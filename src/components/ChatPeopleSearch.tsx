"use client";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

/**
 * CHAT-DA ŞƏXS AXTARIŞI (WhatsApp üslubu).
 *
 * Sıra:
 *   1. ƏVVƏLCƏ chat-dakı/kontaktlardakı şəxslər — yazdıqca dərhal süzülür,
 *      şəbəkə sorğusu getmir.
 *   2. SONRA sosial media — "İnternetdə axtar" ilə. Nəticələr şəkilləri,
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
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [q, setQ] = useState("");
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

  // ── 2) Sosial media axtarışı — yalnız düymə ilə ──
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
      {/* ── Axtarış qutusu ── */}
      <div className="relative">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setWeb(null); setWebErr(null); }}
          onKeyDown={(e) => e.key === "Enter" && searchWeb()}
          placeholder="🔍 Şəxs axtar — ad və ya istifadəçi adı"
          className="w-full pl-3 pr-8 py-2 bg-input-bg border border-input-border rounded-xl text-xs"
        />
        {q && (
          <button onClick={() => { setQ(""); setWeb(null); setWebErr(null); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-sm">✕</button>
        )}
      </div>

      {q.trim() && (
        <div className="mt-2 max-h-[45vh] overflow-y-auto space-y-2">
          {/* ── Chat-dakılar ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted px-1 mb-1">Söhbətlərim</p>
            {local.length === 0 ? (
              <p className="text-[11px] text-muted px-1 py-1">Söhbətlərinizdə tapılmadı.</p>
            ) : local.map((p) => (
              <button key={p.id} onClick={() => onOpenChat(p)}
                className="w-full flex items-center gap-2 px-1 py-1.5 rounded-lg hover:bg-input-bg text-left">
                {p.avatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={imgUrl(p.avatar)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  : <span className="w-8 h-8 rounded-full bg-input-bg flex items-center justify-center text-[11px] font-bold shrink-0">{(p.name || "?").slice(0, 1).toUpperCase()}</span>}
                <span className="min-w-0">
                  <span className="block text-xs font-semibold truncate">{p.name}</span>
                  {p.sub && <span className="block text-[10px] text-muted truncate">{p.sub}</span>}
                </span>
              </button>
            ))}
          </div>

          {/* ── Sosial media ── */}
          <div className="border-t border-card-border pt-2">
            <div className="flex items-center justify-between gap-2 px-1 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Sosial media</p>
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
