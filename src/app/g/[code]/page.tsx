"use client";
// BİRGƏ ALIŞ PƏNCƏRƏSİ — /g/<code>
//
// Pəncərə AVTOMATİK açılır: elanda birgə alış aktivdirsə ilk sifariş geri
// sayımı başladır. Bu səhifə həmin pəncərənin tam mənzərəsidir — nə qədər
// vaxt qalıb, indiyə qədər neçə ədəd alınıb, gözlənilən qiymət və iştirakçılar.
// «Qoşul» sadəcə məhsulu səbətə atır: sifariş verilən anda server onu açıq
// pəncərəyə özü bağlayır.
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
  const [nowTs, setNowTs] = useState(() => Date.now());

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
  // Geri sayım saniyədə bir yenilənir.
  useEffect(() => { const iv = setInterval(() => setNowTs(Date.now()), 1000); return () => clearInterval(iv); }, []);

  const join = async () => {
    if (!isLoggedIn) { toast("Qoşulmaq üçün daxil olun", "error"); router.push("/"); return; }
    setBusy(true);
    const r = await addToCart(g.listing.id, qty);
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
  // «2 gün 04:12:33» formatında qalan vaxt.
  const left = (() => {
    const ms = new Date(g.expiresAt).getTime() - nowTs;
    if (ms <= 0) return "bitdi";
    const t = Math.floor(ms / 1000);
    const d = Math.floor(t / 86400);
    const pad = (n: number) => String(n).padStart(2, "0");
    const hhmmss = `${pad(Math.floor((t % 86400) / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
    return d > 0 ? `${d} gün ${hhmmss}` : hhmmss;
  })();
  const isOwnListing = user?.id === g.listing.seller?.id;
  // Növbəti pilləyə qədər dolum (vizual zolaq).
  const target = p.nextTier?.minQty || p.bestQty || Math.max(1, g.totalQty);
  const progress = Math.min(100, Math.round((g.totalQty / target) * 100));

  return (
    <div className="page-wrap py-6 max-w-3xl">
      <div className="surface overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-orange-500/15 to-fuchsia-500/10 border-b border-card-border">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-bold">👥 Birgə alış pəncərəsi</p>
            {!closed && (
              <span className="px-2 py-1 rounded-lg bg-orange-500/15 text-orange-600 text-xs font-extrabold tabular-nums">
                ⏳ {left}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">
            {g.creator?.name ? `${g.creator.name} başlatdı · ` : ""}
            {g.windowDays} günlük pəncərədə alanların sayı toplanır, endirim hamıya verilir
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
              <span className="text-2xl font-extrabold">{g.fullPrice} AZN</span>
              <span className="text-xs text-muted">indi ödənilir</span>
            </div>
            <div className="mt-1 text-sm">
              {g.settledAt ? (
                <span className="text-green-600 font-semibold">Hesablaşdı: son qiymət {g.finalUnitPrice} AZN — fərq qaytarıldı ✓</span>
              ) : (
                <>
                  <span className="text-orange-600 font-semibold">Gözlənilən qiymət: {p.unitPrice} AZN</span>
                  {p.discountPercent > 0 && <span className="ml-2 px-2 py-0.5 rounded-lg bg-green-500/10 text-green-600 text-xs font-bold">−{p.discountPercent}%</span>}
                </>
              )}
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
            {closed ? "Bu pəncərə bağlanıb — yeni alış təzə pəncərə başladır."
              : `Pəncərə bitir: ${new Date(g.expiresAt).toLocaleString("az-AZ")}`}
            {!g.settledAt && g.settleEta && (
              <> · Endirim hesablanması: <b>{new Date(g.settleEta).toLocaleDateString("az-AZ")}</b></>
            )}
          </div>

          {/* Necə işləyir — fırıldağın qarşısını alan qayda açıq yazılır. */}
          <div className="mt-3 rounded-xl bg-input-bg/60 border border-card-border p-3 text-[11px] leading-relaxed">
            <p className="font-semibold text-foreground mb-1">Necə işləyir</p>
            <p>1. İlk alıcı sifariş verəndə <b>{g.windowDays} günlük</b> pəncərə açılır — geri sayımı bu elanı açan hər kəs görür.</p>
            <p>2. Pəncərə boyu hər iştirakçı indi <b>tam qiyməti</b> ({g.fullPrice} AZN) ödəyir. Nə qədər çox alınsa, qiymət hamı üçün bir o qədər ucuz olur.</p>
            <p>3. Pəncərə bitəndən sonra <b>{g.returnWindowDays} gün</b> qaytarma müddəti gözlənilir (məhsul mağazaya təhvil verilir, satıcı təsdiqləyir).</p>
            <p>4. Həmin müddət bitəndə məhsulu <b>saxlayanların</b> sayına görə son qiymət hesablanır və fərq hər kəsin kartına qaytarılır.</p>
            <p className="text-muted mt-1">Qaytaran şəxs qrupdan çıxır — onun sayı endirimə daxil edilmir. Pəncərə bağlanandan sonra növbəti alıcı təzə pəncərə başladır.</p>
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
              {busy ? "..." : `Qrupa qoşul — ${qty} ədəd · ${(g.fullPrice * qty).toFixed(0)} AZN`}
            </button>
            <p className="text-[11px] text-muted mt-2 text-center">
              İndi {g.fullPrice} AZN ödəyirsiniz. Endirim pəncərə bitib {g.returnWindowDays} günlük qaytarma
              müddəti keçəndən sonra kartınıza qaytarılır. Ödəniş yalnız kartla.
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
                  <span className="text-xs text-muted shrink-0">
                    {pt.quantity} ədəd{pt.returned > 0 ? ` · ${pt.returned} qaytarıldı` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linki paylaş */}
        <div className="px-5 py-4 border-t border-card-border">
          <p className="text-xs text-muted mb-1.5">Daha çox adam alsa qiymət hamı üçün düşür — bu səhifəni paylaşın:</p>
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
