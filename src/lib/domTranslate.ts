/**
 * Ekrandakı mətnin RU/EN tərcüməsi (DOM səviyyəsində).
 *
 * Niyə belədir: saytdakı mətnlərin böyük hissəsi (~5000 sətir) komponentlərdə
 * birbaşa azərbaycanca yazılıb, `t()` açarları yalnız ~640 mətni əhatə edir.
 * Dil RU/EN seçiləndə bu modul render olunmuş mətn düyünlərini və UI
 * atributlarını (placeholder, title, aria-label, alt) AZ → hədəf dil
 * lüğəti ilə əvəz edir. Kodda həmin sətirlər həm də DATA kimi işlənir
 * (kateqoriya adları, API-yə gedən dəyərlər, müqayisələr) — onlara
 * toxunmuruq, yalnız ekranda görünən nəticə dəyişir.
 *
 * Lüğət: `src/lib/i18n/{ru,en}.json` — açar AZ mənbə mətnidir.
 * `{0}`, `{1}` olan açarlar şablondur (`${x} məhsul` kimi template-lər).
 * Yeni mətn əlavə edəndə: `node scripts/i18n-extract.mjs` yeni sətirləri
 * göstərir, tərcüməsini JSON-a əlavə etmək kifayətdir.
 *
 * Tərcümə edilməməli bölmə (məs. istifadəçi mətni) üçün elementə
 * `translate="no"` və ya `data-no-translate` qoyun.
 */

export type Dict = Record<string, string>;

type Pattern = { re: RegExp; order: number[]; out: string };

const TEXT_SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "svg"]);
const ATTRS = ["placeholder", "title", "aria-label", "alt"];

let dict: Dict | null = null;
let patterns: Pattern[] = [];
const cache = new Map<string, string | null>();

// Düyün → {mənbə, tərcümə}. React düyünü yeniləyəndə dəyər tərcüməmizlə
// üst-üstə düşmür → yeni mənbə kimi qəbul edilir.
const textRec = new WeakMap<Node, { src: string; out: string }>();
const attrRec = new WeakMap<Element, Record<string, { src: string; out: string }>>();

let observer: MutationObserver | null = null;
let nativeDialogs: { alert: typeof window.alert; confirm: typeof window.confirm; prompt: typeof window.prompt } | null = null;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function buildPatterns(d: Dict): Pattern[] {
  const out: Pattern[] = [];
  for (const [k, v] of Object.entries(d)) {
    if (!/\{\d+\}/.test(k)) continue;
    // Yalnız mənalı sabit hissəsi olan şablonlar — "{0}" kimi boş şablon hər şeyi tutardı.
    if (k.replace(/\{\d+\}/g, "").replace(/[^\p{L}]/gu, "").length < 3) continue;
    const order: number[] = [];
    const src = k.split(/(\{\d+\})/).map((part) => {
      const m = part.match(/^\{(\d+)\}$/);
      if (m) { order.push(+m[1]); return "([\\s\\S]+?)"; }
      return esc(part);
    }).join("");
    out.push({ re: new RegExp(`^${src}$`), order, out: v });
  }
  // Uzun (daha spesifik) şablonlar əvvəl yoxlanılsın.
  return out.sort((a, b) => b.re.source.length - a.re.source.length);
}

function lookup(core: string): string | null {
  if (!dict) return null;
  const hit = dict[core];
  if (hit !== undefined) return hit;
  // Tez-tez rast gəlinən bəzək: sonda ":" / " *" / "…" / "...", əvvəldə emoji.
  const tail = core.match(/^(.*?)(\s*(?::|\*|…|\.\.\.|\?|!))$/);
  if (tail && dict[tail[1]] !== undefined) return dict[tail[1]] + tail[2];
  const head = core.match(/^([^\p{L}\p{N}]+\s*)(.+)$/u);
  if (head && dict[head[2]] !== undefined) return head[1] + dict[head[2]];
  for (const p of patterns) {
    const m = core.match(p.re);
    if (!m) continue;
    const vals: Record<number, string> = {};
    p.order.forEach((idx, i) => { vals[idx] = m[i + 1]; });
    return p.out.replace(/\{(\d+)\}/g, (_, i) => {
      const v = vals[+i] ?? "";
      // Dəyişən hissə özü də məlum mətn ola bilər (status adı və s.).
      return dict![norm(v)] ?? v;
    });
  }
  return null;
}

