"use client";
// Admin — ANA SƏHİFƏ KARUSELİ.
// • Canlı önizləmə — saytda necə görünəcək
// • Karusel sırası — şəkil bannerləri + sayt slaydları: aktiv/passiv, sıra, mətn, link
// • Sayt slaydları kitabxanası — saytın hazır dizayn slaydlarından seçim
// • Şəkil banner yükləmə (əsas karusel və ya yan banner)
// İstifadəçilərin ödənişli reklamları ayrıca bölmədədir (Reklamlar) və karuseldə
// bu məzmunla növbə ilə göstərilir.
import { useEffect, useMemo, useState } from "react";
import { API, imgUrl } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useAdminLive } from "@/lib/live";
import HeroCarousel from "@/components/HeroCarousel";
import { bannerToSlide, defaultSiteSlides, type BannerRow } from "@/components/HomeCarousel";
import { SITE_SLIDES, SITE_SLIDE_MAP, type SiteSlide } from "@/lib/siteSlides";

const inputCls = "w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50";

function SiteThumb({ s, className = "" }: { s: SiteSlide; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ background: `linear-gradient(125deg, ${s.from}, ${s.via} 55%, ${s.to})` }}>
      <div className="absolute -right-4 -top-6 w-16 h-16 rounded-full opacity-60 blur-xl" style={{ background: s.glow }} />
      <div className="absolute inset-0 p-2 flex flex-col justify-end">
        <p className="text-white/70 text-[8px] font-bold uppercase tracking-wider truncate">{s.kicker}</p>
        <p className="text-white text-[11px] font-black leading-tight line-clamp-2">{s.title}</p>
      </div>
    </div>
  );
}

