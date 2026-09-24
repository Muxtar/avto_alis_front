"use client";
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

/**
 * CHAT-DA ŞƏXS AXTARIŞI (WhatsApp üslubu).
 *
 * Sıra:
 *   1. ƏVVƏLCƏ chat-dakı/kontaktlardakı şəxslər — yazdıqca dərhal süzülür,
 *      şəbəkə sorğusu getmir.
 *   2. SONRA SAYTDAKI İXTİSAS SAHİBLƏRİ — profilində ixtisas göstərən hər kəs
 *      ad və ya peşə ilə tapılır (məs. «santexnik» və ya «Elvin»), tanış
 *      olmasa belə. Əvvəl bu axtarış yox idi: saytda qeydiyyatdan keçmiş
 *      usta yalnız kontaktımda olsaydı tapılırdı.
 *   3. SONRA sosial media — "İnternetdə axtar" ilə. Nəticələr şəkilləri,
 *      platforması və "tradixai istifadəçisi" nişanı ilə gəlir; tanımadığın
 *      şəxsə mesaj yazmaq üçün admin panelə düşən sorğu göndərilir.
 *
 * İnternet axtarışı KREDİT xərclədiyi üçün avtomatik işə düşmür — istifadəçi
 * özü düyməyə basır.
 */

type LocalPerson = { id: number; name: string; avatar?: string | null; sub?: string };

const PLAT: Record<string, { icon: string; label: string; cls: string }> = {
  instagram: { icon: "📷", label: "Instagram", cls: "bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white" },
  facebook: { icon: "📘", label: "Facebook", cls: "bg-blue-600 text-white" },
  linkedin: { icon: "💼", label: "LinkedIn", cls: "bg-sky-700 text-white" },
  x: { icon: "𝕏", label: "X (Twitter)", cls: "bg-neutral-900 text-white" },
};

const proxyImg = (u: string) => `${API}/avatar-proxy?url=${encodeURIComponent(u)}`;

