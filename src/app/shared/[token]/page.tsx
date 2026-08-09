"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import LocationPicker from "@/components/LocationPickerWrapper";

/**
 * Paylaşılan ALIŞ linki.
 *
 * Əsas rejim (payable): paylaşan hər şeyi əvvəlcədən seçib — məhsullar və
 * çatdırılma ünvanı. Linki açan şəxs HEÇ NƏ seçmir, sadəcə ÖDƏYİR və sifariş
 * verilir. Ödəyənin saytda hesabı olması TƏLƏB OLUNMUR — link hamıya açıqdır.
 * Məhsul isə həmişə qeydiyyatlı şəxsə gedir (paylaşanın özünə və ya onun
 * seçdiyi qeydiyyatlı dosta).
 *
 * Köhnə rejim (RECIPIENT): linki alan öz ünvanını seçib nağd sifariş verir —
 * əvvəl yaradılmış linklər işləməyə davam etsin deyə saxlanılıb.
 */
export default function SharedCartPage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const shareToken = String(params.token || "");
  const paidParam = search.get("paid");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  // Ödəyənin məlumatı — qonaq üçün (kim ödədi görünsün). Məcburi deyil.
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  // Ödənişdən qayıdış vəziyyəti
  const [payResult, setPayResult] = useState<{ status: string; orders?: any[] } | null>(null);
  // Alıcının öz ünvanı (köhnə RECIPIENT rejimində)
  const [recLoc, setRecLoc] = useState<{ city: string; address: string; latitude: number | null; longitude: number | null }>({ city: "", address: "", latitude: null, longitude: null });
  const [recPhone, setRecPhone] = useState("");

  const load = useCallback(() => {
    fetch(`${API}/shared-cart/${shareToken}`)
      .then((r) => r.json())
      .then((d) => setData(d))
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

  const importToCart = async () => {
    if (!requireLogin()) return;
    setImporting(true);
    try {
      const res = await fetch(`${API}/cart/import/${shareToken}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (res.ok && d.success) { toast(`${d.added} məhsul səbətə əlavə olundu`, "success"); router.push("/cart"); }
      else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setImporting(false); }
  };

  const isSender = data?.deliveryMode === "SENDER";

  // ── Qonaq ödənişi: hesab tələb olunmur, birbaşa ödəniş pəncərəsinə keçir ──
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

  const checkout = async () => {
    if (!requireLogin()) return;
    if (!recLoc.address.trim()) { toast("Çatdırılma ünvanınızı seçin", "error"); return; }
    setChecking(true);
    try {
      const body = { address: recLoc.address, city: recLoc.city, latitude: recLoc.latitude, longitude: recLoc.longitude, phone: recPhone };
      const res = await fetch(`${API}/shared-cart/${shareToken}/checkout`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json();
      if (res.ok && d.success) { toast("Sifariş verildi ✓ (nağd ödəniş)", "success"); router.push("/orders?tab=buying"); }
      else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setChecking(false); }
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

  const addr = data.deliveryAddress;
  const recipientName = data.recipient?.name || data.by?.name;
  // Paylaşan hər şeyi seçib → linki açan yalnız ödəyir (hesab tələb olunmur).
  const directPay = !!data.payable;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">
        {directPay ? "💳 Ödəniş" : "🛒 Paylaşılan səbət"}
      </h1>
      <p className="text-sm text-muted mb-4">
        {data.by?.name ? <><b>{data.by.name}</b> bu alışı sizinlə paylaşıb. </> : ""}
        {directPay
          ? "Siz yalnız ödəyirsiniz — hesab açmağa ehtiyac yoxdur. Məhsullar aşağıdakı ünvana göndəriləcək."
          : isSender
            ? "Ödədikdən sonra məhsullar göndərənin ünvanına çatdırılacaq."
            : "Ödəyib öz ünvanınıza sifariş verə bilərsiniz."}
      </p>
      {data.title && <p className="text-sm font-medium mb-3">“{data.title}”</p>}

      {data.paid && (
        <div className="mb-4 p-3 rounded-xl bg-green-500/10 text-green-600 text-sm font-medium">
          ✅ Bu link artıq ödənilib — sifariş verilib.
        </div>
      )}

      {data.items?.length ? (
        <>
          <div className="space-y-2 mb-4">
            {data.items.map((it: any) => (
              <div key={it.id} className="surface p-3 flex gap-3 items-center">
                <Link href={`/marketplace/${it.id}`} className="w-16 h-16 bg-input-bg rounded-xl shrink-0 overflow-hidden flex items-center justify-center">
                  {it.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.images[0].startsWith("http") ? it.images[0] : `${imgUrl(it.images[0])}`} alt={it.title} className="w-full h-full object-cover" />
                  ) : null}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/marketplace/${it.id}`} className="font-medium text-sm hover:text-orange-500 block truncate">{it.title}</Link>
                  <p className="text-[11px] text-muted">{it.user?.name} · {it.quantity} ədəd</p>
                </div>
                <p className="text-orange-500 font-bold text-sm">{(it.price * it.quantity).toFixed(2)} AZN</p>
              </div>
            ))}
          </div>
          <div className="surface p-4 flex items-center justify-between mb-4">
            <span className="font-semibold">Ödəniləcək məbləğ</span>
            <span className="text-orange-500 font-bold text-lg">{Number(data.total || 0).toFixed(2)} AZN</span>
          </div>

          {isSender ? (
            /* Ünvan paylaşan tərəfindən seçilib — ödəyən dəyişə bilmir */
            <div className="surface p-4 mb-3">
              <p className="text-sm font-semibold mb-1">📦 Kimə gedir</p>
              <p className="text-sm">{recipientName || "—"}</p>
              <p className="text-sm text-muted mt-1">
                {[addr?.city, addr?.address].filter(Boolean).join(", ") || "—"}{addr?.phone ? ` · 📞 ${addr.phone}` : ""}
              </p>
              <p className="text-[11px] text-muted mt-2">Siz yalnız ödəyirsiniz — məhsullar bu ünvana göndərilir.</p>
            </div>
          ) : (
            /* Köhnə rejim: linki alan öz ünvanını seçir */
            <div className="surface p-4 mb-3 space-y-2">
              <p className="text-sm font-semibold">📍 Çatdırılma ünvanınız</p>
              <input value={recPhone} onChange={(e) => setRecPhone(e.target.value)} placeholder="Telefonunuz" className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm" />
              <LocationPicker city={recLoc.city} address={recLoc.address} latitude={recLoc.latitude} longitude={recLoc.longitude} onChange={(n: any) => setRecLoc(n)} height="220px" />
            </div>
          )}

          {directPay ? (
            <>
              {/* Ödəyənin adı — sifarişdə "kim ödədi" görünsün deyə. Məcburi deyil. */}
              <div className="surface p-4 mb-3 space-y-2">
                <p className="text-sm font-semibold">Sizin adınız <span className="text-muted font-normal">(istəyə bağlı)</span></p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Ad, soyad"
                    className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm" />
                  <input value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} placeholder="Telefon" inputMode="tel"
                    className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm" />
                </div>
                <p className="text-[11px] text-muted">Ödənişi kimin etdiyi {recipientName || "alıcı"}ya bildirilsin deyə.</p>
              </div>
              <button onClick={payNow} disabled={paying || data.paid}
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
              <button onClick={checkout} disabled={checking} className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold disabled:opacity-50">
                {checking ? "Göndərilir…" : "💳 Ödə və sifariş ver (nağd)"}
              </button>
              <button onClick={importToCart} disabled={importing} className="w-full py-2.5 mt-2 bg-input-bg border border-input-border rounded-xl text-sm font-medium disabled:opacity-50">
                {importing ? "Əlavə olunur…" : "və ya səbətimə əlavə et"}
              </button>
            </>
          )}
        </>
      ) : (
        <p className="text-muted text-center py-10">Bu linkdə aktiv məhsul qalmayıb.</p>
      )}
    </div>
  );
}
