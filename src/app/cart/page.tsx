"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import LocationPicker from "@/components/LocationPickerWrapper";
import ShareButton from "@/components/ShareButton";

export default function CartPage() {
  const { t, locale } = useLanguage();
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
  const [deliveryMethod, setDeliveryMethod] = useState<"COURIER" | "SELF">("COURIER"); // çatdırılmada: Yango / satıcı özü
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [city, setCity] = useState("");
  const [yangoFee, setYangoFee] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false); // ödəniş şərtlərini qəbul (bank tələbi)
  // Biznes adına alış — canBuy səlahiyyətli işçi obyekt seçə bilər.
  const [buyOptions, setBuyOptions] = useState<{ id: number; label: string }[]>([]);
  const [buyerObjectId, setBuyerObjectId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "WALLET">("CASH");
  const [paymentTouched, setPaymentTouched] = useState(false); // istifadəçi ödəniş üsulunu əl ilə dəyişib?
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoValidated, setPromoValidated] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [usePoints, setUsePoints] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  // Kart ödənişi — bankın səhifəsi iframe modal-da
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  // Səbəti göndərmə: çatdırılma alıcıya (RECIPIENT) yoxsa mənə (SENDER) — göndərən seçir.
  const [shareMode, setShareMode] = useState<"RECIPIENT" | "SENDER">("RECIPIENT");
  const [shareLoc, setShareLoc] = useState<{ city: string; address: string; latitude: number | null; longitude: number | null }>({ city: "", address: "", latitude: null, longitude: null });
  const [sharePhone, setSharePhone] = useState("");
  // Məhsul seçimi (checkbox) — seçilənləri al və ya faktura göndər
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const prevIdsRef = useRef<Set<number>>(new Set());

  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Stokda yoxdur — kimsə axırıncı ədədi sizdən əvvəl alıb (stock<=0). Belə məhsul
  // səbətdə qalır, amma seçilə/alına bilməz; stok bərpa olunanda yenidən alına bilər.
  const isOut = (it: any) => typeof it?.listing?.stock === "number" && it.listing.stock <= 0;

  // Yeni məhsul əlavə olunanda avtomatik seçili (stokda varsa); mövcud seçim qorunur;
  // silinən və ya stokda qalmayan seçimdən atılır (stokda olmayan seçili qala bilməz).
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<number>();
      for (const it of items) {
        if (isOut(it)) continue; // stokda yoxdursa seçmə/seçimi sil
        if (!prevIdsRef.current.has(it.id)) next.add(it.id);
        else if (prev.has(it.id)) next.add(it.id);
      }
      return next;
    });
    prevIdsRef.current = new Set(items.map((i) => i.id));
  }, [items]);

  const toggleSel = (id: number) => {
    const it = items.find((x) => x.id === id);
    if (it && isOut(it)) return; // stokda olmayanı seçmək olmaz
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const inStockItems = items.filter((i) => !isOut(i));
  const allSelected = inStockItems.length > 0 && inStockItems.every((i) => selected.has(i.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(inStockItems.map((i) => i.id)));
  const selItems = items.filter((i) => selected.has(i.id) && !isOut(i));
  const selTotal = selItems.reduce((s, i) => s + (i.listing?.price || 0) * i.quantity, 0);

  // Ödəniləcək məhsullar (seçim varsa onlar, yoxsa hamısı) biznesə (VÖEN) bağlıdırsa
  // kartla ödəniş mümkündür. VÖEN məhsulunda ödəniş üsulu avtomatik KART seçilir.
  const checkoutItems = selItems.length ? selItems : inStockItems;
  const cardAllowed = checkoutItems.length > 0 && checkoutItems.every((i) => !!(i.listing?.businessId || i.listing?.businessObjectId));
  useEffect(() => {
    if (!cardAllowed) { setPaymentMethod((m) => (m === "CARD" ? "CASH" : m)); return; }
    if (!paymentTouched) setPaymentMethod("CARD"); // VÖEN → default kart
  }, [cardAllowed, paymentTouched]);

  // Səbəti link kimi paylaş — linki yaradır və path qaytarır (paylaşım menyusu üçün).
  const shareCart = async (): Promise<string | null> => {
    if (selItems.length === 0) { toast("Ən azı bir məhsul seçin", "error"); return null; }
    if (shareMode === "SENDER" && !shareLoc.address.trim()) { toast("Öz çatdırılma ünvanınızı seçin", "error"); return null; }
    setSharing(true);
    try {
      const body: any = { itemIds: [...selected], deliveryMode: shareMode };
      if (shareMode === "SENDER") { body.address = shareLoc.address; body.city = shareLoc.city; body.latitude = shareLoc.latitude; body.longitude = shareLoc.longitude; body.phone = sharePhone; }
      const res = await fetch(`${API}/cart/share`, { method: "POST", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) {
        const path = `/shared/${data.token}`;
        setShareLink(`${window.location.origin}${path}`);
        return path;
      }
      toast(data.message || t("error"), "error");
      return null;
    } catch { toast(t("error"), "error"); return null; } finally { setSharing(false); }
  };

  // Bankın iframe-i ödənişdən sonra /payment/return-dən postMessage göndərir.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "kapital-payment") return;
      setPayUrl(null);
      refreshCart();
      router.push(`/orders?payment=${e.data.status}`);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    // Stokdan çox seçməyə icazə vermə (satıcının qoyduğu say maksimumdur).
    const it0 = items.find((it) => it.id === id);
    const max = it0?.listing?.stock;
    if (typeof max === "number" && qty > max) { toast(`Bu məhsuldan maksimum ${max} ədəd var`, "error"); return; }
    // Optimistik yeniləmə — səhifə yenilənmədən (spinner göstərmədən) dərhal dəyişir.
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, quantity: qty } : it)));
    try {
      await fetch(`${API}/cart/item/${id}`, { method: "PUT", headers, body: JSON.stringify({ quantity: qty }) });
      refreshCart();
    } catch { toast(t('error'), 'error'); fetchCart(); }
  };

  const removeItem = async (id: number) => {
    // Optimistik silmə — dərhal yox olur, tam yenilənmə yoxdur.
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    try {
      await fetch(`${API}/cart/item/${id}`, { method: "DELETE", headers });
      refreshCart();
    } catch { toast(t('error'), 'error'); fetchCart(); }
  };

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoError("");
    try {
      const res = await fetch(`${API}/promo/validate`, {
        method: "POST", headers,
        body: JSON.stringify({ code: promoCode.trim(), orderAmount: selTotal }),
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
  // Sifariş çəkisi (kq) — yalnız SEÇİLMİŞ məhsullar üzrə (Yango 50 kq limiti üçün).
  const cartWeight = selItems.reduce((s, i) => s + i.quantity * (i.listing?.weightKg || 0), 0);
  const yangoBlocked = cartWeight > 50; // 50 kq-dan ağır — kuryer mümkün deyil
  const allSelfAllowed = selItems.length > 0 && selItems.every((i) => i.listing?.allowSelfDelivery);
  // Seçilmişlərdən biri "yalnız götürmə" isə çatdırılma mümkün deyil — alıcı özü götürməlidir.
  const anyPickupOnly = selItems.some((i) => (i.listing as any)?.pickupOnly);
  const pickupOnlyTitle = selItems.find((i) => (i.listing as any)?.pickupOnly)?.listing?.title;
  // Yango çatdırılma haqqı yalnız çatdırılma + kuryer + limit daxilində cəmə əlavə olunur.
  const deliveryFee = deliveryType === "DELIVERY" && deliveryMethod === "COURIER" && !yangoBlocked && yangoFee ? yangoFee : 0;
  const finalTotal = Math.max(0, selTotal - promoDiscount - pointsDiscount) + deliveryFee;

  // Ağır yük olduqda kuryerdən satıcı çatdırmasına keç (icazə varsa).
  useEffect(() => {
    if (yangoBlocked && deliveryType === "DELIVERY" && deliveryMethod === "COURIER" && allSelfAllowed) setDeliveryMethod("SELF");
    // eslint-disable-next-line
  }, [yangoBlocked, deliveryType]);

  // "Yalnız götürmə" məhsulu seçiləndə çatdırılmanı bağla — məcburi götürmə.
  useEffect(() => {
    if (anyPickupOnly && deliveryType === "DELIVERY") setDeliveryType("PICKUP");
    // eslint-disable-next-line
  }, [anyPickupOnly]);

  // Yango qiymət təxmini — konum/metod dəyişəndə yenilənir (limit daxilində).
  useEffect(() => {
    if (deliveryType !== "DELIVERY" || deliveryMethod !== "COURIER" || yangoBlocked || lat == null || lng == null) { setYangoFee(null); return; }
    const base = selItems.length ? selItems : inStockItems;
    const objId = base.find((i) => i.listing?.businessObjectId)?.listing?.businessObjectId;
    // Obyekt yoxdursa (fərdi satıcı) — götürmə yeri kimi satıcının konumu istifadə olunur.
    const sellerId = base[0]?.listing?.user?.id;
    if (!objId && !sellerId) { setYangoFee(null); return; }
    let cancelled = false;
    setQuoting(true);
    fetch(`${API}/yango/quote`, { method: "POST", headers, body: JSON.stringify({ businessObjectId: objId || undefined, sellerId: objId ? undefined : sellerId, latitude: lat, longitude: lng, weight: cartWeight || 1 }) })
      .then((r) => r.json()).then((d) => { if (!cancelled) setYangoFee(d?.available ? d.fee : null); })
      .catch(() => { if (!cancelled) setYangoFee(null); }).finally(() => { if (!cancelled) setQuoting(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [deliveryType, deliveryMethod, lat, lng, items.length, yangoBlocked]);

  // canBuy səlahiyyətli işçiliklərdən "biznes adına alış" seçimlərini qur.
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    fetch(`${API}/me/employment`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const opts: { id: number; label: string }[] = [];
        (d.memberships || []).filter((m: any) => m.status === "ACTIVE" && m.canBuy).forEach((m: any) => {
          if (m.object) opts.push({ id: m.object.id, label: `${m.business.name} — ${m.object.name}` });
          else (m.business.objects || []).forEach((o: any) => opts.push({ id: o.id, label: `${m.business.name} — ${o.name}` }));
        });
        // Dublikatları çıxar.
        setBuyOptions(opts.filter((o, i) => opts.findIndex((x) => x.id === o.id) === i));
      })
      .catch(() => {});
    // eslint-disable-next-line
  }, [isLoggedIn, token]);

  // Ödəniş şərtləri qutusunun mətnləri (bank tələbi, çoxdilli).
  const termsLbl: any = {
    az: { accept: "Ödəniş şərtləri ilə tanış oldum və qəbul edirəm", terms: "İstifadə şərtləri", cancel: "Ləğv və ödəmə", privacy: "Məxfilik", need: "Davam etmək üçün ödəniş şərtlərini qəbul edin" },
    en: { accept: "I have read and accept the payment terms", terms: "Terms of Use", cancel: "Cancellation & Payment", privacy: "Privacy", need: "Please accept the payment terms to continue" },
    ru: { accept: "Я ознакомился и принимаю условия оплаты", terms: "Условия", cancel: "Отмена и оплата", privacy: "Конфиденциальность", need: "Примите условия оплаты, чтобы продолжить" },
  };
  const tl = termsLbl[locale] || termsLbl.az;

  const checkout = async () => {
    if (!acceptedTerms) { toast(tl.need, 'error'); return; }
    if (deliveryType === "DELIVERY" && !address) {
      toast(t('deliveryAddress'), 'error'); return;
    }
    if (deliveryType === "DELIVERY" && deliveryMethod === "COURIER" && yangoBlocked) {
      toast("Sifariş 50 kq-dan ağırdır — Yango mümkün deyil. Götürmə və ya satıcı çatdırması seçin.", 'error'); return;
    }
    if (deliveryType === "DELIVERY" && deliveryMethod === "COURIER" && (lat == null || lng == null)) {
      toast("Yango çatdırılması üçün xəritədən konum seçin", 'error'); return;
    }
    setPlacing(true);
    try {
      const res = await fetch(`${API}/cart/checkout`, {
        method: "POST", headers,
        body: JSON.stringify({
          address: deliveryType === "DELIVERY" ? address : null,
          phone, note,
          deliveryType,
          deliveryMethod: deliveryType === "DELIVERY" ? deliveryMethod : null,
          buyerObjectId: buyerObjectId || null,
          latitude: lat, longitude: lng,
          scheduledAt: scheduledAt || null,
          paymentMethod,
          promoCode: promoValidated ? promoCode : null,
          usePoints,
          itemIds: [...selected], // yalnız seçilmiş məhsullar alınır
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Kart ödənişi: bankın səhifəsini saytda modal (iframe) içində aç.
        if (data.paymentUrl) {
          setPayUrl(data.paymentUrl);
          return;
        }
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
        <div className="text-center py-20 surface">
          <svg className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272" /></svg>
          <p className="text-muted mb-4">{t("cartEmpty")}</p>
          <Link href="/elanlar" className="inline-block px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white text-sm font-medium">{t("marketplace")}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Səbəti paylaş */}
            <div className="surface p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-medium">🔗 Seçilmiş məhsulları başqasına göndər ({selItems.length})</p>
                {/* Tək paylaş ikonu — kliklədikdə linki yaradır və tətbiqdə/xaricdə seçimi açır */}
                <ShareButton title="Səbətdəki məhsullar" text="Səbətimə bax — tradixai" beforeShare={shareCart} disabled={sharing || selItems.length === 0} compact className="w-10 h-10 rounded-xl bg-input-bg border border-input-border flex items-center justify-center text-orange-500 hover:bg-orange-500/10 transition-colors" />
              </div>
              {/* Çatdırılma kimə? — göndərən seçir */}
              <div className="grid grid-cols-2 gap-1 bg-input-bg/60 rounded-xl p-1 mt-2">
                <button onClick={() => setShareMode("RECIPIENT")} className={`py-1.5 rounded-lg text-[11px] font-semibold ${shareMode === "RECIPIENT" ? "bg-orange-500 text-white" : "text-muted"}`}>👤 Alıcı öz ünvanına alsın</button>
                <button onClick={() => setShareMode("SENDER")} className={`py-1.5 rounded-lg text-[11px] font-semibold ${shareMode === "SENDER" ? "bg-orange-500 text-white" : "text-muted"}`}>🏠 Mənə gəlsin (o ödəsin)</button>
              </div>
              {shareMode === "SENDER" ? (
                <div className="mt-2 space-y-2">
                  <p className="text-[11px] text-muted">Məhsullar <b>sizin</b> ünvanınıza gələcək — qarşı tərəf yalnız ödəyəcək. Çatdırılma yerinizi seçin:</p>
                  <input value={sharePhone} onChange={(e) => setSharePhone(e.target.value)} placeholder="Telefonunuz" className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-xs" />
                  <LocationPicker city={shareLoc.city} address={shareLoc.address} latitude={shareLoc.latitude} longitude={shareLoc.longitude} onChange={(n: any) => setShareLoc(n)} height="200px" />
                </div>
              ) : (
                <p className="text-[11px] text-muted mt-1">Linki alan şəxs məhsulları alıb <b>öz ünvanına</b> sifariş verəcək.</p>
              )}
              {shareLink && (
                <div className="flex gap-2 mt-2 items-stretch">
                  <input readOnly value={shareLink} className="flex-1 px-3 py-2 bg-input-bg border border-input-border rounded-lg text-xs" onFocus={(e) => e.currentTarget.select()} />
                  <button onClick={() => { navigator.clipboard?.writeText(shareLink); toast("Kopyalandı ✓", "success"); }} className="px-3 py-2 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-semibold">Kopyala</button>
                </div>
              )}
            </div>

            {/* Hamısını seç / ləğv et */}
            {items.length > 0 && (
              <label className="surface px-3 py-2 flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-orange-500" />
                <span>Hamısını seç <span className="text-muted">({selItems.length}/{inStockItems.length})</span></span>
              </label>
            )}

            {/* Mağazaya görə qruplar — eyni mağaza birlikdə çatdırılır */}
            {(() => {
              const groups = new Map<number, { name: string; items: any[] }>();
              for (const it of items) {
                const sid = it.listing.user?.id ?? 0;
                const g = groups.get(sid) || { name: it.listing.user?.name || "Mağaza", items: [] as any[] };
                g.items.push(it); groups.set(sid, g);
              }
              return Array.from(groups.values()).map((g, gi) => (
                <div key={gi} className="surface p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-card-border">
                    <p className="text-sm font-semibold flex items-center gap-1.5">🏪 {g.name}</p>
                    {g.items.length > 1 && <span className="text-[11px] text-green-500">✓ Birlikdə çatdırılır</span>}
                  </div>
                  <div className="space-y-3">
                    {g.items.map((item) => {
                      const out = isOut(item);
                      return (
                      <div key={item.id} className={`flex gap-3 sm:gap-4 items-start transition-opacity ${out ? "opacity-55" : ""}`}>
                        <input type="checkbox" checked={selected.has(item.id)} disabled={out} onChange={() => toggleSel(item.id)} className="w-4 h-4 accent-orange-500 mt-1 shrink-0 disabled:cursor-not-allowed" />
                        <Link href={`/marketplace/${item.listing.id}`} aria-disabled={out} tabIndex={out ? -1 : undefined} className={`w-16 h-16 sm:w-20 sm:h-20 bg-input-bg rounded-xl shrink-0 flex items-center justify-center overflow-hidden ${out ? "pointer-events-none grayscale" : ""}`}>
                          {item.listing.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.listing.images[0].startsWith('http') ? item.listing.images[0] : `${imgUrl(item.listing.images[0])}`} alt={item.listing.title} loading="lazy" className="w-full h-full object-cover" />
                          ) : null}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/marketplace/${item.listing.id}`} aria-disabled={out} tabIndex={out ? -1 : undefined} className={`font-medium text-sm block truncate ${out ? "pointer-events-none text-muted" : "hover:text-orange-500"}`}>{item.listing.title}</Link>
                          {out ? (
                            /* Stokda yoxdur — kimsə əvvəl alıb. Klik yoxdur, seçilə bilməz; stok gələndə yenidən alınar. */
                            <div className="mt-1.5 inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-600 border border-red-500/20 text-[11px] font-semibold leading-snug">
                              <span>⚠️</span>
                              <span>Stokda yoxdur — biri sizdən əvvəl aldı. Stok bərpa olunanda yenidən ala biləcəksiniz.</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => updateQty(item.id, item.quantity - 1)} disabled={item.quantity <= 1} className="w-7 h-7 bg-input-bg border border-input-border rounded-lg hover:opacity-80 text-sm disabled:opacity-40 disabled:cursor-not-allowed">−</button>
                              <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                              <button onClick={() => updateQty(item.id, item.quantity + 1)} disabled={typeof item.listing?.stock === "number" && item.quantity >= item.listing.stock} title={typeof item.listing?.stock === "number" && item.quantity >= item.listing.stock ? `Maksimum ${item.listing.stock} ədəd` : ""} className="w-7 h-7 bg-input-bg border border-input-border rounded-lg hover:opacity-80 text-sm disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                              {typeof item.listing?.stock === "number" && <span className="text-[11px] text-muted ml-1">stok: {item.listing.stock}</span>}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex flex-col justify-between items-end">
                          <p className={`font-bold text-sm ${out ? "text-muted line-through" : "text-orange-500"}`}>{(item.listing.price * item.quantity).toFixed(2)} AZN</p>
                          <button onClick={() => removeItem(item.id)} className="flex items-center gap-1 text-red-500 text-xs hover:text-red-400 mt-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            {t("remove")}
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>

          <div className="lg:col-span-1">
            <div className="surface p-5 sticky top-20 space-y-3">
              <h3 className="font-semibold">{t("cartTotal")}</h3>

              <div className="flex justify-between text-sm">
                <span className="text-muted">{selItems.length} {t("items")}</span>
                <span>{selTotal.toFixed(2)} AZN</span>
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
              {/* Çatdırılma haqqı — həmişə görünür: götürmə=Pulsuz, Yango=+haqq (məhsulun üstünə gəlir) */}
              {deliveryType === "PICKUP" ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">🏪 Özü götürmə</span>
                  <span className="text-green-600 font-medium">Pulsuz</span>
                </div>
              ) : deliveryMethod === "SELF" ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">🚚 Satıcı çatdırır</span>
                  <span className="text-muted">satıcı ilə razılaşın</span>
                </div>
              ) : quoting ? (
                <div className="flex justify-between text-sm text-muted">
                  <span>🛵 Yango çatdırılma</span>
                  <span className="animate-pulse">hesablanır…</span>
                </div>
              ) : deliveryFee > 0 ? (
                <div className="flex justify-between text-sm text-muted">
                  <span>🛵 Yango çatdırılma</span>
                  <span className="font-medium text-foreground">+{deliveryFee.toFixed(2)} AZN</span>
                </div>
              ) : (lat == null || lng == null) ? (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>🛵 Yango çatdırılma</span>
                  <span>çatdırılma ünvanını seçin</span>
                </div>
              ) : (
                <div className="flex justify-between text-sm text-red-500">
                  <span>🛵 Yango çatdırılma</span>
                  <span>bu ünvana çatdıra bilmir</span>
                </div>
              )}

              <div className="flex justify-between pt-3 border-t border-card-border">
                <span className="font-semibold">{t("cartTotal")}</span>
                <span className="text-xl font-bold text-orange-500">{finalTotal.toFixed(2)} AZN</span>
              </div>

              {!showCheckout ? (
                <button onClick={() => setShowCheckout(true)} disabled={selItems.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white text-sm font-semibold disabled:opacity-50">
                  {selItems.length === 0 ? "Məhsul seçin" : `${t("checkout")} (${selItems.length})`}
                </button>
              ) : (
                <div className="space-y-3 pt-2">
                  {/* Delivery Type */}
                  <div>
                    <label className="block text-xs text-muted mb-1">{t("deliveryType")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button disabled={anyPickupOnly} onClick={() => setDeliveryType("DELIVERY")} className={`py-2 rounded-lg text-xs font-medium ${deliveryType === "DELIVERY" ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border'} ${anyPickupOnly ? 'opacity-40 cursor-not-allowed' : ''}`}>
                        🚚 {t("delivery")}
                      </button>
                      <button onClick={() => setDeliveryType("PICKUP")} className={`py-2 rounded-lg text-xs font-medium ${deliveryType === "PICKUP" ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border'}`}>
                        🏪 {t("pickup")}
                      </button>
                    </div>
                    {anyPickupOnly && (
                      <p className="text-[11px] text-orange-500 mt-1.5">🏠 «{pickupOnlyTitle}» yalnız götürmə ilə satılır — çatdırılma mümkün deyil, alıcı özü götürməlidir.</p>
                    )}
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
                      {/* Ünvan yalnız bir dəfə — LocationPicker özü küçə ünvanı + şəhər
                          sahələrini göstərir (əvvəl üstdə ayrıca ünvan input-u da vardı,
                          eyni `address` state-inə bağlı olub təkrarlanırdı → silindi). */}
                      <label className="block text-xs text-muted mb-1">{t("deliveryAddress")}</label>
                      <div>
                        <p className="text-[11px] text-muted mb-1">📍 Çatdırılma konumunu seçin (Yango kuryeri üçün vacibdir):</p>
                        <LocationPicker
                          city={city}
                          address={address}
                          latitude={lat}
                          longitude={lng}
                          onChange={(n: any) => { setCity(n.city || city); if (n.address) setAddress(n.address); setLat(n.latitude); setLng(n.longitude); setSelectedAddressId(null); }}
                          height="220px"
                        />
                        {lat != null && lng != null && <p className="text-[11px] text-green-500 mt-1">✓ Konum seçildi</p>}
                      </div>

                      {/* Çatdırılma metodu seçimi */}
                      <div className="mt-3">
                        <label className="block text-xs text-muted mb-1">Çatdırılma üsulu {cartWeight > 0 && <span className="text-muted">· {cartWeight.toFixed(1)} kq</span>}</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" disabled={yangoBlocked} onClick={() => !yangoBlocked && setDeliveryMethod("COURIER")}
                            className={`py-2 px-2 rounded-lg text-xs font-medium border ${yangoBlocked ? "opacity-40 cursor-not-allowed border-input-border bg-input-bg" : deliveryMethod === "COURIER" ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-input-border bg-input-bg"}`}>
                            🛵 Yango kuryer{yangoBlocked ? <span className="block text-[10px] text-red-500">50 kq-dan ağır</span> : deliveryMethod === "COURIER" && (quoting ? <span className="block text-[10px] text-muted">hesablanır...</span> : yangoFee != null ? <span className="block text-[10px] text-muted">{yangoFee.toFixed(2)} AZN</span> : <span className="block text-[10px] text-muted">konum seçin</span>)}
                          </button>
                          {allSelfAllowed && (
                            <button type="button" onClick={() => setDeliveryMethod("SELF")}
                              className={`py-2 px-2 rounded-lg text-xs font-medium border ${deliveryMethod === "SELF" ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-input-border bg-input-bg"}`}>
                              🚗 Satıcı özü<span className="block text-[10px] text-muted">satıcı çatdırır</span>
                            </button>
                          )}
                        </div>
                        {yangoBlocked && (
                          <p className="text-[11px] text-red-500 mt-1.5">
                            ⚖️ Sifariş 50 kq-dan ağırdır — Yango kuryer mümkün deyil. {allSelfAllowed ? "Satıcı çatdırması seçildi." : "Yuxarıdan “🏪 Götürmə”ni seçin (satıcı bu məhsulda özü çatdırma təklif etmir)."}
                          </p>
                        )}
                        {/* Satıcının öz çatdırma qeydi/qiyməti */}
                        {deliveryMethod === "SELF" && (() => {
                          const notes = Array.from(new Map(selItems.filter((i) => i.listing?.selfDeliveryNote).map((i) => [`${i.listing.user?.id}|${i.listing.selfDeliveryNote}`, { seller: i.listing.user?.name, note: i.listing.selfDeliveryNote }])).values());
                          if (!notes.length) return null;
                          return (
                            <div className="mt-2 space-y-1">
                              {notes.map((n: any, i: number) => (
                                <div key={i} className="px-3 py-2 rounded-lg bg-orange-500/5 border border-orange-500/20 text-[11px]">
                                  🚗 <b>{n.seller}</b> çatdırma qeydi: <span className="text-muted">{n.note}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-muted mb-1">{t("phone")}</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
                  </div>

                  {/* Biznes adına alış — yalnız canBuy səlahiyyətli işçilərə görünür */}
                  {buyOptions.length > 0 && (
                    <div>
                      <label className="block text-xs text-muted mb-1">🏢 Kimin adına alırsınız?</label>
                      <select value={buyerObjectId} onChange={(e) => setBuyerObjectId(e.target.value)} className={inputCls}>
                        <option value="">Şəxsi alış (özüm üçün)</option>
                        {buyOptions.map((o) => <option key={o.id} value={o.id}>Biznes üçün: {o.label}</option>)}
                      </select>
                      {buyerObjectId && <p className="text-[11px] text-muted mt-1">Bu sifariş seçilmiş obyektin adına qeyd olunacaq.</p>}
                    </div>
                  )}

                  {/* Scheduled */}
                  <div>
                    <label className="block text-xs text-muted mb-1">{t("scheduledDelivery")}</label>
                    <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className={inputCls} min={new Date().toISOString().slice(0,16)} />
                  </div>

                  {/* Payment */}
                  <div>
                    <label className="block text-xs text-muted mb-1">{t("paymentMethod")}</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => { setPaymentTouched(true); setPaymentMethod("CASH"); }} className={`py-2 rounded-lg text-xs ${paymentMethod === "CASH" ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border'}`}>💵 {t("cash")}</button>
                      <button onClick={() => { if (cardAllowed) { setPaymentTouched(true); setPaymentMethod("CARD"); } }} disabled={!cardAllowed} title={cardAllowed ? "" : (t("cardOnlyBusiness") || "Yalnız biznes məhsulları kartla")} className={`py-2 rounded-lg text-xs ${paymentMethod === "CARD" ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border'} ${!cardAllowed ? 'opacity-40 cursor-not-allowed' : ''}`}>💳 {t("card")}</button>
                      <button onClick={() => { setPaymentTouched(true); setPaymentMethod("WALLET"); }} className={`py-2 rounded-lg text-xs ${paymentMethod === "WALLET" ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border'}`}>👝 {t("wallet")}</button>
                    </div>
                    {!cardAllowed
                      ? <p className="text-[11px] text-muted mt-1.5">{t("cardOnlyBusinessHint") || "Bu məhsullar fərdi satıcılara aiddir — yalnız nağd/əldən. Kart yalnız biznes məhsullarında işləyir."}</p>
                      : paymentMethod === "CARD" && <p className="text-[11px] text-muted mt-1.5">💳 Kartla ödəniş — təsdiqdən sonra bankın təhlükəsiz ödəniş səhifəsi açılacaq.</p>}
                  </div>

                  {/* Promo Code */}
                  <div>
                    <label className="block text-xs text-muted mb-1">{t("promoCode")}</label>
                    <div className="flex gap-2">
                      <input value={promoCode} onChange={e => { setPromoCode(e.target.value); setPromoValidated(false); setPromoDiscount(0); }} placeholder="YANGO" className={inputCls + " flex-1"} />
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

                  {/* Ödəniş şərtlərinin qəbulu — bank tələbi */}
                  <label className="flex items-start gap-2.5 px-1 cursor-pointer">
                    <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="w-4 h-4 mt-0.5 accent-orange-500 shrink-0" />
                    <span className="text-xs text-muted leading-relaxed">
                      {tl.accept} (
                      <Link href="/terms" target="_blank" className="text-orange-500 hover:underline">{tl.terms}</Link>
                      {" · "}
                      <Link href="/cancellation" target="_blank" className="text-orange-500 hover:underline">{tl.cancel}</Link>
                      {" · "}
                      <Link href="/privacy" target="_blank" className="text-orange-500 hover:underline">{tl.privacy}</Link>
                      )
                    </span>
                  </label>

                  <button onClick={checkout} disabled={placing || !acceptedTerms} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white text-sm font-semibold disabled:opacity-50">
                    {placing ? "..." : `${t("confirmOrder")} • ${finalTotal.toFixed(2)} AZN`}
                  </button>
                  <button onClick={() => setShowCheckout(false)} className="w-full py-2 text-muted text-xs">{t("adminCancel")}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Kart ödənişi — bankın səhifəsi saytda iframe modal içində */}
      {payUrl && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-card w-full max-w-md h-[640px] max-h-[92vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-card-border shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-base">🔒</span>
                <span className="font-semibold text-sm">{t("securePayment") || "Təhlükəsiz ödəniş"}</span>
              </div>
              <button onClick={() => setPayUrl(null)} className="w-8 h-8 rounded-full hover:bg-input-bg flex items-center justify-center" aria-label="close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <iframe src={payUrl} title="payment" className="flex-1 w-full border-0 bg-white" />
            <div className="px-4 py-2 border-t border-card-border text-center shrink-0">
              <p className="text-[11px] text-muted">
                {t("paymentNotOpening") || "Forma açılmırsa"}{" "}
                <a href={payUrl} className="text-orange-500 font-medium hover:underline">{t("openFullPage") || "tam səhifədə açın"}</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
