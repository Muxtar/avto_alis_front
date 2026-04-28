"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { useToast } from "@/components/Toast";
import { API, UPLOADS } from "@/lib/api";

export default function CartPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, token, isLoggedIn, authLoading } = useAuth();
  const { refreshCart } = useCart();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  // Yeni Bolt Food benzeri ozellikler
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [deliveryType, setDeliveryType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [scheduledAt, setScheduledAt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "WALLET">("CASH");
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoValidated, setPromoValidated] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [usePoints, setUsePoints] = useState(0);
  const [userPoints, setUserPoints] = useState(0);

  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    fetchCart();
    setPhone(user?.phone || "");
    fetchAddresses();
    fetchUserPoints();
  }, [isLoggedIn, authLoading]);

  const fetchCart = () => {
    setLoading(true);
    fetch(`${API}/cart`, { headers })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.cart?.items || []);
        setTotal(d.total || 0);
      })
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoading(false));
  };

  const fetchAddresses = () => {
    fetch(`${API}/addresses`, { headers })
      .then(r => r.json())
      .then(d => {
        setSavedAddresses(d.addresses || []);
        const def = (d.addresses || []).find((a: any) => a.isDefault);
        if (def) {
          setSelectedAddressId(def.id);
          setAddress(def.address);
          if (def.phone) setPhone(def.phone);
        }
      }).catch(() => {});
  };

  const fetchUserPoints = () => {
    fetch(`${API}/me`, { headers })
      .then(r => r.json())
      .then(d => setUserPoints(d.user?.loyaltyPoints || 0))
      .catch(() => {});
  };

  const selectAddress = (id: number) => {
    const a = savedAddresses.find(x => x.id === id);
    if (a) {
      setSelectedAddressId(id);
      setAddress(a.address);
      if (a.phone) setPhone(a.phone);
    }
  };

  const updateQty = async (id: number, qty: number) => {
    if (qty < 1) return;
    await fetch(`${API}/cart/item/${id}`, { method: "PUT", headers, body: JSON.stringify({ quantity: qty }) });
    fetchCart();
    refreshCart();
  };

  const removeItem = async (id: number) => {
    await fetch(`${API}/cart/item/${id}`, { method: "DELETE", headers });
    fetchCart();
    refreshCart();
  };

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError("");
    try {
      const res = await fetch(`${API}/promo/validate`, {
        method: "POST", headers,
        body: JSON.stringify({ code: promoCode.trim(), orderAmount: total }),
      });
      const data = await res.json();
      if (data.success) {
        setPromoDiscount(data.discount);
        setPromoValidated(true);
        toast(`${t('promoApplied')}: -${data.discount} AZN`, 'success');
      } else {
        setPromoError(data.message);
        setPromoDiscount(0);
        setPromoValidated(false);
      }
    } catch { toast(t('error'), 'error'); }
  };

  const pointsDiscount = usePoints * 0.01;
  const finalTotal = Math.max(0, total - promoDiscount - pointsDiscount);

  const checkout = async () => {
    if (deliveryType === "DELIVERY" && !address) {
      toast(t('deliveryAddress'), 'error'); return;
    }
    setPlacing(true);
    try {
      const res = await fetch(`${API}/cart/checkout`, {
        method: "POST", headers,
        body: JSON.stringify({
          address: deliveryType === "DELIVERY" ? address : null,
          phone, note,
          deliveryType,
          scheduledAt: scheduledAt || null,
          paymentMethod,
          promoCode: promoValidated ? promoCode : null,
          usePoints,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPlaced(true);
        refreshCart();
        toast(`${t('orderPlaced')} ${data.pointsEarned > 0 ? `(+${data.pointsEarned} ${t('points')})` : ''}`, 'success');
        setTimeout(() => router.push("/orders"), 1500);
      } else {
        toast(data.message || t('error'), 'error');
      }
    } catch { toast(t('error'), 'error'); } finally { setPlacing(false); }
  };

  if (authLoading || loading) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const inputCls = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm";

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">{t("cart")}</h1>

      {placed && (
        <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-center font-medium">
          {t("orderPlaced")} ✓
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-20 bg-card border border-card-border rounded-2xl">
          <svg className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272" /></svg>
          <p className="text-muted mb-4">{t("cartEmpty")}</p>
          <Link href="/marketplace" className="inline-block px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium">{t("marketplace")}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-card border border-card-border rounded-xl p-3 sm:p-4 flex gap-3 sm:gap-4">
                <Link href={`/marketplace/${item.listing.id}`} className="w-16 h-16 sm:w-20 sm:h-20 bg-input-bg rounded-xl shrink-0 flex items-center justify-center overflow-hidden">
                  {item.listing.images?.[0] ? (
                    <img src={item.listing.images[0].startsWith('http') ? item.listing.images[0] : `${UPLOADS}/${item.listing.images[0]}`} alt={item.listing.title} loading="lazy" className="w-full h-full object-cover" />
                  ) : null}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/marketplace/${item.listing.id}`} className="font-medium text-sm hover:text-orange-500 block truncate">{item.listing.title}</Link>
                  <p className="text-muted text-xs mt-0.5">{item.listing.user.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-7 h-7 bg-input-bg border border-input-border rounded-lg hover:opacity-80 text-sm">−</button>
                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-7 h-7 bg-input-bg border border-input-border rounded-lg hover:opacity-80 text-sm">+</button>
                  </div>
                </div>
                <div className="text-right flex flex-col justify-between">
                  <p className="text-orange-500 font-bold text-sm">{(item.listing.price * item.quantity).toFixed(2)} AZN</p>
                  <button onClick={() => removeItem(item.id)} className="text-red-500 text-xs hover:text-red-400">{t("remove")}</button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card border border-card-border rounded-2xl p-5 sticky top-20 space-y-3">
              <h3 className="font-semibold">{t("cartTotal")}</h3>

              <div className="flex justify-between text-sm">
                <span className="text-muted">{items.length} {t("items")}</span>
                <span>{total.toFixed(2)} AZN</span>
              </div>

              {promoDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>{t("promoDiscount")}</span>
                  <span>−{promoDiscount.toFixed(2)} AZN</span>
                </div>
              )}

              {pointsDiscount > 0 && (
                <div className="flex justify-between text-sm text-blue-500">
                  <span>{t("pointsDiscount")} ({usePoints} pt)</span>
                  <span>−{pointsDiscount.toFixed(2)} AZN</span>
                </div>
              )}

              <div className="flex justify-between pt-3 border-t border-card-border">
                <span className="font-semibold">{t("cartTotal")}</span>
                <span className="text-xl font-bold text-orange-500">{finalTotal.toFixed(2)} AZN</span>
              </div>

              {!showCheckout ? (
                <button onClick={() => setShowCheckout(true)} className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-semibold">
                  {t("checkout")}
                </button>
              ) : (
                <div className="space-y-3 pt-2">
                  {/* Delivery Type */}
                  <div>
                    <label className="block text-xs text-muted mb-1">{t("deliveryType")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setDeliveryType("DELIVERY")} className={`py-2 rounded-lg text-xs font-medium ${deliveryType === "DELIVERY" ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border'}`}>
                        🚚 {t("delivery")}
                      </button>
                      <button onClick={() => setDeliveryType("PICKUP")} className={`py-2 rounded-lg text-xs font-medium ${deliveryType === "PICKUP" ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border'}`}>
                        🏪 {t("pickup")}
                      </button>
                    </div>
                  </div>

                  {/* Saved Addresses */}
                  {deliveryType === "DELIVERY" && savedAddresses.length > 0 && (
                    <div>
                      <label className="block text-xs text-muted mb-1">{t("savedAddresses")}</label>
                      <select value={selectedAddressId || ""} onChange={e => selectAddress(Number(e.target.value))} className={inputCls}>
                        <option value="">— {t("newAddress")} —</option>
                        {savedAddresses.map(a => <option key={a.id} value={a.id}>{a.label}: {a.address}</option>)}
                      </select>
                    </div>
                  )}

                  {deliveryType === "DELIVERY" && (
                    <div>
                      <label className="block text-xs text-muted mb-1">{t("deliveryAddress")}</label>
                      <input value={address} onChange={(e) => { setAddress(e.target.value); setSelectedAddressId(null); }} required placeholder={t("address")} className={inputCls} />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-muted mb-1">{t("phone")}</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                  </div>

                  {/* Scheduled */}
                  <div>
                    <label className="block text-xs text-muted mb-1">{t("scheduledDelivery")}</label>
                    <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className={inputCls} min={new Date().toISOString().slice(0,16)} />
                  </div>

                  {/* Payment */}
                  <div>
                    <label className="block text-xs text-muted mb-1">{t("paymentMethod")}</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => setPaymentMethod("CASH")} className={`py-2 rounded-lg text-xs ${paymentMethod === "CASH" ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border'}`}>💵 {t("cash")}</button>
                      <button onClick={() => setPaymentMethod("CARD")} className={`py-2 rounded-lg text-xs ${paymentMethod === "CARD" ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border'}`}>💳 {t("card")}</button>
                      <button onClick={() => setPaymentMethod("WALLET")} className={`py-2 rounded-lg text-xs ${paymentMethod === "WALLET" ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border'}`}>👝 {t("wallet")}</button>
                    </div>
                  </div>

                  {/* Promo Code */}
                  <div>
                    <label className="block text-xs text-muted mb-1">{t("promoCode")}</label>
                    <div className="flex gap-2">
                      <input value={promoCode} onChange={e => { setPromoCode(e.target.value); setPromoValidated(false); setPromoDiscount(0); }} placeholder="BOLT5" className={inputCls + " flex-1"} />
                      <button onClick={validatePromo} disabled={!promoCode.trim() || promoValidated} className="px-3 py-2 bg-input-bg border border-input-border rounded-lg text-xs">
                        {promoValidated ? "✓" : t("apply")}
                      </button>
                    </div>
                    {promoError && <p className="text-red-500 text-xs mt-1">{promoError}</p>}
                  </div>

                  {/* Loyalty Points */}
                  {userPoints > 0 && (
                    <div>
                      <label className="block text-xs text-muted mb-1">
                        {t("useLoyaltyPoints")} ({userPoints} pt)
                      </label>
                      <input type="number" min={0} max={userPoints} value={usePoints} onChange={e => setUsePoints(Math.min(Math.max(0, Number(e.target.value)), userPoints))} className={inputCls} />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-muted mb-1">{t("orderNote")}</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls + " resize-none"} />
                  </div>

                  <button onClick={checkout} disabled={placing} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white text-sm font-semibold disabled:opacity-50">
                    {placing ? "..." : `${t("confirmOrder")} • ${finalTotal.toFixed(2)} AZN`}
                  </button>
                  <button onClick={() => setShowCheckout(false)} className="w-full py-2 text-muted text-xs">{t("adminCancel")}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
