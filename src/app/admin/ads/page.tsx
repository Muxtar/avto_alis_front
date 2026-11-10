"use client";
// Admin — istifadəçilərin ödənişli ana səhifə reklamları.
// Ödənilmiş reklam yoxlamaya düşür: təsdiq → yayım (müddət indi başlayır),
// rədd → istifadəçiyə səbəb + pul qaytarılmalıdır (bankdan əl ilə, sonra «Qaytarıldı»).
import { useEffect, useState } from "react";
import { API, imgUrl } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useAdminLive } from "@/lib/live";

const TABS = [
  { key: "PENDING_REVIEW", label: "Yoxlamada" },
  { key: "ACTIVE", label: "Yayımda" },
  { key: "REFUND", label: "Pul qaytarılmalı" },
  { key: "REJECTED", label: "Rədd edilib" },
  { key: "EXPIRED", label: "Bitib" },
];
const img = (s: string | null | undefined) => (!s ? "" : /^(https?:|data:)/.test(s) ? s : imgUrl(s));
const d = (s: string | null) => (s ? new Date(s).toLocaleString("az-AZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default function AdminAdsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState("PENDING_REVIEW");
  const [ads, setAds] = useState<any[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = (t = tab) => {
    fetch(`${API}/admin/ads?status=${t}`, { headers })
      .then((r) => r.json()).then((x) => { if (x.success) { setAds(x.ads); setCounts(x.counts || {}); } else setAds([]); })
      .catch(() => setAds([]));
  };
  useEffect(() => { setAds(null); load(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useAdminLive(["ad"], () => load());

  const act = async (id: number, action: "approve" | "reject" | "refunded") => {
    let body: any = {};
    if (action === "reject") {
      const reason = window.prompt("Rədd səbəbi (istifadəçiyə göndəriləcək):", "Reklam qaydalarına uyğun deyil");
      if (!reason) return;
      body = { reason };
    }
    if (action === "refunded" && !window.confirm("Pul bankdan istifadəçiyə qaytarılıb?")) return;
    setBusy(id);
    try {
      const r = await fetch(`${API}/admin/ads/${id}/${action}`, { method: "POST", headers, body: JSON.stringify(body) }).then((x) => x.json());
      if (!r.success) { toast(r.message || "Alınmadı", "error"); return; }
      toast(action === "approve" ? "Reklam yayımlandı ✓" : action === "reject" ? "Rədd edildi" : "Qeyd edildi ✓", "success");
      load();
    } catch { toast("Alınmadı", "error"); } finally { setBusy(null); }
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold">📣 İstifadəçi reklamları</h1>
        <p className="text-muted text-xs mt-1">Ana səhifə karuseli və yan bannerdə ödənişli reklamlar. Qiymətlər və slot sayı: Tənzimləmələr → «Ana səhifə reklamı».</p>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${tab === t.key ? "bg-orange-500 text-white border-orange-500" : "bg-card border-card-border hover:border-orange-500/50"}`}>
            {t.label}{counts[t.key] ? <span className="ml-1.5 opacity-80">({counts[t.key]})</span> : null}
          </button>
        ))}
      </div>

      {ads === null ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : ads.length === 0 ? (
        <p className="text-sm text-muted text-center py-12">Burada reklam yoxdur.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {ads.map((a) => (
            <div key={a.id} className="bg-card border border-card-border rounded-xl overflow-hidden">
              <div className="relative aspect-[16/7] bg-[#140f3a]">
                {(a.image || a.listing?.images?.[0]) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img(a.image || a.listing?.images?.[0])} alt="" className="absolute inset-0 w-full h-full object-contain" />
                )}
                <span className="absolute top-2 left-2 rounded-full bg-black/60 text-white px-2 py-0.5 text-[11px] font-semibold">
                  {a.placement === "MAIN" ? "Ana karusel" : "Yan banner"} · {a.sellerKind === "BUSINESS" ? "Sahibkar" : "Fərdi"}
                </span>
              </div>
              <div className="p-3.5 space-y-1.5">
                <p className="font-semibold">{a.headline}</p>
                {a.subtitle && <p className="text-xs text-muted">{a.subtitle}</p>}
                <p className="text-xs">
                  {a.sourceType === "LISTING"
                    ? <a className="text-orange-500 hover:underline" href={`/marketplace/${a.listingId}`} target="_blank" rel="noreferrer">📦 {a.listing?.title || `Elan #${a.listingId}`}</a>
                    : <a className="text-orange-500 hover:underline" href={`/object/${a.objectId}`} target="_blank" rel="noreferrer">🏢 {a.object?.name || `Obyekt #${a.objectId}`}</a>}
                </p>
                <p className="text-xs text-muted">
                  👤 {a.user?.name || "—"} · {a.user?.phone} · {a.days} gün · <b>{a.amount > 0 ? `${a.amount.toFixed(2)} AZN` : "Pulsuz"}</b>
                </p>
                <p className="text-[11px] text-muted">
                  Yaradılıb: {d(a.createdAt)}{a.startsAt ? ` · Başladı: ${d(a.startsAt)}` : ""}{a.endsAt ? ` · Bitir: ${d(a.endsAt)}` : ""}
                  {a.status !== "PENDING_REVIEW" && ` · 👁 ${a.impressions} · 👆 ${a.clicks}`}
                </p>
                {a.rejectReason && <p className="text-xs text-red-500">Səbəb: {a.rejectReason}</p>}
                <div className="flex gap-2 pt-1.5">
                  {a.status === "PENDING_REVIEW" && (
                    <button disabled={busy === a.id} onClick={() => act(a.id, "approve")} className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60">✓ Təsdiqlə</button>
                  )}
                  {(a.status === "PENDING_REVIEW" || a.status === "ACTIVE") && (
                    <button disabled={busy === a.id} onClick={() => act(a.id, "reject")} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-500/10 text-red-500 border border-red-500/30 disabled:opacity-60">
                      {a.status === "ACTIVE" ? "Dayandır" : "Rədd et"}
                    </button>
                  )}
                  {a.refundStatus === "PENDING" && (
                    <button disabled={busy === a.id} onClick={() => act(a.id, "refunded")} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/30 disabled:opacity-60">💸 Pul qaytarıldı</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
