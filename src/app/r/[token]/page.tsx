"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { fmtDate } from "@/lib/referral";

// Alıcı referal linki açır → məhsulları ADİ səbətə (referal bağlantısı ilə) atır
// → ödəniş/çatdırılma adi checkout-da (/cart).
export default function ReferralLinkPage() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const { refreshCart } = useCart();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const linkToken = String(params.token || "");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API}/referral/${linkToken}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          setData(d);
          const c: Record<number, boolean> = {};
          (d.items || []).forEach((i: any) => { if (i.available) c[i.listingId] = true; });
          setChecked(c);
        } else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [linkToken]);

  const goLogin = () => {
    // Daxil olduqdan sonra bu linkə qayıtmaq üçün (verify səhifəsi oxuyur).
    try { localStorage.setItem("afterLogin", `/r/${linkToken}`); } catch { /* storage bağlı */ }
    router.push("/");
  };

  const addToCart = async () => {
    if (!isLoggedIn) { goLogin(); return; }
    const listingIds = Object.keys(checked).filter((k) => checked[Number(k)]).map(Number);
    if (listingIds.length === 0) { toast("Ən azı bir məhsul seçin", "error"); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/referral/${linkToken}/add-to-cart`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ listingIds }),
      });
      const r = await res.json().catch(() => ({}));
      if (res.ok && r.success !== false) {
        await refreshCart();
        if (Array.isArray(r.skipped) && r.skipped.length) toast(`Əlavə olunmadı: ${r.skipped.join(", ")}`, "info");
        else toast("Səbətə əlavə olundu ✓", "success");
        try { localStorage.removeItem("afterLogin"); } catch { /* */ }
        router.push(r.redirect || "/cart");
      } else toast(r.message || "Xəta baş verdi", "error");
    } catch { toast("Xəta baş verdi", "error"); } finally { setBusy(false); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (notFound || !data) return (
    <div className="max-w-md mx-auto px-3 py-16 text-center">
      <div className="text-4xl mb-3">🔗</div>
      <p className="font-semibold mb-1">Link tapılmadı</p>
      <p className="text-sm text-muted mb-4">Link səhvdir və ya silinib.</p>
      <Link href="/elanlar" className="inline-block px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold">Elanlara bax</Link>
    </div>
  );

  const items: any[] = data.items || [];
  const selTotal = items.filter((i) => i.available && checked[i.listingId]).reduce((s, i) => s + i.price * i.quantity, 0);
  const selCount = items.filter((i) => i.available && checked[i.listingId]).length;
  const store = data.store;
  const ref = data.referrer;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6">
      {/* Kim tövsiyə edir + hansı mağaza */}
      <div className="surface p-4 mb-4">
        <p className="text-xs text-muted mb-2">🤝 Referal tövsiyə</p>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-orange-500/10 overflow-hidden flex items-center justify-center shrink-0 font-bold text-orange-500">
            {ref?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgUrl(ref.avatar)} alt={ref.name} className="w-full h-full object-cover" />
            ) : (ref?.name || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm"><b>{ref?.name || "İstifadəçi"}</b>{ref?.profession ? <span className="text-muted"> · {ref.profession}</span> : null}</p>
            {store && (
              <p className="text-xs text-muted truncate">
                {store.isObject ? "Mağaza" : "Satıcı"}:{" "}
                <Link href={store.isObject ? `/object/${store.id}` : `/seller/${store.id}`} className="text-orange-500 hover:underline font-medium">{store.name}</Link>
                {store.city ? ` · ${store.city}` : ""}
              </p>
            )}
          </div>
        </div>
        {data.title && <h1 className="text-lg font-bold mt-3">{data.title}</h1>}
        {data.expiresAt && <p className="text-[11px] text-muted mt-1">Link {fmtDate(data.expiresAt)} tarixinədək etibarlıdır</p>}
      </div>

      {!data.valid ? (
        <div className="surface p-6 text-center border border-red-500/30">
          <div className="text-3xl mb-2">⛔</div>
          <p className="font-semibold text-red-500 mb-1">Bu link artıq işləmir</p>
          <p className="text-sm text-muted mb-4">{data.reason || "Linkin müddəti bitib və ya dayandırılıb."}</p>
          {store && (
            <Link href={store.isObject ? `/object/${store.id}` : `/seller/${store.id}`} className="inline-block px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-semibold">
              {store.isObject ? "Mağazaya bax" : "Satıcının elanlarına bax"}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="surface p-4 mb-4 space-y-3">
            {items.length === 0 && <p className="text-sm text-muted text-center py-4">Linkdə məhsul yoxdur.</p>}
            {items.map((i) => (
              <label key={i.listingId} className={`flex items-center gap-3 ${i.available ? "cursor-pointer" : "opacity-50"}`}>
                <input type="checkbox" disabled={!i.available} checked={!!(i.available && checked[i.listingId])}
                  onChange={() => setChecked((c) => ({ ...c, [i.listingId]: !c[i.listingId] }))}
                  className="w-4 h-4 accent-orange-500 shrink-0 disabled:cursor-not-allowed" />
                <div className={`w-14 h-14 rounded-xl bg-input-bg overflow-hidden shrink-0 flex items-center justify-center ${i.available ? "" : "grayscale"}`}>
                  {i.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgUrl(i.image)} alt={i.title} className="w-full h-full object-cover" />
                  ) : <span className="text-muted">📦</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/marketplace/${i.listingId}`} className="text-sm font-medium truncate block hover:text-orange-500">{i.title}</Link>
                  <p className="text-xs text-muted">{i.quantity} × {formatPrice(i.price)} AZN</p>
                  {!i.available && <p className="text-[11px] text-red-500 mt-0.5">{i.unavailableReason || "Hazırda satışda deyil"}</p>}
                </div>
                <span className={`text-sm font-semibold shrink-0 ${i.available ? "" : "line-through text-muted"}`}>{formatPrice(i.price * i.quantity)} AZN</span>
              </label>
            ))}
            {items.length > 0 && (
              <div className="border-t border-card-border pt-3 flex items-center justify-between font-bold">
                <span>Cəmi {selCount > 0 ? <span className="text-xs text-muted font-normal">({selCount} məhsul)</span> : null}</span>
                <span className="text-orange-500">{formatPrice(selTotal)} AZN</span>
              </div>
            )}
          </div>

          <div className="surface p-4 space-y-2">
            <button onClick={addToCart} disabled={busy || authLoading || (isLoggedIn && selCount === 0)}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold disabled:opacity-50">
              {busy ? "..." : isLoggedIn ? "🛒 Səbətə əlavə et" : "Daxil ol və səbətə əlavə et"}
            </button>
            <p className="text-[11px] text-muted text-center">
              Ödəniş (kart / nağd) və çatdırılma adi səbətdə seçilir. Qiymət satıcının qiymətidir — sizin üçün əlavə xərc yoxdur.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
