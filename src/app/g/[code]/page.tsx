"use client";
// BİRGƏ ALIŞ səhifəsi — /g/<code>
//
// Linki alan bu səhifəni açır: məhsul, qrupun hazırkı sayı, hazırkı qiymət və
// növbəti pilləyə nə qədər qaldığı. «Qoşul» düyməsi məhsulu səbətə QRUP SƏTRİ
// kimi əlavə edir (adi sətirlə birləşmir) — ona görə kimin neçə ədəd aldığı
// düzgün qruplaşır və endirim yalnız bu link üzərindən alanlara işləyir.
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { API, imgUrl } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { useToast } from "@/components/Toast";
import { useLive } from "@/lib/live";

export default function GroupBuyPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [g, setG] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`${API}/group-buy/${params.code}`).then((x) => x.json());
      if (r?.success) setG(r.group);
      else setG(null);
    } catch { /* şəbəkə */ } finally { if (!silent) setLoading(false); }
  }, [params.code]);

  useEffect(() => { load(); }, [load]);
  // Kimsə qoşulanda say/qiymət dərhal yenilənsin.
  useLive(["order"], () => load(true));

  const join = async () => {
    if (!isLoggedIn) { toast("Qoşulmaq üçün daxil olun", "error"); router.push("/"); return; }
    setBusy(true);
    const r = await addToCart(g.listing.id, qty, g.code);
    setBusy(false);
    if (!r.success) { toast(r.message || "Xəta", "error"); return; }
    toast("Səbətə əlavə olundu ✓", "success");
    router.push("/cart");
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!g) {
    return (
      <div className="page-wrap py-16 text-center">
        <p className="text-lg font-semibold">Birgə alış tapılmadı</p>
        <p className="text-muted text-sm mt-1">Link səhvdir və ya alış bağlanıb.</p>
        <Link href="/elanlar" className="inline-block mt-4 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold">Elanlara bax</Link>
      </div>
    );
  }

  const p = g.pricing;
  const closed = g.status !== "OPEN";
  const isOwnListing = user?.id === g.listing.seller?.id;
  // Növbəti pilləyə qədər dolum (vizual zolaq).
  const target = p.nextTier?.minQty || p.bestQty || Math.max(1, g.totalQty);
  const progress = Math.min(100, Math.round((g.totalQty / target) * 100));

  return (
    <div className="page-wrap py-6 max-w-3xl">
      <div className="surface overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500/15 to-fuchsia-500/10 border-b border-card-border">
          <p className="text-sm font-bold">👥 Birgə alış</p>
          <p className="text-xs text-muted mt-0.5">
            {g.creator?.name ? `${g.creator.name} başlatdı · ` : ""}
            link ilə alanların sayı toplanır, qiymət hamıya düşür
          </p>
        </div>

        <div className="p-5 flex gap-4 flex-wrap sm:flex-nowrap">
          {g.listing.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgUrl(g.listing.images[0])} alt={g.listing.title} className="w-28 h-28 rounded-xl object-cover shrink-0" />
          ) : <div className="w-28 h-28 rounded-xl bg-input-bg shrink-0" />}
          <div className="min-w-0 flex-1">
            <Link href={`/marketplace/${g.listing.id}`} className="font-bold hover:text-orange-500 line-clamp-2">{g.listing.title}</Link>
            <p className="text-xs text-muted mt-0.5">Satıcı: {g.listing.businessObject?.name || g.listing.seller?.name}</p>
            <div className="mt-2 flex items-end gap-2 flex-wrap">
              <span className="text-2xl font-extrabold text-orange-500">{p.unitPrice} AZN</span>
              {p.unitPrice < p.basePrice && <span className="text-sm text-muted line-through">{p.basePrice} AZN</span>}
              {p.discountPercent > 0 && <span className="px-2 py-0.5 rounded-lg bg-green-500/10 text-green-600 text-xs font-bold">−{p.discountPercent}%</span>}
            </div>
          </div>
        </div>

        {/* Dolum zolağı + növbəti pillə */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold">Qrupda {g.totalQty} ədəd</span>
            {p.nextTier
              ? <span className="text-muted">Daha {p.nextTier.need} ədəd → {p.nextTier.price} AZN</span>
              : <span className="text-green-600 font-semibold">Ən yaxşı qiymət əldə olunub 🎉</span>}
          </div>
          <div className="h-2.5 rounded-full bg-input-bg overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-fuchsia-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 text-[11px] text-muted">
            {closed ? "Bu birgə alış bağlanıb — yeni qoşulma mümkün deyil."
              : `Bitmə vaxtı: ${new Date(g.expiresAt).toLocaleString("az-AZ")}`}
          </div>
        </div>

        {/* Say-qiymət cədvəli */}
        {g.tiers?.length > 0 && (
          <div className="px-5 pb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted mb-1.5">Say-qiymət cədvəli</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {g.tiers.map((tr: any) => (
                <div key={tr.minQty} className={`rounded-xl border p-2 text-center ${g.totalQty >= tr.minQty ? "border-green-500/40 bg-green-500/5" : "border-card-border"}`}>
                  <p className="text-[11px] text-muted">{tr.minQty} ədəddən</p>
                  <p className="text-sm font-bold">{tr.price} AZN</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-1.5">Aralıq saylarda qiymət avtomatik hesablanır.</p>
          </div>
        )}

        {/* Qoşulma */}
        {!closed && !isOwnListing && (
          <div className="px-5 py-4 border-t border-card-border">
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 rounded-lg bg-input-bg border border-input-border">−</button>
              <span className="flex-1 text-center font-semibold">{qty} ədəd</span>
              <button onClick={() => setQty(Math.min(g.listing.stock || 999, qty + 1))} className="w-9 h-9 rounded-lg bg-input-bg border border-input-border">+</button>
            </div>
            <button onClick={join} disabled={busy}
              className="w-full py-3 rounded-2xl cta-gradient font-bold text-[15px] disabled:opacity-50">
              {busy ? "..." : `Qrupa qoşul — ${qty} ədəd`}
            </button>
            <p className="text-[11px] text-muted mt-2 text-center">
              Qrup böyüdükcə qiymət düşür. Sizdən əvvəl alanlara fərq avtomatik qaytarılır.
            </p>
          </div>
        )}

        {/* İştirakçılar */}
        <div className="px-5 py-4 border-t border-card-border">
          <p className="text-xs font-bold uppercase tracking-wide text-muted mb-2">İştirakçılar ({g.participants.length})</p>
          {g.participants.length === 0 ? (
            <p className="text-sm text-muted">Hələ heç kim qoşulmayıb — ilk siz olun.</p>
          ) : (
            <div className="space-y-2">
              {g.participants.map((pt: any) => (
                <div key={pt.orderId} className="flex items-center gap-2.5">
                  {pt.user.avatar
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={imgUrl(pt.user.avatar)} alt="" className="w-8 h-8 rounded-full object-cover" />
                    : <span className="w-8 h-8 rounded-full bg-input-bg flex items-center justify-center text-xs font-bold">{(pt.user.name || "?").slice(0, 1).toUpperCase()}</span>}
                  <span className="text-sm font-medium truncate flex-1">{pt.user.name}</span>
                  <span className="text-xs text-muted shrink-0">{pt.quantity} ədəd</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linki paylaş */}
        <div className="px-5 py-4 border-t border-card-border">
          <p className="text-xs text-muted mb-1.5">Daha çox adam qoşulsa qiymət daha da düşür — linki paylaşın:</p>
          <div className="flex items-center gap-2">
            <input readOnly value={typeof window !== "undefined" ? window.location.href : ""} className="flex-1 min-w-0 px-3 py-2 bg-input-bg border border-input-border rounded-xl text-xs" />
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast("Kopyalandı ✓", "success"); }}
              className="shrink-0 px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold">Kopyala</button>
          </div>
        </div>
      </div>
    </div>
  );
}
