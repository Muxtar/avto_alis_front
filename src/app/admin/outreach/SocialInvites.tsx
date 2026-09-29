"use client";
// ADMIN · SOSİAL PROFİLLƏRƏ YAZILANLAR.
// İstifadəçilər çat axtarışında internetdə tapdıqları profillərə (Instagram, Facebook…)
// yazır; mesajlar o şəxs qoşulub hesabını təsdiqləyənə qədər gözləyir. Adminin işi:
// saytın RƏSMİ sosial hesabından həmin profilə xəbər vermək və «Xəbər verildi» basmaq.
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

type Row = {
  key: string; platform: string; handle: string; url: string | null; name: string | null; avatar: string | null;
  senders: { id: number; name: string; phone: string | null; count: number }[];
  messages: number; consults: number; media: number; pending: number;
  offers: number; offerTotal: number; offerExpiresAt: string | null;
  firstAt: string; lastAt: string; previews: string[]; requested: number;
  state: "TODO" | "NOTIFIED" | "DELIVERED";
  notice: { notifiedAt: string | null; by: string | null; times: number; note: string | null } | null;
  deliveredTo: { id: number; name: string | null; at: string | null } | null;
};

const PLAT: Record<string, { label: string; cls: string }> = {
  instagram: { label: "Instagram", cls: "bg-gradient-to-r from-fuchsia-500 to-orange-400 text-white" },
  facebook: { label: "Facebook", cls: "bg-blue-600 text-white" },
  linkedin: { label: "LinkedIn", cls: "bg-sky-700 text-white" },
  twitter: { label: "X", cls: "bg-neutral-900 text-white" },
  tiktok: { label: "TikTok", cls: "bg-neutral-900 text-white" },
  youtube: { label: "YouTube", cls: "bg-red-600 text-white" },
  telegram: { label: "Telegram", cls: "bg-sky-500 text-white" },
};
const TABS: { k: "TODO" | "NOTIFIED" | "DELIVERED" | "ALL"; label: string }[] = [
  { k: "TODO", label: "Xəbər veriləcək" }, { k: "NOTIFIED", label: "Xəbər verilib" }, { k: "DELIVERED", label: "Qoşuldu" }, { k: "ALL", label: "Hamısı" },
];
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("az-AZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");

/** Saytın rəsmi hesabından göndəriləcək xəbərdarlıq — adlar görünür, mesaj mətni yox (şəxsi yazışmadır). */
function notice(r: Row): string {
  const plat = PLAT[r.platform]?.label || r.platform;
  const names = r.senders.map((s) => s.name).filter(Boolean);
  const who = names.length === 1 ? names[0] : names.length <= 3 ? names.join(", ") : `${names.slice(0, 2).join(", ")} və daha ${names.length - 2} nəfər`;
  const what = [r.offers && `${r.offers} ödənişli danışıq təklifi (${r.offerTotal} AZN, ödəniş platformada saxlanılır)`, r.messages && `${r.messages} mesaj`, r.consults && `${r.consults} Rəy (konsultasiya) sorğusu`].filter(Boolean).join(" və ");
  return `Salam${r.name ? `, ${r.name}` : ""}! 👋

Bu, tradixai.io platformasının rəsmi hesabıdır. Platformada ${who} sizə ${what} göndərib.

Oxumaq və cavab vermək üçün:
1) tradixai.io saytında qeydiyyatdan keçin;
2) Profil → Sosial şəbəkələr bölməsində bu ${plat} hesabınızı əlavə edib təsdiqləyin.

Təsdiqdən dərhal sonra bütün mesajlar sizə çatacaq.${r.offers ? `

⏳ Diqqət: ödənişli təklif ${r.offerExpiresAt ? new Date(r.offerExpiresAt).toLocaleDateString("az-AZ") : "7 gün ərzində"} tarixinə qədər qüvvədədir — qəbul edilməsə pul göndərənə qaytarılır.` : ""}`;
}

