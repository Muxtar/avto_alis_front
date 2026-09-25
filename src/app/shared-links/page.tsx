"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

type SharedLink = {
  token: string;
  title: string | null;
  kind: "CART" | "BUNDLE";
  deliveryMode: "SENDER" | "RECIPIENT";
  note: string | null;
  createdAt: string;
  expiresAt: string | null;
  itemCount: number;
  recipient: { id: number; name: string; avatar?: string | null } | null;
  state: "OPEN" | "PAID" | "EXPIRED" | "CANCELLED";
  paidTotal: number | null;
};

const STATE: Record<SharedLink["state"], { label: string; cls: string }> = {
  OPEN: { label: "Açıq", cls: "bg-green-500/10 text-green-600" },
  PAID: { label: "Ödənildi", cls: "bg-blue-500/10 text-blue-600" },
  EXPIRED: { label: "Müddəti bitib", cls: "bg-input-bg text-muted" },
  CANCELLED: { label: "Dayandırılıb", cls: "bg-red-500/10 text-red-600" },
};

const kindLabel = (l: SharedLink) =>
  l.deliveryMode === "SENDER" ? "💳 Başqası ödəsin" : l.kind === "BUNDLE" ? "📋 Paket / resept" : "🛒 Səbət";

const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return "—"; }
};

// Paylaşdığım səbət / paket linkləri — vəziyyət, kopyala, aç, dayandır.
export default function SharedLinksPage() {
  const router = useRouter();
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/me/shared-carts`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setLinks(d?.links || []))
      .catch(() => toast("Siyahı yüklənmədi", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/?next=/shared-links"); return; }
    load();
  }, [authLoading, isLoggedIn, load, router]);

  const copy = async (t: string) => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/shared/${t}`); toast("Link kopyalandı ✓", "success"); }
    catch { toast("Linki kopyalamaq mümkün olmadı", "error"); }
  };

  const cancel = async (t: string) => {
    if (!confirm("Bu link dayandırılsın? Linki açanlar artıq ondan istifadə edə bilməyəcək.")) return;
    setBusy(t);
    try {
      const res = await fetch(`${API}/shared-cart/${t}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success !== false) {
        toast("Link dayandırıldı", "success");
        setLinks((prev) => prev.map((l) => (l.token === t ? { ...l, state: "CANCELLED" } : l)));
      } else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  if (authLoading || (loading && links.length === 0)) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold">🔗 Paylaşdığım linklər / paketlər</h1>
        <Link href="/cart" className="text-xs font-semibold text-orange-500 hover:underline shrink-0">Səbətə keç →</Link>
      </div>
      <p className="text-sm text-muted mb-5">Səbətdən paylaşdığınız linklər və göndərdiyiniz paketlər. Linklər 30 gün etibarlıdır.</p>

      {links.length === 0 ? (
        <div className="surface p-8 text-center">
          <p className="text-muted text-sm mb-3">Hələ heç bir link paylaşmamısınız.</p>
          <Link href="/cart" className="inline-block px-5 py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-orange-500 to-orange-600">Səbətdən paylaş</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((l) => {
            const st = STATE[l.state] || STATE.OPEN;
            return (
              <div key={l.token} className="surface p-4">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-600 text-[11px] font-semibold">{kindLabel(l)}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="font-semibold text-sm truncate">{l.title || `${l.itemCount} məhsul`}</p>
                  </div>
                  {l.state === "PAID" && l.paidTotal != null && (
                    <p className="text-sm font-bold text-green-600 shrink-0">{Number(l.paidTotal).toFixed(2)} AZN</p>
                  )}
                </div>

                <div className="mt-2 text-[12px] text-muted space-y-0.5">
                  {l.recipient && (
                    <p className="flex items-center gap-1.5">
                      {l.recipient.avatar
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={imgUrl(l.recipient.avatar)} alt="" className="w-4 h-4 rounded-full object-cover" />
                        : <span>👤</span>}
                      Kimə: <b className="text-foreground">{l.recipient.name}</b>
                    </p>
                  )}
                  <p>{l.itemCount} məhsul · Yaradılıb: {fmtDate(l.createdAt)} · Bitir: {fmtDate(l.expiresAt)}</p>
                  {l.note && <p className="italic truncate">“{l.note.length > 120 ? `${l.note.slice(0, 120)}…` : l.note}”</p>}
                </div>

                <div className="flex gap-2 mt-3 flex-wrap">
                  <button onClick={() => copy(l.token)} className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 text-xs font-semibold">Linki kopyala</button>
                  <Link href={`/shared/${l.token}`} className="px-3 py-1.5 rounded-lg bg-input-bg border border-input-border text-xs font-semibold">Aç</Link>
                  {l.state === "OPEN" && (
                    <button onClick={() => cancel(l.token)} disabled={busy === l.token}
                      className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 text-xs font-semibold disabled:opacity-50">
                      {busy === l.token ? "…" : "Dayandır"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
