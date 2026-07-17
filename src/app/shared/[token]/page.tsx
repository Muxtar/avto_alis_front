"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import LocationPicker from "@/components/LocationPickerWrapper";

export default function SharedCartPage() {
  const params = useParams();
  const router = useRouter();
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const shareToken = String(params.token || "");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [checking, setChecking] = useState(false);
  // Alıcının öz ünvanı (RECIPIENT rejimində)
  const [recLoc, setRecLoc] = useState<{ city: string; address: string; latitude: number | null; longitude: number | null }>({ city: "", address: "", latitude: null, longitude: null });
  const [recPhone, setRecPhone] = useState("");

  useEffect(() => {
    fetch(`${API}/shared-cart/${shareToken}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData({ success: false }))
      .finally(() => setLoading(false));
  }, [shareToken]);

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

  const checkout = async () => {
    if (!requireLogin()) return;
    if (!isSender && !recLoc.address.trim()) { toast("Çatdırılma ünvanınızı seçin", "error"); return; }
    setChecking(true);
    try {
      const body: any = isSender ? {} : { address: recLoc.address, city: recLoc.city, latitude: recLoc.latitude, longitude: recLoc.longitude, phone: recPhone };
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
        <p className="text-muted mb-4">Bu paylaşılan səbət tapılmadı və ya silinib.</p>
        <Link href="/elanlar" className="text-orange-500 font-medium">← Bazara qayıt</Link>
      </div>
    );
  }

  const addr = data.deliveryAddress;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">🛒 Paylaşılan səbət</h1>
      <p className="text-sm text-muted mb-4">
        {data.by?.name ? <><b>{data.by.name}</b> sizin üçün bu məhsulları seçib. </> : ""}
        {isSender ? "Ödədikdən sonra məhsullar göndərənin ünvanına çatdırılacaq." : "Ödəyib öz ünvanınıza sifariş verə bilərsiniz."}
      </p>
      {data.title && <p className="text-sm font-medium mb-3">“{data.title}”</p>}

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
            <span className="font-semibold">Cəmi</span>
            <span className="text-orange-500 font-bold text-lg">{Number(data.total || 0).toFixed(2)} AZN</span>
          </div>

          {isSender ? (
            /* Göndərənin ünvanına çatdırılır — alıcı yalnız ödəyir */
            <div className="surface p-4 mb-3">
              <p className="text-sm font-semibold mb-1">🏠 Çatdırılma ünvanı (göndərənin)</p>
              <p className="text-sm text-muted">{[addr?.city, addr?.address].filter(Boolean).join(", ") || "—"}{addr?.phone ? ` · 📞 ${addr.phone}` : ""}</p>
              <p className="text-[11px] text-muted mt-1">Siz yalnız ödəyirsiniz — məhsullar bu ünvana göndərilir.</p>
            </div>
          ) : (
            /* Alıcı öz ünvanını seçir */
            <div className="surface p-4 mb-3 space-y-2">
              <p className="text-sm font-semibold">📍 Çatdırılma ünvanınız</p>
              <input value={recPhone} onChange={(e) => setRecPhone(e.target.value)} placeholder="Telefonunuz" className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm" />
              <LocationPicker city={recLoc.city} address={recLoc.address} latitude={recLoc.latitude} longitude={recLoc.longitude} onChange={(n: any) => setRecLoc(n)} height="220px" />
            </div>
          )}

          <button onClick={checkout} disabled={checking} className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold disabled:opacity-50">
            {checking ? "Göndərilir…" : isSender ? "💳 Ödə və göndər (nağd)" : "💳 Ödə və sifariş ver (nağd)"}
          </button>
          {!isSender && (
            <button onClick={importToCart} disabled={importing} className="w-full py-2.5 mt-2 bg-input-bg border border-input-border rounded-xl text-sm font-medium disabled:opacity-50">
              {importing ? "Əlavə olunur…" : "və ya səbətimə əlavə et"}
            </button>
          )}
        </>
      ) : (
        <p className="text-muted text-center py-10">Bu səbətdə aktiv məhsul qalmayıb.</p>
      )}
    </div>
  );
}