export default function ChatPeopleSearch({
  people, onOpenChat,
}: {
  people: LocalPerson[];                       // chat + kontakt siyahısı
  onOpenChat: (p: LocalPerson) => void;
}) {
  const { token, isLoggedIn, user } = useAuth();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [site, setSite] = useState<any[] | null>(null);      // saytdakı ixtisas sahibləri
  const [siteLoading, setSiteLoading] = useState(false);
  const [webLoading, setWebLoading] = useState(false);
  const [web, setWeb] = useState<any[] | null>(null);
  const [webErr, setWebErr] = useState<string | null>(null);
  // Sosial profilə mesaj — admin əl ilə çatdırır
  const [msgTarget, setMsgTarget] = useState<any>(null);
  const [msgText, setMsgText] = useState("");
  const [msgBusy, setMsgBusy] = useState(false);

  // ── 1) Yerli süzgəc — şəbəkə sorğusu YOXDUR ──
  const local = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return people.filter((p) => (p.name || "").toLowerCase().includes(s)).slice(0, 20);
  }, [q, people]);

  // ── 2) Saytdakı ixtisas sahibləri — ad VƏ YA peşə ilə (avtomatik) ──
  // Pulsuzdur (daxili baza), ona görə internetdən fərqli olaraq yazdıqca
  // özü işə düşür; 350 ms gözləyir ki, hər hərfdə sorğu getməsin.
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) { setSite(null); return; }
    let alive = true;
    setSiteLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/professionals?q=${encodeURIComponent(s)}`).then((x) => x.json());
        if (alive) setSite(r?.success ? (r.professionals || []) : []);
      } catch { if (alive) setSite([]); } finally { if (alive) setSiteLoading(false); }
    }, 350);
    return () => { alive = false; clearTimeout(timer); };
  }, [q]);

  // Söhbətlərimdə onsuz da görünənləri və özümü təkrar göstərmirik.
  const siteList = useMemo(() => {
    if (!site) return [];
    const shown = new Set(people.map((p) => p.id));
    return site.filter((u: any) => u.id !== user?.id && !shown.has(u.id)).slice(0, 20);
  }, [site, people, user?.id]);

  // ── 3) Sosial media axtarışı — yalnız düymə ilə ──
  const searchWeb = async () => {
    const s = q.trim();
    if (s.length < 2) { toast("Ən azı 2 hərf yazın", "error"); return; }
    if (!isLoggedIn || !token) { toast("İnternetdə axtarış üçün daxil olun", "error"); return; }
    setWebLoading(true); setWebErr(null); setWeb(null);
    try {
      const r = await fetch(`${API}/search/web`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: s, mode: "person" }),
      }).then((x) => x.json());
      if (r.success) setWeb(r.results || []);
      else setWebErr(r.message || "Nəticə tapılmadı");
    } catch { setWebErr("Şəbəkə xətası"); } finally { setWebLoading(false); }
  };

  const sendOutreach = async () => {
    if (!msgTarget || !msgText.trim()) return;
    setMsgBusy(true);
    try {
      const r = await fetch(`${API}/social-outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          targetUrl: msgTarget.url, targetPlatform: msgTarget.platform, targetHandle: msgTarget.handle,
          targetName: msgTarget.siteUser?.name || msgTarget.displayName || msgTarget.handle,
          targetAvatar: msgTarget.siteUser?.avatar || msgTarget.avatarUrl || null,
          matchedUserId: msgTarget.siteUser?.id || null,
          message: msgText.trim(),
        }),
      }).then((x) => x.json());
      if (r.success) { toast("Mesaj göndərildi — admin çatdıracaq ✓", "success"); setMsgTarget(null); setMsgText(""); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setMsgBusy(false); }
  };

  return (
    <>
      {/* ── Axtarış qutusu ──
          Əvvəl adi, kiçik (py-2, text-xs) sahə idi və yan paneldə gözə
          dəymirdi. İndi daha iri, rəngli çərçivəli və fokusda işıqlanan
          qutudur: içində axtarış ikonu, altında qısa izah. */}
      <div className="rounded-2xl p-[2px] bg-gradient-to-r from-orange-500 via-fuchsia-500 to-sky-500 shadow-md transition-shadow focus-within:shadow-[0_0_0_4px_rgba(249,115,22,0.15)]">
        <div className="relative bg-card rounded-[14px]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setWeb(null); setWebErr(null); }}
            onKeyDown={(e) => e.key === "Enter" && searchWeb()}
            placeholder="Ad və ya ixtisas axtar…"
            className="w-full pl-11 pr-10 py-3.5 bg-transparent rounded-[14px] text-sm font-medium placeholder:text-muted/80 focus:outline-none"
          />
          {q ? (
            <button onClick={() => { setQ(""); setWeb(null); setWebErr(null); }} aria-label="Təmizlə"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-input-bg text-muted hover:text-foreground flex items-center justify-center text-sm">✕</button>
          ) : null}
        </div>
      </div>
      {!q.trim() && (
        <p className="mt-2 px-1 text-[11px] text-muted leading-snug">
          Ad və ya ixtisas yazın (məs. «Elvin» və ya «santexnik») — əvvəl söhbətlərinizdə,
          sonra <span className="font-semibold text-foreground/80">saytdakı ixtisas sahiblərində</span>,
          sonra <span className="font-semibold text-foreground/80">Instagram · Facebook · X · LinkedIn</span> hesablarında axtarılır.
        </p>
      )}

      {q.trim() && (
        <div className="mt-3 max-h-[45vh] overflow-y-auto space-y-3">
          {/* ── Chat-dakılar ── */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-orange-500 px-1 mb-1">Söhbətlərim</p>
            {local.length === 0 ? (
              <p className="text-[11px] text-muted px-1 py-1">Söhbətlərinizdə tapılmadı.</p>
            ) : local.map((p) => (
              <button key={p.id} onClick={() => onOpenChat(p)}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-input-bg text-left transition-colors">
                {p.avatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={imgUrl(p.avatar)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  : <span className="w-8 h-8 rounded-full bg-input-bg flex items-center justify-center text-[11px] font-bold shrink-0">{(p.name || "?").slice(0, 1).toUpperCase()}</span>}
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate">{p.name}</span>
                  {p.sub && <span className="block text-[11px] text-muted truncate">{p.sub}</span>}
                </span>
              </button>
            ))}
          </div>

          {/* ── Saytdakı ixtisas sahibləri ── */}
          <div className="border-t border-card-border pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-to)] px-1 mb-1">
              Saytdakı ixtisas sahibləri
            </p>
            {siteLoading && <p className="text-[11px] text-muted px-1 py-1">axtarılır…</p>}
            {!siteLoading && siteList.length === 0 && (
              <p className="text-[11px] text-muted px-1 py-1">
                {q.trim().length < 2 ? "Ən azı 2 hərf yazın." : "Bu ad və ya ixtisas üzrə qeydiyyatlı şəxs tapılmadı."}
              </p>
            )}
            {siteList.map((u: any) => {
              // `profession` çox vaxt `professions[0]` ilə eynidir — təkrarı atırıq
              // («Santexnik · Santexnik» kimi görünməsin).
              const profs: string[] = Array.from(new Set([u.profession, ...(u.professions || [])].filter(Boolean)));
              return (
                <div key={u.id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-input-bg transition-colors">
                  {u.avatar
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={imgUrl(u.avatar)} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                    : <span className="w-9 h-9 rounded-full bg-input-bg flex items-center justify-center text-[11px] font-bold shrink-0">{(u.name || "?").slice(0, 1).toUpperCase()}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">
                      {u.name}
                      {u.idVerifyStatus === "APPROVED" && <span className="ml-1 text-[10px] text-green-600" title="Təsdiqlənmiş profil">✓</span>}
                    </p>
                    <p className="text-[11px] text-muted truncate">
                      {profs.slice(0, 2).join(" · ") || "ixtisas"}
                      {u.city ? ` · ${u.city}` : ""}
                      {u.ratingCount > 0 ? ` · ⭐ ${Number(u.avgRating || 0).toFixed(1)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onOpenChat({ id: u.id, name: u.name, avatar: u.avatar })}
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--brand-soft)] text-[var(--brand-to)] text-[11px] font-bold">
                      💬 Chat
                    </button>
                    <a href={`/seller/${u.id}`} className="px-2 py-1.5 rounded-lg bg-input-bg border border-card-border text-[11px] font-semibold">
                      Profil
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Sosial media ── */}
          <div className="border-t border-card-border pt-2">
            <div className="flex items-center justify-between gap-2 px-1 mb-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Sosial media</p>
              <button onClick={searchWeb} disabled={webLoading}
                className="text-[11px] font-bold text-[var(--brand-to)] disabled:opacity-50">
                {webLoading ? "axtarılır…" : web ? "yenidən axtar" : "🌐 internetdə axtar"}
              </button>
            </div>

            {webErr && <p className="text-[11px] text-red-500 px-1">{webErr}</p>}
            {web && web.length === 0 && !webErr && (
              <p className="text-[11px] text-muted px-1">Açıq profil tapılmadı.</p>
            )}

            {web?.map((r: any) => {
              const m = PLAT[r.platform || ""] || { icon: "🔗", label: r.site || "Profil", cls: "bg-input-bg text-muted" };
              const src = r.siteUser?.avatar ? imgUrl(r.siteUser.avatar) : (r.avatarUrl ? proxyImg(r.avatarUrl) : null);
              const name = r.siteUser?.name || r.displayName || r.handle || r.title;
              return (
                <div key={r.url} className={`rounded-xl border p-2 mb-1.5 ${r.siteUser ? "border-[var(--brand-to)] bg-[var(--brand-soft)]" : "border-card-border"}`}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-w-0">
                    <span className="relative shrink-0">
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" loading="lazy" className="w-10 h-10 rounded-full object-cover bg-input-bg"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; const n = e.currentTarget.nextElementSibling as HTMLElement | null; if (n) n.style.display = "flex"; }} />
                      ) : null}
                      <span style={{ display: src ? "none" : "flex" }} className="w-10 h-10 rounded-full items-center justify-center text-sm font-bold bg-input-bg text-muted">
                        {(name || "?").slice(0, 1).toUpperCase()}
                      </span>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-card flex items-center justify-center text-[9px] ${m.cls}`}>{m.icon}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold truncate">
                        {name}{r.verifiedBadge && <span className="text-[var(--brand-to)] ml-1">✔︎</span>}
                      </span>
                      <span className="block text-[10px] text-muted truncate">
                        {r.handle ? `@${r.handle}` : m.label}
                        {typeof r.followers === "number" ? ` · ${r.followers.toLocaleString("az-AZ")} izləyici` : ""}
                      </span>
                      {r.siteUser && <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--brand-to)] text-white">✓ tradixai istifadəçisi</span>}
                    </span>
                  </a>
                  <div className="flex gap-1.5 mt-1.5">
                    {r.siteUser ? (
                      <button onClick={() => onOpenChat({ id: r.siteUser.id, name: r.siteUser.name, avatar: r.siteUser.avatar })}
                        className="flex-1 py-1 rounded-lg text-[11px] font-bold text-white cta-gradient">💬 Chat</button>
                    ) : (
                      <button onClick={() => { setMsgTarget(r); setMsgText(""); }}
                        className="flex-1 py-1 rounded-lg text-[11px] font-bold text-white cta-gradient">✉️ Mesaj</button>
                    )}
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="px-2 py-1 rounded-lg border border-card-border text-[11px] font-semibold">↗</a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sosial profilə mesaj — admin əl ilə çatdırır ── */}
      {msgTarget && (
        <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4" onClick={() => !msgBusy && setMsgTarget(null)}>
          <div className="bg-card text-foreground border border-card-border rounded-2xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-sm mb-1">
              ✉️ {msgTarget.displayName || msgTarget.handle}
              <span className="font-normal text-muted"> · {PLAT[msgTarget.platform || ""]?.label || msgTarget.platform}</span>
            </p>
            <p className="text-[11px] text-muted mb-2">
              Mesaj admin panelinə düşür və oradan həmin profilə <b>əl ilə</b> göndərilir. Sizin adınız da yazılır.
            </p>
            <textarea value={msgText} onChange={(e) => setMsgText(e.target.value)} rows={4}
              placeholder="Mesajınızı yazın…"
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm resize-none mb-2" />
            <div className="flex gap-2">
              <button onClick={() => setMsgTarget(null)} disabled={msgBusy}
                className="px-3 py-2 rounded-xl border border-card-border text-sm">Ləğv</button>
              <button onClick={sendOutreach} disabled={msgBusy || !msgText.trim()}
                className="flex-1 py-2 rounded-xl text-white text-sm font-bold cta-gradient disabled:opacity-50">
                {msgBusy ? "Göndərilir…" : "Göndər"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