export function translateString(s: string): string {
  if (!dict || !s || !/\p{L}/u.test(s)) return s;
  const core = norm(s);
  let tr = cache.get(core);
  if (tr === undefined) {
    tr = lookup(core);
    if (cache.size > 20000) cache.clear();
    cache.set(core, tr);
  }
  if (tr == null) return s;
  const lead = s.match(/^\s*/)![0];
  const trail = s.match(/\s*$/)![0];
  return lead + tr + trail;
}

function skipped(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (TEXT_SKIP.has(e.tagName) || TEXT_SKIP.has(e.nodeName)) return true;
    if (e.getAttribute("translate") === "no" || e.hasAttribute("data-no-translate")) return true;
    if ((e as HTMLElement).isContentEditable) return true;
  }
  return false;
}

function doText(node: Text) {
  const cur = node.nodeValue ?? "";
  const rec = textRec.get(node);
  if (rec && cur === rec.out) return; // artıq tərcümə edilib
  if (skipped(node.parentElement)) return;
  const out = translateString(cur);
  if (out === cur) { textRec.delete(node); return; }
  // value-suz <option>-un dəyəri mətnindən götürülür — tərcümə seçimi pozmasın.
  const p = node.parentElement;
  if (p?.tagName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", norm(cur));
  textRec.set(node, { src: cur, out });
  node.nodeValue = out;
}

function doAttrs(el: Element) {
  if (skipped(el)) return;
  let recs = attrRec.get(el);
  const list = el.tagName === "INPUT" && /^(button|submit|reset)$/i.test((el as HTMLInputElement).type) ? [...ATTRS, "value"] : ATTRS;
  for (const a of list) {
    const cur = el.getAttribute(a);
    if (!cur) continue;
    const rec = recs?.[a];
    if (rec && cur === rec.out) continue;
    const out = translateString(cur);
    if (out === cur) { if (recs) delete recs[a]; continue; }
    if (!recs) { recs = {}; attrRec.set(el, recs); }
    recs[a] = { src: cur, out };
    el.setAttribute(a, out);
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) { doText(root as Text); return; }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE) {
    if (skipped(root as Element)) return;
    doAttrs(root as Element);
  }
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) =>
      n.nodeType === Node.ELEMENT_NODE && (TEXT_SKIP.has((n as Element).tagName) || TEXT_SKIP.has(n.nodeName) ||
        (n as Element).getAttribute("translate") === "no" || (n as Element).hasAttribute("data-no-translate"))
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
    else doAttrs(n as Element);
  }
}

function restore(root: Node) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const rec = textRec.get(n);
      if (rec && n.nodeValue === rec.out) n.nodeValue = rec.src;
      textRec.delete(n);
    } else {
      const recs = attrRec.get(n as Element);
      if (!recs) continue;
      for (const [a, rec] of Object.entries(recs)) {
        if ((n as Element).getAttribute(a) === rec.out) (n as Element).setAttribute(a, rec.src);
      }
      attrRec.delete(n as Element);
    }
  }
}

function patchDialogs() {
  if (nativeDialogs) return;
  nativeDialogs = { alert: window.alert, confirm: window.confirm, prompt: window.prompt };
  const n = nativeDialogs;
  window.alert = (m?: unknown) => n.alert.call(window, typeof m === "string" ? translateString(m) : m);
  window.confirm = (m?: string) => n.confirm.call(window, m ? translateString(m) : m);
  window.prompt = (m?: string, d?: string) => n.prompt.call(window, m ? translateString(m) : m, d);
}

function unpatchDialogs() {
  if (!nativeDialogs) return;
  window.alert = nativeDialogs.alert;
  window.confirm = nativeDialogs.confirm;
  window.prompt = nativeDialogs.prompt;
  nativeDialogs = null;
}

/** Hədəf dil lüğətini aktivləşdirir (null → AZ, orijinal mətnlər bərpa olunur). */
export function setDomDictionary(d: Dict | null) {
  observer?.disconnect();
  observer = null;
  if (typeof document === "undefined") return;
  // Əvvəlki dilin tərcümələrini geri qaytar, sonra (lazımdırsa) yenisini tətbiq et.
  restore(document.documentElement);
  cache.clear();
  dict = d;
  patterns = d ? buildPatterns(d) : [];
  if (!d) { unpatchDialogs(); return; }
  patchDialogs();
  walk(document.documentElement);
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") doText(m.target as Text);
      else if (m.type === "attributes") doAttrs(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.documentElement, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: [...ATTRS, "value"],
  });
}