export default function AdminBannersPage() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ title: string; subtitle: string; ctaLabel: string; link: string }>({ title: "", subtitle: "", ctaLabel: "", link: "" });
  // Yükləmə forması
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [form, setForm] = useState({ title: "", subtitle: "", ctaLabel: "", link: "", position: "MAIN" });
  const [ratio, setRatio] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const authHeaders = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const load = () => {
    fetch(`${API}/admin/banners`, { headers: authHeaders })
      .then((r) => r.json()).then((d) => { if (d.success) setBanners(d.banners); }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps
  useAdminLive(["banner"], () => { load(); });

  const main = useMemo(() => banners.filter((b) => (b.position || "MAIN") === "MAIN").sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [banners]);
  const side = useMemo(() => banners.filter((b) => b.position === "SIDE"), [banners]);
  const siteConfigured = main.some((b) => b.kind === "SITE");
  const usedKeys = new Set(main.filter((b) => b.kind === "SITE").map((b) => b.siteKey));

  // Canlı önizləmə — saytdakı ilə eyni qayda (reklamlar xaric).
  const previewSlides = useMemo(() => {
    const content = main.filter((b) => b.active).map(bannerToSlide).filter((x): x is NonNullable<typeof x> => !!x);
    const all = siteConfigured ? content : [...content, ...defaultSiteSlides()];
    return all.length ? all : defaultSiteSlides();
  }, [main, siteConfigured]);

  const patch = async (id: number, data: any) => {
    const r = await fetch(`${API}/admin/banners/${id}`, { method: "PUT", headers: jsonHeaders, body: JSON.stringify(data) }).then((x) => x.json()).catch(() => null);
    if (r?.success) load(); else toast(r?.message || "Xəta", "error");
  };

  const move = async (id: number, delta: number) => {
    const ids = main.map((b) => b.id);
    const i = ids.indexOf(id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setBanners((prev) => prev.map((b) => (ids.includes(b.id) ? { ...b, sortOrder: ids.indexOf(b.id) } : b)));
    const r = await fetch(`${API}/admin/banners-order`, { method: "PUT", headers: jsonHeaders, body: JSON.stringify({ ids }) }).then((x) => x.json()).catch(() => null);
    if (!r?.success) { toast("Sıra saxlanmadı", "error"); load(); }
  };

  const remove = async (b: BannerRow) => {
    if (!confirm(b.kind === "SITE" ? "Slayd karuseldən çıxarılsın?" : "Banner silinsin?")) return;
    const r = await fetch(`${API}/admin/banners/${b.id}`, { method: "DELETE", headers: authHeaders }).then((x) => x.json()).catch(() => null);
    if (r?.success) { setBanners((x) => x.filter((y) => y.id !== b.id)); toast(b.kind === "SITE" ? "Çıxarıldı" : "Silindi", "success"); }
    else toast(r?.message || "Xəta", "error");
  };

  const addSite = async (key: string) => {
    const r = await fetch(`${API}/admin/banners/site`, { method: "POST", headers: jsonHeaders, body: JSON.stringify({ siteKey: key }) }).then((x) => x.json()).catch(() => null);
    if (r?.success) load(); else toast(r?.message || "Xəta", "error");
  };
  const addAllSite = async () => {
    for (const s of SITE_SLIDES) if (!usedKeys.has(s.key)) await addSite(s.key);
    toast("Bütün sayt slaydları əlavə edildi ✓", "success");
  };

  const startEdit = (b: BannerRow) => {
    setEditing(b.id);
    setDraft({ title: b.title || "", subtitle: b.subtitle || "", ctaLabel: b.ctaLabel || "", link: b.link || "" });
  };
  const saveEdit = async () => {
    if (editing == null) return;
    await patch(editing, draft);
    setEditing(null);
  };

  const pickFile = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f); setRatio(null); setPreview(f ? URL.createObjectURL(f) : "");
    if (f) {
      const url = URL.createObjectURL(f);
      const im = new Image();
      im.onload = () => { setRatio(im.naturalWidth / im.naturalHeight); URL.revokeObjectURL(url); };
      im.onerror = () => URL.revokeObjectURL(url);
      im.src = url;
    }
  };

  const upload = async () => {
    if (!file) { toast("Şəkil seçin", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      (["title", "subtitle", "ctaLabel", "link"] as const).forEach((k) => { if (form[k].trim()) fd.append(k, form[k].trim()); });
      fd.append("position", form.position);
      fd.append("sortOrder", String(form.position === "MAIN" ? main.length : side.length));
      const r = await fetch(`${API}/admin/banners`, { method: "POST", headers: authHeaders, body: fd }).then((x) => x.json());
      if (r.success) { toast("Banner əlavə edildi ✓", "success"); pickFile(null); setForm({ title: "", subtitle: "", ctaLabel: "", link: "", position: form.position }); load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setUploading(false); }
  };

  const thumb = (b: BannerRow) => {
    if (b.kind === "SITE") {
      const s = b.siteKey ? SITE_SLIDE_MAP.get(b.siteKey) : undefined;
      return s ? <SiteThumb s={s} className="w-full sm:w-44 h-24 shrink-0" /> : <div className="w-full sm:w-44 h-24 rounded-lg bg-input-bg shrink-0" />;
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imgUrl(b.image)} alt="" className="w-full sm:w-44 h-24 object-cover rounded-lg bg-input-bg shrink-0" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">🎠 Ana səhifə karuseli</h1>
        <p className="text-muted text-xs mt-1">
          Karuseldə nəyin görünəcəyini buradan idarə edin. İstifadəçilərin ödənişli reklamları (<a href="/admin/ads" className="text-orange-500 hover:underline">Reklamlar</a>) bu slaydlarla növbə ilə göstərilir.
        </p>
      </div>

      {/* Canlı önizləmə */}
      <section className="bg-card border border-card-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">👁 Canlı önizləmə</h2>
          <span className="text-xs text-muted">{previewSlides.length} slayd (reklamlar xaric)</span>
        </div>
        <div className="max-w-3xl">
          <HeroCarousel key={previewSlides.map((s) => s.id).join(",")} slides={previewSlides} />
        </div>
      </section>

      {/* Karusel sırası */}
      <section className="bg-card border border-card-border rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="font-semibold">📋 Karusel sırası</h2>
          <span className="text-xs text-muted">{main.filter((b) => b.active).length} aktiv / {main.length}</span>
        </div>
        {!siteConfigured && (
          <p className="text-[12px] text-sky-600 bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2 mb-3">
            ℹ️ Hələ sayt slaydı seçilməyib — bu halda <b>bütün {SITE_SLIDES.length} sayt slaydı</b> avtomatik göstərilir (önizləmədə görünür). Aşağıdakı kitabxanadan seçsəniz yalnız seçdikləriniz göstəriləcək.
          </p>
        )}
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : main.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">Karuseldə admin slaydı yoxdur.</p>
        ) : (
          <div className="space-y-2">
            {main.map((b, i) => {
              const s = b.kind === "SITE" && b.siteKey ? SITE_SLIDE_MAP.get(b.siteKey) : undefined;
              return (
                <div key={b.id} className={`border rounded-xl p-2.5 flex flex-col sm:flex-row gap-3 ${b.active ? "border-card-border" : "border-dashed border-card-border opacity-60"}`}>
                  <div className="flex sm:flex-col gap-1 shrink-0 order-last sm:order-first">
                    <button onClick={() => move(b.id, -1)} disabled={i === 0} className="w-8 h-8 rounded-lg bg-input-bg border border-input-border disabled:opacity-30" aria-label="Yuxarı">↑</button>
                    <button onClick={() => move(b.id, 1)} disabled={i === main.length - 1} className="w-8 h-8 rounded-lg bg-input-bg border border-input-border disabled:opacity-30" aria-label="Aşağı">↓</button>
                  </div>
                  {thumb(b)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-muted">#{i + 1}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${b.kind === "SITE" ? "bg-violet-500/10 text-violet-500" : "bg-orange-500/10 text-orange-500"}`}>
                        {b.kind === "SITE" ? "Sayt slaydı" : "Şəkil banner"}
                      </span>
                      <p className="font-medium text-sm truncate">{b.title || s?.title || "(başlıqsız)"}</p>
                    </div>
                    {editing === b.id ? (
                      <div className="grid sm:grid-cols-2 gap-2 mt-2">
                        <input className={inputCls} placeholder={s ? `Başlıq (standart: ${s.title})` : "Başlıq"} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                        <input className={inputCls} placeholder={s ? "Alt yazı (boş = standart)" : "Alt yazı"} value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} />
                        <input className={inputCls} placeholder={s ? `Düymə (standart: ${s.cta})` : "Düymə mətni (məs. Ətraflı bax)"} value={draft.ctaLabel} onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })} />
                        <input className={inputCls} placeholder={s ? `Link (standart: ${s.href})` : "Link (/elanlar... və ya https://...)"} value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
                        <div className="sm:col-span-2 flex gap-2">
                          <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-orange-500">Yadda saxla</button>
                          <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg text-xs bg-input-bg border border-input-border">Ləğv et</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {(b.subtitle || s?.subtitle) && <p className="text-xs text-muted line-clamp-1 mt-0.5">{b.subtitle || s?.subtitle}</p>}
                        <p className="text-[11px] text-muted mt-0.5 truncate">🔗 {b.link || s?.href || "linksiz"}{b.ctaLabel ? ` · «${b.ctaLabel}»` : ""}</p>
                      </>
                    )}
                  </div>
                  <div className="flex sm:flex-col items-stretch gap-1.5 shrink-0">
                    <button onClick={() => patch(b.id, { active: !b.active })} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${b.active ? "bg-green-500/10 text-green-600" : "bg-input-bg text-muted"}`}>
                      {b.active ? "Aktiv ✓" : "Passiv"}
                    </button>
                    {editing !== b.id && <button onClick={() => startEdit(b)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-input-bg border border-input-border">✏️ Mətn</button>}
                    <button onClick={() => remove(b)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20">{b.kind === "SITE" ? "Çıxar" : "Sil"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sayt slaydları kitabxanası */}
      <section className="bg-card border border-card-border rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="font-semibold">✨ Sayt slaydları</h2>
            <p className="text-xs text-muted">Saytın hazır dizayn slaydları — şəkil yükləmək lazım deyil, hər ekranda kəskin görünür.</p>
          </div>
          {SITE_SLIDES.some((s) => !usedKeys.has(s.key)) && (
            <button onClick={addAllSite} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-input-bg border border-input-border hover:border-orange-500/50">Hamısını əlavə et</button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {SITE_SLIDES.map((s) => {
            const added = usedKeys.has(s.key);
            return (
              <div key={s.key} className="rounded-xl border border-card-border overflow-hidden">
                <SiteThumb s={s} className="aspect-[16/9] !rounded-none" />
                <div className="p-2">
                  <p className="text-xs font-semibold truncate">{s.label}</p>
                  <button onClick={() => !added && addSite(s.key)} disabled={added}
                    className={`mt-1.5 w-full py-1.5 rounded-lg text-xs font-semibold ${added ? "bg-green-500/10 text-green-600" : "text-white bg-gradient-to-r from-orange-500 to-orange-600"}`}>
                    {added ? "Karuseldədir ✓" : "＋ Əlavə et"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Şəkil banner yüklə */}
      <section className="bg-card border border-card-border rounded-2xl p-4">
        <h2 className="font-semibold mb-3">🖼 Şəkil banner yüklə</h2>
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <label className="block">
              <span className="block text-xs font-medium text-muted mb-1">Şəkil — <b>16:9</b> tövsiyə olunur (1920×1080)</span>
              <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-500/10 file:text-orange-500 file:text-sm file:font-semibold" />
            </label>
            {ratio != null && form.position === "MAIN" && (
              <p className={`text-[11px] ${ratio > 1.56 && ratio < 2.03 ? "text-green-500" : "text-amber-500"}`}>
                {ratio > 1.56 && ratio < 2.03 ? `✓ Nisbət ${ratio.toFixed(2)}:1 — karuseli tam dolduracaq.` : `⚠ Nisbət ${ratio.toFixed(2)}:1 — yanlarda bulanıq fon qalacaq; 16:9 daha yaxşıdır.`}
              </p>
            )}
            <select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className={inputCls}>
              <option value="MAIN">Əsas karusel</option>
              <option value="SIDE">Yan banner (sağ sütun, maks 3)</option>
            </select>
            <input className={inputCls} placeholder="Başlıq (opsional, şəklin üstündə)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className={inputCls} placeholder="Alt yazı (opsional)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Düymə mətni" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
              <input className={inputCls} placeholder="Link" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
            </div>
            <button onClick={upload} disabled={uploading || !file} className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white text-sm font-semibold disabled:opacity-50">
              {uploading ? "Yüklənir…" : "Əlavə et"}
            </button>
          </div>
          <div>
            <p className="text-xs text-muted mb-1.5">Önizləmə</p>
            {preview && form.position === "MAIN" ? (
              <HeroCarousel slides={[{ id: "pv", kind: "image", label: "Önizləmə", image: preview, title: form.title || undefined, subtitle: form.subtitle || undefined, cta: form.ctaLabel || undefined, href: form.link || undefined }]} />
            ) : preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="w-56 h-32 object-cover rounded-lg" />
            ) : (
              <div className="aspect-[16/9] rounded-2xl border-2 border-dashed border-card-border flex items-center justify-center text-sm text-muted">Şəkil seçin</div>
            )}
          </div>
        </div>
      </section>

      {/* Yan bannerlər */}
      <section className="bg-card border border-card-border rounded-2xl p-4">
        <h2 className="font-semibold mb-1">📌 Yan bannerlər</h2>
        <p className="text-xs text-muted mb-3">Karuselin sağındakı 3 kiçik plitə (yalnız böyük ekranda). Ödənişli yan reklamlar bunlardan əvvəl göstərilir.</p>
        {side.length === 0 ? (
          <p className="text-sm text-muted">Yan banner yoxdur — saytın standart plitələri göstərilir.</p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {side.map((b) => (
              <div key={b.id} className={`rounded-xl border border-card-border overflow-hidden ${b.active ? "" : "opacity-60"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgUrl(b.image)} alt="" className="w-full h-24 object-cover" />
                <div className="p-2 flex gap-1.5">
                  <button onClick={() => patch(b.id, { active: !b.active })} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${b.active ? "bg-green-500/10 text-green-600" : "bg-input-bg text-muted"}`}>{b.active ? "Aktiv ✓" : "Passiv"}</button>
                  <button onClick={() => patch(b.id, { position: "MAIN" })} className="px-2 py-1.5 rounded-lg text-xs bg-input-bg border border-input-border" title="Əsas karuselə keçir">↖</button>
                  <button onClick={() => remove(b)} className="px-2 py-1.5 rounded-lg text-xs bg-red-500/10 text-red-500">Sil</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
