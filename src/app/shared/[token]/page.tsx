"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

/**
 * Paylaşılan ALIŞ linki.
 *
 * SENDER («Başqası ödəsin»): paylaşan hər şeyi əvvəlcədən seçib — məhsullar,
 * çatdırılma növü, ünvan və telefon. Linki açan şəxs HEÇ NƏ seçmir, sadəcə
 * kartla ÖDƏYİR. Ödəyənin saytda hesabı olması TƏLƏB OLUNMUR.
 *
 * RECIPIENT (səbət və ya 📋 paket/resept): linki açan məhsulları ÖZ səbətinə
 * əlavə edir və adi qaydada (öz ünvanı, Yango, kart/nağd) alır. Bunun üçün
 * daxil olmalıdır.
 */
export default function SharedCartPage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const { token, isLoggedIn } = useAuth();
  const { refreshCart } = useCart();
  const { toast } = useToast();
  const shareToken = String(params.token || "");
  const paidParam = search.get("paid");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [paying, setPaying] = useState(false);
  // Ödəyənin məlumatı — qonaq üçün (kim ödədi görünsün). Məcburi deyil.
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  // Ödənişdən qayıdış vəziyyəti
  const [payResult, setPayResult] = useState<{ status: string; orders?: any[] } | null>(null);
  // RECIPIENT: səbətə əlavə olunacaq məhsullar (yalnız mövcud olanlar seçilə bilər)
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    fetch(`${API}/shared-cart/${shareToken}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setPicked(new Set((d?.items || []).filter((i: any) => i.available !== false).map((i: any) => i.id)));
      })
      .catch(() => setData({ success: false }))
      .finally(() => setLoading(false));
  }, [shareToken]);
  useEffect(() => { load(); }, [load]);

  // Ödənişdən qayıtdıqda nəticəni gözlə. Şlüzün callback-i serverə gec çata bilər,
  // ona görə statusu bir müddət POLL edirik (dərhal "uğursuz" yazmayaq).
  useEffect(() => {
    if (!paidParam) return;
    let stop = false;
    (async () => {
      for (let i = 0; i < 15 && !stop; i++) {
        try {
          const d = await fetch(`${API}/shared-cart/${shareToken}/status`).then((r) => r.json());
          if (d?.success && d.status === "PAID") { setPayResult(d); load(); return; }
          if (d?.success && d.status === "FAILED" && i > 3) { setPayResult(d); return; }
        } catch { /* şəbəkə — yenidən cəhd */ }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!stop) setPayResult({ status: paidParam === "success" ? "PENDING" : "FAILED" });
    })();
    return () => { stop = true; };
  }, [paidParam, shareToken, load]);

  const requireLogin = () => {
    if (!isLoggedIn || !token) { toast("Əvvəlcə daxil olun", "info"); router.push(`/?next=/shared/${shareToken}`); return false; }
    return true;
  };

  const togglePick = (id: number) =>
    setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const importToCart = async () => {
    if (!requireLogin()) return;
    if (picked.size === 0) { toast("Ən azı bir məhsul seçin", "error"); return; }
    setImporting(true);
    try {
      const res = await fetch(`${API}/cart/import/${shareToken}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ listingIds: [...picked] }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 410) { toast(d.message || "Bu link artıq aktiv deyil", "error"); load(); return; }
      if (res.ok && d.success) {
        refreshCart();
        const skipped: string[] = d.skipped || [];
        toast(`${d.added} məhsul səbətə əlavə olundu${skipped.length ? ` · əlavə olunmadı: ${skipped.join(", ")}` : ""}`, "success");
        router.push("/cart");
      } else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setImporting(false); }
  };

  // ── Qonaq ödənişi (yalnız SENDER): hesab tələb olunmur ──
  const payNow = async () => {
    setPaying(true);
    try {
      const res = await fetch(`${API}/shared-cart/${shareToken}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ payerName: payerName.trim(), payerPhone: payerPhone.trim() }),
      });
      const d = await res.json();
      if (res.ok && d.success && d.paymentUrl) {
        // Ödənişdən sonra bank /payment/return-ə qaytarır; oradan bu səhifəyə
        // qayıda bilməsi üçün tokeni saxlayırıq (qonağın /orders səhifəsi yoxdur).
        try { sessionStorage.setItem("sharedPayToken", shareToken); } catch { /* bloklanıb */ }
        window.location.href = d.paymentUrl;
        return;
      }
      toast(d.message || "Ödəniş başladıla bilmədi", "error");
    } catch { toast("Xəta", "error"); } finally { setPaying(false); }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!data?.success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-muted mb-4">Bu paylaşılan link tapılmadı və ya silinib.</p>
        <Link href="/elanlar" className="text-orange-500 font-medium">← Bazara qayıt</Link>
      </div>
    );
  }

  // ── Ödənişdən qayıdış nəticəsi ──
  if (payResult) {
    const ok = payResult.status === "PAID";
    const pending = payResult.status === "PENDING";
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl ${ok ? "bg-green-500/10" : pending ? "bg-amber-500/10" : "bg-red-500/10"}`}>
          {ok ? "✅" : pending ? "⏳" : "❌"}
        </div>
        <h1 className="text-xl font-bold mb-2">{ok ? "Ödəniş alındı" : pending ? "Ödəniş yoxlanılır" : "Ödəniş alınmadı"}</h1>
        <p className="text-sm text-muted mb-5">
          {ok
            ? <>Təşəkkürlər! Sifariş verildi və <b>{data.recipient?.name || data.by?.name}</b> adına göndəriləcək. Satıcı təsdiqlədikdən sonra çatdırılma başlayır.</>
            : pending
              ? "Bankdan təsdiq gözlənilir. Bu səhifəni bir neçə dəqiqədən sonra yeniləyə bilərsiniz."
              : "Ödəniş tamamlanmadı. Yenidən cəhd edə bilərsiniz."}
        </p>
        {ok && payResult.orders?.length ? (
          <p className="text-xs text-muted mb-5">Sifariş nömrəsi: {payResult.orders.map((o: any) => `#${o.id}`).join(", ")}</p>
        ) : null}
        {!ok && (
          <button onClick={() => { setPayResult(null); router.replace(`/shared/${shareToken}`); }}
            className="px-5 py-2.5 rounded-xl text-white font-semibold" style={{ background: "var(--brand-to)" }}>
            Yenidən cəhd et
          </button>
        )}
        <div className="mt-4"><Link href="/elanlar" className="text-sm text-muted hover:text-foreground">tradixai-a bax →</Link></div>
      </div>
    );
  }

  const isSender = data.deliveryMode === "SENDER";
  const isBundle = data.kind === "BUNDLE";
  const closed: string | null = data.closed || null;
  const delivery = data.delivery;
  const recipientName = data.recipient?.name || data.by?.name;
  const items: any[] = data.items || [];
  const availableItems = items.filter((i) => i.available !== false);
  const pickedTotal = items.filter((i) => picked.has(i.id)).reduce((s, i) => s + Number(i.price || 0) * (i.quantity || 1), 0);
  const deliveryLabel = !delivery ? null
    : delivery.type === "PICKUP" ? "🏪 Mağazadan götürmə"
      : delivery.method === "SELF" ? "🚚 Satıcı özü çatdırır"
        : "🚕 Yango kuryeri";

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6">
      {isBundle ? (
        <h1 className="text-lg sm:text-xl font-bold mb-2">
          📋 {data.by?.name || "Bir istifadəçi"}{data.by?.profession ? ` (${data.by.profession})` : ""} sizin üçün məhsul paketi hazırlayıb
        </h1>
      ) : (
        <h1 className="text-xl sm:text-2xl font-bold mb-1">
          {isSender ? "💳 Ödəniş" : "🛒 Paylaşılan səbət"}
        </h1>
      )}
      <p className="text-sm text-muted mb-4">
        {!isBundle && data.by?.name ? <><b>{data.by.name}</b> bu alışı sizinlə paylaşıb. </> : ""}
        {isSender
          ? "Siz yalnız ödəyirsiniz — hesab açmağa ehtiyac yoxdur. Çatdırılma paylaşan tərəfindən seçilib."
          : "Məhsulları öz səbətinizə əlavə edin və adi qaydada — öz ünvanınızla, istədiyiniz çatdırılma və ödəniş üsulu ilə — alın."}
      </p>
      {data.title && <p className="text-sm font-medium mb-3">“{data.title}”</p>}

      {closed && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600">
          <p className="font-bold text-sm">⛔ Bu link artıq aktiv deyil</p>
          <p className="text-sm mt-0.5">{closed}</p>
        </div>
      )}

      {data.paid && (
        <div className="mb-4 p-3 rounded-xl bg-green-500/10 text-green-600 text-sm font-medium">
          ✅ Bu link artıq ödənilib — sifariş verilib.
        </div>
      )}

      {data.note && (
        <div className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <p className="text-[11px] font-semibold text-orange-600 mb-0.5">📝 {data.by?.name ? `${data.by.name}-ın qeydi` : "Qeyd"}</p>
          <p className="text-sm whitespace-pre-wrap">{data.note}</p>
        </div>
      )}

      {items.length ? (
        <>
          <div className="space-y-2 mb-4">
            {items.map((it: any) => {
              const unavailable = it.available === false;
              const canPick = !isSender && !closed && !unavailable;
              return (
                <div key={it.id} className={`surface p-3 ${unavailable ? "opacity-60" : ""}`}>
                  <div className="flex gap-3 items-center">
                    {!isSender && (
                      <input type="checkbox" checked={picked.has(it.id)} disabled={!canPick} onChange={() => togglePick(it.id)}
                        className="w-4 h-4 accent-orange-500 shrink-0 disabled:cursor-not-allowed" />
                    )}
                    <Link href={`/marketplace/${it.id}`} className={`w-16 h-16 bg-input-bg rounded-xl shrink-0 overflow-hidden flex items-center justify-center ${unavailable ? "grayscale" : ""}`}>
                      {it.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.images[0].startsWith("http") ? it.images[0] : `${imgUrl(it.images[0])}`} alt={it.title} className="w-full h-full object-cover" />
                      ) : null}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/marketplace/${it.id}`} className="font-medium text-sm hover:text-orange-500 block truncate">{it.title}</Link>
                      <p className="text-[11px] text-muted">{it.user?.name} · {it.quantity} ədəd</p>
                      {unavailable && (
                        <p className="text-[11px] text-red-500 font-semibold mt-0.5">⚠️ {it.unavailableReason || "Hazırda alına bilməz"}</p>
                      )}
                      {it.priceChanged && it.sharedPrice != null && (
                        <p className="text-[11px] text-amber-600 mt-0.5">Qiymət dəyişib: əvvəl {Number(it.sharedPrice).toFixed(2)} AZN, indi {Number(it.price).toFixed(2)} AZN</p>
                      )}
                    </div>
                    <p className={`font-bold text-sm shrink-0 ${unavailable ? "text-muted line-through" : "text-orange-500"}`}>{(Number(it.price || 0) * (it.quantity || 1)).toFixed(2)} AZN</p>
                  </div>
                  {it.note && (
                    <p className="mt-2 text-[12px] px-2.5 py-1.5 rounded-lg bg-input-bg border border-input-border whitespace-pre-wrap">💊 İstifadə: {it.note}</p>
                  )}
                </div>
              );
            })}
          </div>

          {isSender ? (
            <>
              <div className="surface p-4 flex items-center justify-between mb-4">
                <span className="font-semibold">Ödəniləcək məbləğ</span>
                <span className="text-orange-500 font-bold text-lg">{Number(data.total || 0).toFixed(2)} AZN</span>
              </div>

              {/* Çatdırılma paylaşan tərəfindən seçilib — ödəyən dəyişə bilmir */}
              <div className="surface p-4 mb-3 space-y-1">
                <p className="text-sm font-semibold">📦 Kimə gedir</p>
                <p className="text-sm">{recipientName || "—"}</p>
                {deliveryLabel && <p className="text-sm mt-1">{deliveryLabel}</p>}
                {delivery?.type !== "PICKUP" && (
                  <p className="text-sm text-muted">{[delivery?.city, delivery?.address].filter(Boolean).join(", ") || "—"}</p>
                )}
                {delivery?.phone && <p className="text-sm text-muted">📞 {delivery.phone}</p>}
                {delivery?.type === "DELIVERY" && delivery?.method === "COURIER" && (
                  <p className="text-[11px] text-amber-600 mt-1">Çatdırılma haqqı (Yango) ödəniş zamanı əlavə olunur.</p>
                )}
                <p className="text-[11px] text-muted mt-2">Siz yalnız ödəyirsiniz — çatdırılmanı paylaşan seçib.</p>
              </div>

              <div className="surface p-4 mb-3 space-y-2">
                <p className="text-sm font-semibold">Sizin adınız <span className="text-muted font-normal">(istəyə bağlı)</span></p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Ad, soyad" disabled={!!closed}
                    className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm" />
                  <input value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} placeholder="Telefon" inputMode="tel" disabled={!!closed}
                    className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm" />
                </div>
                <p className="text-[11px] text-muted">Ödənişi kimin etdiyi {recipientName || "alıcı"}ya bildirilsin deyə.</p>
              </div>
              <button onClick={payNow} disabled={paying || data.paid || !!closed || data.payable === false}
                className="w-full py-3.5 text-white rounded-xl font-bold text-[15px] disabled:opacity-50"
                style={{ background: "var(--brand-to)" }}>
                {paying ? "Ödəniş pəncərəsi açılır…" : `💳 ${Number(data.total || 0).toFixed(2)} AZN ödə`}
              </button>
              <p className="text-[11px] text-muted text-center mt-2">
                Ödəniş bank səhifəsində aparılır. Kart məlumatlarınız tradixai-a ötürülmür.
              </p>
            </>
          ) : (
            <>
              <div className="surface p-4 flex items-center justify-between mb-4">
                <span className="font-semibold">Seçilmiş məhsullar ({picked.size}/{availableItems.length})</span>
                <span className="text-orange-500 font-bold text-lg">{pickedTotal.toFixed(2)} AZN</span>
              </div>
              <button onClick={importToCart} disabled={importing || !!closed || picked.size === 0}
                className="w-full py-3.5 text-white rounded-xl font-bold text-[15px] disabled:opacity-50"
                style={{ background: "var(--brand-to)" }}>
                {importing ? "Əlavə olunur…" : "🛒 Hamısını səbətimə əlavə et"}
              </button>
              <p className="text-[11px] text-muted text-center mt-2">
                {isLoggedIn ? "Səbətdə öz ünvanınızı, çatdırılmanı və ödəniş üsulunu seçəcəksiniz." : "Səbətə əlavə etmək üçün daxil olmalısınız."}
              </p>
            </>
          )}
        </>
      ) : (
        <p className="text-muted text-center py-10">Bu linkdə aktiv məhsul qalmayıb.</p>
      )}
    </div>
  );
}