export default function SocialInvites() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"TODO" | "NOTIFIED" | "DELIVERED" | "ALL">("TODO");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const H = () => ({ Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`, "Content-Type": "application/json" });
  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/admin/social-invites?status=${tab}&q=${encodeURIComponent(q.trim())}`, { headers: H() }).then((x) => x.json());
      if (r.success) { setItems(r.items || []); setCounts(r.counts || {}); } else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { const id = setInterval(load, 60000); return () => clearInterval(id); }, [load]);

  const copy = (text: string, msg = "Kopyalandı") => navigator.clipboard?.writeText(text).then(() => toast(msg, "success")).catch(() => {});
  const markNotified = async (r: Row) => {
    setBusy(r.key);
    try {
      const d = await fetch(`${API}/admin/social-invites/notified`, { method: "POST", headers: H(), body: JSON.stringify({ key: r.key, note: note[r.key] || "" }) }).then((x) => x.json());
      if (d.success) {
        toast(`Qeyd olundu ✓ — ${d.notifiedSenders} yazana bildiriş getdi`, "success");
        window.dispatchEvent(new Event("admin:pending-changed"));
        load();
      } else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="seg-tabs flex-1 min-w-[280px]" role="tablist">
          {TABS.map((t) => (
            <button key={t.k} onClick={() => { setTab(t.k); setLoading(true); }} role="tab" aria-selected={tab === t.k} className={`seg-tab ${tab === t.k ? "is-active" : ""}`}>
              {t.label}{(counts[t.k] ?? 0) > 0 && <span className={t.k === "TODO" ? "seg-badge" : "ml-1 text-[10px] opacity-70"}>{counts[t.k]}</span>}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Profil, ad və ya yazan şəxs…"
          className="w-full sm:w-64 px-3 py-2.5 bg-card border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-to)]/30" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--brand-to)] border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="surface p-10 text-center">
          <p className="text-3xl mb-2">{tab === "TODO" ? "✅" : "📭"}</p>
          <p className="font-semibold text-sm">{tab === "TODO" ? "Xəbər veriləcək profil yoxdur" : "Siyahı boşdur"}</p>
          <p className="text-xs text-muted mt-1">İstifadəçi çat axtarışında tapdığı sosial profilə yazanda burada görünəcək.</p>
        </div>
      ) : (
        items.map((r) => {
          const p = PLAT[r.platform] || { label: r.platform, cls: "bg-input-bg text-muted" };
          const isOpen = open === r.key;
          return (
            <div key={r.key} className="surface overflow-hidden">
              {/* Sətir — profil, kim yazıb, neçə mesaj */}
              <button onClick={() => setOpen(isOpen ? null : r.key)} className="w-full text-left p-4 flex items-start gap-3 hover:bg-input-bg/40 transition-colors">
                <span className="relative shrink-0">
                  {r.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${API}/avatar-proxy?url=${encodeURIComponent(r.avatar)}`} alt="" className="w-12 h-12 rounded-2xl object-cover bg-input-bg" />
                  ) : (
                    <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-400 to-slate-500 text-white font-bold flex items-center justify-center">{(r.name || r.handle).slice(0, 2).toUpperCase()}</span>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm truncate">{r.name || r.handle}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${p.cls}`}>{p.label}</span>
                    {r.state === "TODO" && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-700">xəbər veriləcək</span>}
                    {r.state === "NOTIFIED" && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-700">xəbər verilib{r.notice?.times && r.notice.times > 1 ? ` ×${r.notice.times}` : ""}</span>}
                    {r.state === "DELIVERED" && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700">✓ qoşuldu</span>}
                    {r.offers > 0 && r.state !== "DELIVERED" && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white" title="Ödəniş platformada saxlanılır; müddət bitəndə geri qaytarılır">💰 {r.offers} təklif · {r.offerTotal} AZN{r.offerExpiresAt ? ` · ${Math.max(0, Math.ceil((new Date(r.offerExpiresAt).getTime() - Date.now()) / 864e5))} gün` : ""}</span>}
                    {r.requested > 0 && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white" title="İstifadəçi xüsusi olaraq «Adminlər xəbər versin» istəyib">📣 {r.requested} müraciət</span>}
                  </span>
                  <span className="block text-[11.5px] text-muted truncate">@{r.handle}</span>
                  <span className="block text-[12px] mt-1">
                    <b>{r.senders.length}</b> nəfər yazıb: {r.senders.slice(0, 3).map((s) => s.name).join(", ")}{r.senders.length > 3 ? ` +${r.senders.length - 3}` : ""}
                  </span>
                  <span className="block text-[11px] text-muted mt-0.5">
                    {r.offers ? `${r.offers} ödənişli təklif · ` : ""}{r.messages} mesaj{r.consults ? ` · ${r.consults} Rəy sorğusu` : ""}{r.media ? ` · ${r.media} media` : ""} · son: {fmt(r.lastAt)}
                    {r.state === "NOTIFIED" && r.notice?.notifiedAt ? ` · xəbər: ${fmt(r.notice.notifiedAt)}${r.notice.by ? ` (${r.notice.by})` : ""}` : ""}
                    {r.state === "DELIVERED" && r.deliveredTo ? ` · qoşuldu: ${r.deliveredTo.name || `#${r.deliveredTo.id}`} ${fmt(r.deliveredTo.at)}` : ""}
                  </span>
                </span>
                <svg className={`w-5 h-5 text-muted shrink-0 mt-1 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {isOpen && (
                <div className="border-t border-card-border p-4 space-y-3 bg-input-bg/20">
                  {/* Yazanlar */}
                  <div>
                    <p className="id-field-label mb-1.5">Kim yazıb</p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.senders.map((s) => (
                        <span key={s.id} className="px-2.5 py-1 rounded-full bg-card border border-card-border text-xs">
                          <b>{s.name}</b>{s.phone ? <span className="text-muted"> · {s.phone}</span> : null} · {s.count} mesaj
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Addım 1-2: profili aç, hazır mətni kopyala */}
                  <div className="rounded-2xl border border-dashed border-[var(--brand-to)]/40 p-3 bg-card">
                    <p className="id-field-label mb-1.5">Saytın rəsmi {p.label} hesabından göndəriləcək mətn</p>
                    <pre className="text-[13px] whitespace-pre-wrap font-sans leading-relaxed">{notice(r)}</pre>
                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-to)] text-xs font-bold">1 · Profili aç ↗</a>}
                      <button onClick={() => copy(notice(r), "Mətn kopyalandı — profilə DM kimi göndərin")} className="px-3 py-2 text-white text-xs font-bold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]">2 · 📋 Mətni kopyala</button>
                      {r.url && <button onClick={() => copy(r.url!)} className="px-3 py-2 bg-input-bg text-xs font-semibold">🔗 Linki kopyala</button>}
                    </div>
                  </div>

                  {r.previews.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted">Gözləyən mesajlardan nümunə (yalnız yoxlama üçün — göndərilmir)</summary>
                      <ul className="mt-1.5 space-y-1">{r.previews.map((t, i) => <li key={i} className="px-2 py-1 rounded-lg bg-card border border-card-border">«{t}»</li>)}</ul>
                    </details>
                  )}

                  {/* Addım 3: qeyd et */}
                  {r.state !== "DELIVERED" && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input value={note[r.key] || ""} onChange={(e) => setNote((x) => ({ ...x, [r.key]: e.target.value }))}
                        placeholder="Qeyd (istəyə bağlı) — məs. «DM bağlıdır, şərhə yazıldı»"
                        className="flex-1 px-3 py-2.5 bg-card border border-input-border rounded-xl text-sm" />
                      <button onClick={() => markNotified(r)} disabled={busy === r.key}
                        className="px-4 py-2.5 bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">
                        {busy === r.key ? "…" : r.state === "NOTIFIED" ? "3 · ✓ Yenidən xəbər verildi" : "3 · ✓ Xəbər verildi"}
                      </button>
                    </div>
                  )}
                  {r.notice?.note && <p className="text-[11px] text-muted">Son qeyd: {r.notice.note}</p>}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
