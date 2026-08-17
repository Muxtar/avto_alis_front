"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { formatPrice, formatPriceShort } from "@/lib/format";
import { countryLabel } from "@/lib/countries";
import { getCategoryAttrs, parseCat, getListingFields, catToSlugs } from "@/lib/categories";
import OrderMap from "@/components/OrderMapWrapper";
import ShareButton from "@/components/ShareButton";
import ListingCard from "@/components/ListingCard";
import ComplaintButton from "@/components/ComplaintButton";
import { recordView } from "@/lib/recentlyViewed";
import InstallmentCalculator from "@/components/InstallmentCalculator";
import { installmentAllowed, isBusinessListing } from "@/lib/installment";


export default function ListingDetailPage() {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const { user, token, isLoggedIn } = useAuth();
  const { addToCart } = useCart();
  const params = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [sellerListings, setSellerListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [msgSent, setMsgSent] = useState(false);
  const [msgSending, setMsgSending] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState(0); // 5 ulduzlu rəy
  const [commentSending, setCommentSending] = useState(false);
  const [cartQty, setCartQty] = useState(1);
  // Hissəli alış planı — səbətə əlavə edərkən ötürülür.
  const [installMonths, setInstallMonths] = useState<number | null>(6);
  const [cartAdding, setCartAdding] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  // Bron / rezervasiya
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bk, setBk] = useState({ date: "", time: "", checkIn: "", checkOut: "", guests: "1", rooms: "1", note: "", contactName: "", contactPhone: "" });

  const submitBooking = async () => {
    if (!isLoggedIn) { router.push("/"); return; }
    if (!bk.contactPhone.trim()) { toast("Əlaqə nömrəsi tələb olunur", "error"); return; }
    const isStay = listing.bookingType === "STAY";
    if (isStay) {
      if (!bk.checkIn || !bk.checkOut) { toast("Giriş və çıxış tarixini seçin", "error"); return; }
    } else if (!bk.date) { toast("Tarix seçin", "error"); return; }
    setBookingBusy(true);
    try {
      const r = await fetch(`${API}/bookings`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id, guests: bk.guests, note: bk.note, contactName: bk.contactName, contactPhone: bk.contactPhone,
          ...(isStay ? { checkIn: bk.checkIn, checkOut: bk.checkOut, rooms: bk.rooms } : { date: bk.date, time: bk.time }),
        }),
      }).then((x) => x.json());
      if (r.success) { toast("Bron sorğusu göndərildi ✓", "success"); setBookingOpen(false); router.push("/bookings"); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta baş verdi", "error"); } finally { setBookingBusy(false); }
  };

  // Seçilmiş statusunu yoxla.
  useEffect(() => {
    if (!listing || !token || !isLoggedIn) return;
    fetch(`${API}/favorites/check`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ listingIds: [listing.id] }),
    }).then((r) => r.json()).then((d) => setIsFavorited((d.favorites || []).includes(listing.id))).catch(() => {});
  }, [listing, token, isLoggedIn]);

  const toggleFavorite = async () => {
    if (!isLoggedIn || !listing) { toast(t("loginRequired"), "error"); return; }
    setFavBusy(true);
    try {
      if (isFavorited) {
        await fetch(`${API}/favorites/${listing.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setIsFavorited(false);
      } else {
        await fetch(`${API}/favorites`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ listingId: listing.id }) });
        setIsFavorited(true);
      }
    } catch { toast(t("error"), "error"); } finally { setFavBusy(false); }
  };

  const handleAddToCart = async () => {
    if (!listing) return;
    setCartAdding(true);
    const result = await addToCart(listing.id, cartQty);
    if (result.success) {
      setCartAdded(true);
      setTimeout(() => setCartAdded(false), 3000);
    }
    setCartAdding(false);
  };

  // Sahib öz elanını silir (detal səhifəsindən).
  const [deleting, setDeleting] = useState(false);
  const handleDeleteListing = async () => {
    if (!listing) return;
    if (!confirm("Bu elanı silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/me/listings/${listing.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast("Elan silindi", "success"); router.push("/account"); }
      else { const e = await res.json().catch(() => ({})); toast(e.message || t("error"), "error"); setDeleting(false); }
    } catch { toast(t("error"), "error"); setDeleting(false); }
  };

  // İndi al — səbətə əlavə edib birbaşa səbətə (ödəniş/sifariş) keçir.
  const handleBuyNow = async () => {
    if (!listing) return;
    setCartAdding(true);
    const result = await addToCart(listing.id, cartQty);
    setCartAdding(false);
    if (result.success) router.push("/cart");
    else if (result.message) toast(result.message, "error");
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !user || !token) return;
    setCommentSending(true);
    try {
      const res = await fetch(`${API}/listings/${params.id}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText, rating: commentRating || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setListing({ ...listing, comments: [data.comment, ...(listing.comments || [])] });
        setCommentText(""); setCommentRating(0);
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.message || t('error'), 'error');
      }
    } catch { toast(t('error'), 'error'); } finally { setCommentSending(false); }
  };

  // Rəy sahibinin öz rəyini dəyişməsi/silməsi.
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const saveEditedComment = async () => {
    if (editingCommentId == null || !editingText.trim()) return;
    setCommentBusy(true);
    try {
      const res = await fetch(`${API}/comments/${editingCommentId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: editingText.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setListing({ ...listing, comments: (listing.comments || []).map((c: any) => (c.id === editingCommentId ? data.comment : c)) });
        setEditingCommentId(null); setEditingText("");
        toast("Rəy yeniləndi ✓", "success");
      } else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); } finally { setCommentBusy(false); }
  };

  const deleteComment = async (id: number) => {
    if (!confirm("Rəyi silmək istədiyinizə əminsiniz?")) return;
    setCommentBusy(true);
    try {
      const res = await fetch(`${API}/comments/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setListing({ ...listing, comments: (listing.comments || []).filter((c: any) => c.id !== id) });
        toast("Rəy silindi", "success");
      } else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); } finally { setCommentBusy(false); }
  };

  const handleSendMessage = async () => {
    if (!msgText.trim() || !listing) return;
    setMsgSending(true);
    try {
      await fetch(`${API}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: listing.user.id, listingId: listing.id, content: msgText }),
      });
      setMsgSent(true);
      setMsgText("");
      setTimeout(() => setMsgSent(false), 3000);
    } catch { toast(t('error'), 'error'); } finally { setMsgSending(false); }
  };

  useEffect(() => {
    // Token GÖNDƏRİLİR — backend canReview-i giriş etmiş istifadəçiyə görə
    // hesablayır (fərdi elanda rəy formu, VÖEN-də alış yoxlaması). Token
    // olmadan reviewerId=null olub canReview həmişə false qalırdı → rəy
    // formu heç vaxt görünmürdü.
    fetch(`${API}/listings/${params.id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then((r) => r.json())
      .then((d) => {
        setListing(d);
        // Əvvəl baxılanlara yaz (ana səhifədə "Əvvəl baxdıqlarınız" üçün).
        if (d?.id) recordView({ id: d.id, title: d.title, price: d.price, image: d.images?.[0] || null, type: d.type });
        // Satıcının/obyektin DİGƏR elanları — VÖEN-də obyekt üzrə, fərdidə satıcı üzrə.
        const sellerQ = d?.businessObjectId ? `objectId=${d.businessObjectId}` : `sellerId=${d?.user?.id}`;
        if (d?.user?.id) {
          fetch(`${API}/listings?${sellerQ}&limit=12`)
            .then((r) => r.json())
            .then((rd) => setSellerListings((rd.listings || []).filter((x: any) => x.id !== d.id).slice(0, 10)))
            .catch(() => {});
        }
        // Eyni kateqoriyada BAŞQA satıcıların elanları (cari satıcı istisna).
        const mainCat = parseCat(d?.category).main;
        if (mainCat) {
          fetch(`${API}/listings?category=${encodeURIComponent(mainCat)}&limit=16`)
            .then((r) => r.json())
            .then((rd) => setRelated((rd.listings || []).filter((x: any) => x.id !== d.id && x.user?.id !== d?.user?.id).slice(0, 10)))
            .catch(() => {});
        }
      })
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoading(false));
    // token deps-də — async yüklənəndə yenidən çəkilib canReview düzgün gəlsin.
  }, [params.id, token]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--brand-to)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-muted">Elan tapılmadı</p>
      </div>
    );
  }

  const isService = listing.type === "SERVICE";

  return (
    <div className="page-wrap py-4 sm:py-6">
      {/* Breadcrumb — kateqoriya yolu (birmarket üslubu) */}
      {(() => {
        const { main, sub } = parseCat(listing.category);
        const slugs = catToSlugs(listing.category);
        if (!main) return null;
        return (
          <nav className="flex items-center gap-1.5 text-xs text-muted mb-3 flex-wrap">
            <Link href="/elanlar" className="hover:text-[var(--brand-to)] transition-colors">Ana səhifə</Link>
            <span className="text-muted-foreground/50">›</span>
            <Link href={`/elanlar/${slugs[0]}`} className="hover:text-[var(--brand-to)] transition-colors">{main}</Link>
            {sub && (<><span className="text-muted-foreground/50">›</span><Link href={`/elanlar/${slugs[0]}/${slugs[1]}`} className="hover:text-[var(--brand-to)] transition-colors">{sub}</Link></>)}
          </nav>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:items-start">
        {/* SOL SÜTUN: şəkillər + məhsul məlumatları TƏK sütunda təbii axınla.
            (Əvvəl ayrı grid sıralarında idi — alış qutusu hündür olduqda sol sıralar
            dartılıb bir şəkildə boşluq yaradırdı; indi axın təbii, boşluq yoxdur.) */}
        <div className="order-1 lg:col-span-3 space-y-4 sm:space-y-6 min-w-0">
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            <div className="relative aspect-video tile-soft flex items-center justify-center group">
              {listing.images?.length > 0 ? (
                <>
                <img
                  src={(() => {
                    const img = listing.images[Math.min(activeImageIdx, listing.images.length - 1)];
                    return img.startsWith('http') ? img : `${imgUrl(img)}`;
                  })()}
                  loading="lazy"
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                {/* Şəkil sayğacı + naviqasiya oxları */}
                {listing.images.length > 1 && (
                  <>
                    <span className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur text-white text-xs font-semibold rounded-lg">
                      {Math.min(activeImageIdx, listing.images.length - 1) + 1} / {listing.images.length}
                    </span>
                    <button type="button" aria-label="Əvvəlki şəkil"
                      onClick={() => setActiveImageIdx((i) => (i - 1 + listing.images.length) % listing.images.length)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur text-white flex items-center justify-center transition-all sm:opacity-0 sm:group-hover:opacity-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button type="button" aria-label="Növbəti şəkil"
                      onClick={() => setActiveImageIdx((i) => (i + 1) % listing.images.length)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur text-white flex items-center justify-center transition-all sm:opacity-0 sm:group-hover:opacity-100">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </>
                )}
                </>
              ) : (
                <div className="text-center">
                  <svg className="w-20 h-20 text-muted-foreground/20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isService ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    )}
                  </svg>
                </div>
              )}
            </div>
            {listing.images?.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {listing.images.map((img: string, idx: number) => {
                  const src = img.startsWith('http') ? img : `${imgUrl(img)}`;
                  const isActive = idx === Math.min(activeImageIdx, listing.images.length - 1);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 transition-all ${
                        isActive ? "border-[var(--brand-to)] shadow-md shadow-[var(--brand-to)]/25" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                      aria-label={`Şəkil ${idx + 1}`}
                    >
                      <img src={src} alt={`${listing.title} ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Məhsul məlumatları + təsvir + rəylər — şəkil ilə eyni sütunda (təbii axın) */}
          <div>
          {/* Specifications */}
          {!isService && (
            <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6">
              <h3 className="font-semibold mb-3">{t("productInfo")}</h3>
              {/* Telefonda da 2 sütun — məlumat yığcam və oxunaqlı olsun */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
                {listing.attributes && Object.entries(listing.attributes).map(([k, v]) => {
                  if (v === null || v === undefined || String(v).trim() === "") return null;
                  const def = getCategoryAttrs(parseCat(listing.category).main).find((a) => a.key === k);
                  return (
                    <div key={k}>
                      <p className="text-muted text-xs mb-1">{def?.label || k}</p>
                      <p className="font-medium">{String(v)}{def?.suffix ? ` ${def.suffix}` : ""}</p>
                    </div>
                  );
                })}
                {getListingFields(parseCat(listing.category).main).includes("condition") && listing.condition && (
                  <div>
                    <p className="text-muted text-xs mb-1">{t("condition")}</p>
                    <p className={`font-medium ${listing.condition === 'NEW' ? 'text-green-500' : listing.condition === 'USED' ? 'text-[var(--brand-to)]' : 'text-blue-500'}`}>
                      {listing.condition === 'NEW' ? t("conditionNew") : listing.condition === 'USED' ? t("conditionUsed") : t("conditionRefurbished")}
                    </p>
                  </div>
                )}
                {listing.brand && (
                  <div>
                    <p className="text-muted text-xs mb-1">{t("partBrand") || t("brand")}</p>
                    <p className="font-medium">🏷️ {listing.brand}</p>
                  </div>
                )}
                {listing.country && (
                  <div>
                    <p className="text-muted text-xs mb-1">{t("countryOfOrigin")}</p>
                    <p className="font-medium">{countryLabel(listing.country, locale)}</p>
                  </div>
                )}
                {listing.year && (
                  <div>
                    <p className="text-muted text-xs mb-1">{t("manufacturingYear")}</p>
                    <p className="font-medium">📅 {listing.year}</p>
                  </div>
                )}
                {listing.model && (
                  <div>
                    <p className="text-muted text-xs mb-1">{t("vehicleModel")}</p>
                    <p className="font-medium">{listing.model}</p>
                  </div>
                )}
                {listing.city && (
                  <div>
                    <p className="text-muted text-xs mb-1">{t("city")}</p>
                    <p className="font-medium">📍 {listing.city}</p>
                  </div>
                )}
                {listing.fuelType && (
                  <div>
                    <p className="text-muted text-xs mb-1">{t("fuelType")}</p>
                    <p className="font-medium">⛽ {t(`fuel${listing.fuelType.charAt(0) + listing.fuelType.slice(1).toLowerCase()}` as any)}</p>
                  </div>
                )}
                {listing.paymentType && (
                  <div>
                    <p className="text-muted text-xs mb-1">{t("paymentType")}</p>
                    <p className="font-medium">💳 {t(`payment${listing.paymentType.charAt(0) + listing.paymentType.slice(1).toLowerCase()}` as any)}</p>
                  </div>
                )}
                {listing.forVehicle && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-muted text-xs mb-1">{t("forVehicle")}</p>
                    <p className="font-medium flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-[var(--brand-to)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.375" /></svg>
                      {listing.forVehicle}
                    </p>
                  </div>
                )}
                {listing.unit && listing.unitValue && (
                  <div>
                    <p className="text-muted text-xs mb-1">{t("unitValue")}</p>
                    <p className="font-medium text-[var(--brand-to)]">
                      {listing.unitValue} {listing.unit === 'LITER' ? t("unitLiter") : listing.unit === 'KG' ? t("unitKg") : listing.unit === 'ML' ? t("unitMl") : listing.unit === 'PIECE' ? t("unitPiece") : listing.unit === 'METER' ? t("unitMeter") : listing.unit}
                    </p>
                  </div>
                )}
                {getListingFields(parseCat(listing.category).main).includes("stock") && (
                <div>
                  <p className="text-muted text-xs mb-1">{t("stock")}</p>
                  <p className={`font-medium ${listing.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {listing.stock > 0 ? `${listing.stock} ${t("items")}` : t("outOfStock")}
                  </p>
                </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6 mt-4">
            <h3 className="font-semibold mb-3">{t("description")}</h3>
            <p className="text-foreground/80 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>

          {/* Statistika zolağı — №, tarix, baxış, rəy (bir kartda) */}
          {(() => {
            const d = new Date(listing.createdAt);
            const time = d.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" });
            const today = new Date();
            const yest = new Date(); yest.setDate(today.getDate() - 1);
            const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
            const azMonths = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
            const dateLabel = sameDay(d, today) ? `Bu gün, ${time}` : sameDay(d, yest) ? `Dünən, ${time}` : `${d.getDate()} ${azMonths[d.getMonth()]} ${d.getFullYear()}`;
            const Cell = ({ icon, label, value }: any) => (
              <div className="flex-1 min-w-[100px] text-center py-1">
                <p className="text-base leading-none mb-1">{icon}</p>
                <p className="text-sm font-semibold">{value}</p>
                <p className="text-[10px] text-muted uppercase tracking-wide">{label}</p>
              </div>
            );
            return (
              <div className="flex flex-wrap items-center divide-x divide-card-border mt-4 p-3 bg-card border border-card-border rounded-2xl">
                <Cell icon="🔖" label="Elan №" value={listing.id} />
                <Cell icon="👁️" label={t("views")} value={listing.viewCount || 0} />
                <Cell icon="💬" label={t("comments")} value={listing._count?.comments || listing.comments?.length || 0} />
                <Cell icon="🗓️" label="Tarix" value={dateLabel} />
              </div>
            );
          })()}

          {/* Comments */}
          <div id="reviews" className="bg-card border border-card-border rounded-2xl p-4 sm:p-6 mt-4 scroll-mt-20">
            <h3 className="font-semibold mb-4 flex items-center gap-2 flex-wrap">
              <svg className="w-5 h-5 text-[var(--brand-to)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {t("comments")} ({listing.comments?.length || 0})
              {(() => {
                const rs = (listing.comments || []).map((c: any) => c.rating).filter((r: number) => r >= 1 && r <= 5);
                if (!rs.length) return null;
                const pct = Math.round(rs.reduce((a: number, b: number) => a + b, 0) / rs.length / 5 * 100);
                return <span className="text-xs px-2 py-0.5 rounded-lg bg-green-500/10 text-green-600 font-semibold">👍 {pct}% məmnun ({rs.length})</span>;
              })()}
            </h3>

            {!isLoggedIn ? (
              <div className="mb-4 text-center py-3 bg-input-bg border border-input-border rounded-xl text-muted text-sm">
                <Link href="/" className="text-[var(--brand-to)] hover:opacity-80">{t("loginToComment")}</Link>
              </div>
            ) : (listing.comments || []).some((c: any) => c.user?.id === user?.id) ? (
              <div className="mb-4 text-center py-2.5 bg-input-bg border border-input-border rounded-xl text-muted text-xs">Bu məhsula rəyinizi yazmısınız — aşağıdan dəyişə/silə bilərsiniz</div>
            ) : listing.canReview ? (
              // VÖEN-li elan: yalnız məhsulu alan. Fərdi (VÖEN-siz) elan: hər kəs
              // almadan da rəy yaza bilər (bir dəfə, dəyişilə bilər).
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setCommentRating(n)} className="text-2xl leading-none">
                      <span className={n <= commentRating ? "text-[var(--brand-to)]" : "text-muted/40"}>★</span>
                    </button>
                  ))}
                  <span className="text-xs text-muted ml-1">{commentRating ? `${commentRating}/5` : "reytinq (istəyə bağlı)"}</span>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t("commentPlaceholder")}
                    className="flex-1 px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-to)]/50 placeholder-muted-foreground" />
                  <button onClick={handleAddComment} disabled={!commentText.trim() || commentSending}
                    className="px-4 py-2.5 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] rounded-xl text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50">
                    {t("addComment")}
                  </button>
                </div>
              </div>
            ) : user?.id !== listing.user.id && (
              // VÖEN-li elan: rəy yalnız məhsulu aldıqdan sonra yazıla bilər.
              // Ayrıca "Satıcıdan soruş" inputu YOXDUR — aşağıda "Mesaj yaz"
              // kartı onsuz da mövcuddur (istifadəçi tələbi).
              <div className="mb-4 flex items-center gap-2 text-xs text-muted bg-input-bg border border-input-border rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-[var(--brand-to)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Rəyi məhsulu aldıqdan sonra yaza bilərsiniz. Sualınız varsa aşağıdan satıcıya mesaj yazın.
              </div>
            )}

            {listing.comments?.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl block mb-2">💬</span>
                <p className="text-muted text-sm">{listing.canReview ? "İlk rəyi siz yazın" : "Hələ rəy yoxdur"}</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {listing.comments?.map((c: any) => {
                  const isMine = isLoggedIn && user?.id === c.user.id;
                  const isEditing = editingCommentId === c.id;
                  return (
                    <div key={c.id} className={`flex gap-3 p-3.5 rounded-2xl border transition-colors ${isMine ? "bg-[var(--brand-soft)] border-[var(--brand-to)]/15" : "bg-input-bg/50 border-transparent"}`}>
                      {c.user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`${imgUrl(c.user.avatar)}`} alt={c.user.name} className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                          {c.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Link href={`/seller/${c.user.id}`} className="font-semibold text-sm hover:text-[var(--brand-to)] transition-colors truncate">{c.user.name}</Link>
                          {isMine && <span className="px-1.5 py-0.5 bg-[var(--brand-soft)] text-[var(--brand-to)] rounded text-[9px] font-bold shrink-0">SİZ</span>}
                          <span className="text-muted text-[11px] shrink-0 ml-auto">{new Date(c.createdAt).toLocaleDateString("az-AZ", { day: "numeric", month: "short" })}</span>
                        </div>
                        {isEditing ? (
                          <div className="mt-1.5 space-y-2">
                            <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={2} autoFocus
                              className="w-full px-3 py-2 bg-card border border-[var(--brand-to)]/40 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand-to)]/40" />
                            <div className="flex gap-2">
                              <button onClick={saveEditedComment} disabled={commentBusy || !editingText.trim()}
                                className="px-3.5 py-1.5 bg-[var(--brand-to)] text-white rounded-lg text-xs font-semibold disabled:opacity-50">{commentBusy ? "..." : "Yadda saxla"}</button>
                              <button onClick={() => { setEditingCommentId(null); setEditingText(""); }}
                                className="px-3.5 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs">İmtina</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-foreground/85 text-sm leading-relaxed break-words">{c.content}</p>
                        )}
                        {/* Öz rəyində: dəyiş / sil */}
                        {isMine && !isEditing && (
                          <div className="flex gap-3 mt-1.5">
                            <button onClick={() => { setEditingCommentId(c.id); setEditingText(c.content); }}
                              className="text-[11px] text-muted hover:text-[var(--brand-to)] font-medium transition-colors">✎ Dəyiş</button>
                            <button onClick={() => deleteComment(c.id)} disabled={commentBusy}
                              className="text-[11px] text-muted hover:text-red-500 font-medium transition-colors disabled:opacity-50">✕ Sil</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Alış qutusu — masaüstündə sağ sütun (col 4-5), yapışıq (sticky).
            TELEFONDA məhsul məlumatından sonra (order-2). */}
        <div className="order-2 lg:col-span-2 space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* Price Card */}
          <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6">
            <div className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium mb-3 ${
              isService ? "bg-green-500/10 text-green-500" : "bg-[var(--brand-soft)] text-[var(--brand-to)]"
            }`}>
              {isService ? t("service") : t("product")}
            </div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold">{listing.title}</h1>
              <ShareButton title={listing.title} text={`${listing.title} — tradixai`} path={`/marketplace/${listing.id}`} listingId={listing.id} compact className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-input-bg border border-input-border text-muted hover:text-[var(--brand-to)] hover:border-[var(--brand-to)]/50 transition-all" />
            </div>
            {/* Reytinq + məhsulun kodu (birmarket üslubu) */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {(() => {
                const rs = (listing.comments || []).map((c: any) => c.rating).filter((r: number) => r >= 1 && r <= 5);
                if (!rs.length) return null;
                const avg = rs.reduce((a: number, b: number) => a + b, 0) / rs.length;
                return (
                  <a href="#reviews" className="flex items-center gap-1">
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <svg key={i} className={`w-4 h-4 ${i <= Math.round(avg) ? "text-amber-400" : "text-muted-foreground/25"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.3L5.8 21l1.6-7L2 9.2l7.2-.6L12 2l2.8 6.6 7.2.6-5.4 4.8 1.6 7z" /></svg>
                      ))}
                    </span>
                    <span className="text-xs text-muted font-medium">{avg.toFixed(1)} · {rs.length} rəy</span>
                  </a>
                );
              })()}
              <span className="text-xs text-muted-foreground">Kod: №{listing.id}</span>
            </div>

            {/* eBay üslubu satıcı/obyekt sətri — etibar məlumatı (% müsbət · digər elanları · mesaj) qiymətin üstündə */}
            {(() => {
              const isVoen = !!listing.businessObject;
              const prof = isVoen ? listing.businessObject : listing.user;
              const profHref = isVoen ? `/object/${listing.businessObject.id}` : `/seller/${listing.user.id}`;
              const objRating = isVoen ? listing.businessObject.rating : null;
              const posPercent = isVoen
                ? (objRating?.likePercent ?? objRating?.percent ?? null)
                : (listing.user.avgRating ? Math.round((listing.user.avgRating / 5) * 100) : null);
              const ratingCount = isVoen ? (objRating?.count ?? 0) : (listing.user.ratingCount ?? 0);
              const avatarUrl = !isVoen && listing.user.avatar ? imgUrl(listing.user.avatar) : null;
              const initials = (prof.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2);
              const canMsg = isLoggedIn && user?.id !== listing.user.id;
              return (
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-card-border">
                  <Link href={profHref} className="shrink-0">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={prof.name} className="w-11 h-11 rounded-full object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] flex items-center justify-center text-white text-sm font-bold">{isVoen ? "🏪" : initials}</div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={profHref} className="font-semibold text-sm hover:text-[var(--brand-to)] transition-colors truncate block">
                      {prof.name}{isVoen ? ` (№${listing.businessObject.id})` : ""}
                    </Link>
                    <div className="flex items-center gap-1.5 text-xs flex-wrap mt-0.5">
                      {posPercent != null && ratingCount > 0 ? (
                        <span className="text-green-600 font-semibold">👍 {posPercent}% müsbət</span>
                      ) : (
                        <span className="text-muted">Yeni satıcı</span>
                      )}
                      <span className="text-muted-foreground/50">·</span>
                      <Link href={profHref} className="text-muted hover:text-[var(--brand-to)] underline-offset-2 hover:underline">Digər elanları</Link>
                      {canMsg && (
                        <>
                          <span className="text-muted-foreground/50">·</span>
                          <a href="#message" className="text-muted hover:text-[var(--brand-to)] underline-offset-2 hover:underline">Chat</a>
                        </>
                      )}
                    </div>
                  </div>
                  <Link href={profHref} className="shrink-0 text-muted hover:text-[var(--brand-to)]" aria-label="Profilə bax">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                </div>
              );
            })()}

            {/* Çox böyük qiymətlər qutudan daşmasın: qısa format + tam dəyər title-da */}
            <div className="flex items-baseline flex-wrap gap-x-1.5 mb-3 min-w-0" title={`${formatPrice(listing.price)} ${t("azn")}`}>
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] bg-clip-text text-transparent break-words min-w-0">
                {formatPriceShort(listing.price)}
              </span>
              <span className="text-foreground/70 text-base font-semibold">{t("azn")}{listing.forRent ? " / icarə" : ""}</span>
            </div>
            {(listing.forRent || listing.barter || listing.bookable || listing.weightKg) && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {listing.forRent && <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-500 rounded-lg text-xs font-semibold">🔑 İcarəyə verilir</span>}
                {listing.barter && <span className="px-2.5 py-1 bg-purple-500/10 text-purple-500 rounded-lg text-xs font-semibold">🔄 Barter (dəyiş-düş) qəbul olunur</span>}
                {listing.bookable && <span className="px-2.5 py-1 bg-[var(--brand-soft)] text-[var(--brand-to)] rounded-lg text-xs font-semibold">📅 {listing.bookingType === "STAY" ? "Gecələmə bronu" : "Rezervasiya"}</span>}
                {listing.weightKg ? <span className="px-2.5 py-1 bg-input-bg text-muted rounded-lg text-xs font-semibold">⚖️ {listing.weightKg} kq</span> : null}
              </div>
            )}
            {/* Vəziyyət — eBay üslubu: qiymətin altında açıq göstərilir (yalnız uyğun kateqoriyalarda) */}
            {getListingFields(parseCat(listing.category).main).includes("condition") && listing.condition && (
              <div className="flex items-center gap-2 text-sm mb-3">
                <span className="text-muted">{t("condition")}:</span>
                <span className={`font-semibold ${listing.condition === 'NEW' ? 'text-green-600' : listing.condition === 'USED' ? 'text-[var(--brand-to)]' : 'text-blue-500'}`}>
                  {listing.condition === 'NEW' ? t("conditionNew") : listing.condition === 'USED' ? t("conditionUsed") : t("conditionRefurbished")}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted text-sm mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              </svg>
              {listing.category}
            </div>

            {/* Hissəli alış — yalnız BİZNES məhsullarında (şəxsi elanda taksit yoxdur) */}
            {installmentAllowed(listing.price * cartQty, isBusinessListing(listing)) && (
              <div className="mb-4">
                <InstallmentCalculator
                  amount={listing.price * cartQty}
                  value={installMonths}
                  onChange={setInstallMonths}
                />
              </div>
            )}

            {/* Owner actions — redaktə + sil */}
            {isLoggedIn && user?.id === listing.user.id && (
              <div className="flex gap-2 mb-3">
                <Link
                  href={`/account?edit=${listing.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] rounded-xl font-semibold text-white hover:brightness-110 transition-all shadow-lg shadow-[var(--brand-to)]/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t("editListing")}
                </Link>
                <button
                  onClick={handleDeleteListing}
                  disabled={deleting}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl font-semibold hover:bg-red-500/20 transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {t("delete") || "Sil"}
                </button>
              </div>
            )}

            {/* Bron / rezervasiya — sahib olmayanlar üçün */}
            {listing.bookable && user?.id !== listing.user.id && (
              <button onClick={() => { if (!isLoggedIn) { router.push("/"); return; } setBk((p) => ({ ...p, contactPhone: p.contactPhone || (user?.phone || "") })); setBookingOpen(true); }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] rounded-xl font-semibold text-white hover:brightness-110 transition-all shadow-lg shadow-[var(--brand-to)]/20 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {listing.bookingType === "STAY" ? "Otağı bron et" : "Bron et / Rezervasiya"}
              </button>
            )}

            {/* Stock Status & Add to Cart */}
            {!isService && (
              <>
                <div className={`flex items-center gap-2 mb-3 text-sm font-medium ${listing.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {listing.stock > 0 ? (listing.stock <= 5 ? `${t("onlyLeft")} ${listing.stock} ${t("items")}` : t("inStock")) : t("outOfStock")}
                </div>

                {/* VÖEN-siz (fərdi) elanlarda sayt üzərindən alış yoxdur — yalnız əlaqə (tap.az üslubu). */}
                {!listing.businessId && (
                  <>
                    <div className="mb-2 px-3 py-2 bg-input-bg border border-input-border rounded-xl text-muted text-xs text-center">
                      Bu fərdi elandır — satıcı ilə birbaşa əlaqə saxlayın (sayt üzərindən ödəniş yoxdur).
                    </div>
                    {user?.id !== listing.user.id && (
                      <button onClick={toggleFavorite} disabled={favBusy}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all mb-2 disabled:opacity-50 ${isFavorited ? "bg-[var(--brand-soft)] text-[var(--brand-to)] border border-[var(--brand-to)]/40" : "bg-input-bg border border-input-border text-foreground hover:border-[var(--brand-to)]/50"}`}>
                        <svg className="w-5 h-5" fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                        {isFavorited ? "Seçilmişlərdədir ✓" : "Seçilmişlərə əlavə et"}
                      </button>
                    )}
                  </>
                )}
                {/* Etibar plitələri — referans dizayn */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { icon: "🛡️", label: "Təhlükəsiz ödəniş", cls: "bg-emerald-500/10 text-emerald-600" },
                    { icon: "🚚", label: "Tez göndərmə", cls: "bg-sky-500/10 text-sky-600" },
                    { icon: "↩️", label: "Alıcı qoruması", cls: "bg-[var(--brand-soft)] text-[var(--brand-to)]" },
                  ].map((f) => (
                    <div key={f.label} className={`rounded-xl px-2 py-2.5 text-center ${f.cls}`}>
                      <div className="text-base leading-none mb-1">{f.icon}</div>
                      <div className="text-[10px] font-semibold leading-tight">{f.label}</div>
                    </div>
                  ))}
                </div>

                {listing.businessId && isLoggedIn && user?.id !== listing.user.id && listing.stock > 0 && (
                  <>
                    {cartAdded && <div className="mb-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-xs text-center">{t("addedToCart")}</div>}
                    <div className="flex items-center gap-2 mb-3">
                      <button onClick={() => setCartQty(Math.max(1, cartQty - 1))} className="w-8 h-8 bg-input-bg border border-input-border rounded-lg flex items-center justify-center hover:opacity-80">−</button>
                      <span className="flex-1 text-center font-medium">{cartQty}</span>
                      <button onClick={() => setCartQty(Math.min(listing.stock, cartQty + 1))} className="w-8 h-8 bg-input-bg border border-input-border rounded-lg flex items-center justify-center hover:opacity-80">+</button>
                    </div>
                    <button onClick={handleBuyNow} disabled={cartAdding}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl cta-gradient font-bold text-[15px] shadow-lg shadow-[var(--cta-from)]/25 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12A1.125 1.125 0 0119.75 21.75H4.25a1.125 1.125 0 01-1.119-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>
                      {t("buyNow")} — {formatPrice(listing.price * cartQty)} {t("azn")}
                    </button>
                    <button onClick={handleAddToCart} disabled={cartAdding}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-input-bg border border-input-border rounded-xl font-semibold text-foreground hover:border-[var(--brand-to)]/50 transition-all disabled:opacity-50 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                      {t("addToCart")}
                    </button>
                    {/* Watchlist (Seçilmişlər) — eBay üslubu üçüncü düymə */}
                    <button onClick={toggleFavorite} disabled={favBusy}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 ${isFavorited ? "bg-[var(--brand-soft)] text-[var(--brand-to)] border border-[var(--brand-to)]/40" : "bg-input-bg border border-input-border text-foreground hover:border-[var(--brand-to)]/50"}`}>
                      <svg className="w-5 h-5" fill={isFavorited ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                      {isFavorited ? "Seçilmişlərdədir ✓" : "Seçilmişlərə əlavə et"}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Satıcı / Obyekt kartı — VÖEN (obyektə bağlı) elanda OBYEKT məlumatı,
              fərdi (VÖEN-siz) elanda isə şəxsin məlumatı göstərilir. */}
          {listing.businessObject ? (
            <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6">
              <h3 className="font-semibold mb-4">Obyekt məlumatı</h3>
              <Link href={`/object/${listing.businessObject.id}`} className="flex items-center gap-3 mb-4 group">
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] rounded-xl flex items-center justify-center text-white text-xl shrink-0 group-hover:shadow-lg group-hover:shadow-[var(--brand-to)]/20 transition-all">🏪</div>
                <div className="min-w-0">
                  <p className="font-medium group-hover:text-[var(--brand-to)] transition-colors truncate">{listing.businessObject.name}</p>
                  <p className="text-muted text-xs truncate">
                    Obyekt №{listing.businessObject.id}{listing.businessObject.business?.name ? ` · ${listing.businessObject.business.name}` : ""}
                  </p>
                </div>
              </Link>

              {/* Obyektin reytinqi — obyekti açmadan burada görünür (5 ulduz + bəyən/bəyənmə %) */}
              {listing.businessObject.rating && listing.businessObject.rating.count > 0 ? (
                <Link href={`/object/${listing.businessObject.id}`} className="block mb-4 rounded-xl border border-card-border bg-input-bg/40 p-3 hover:border-[var(--brand-to)]/40 transition-colors">
                  <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1.5">
                    <span className="inline-flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={`text-sm leading-none ${n <= Math.round(listing.businessObject.rating.avg || 0) ? "text-amber-400" : "text-muted/30"}`}>★</span>
                      ))}
                    </span>
                    <span className="font-bold text-sm">{(listing.businessObject.rating.avg || 0).toFixed(1)}</span>
                    <span className="text-xs text-muted">({listing.businessObject.rating.count} rəy)</span>
                    {listing.businessObject.rating.likePercent != null && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-green-500/10 text-green-600">👍 {listing.businessObject.rating.likePercent}% müsbət</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted">
                    <span className="text-green-600 font-medium">👍 {listing.businessObject.rating.likes}</span>
                    <span className="text-red-500 font-medium">👎 {listing.businessObject.rating.dislikes}</span>
                    <span className="ml-auto text-[var(--brand-to)]">Rəyləri gör →</span>
                  </div>
                </Link>
              ) : (
                <p className="text-xs text-muted mb-4">⭐ Obyektin hələ reytinqi yoxdur</p>
              )}

              {(listing.businessObject.address || listing.businessObject.city) && (
                <div className="flex items-start gap-2 text-sm text-muted mb-3">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <div className="flex-1">
                    {listing.businessObject.city && (
                      <Link href={`/locations/${encodeURIComponent(listing.businessObject.city)}`} className="font-medium text-foreground hover:text-[var(--brand-to)] transition-colors">
                        {listing.businessObject.city}
                      </Link>
                    )}
                    {listing.businessObject.address && <p className="text-xs">{listing.businessObject.address}</p>}
                  </div>
                </div>
              )}

              {(listing.businessObject.latitude && listing.businessObject.longitude) && (
                <div className="mb-4">
                  <OrderMap
                    sellerLat={listing.businessObject.latitude}
                    sellerLng={listing.businessObject.longitude}
                    sellerLabel={listing.businessObject.name}
                    height="180px"
                  />
                </div>
              )}

            </div>
          ) : (
          <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6">
            <h3 className="font-semibold mb-4">{t("sellerInfo")}</h3>
            <Link href={`/seller/${listing.user.id}`} className="flex items-center gap-3 mb-4 group">
              {listing.user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${imgUrl(listing.user.avatar)}`} alt={listing.user.name} className="w-12 h-12 rounded-xl object-cover shrink-0 group-hover:shadow-lg group-hover:shadow-[var(--brand-to)]/20 transition-all" />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 group-hover:shadow-lg group-hover:shadow-[var(--brand-to)]/20 transition-all">
                  {listing.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
              )}
              <div>
                <p className="font-medium group-hover:text-[var(--brand-to)] transition-colors">{listing.user.name}</p>
                <p className="text-muted text-xs">{t("sellerProfile")} &rarr;</p>
              </div>
            </Link>
            {isLoggedIn && user?.id !== listing.user.id && (
              <div className="mb-3">
                <ComplaintButton listingId={listing.id} label="⚠ Bu məhsul haqqında şikayət et" className="text-xs text-red-500 hover:underline" />
              </div>
            )}
            {(listing.location || listing.city || listing.user.city) && (
              <div className="flex items-start gap-2 text-sm text-muted mb-3">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <div className="flex-1">
                  {(listing.city || listing.user.city) && (
                    <Link
                      href={`/locations/${encodeURIComponent(listing.city || listing.user.city)}`}
                      className="font-medium text-foreground hover:text-[var(--brand-to)] transition-colors"
                    >
                      {listing.city || listing.user.city}
                    </Link>
                  )}
                  {listing.location && <p className="text-xs">{listing.location}</p>}
                </div>
              </div>
            )}

            {/* Mini-map: shows where the seller is located. Uses listing's own
                lat/lng if set (e.g. workplace branch), otherwise falls back to
                the seller's profile pin. */}
            {((listing.latitude && listing.longitude) || (listing.user.latitude && listing.user.longitude)) && (
              <div className="mb-4">
                <OrderMap
                  sellerLat={listing.latitude || listing.user.latitude}
                  sellerLng={listing.longitude || listing.user.longitude}
                  sellerLabel={listing.user.name}
                  height="180px"
                />
              </div>
            )}

          </div>
          )}

          {/* Message Card */}
          <div id="message" className="bg-card border border-card-border rounded-2xl p-4 sm:p-6 scroll-mt-20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[var(--brand-to)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
              {t("sendMessage")}
            </h3>
            {isLoggedIn && user?.id !== listing.user.id ? (
              <>
                {msgSent && (
                  <div className="mb-3 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm text-center">
                    {t("messageSent")}
                  </div>
                )}
                <textarea
                  rows={3}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder={t("messagePlaceholder")}
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-to)]/50 placeholder-muted-foreground resize-none mb-3"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={msgSending || !msgText.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] rounded-xl font-medium text-white text-sm hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {msgSending ? "..." : t("sendMessage")}
                </button>
              </>
            ) : !isLoggedIn ? (
              <Link href="/" className="block text-center py-3 bg-input-bg border border-input-border rounded-xl text-sm text-muted hover:text-foreground transition-colors">
                {t("loginToMessage")}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* 1) Elanı paylaşanın (satıcı/obyekt) DİGƏR elanları — məhsul məlumatından
          sonra. Başlıq "əvvəl baxdıqlarınız" stilində: kiçik, solğun, adsız. */}
      {sellerListings.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 px-1 text-base sm:text-lg font-bold text-foreground">digər elanları</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {sellerListings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      {/* 2) Eyni kateqoriyada BAŞQA satıcıların elanları — ən altda */}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 px-1 text-base sm:text-lg font-bold text-foreground">eyni kateqoriyada başqa elanlar</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {related.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        </section>
      )}

      {/* ── Bron modalı ── */}
      {bookingOpen && listing.bookable && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4" onClick={() => setBookingOpen(false)}>
          <div className="bg-card border border-card-border w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">📅 {listing.bookingType === "STAY" ? "Gecələmə bronu" : "Rezervasiya"}</h3>
              <button onClick={() => setBookingOpen(false)} className="text-muted hover:text-foreground text-2xl leading-none">×</button>
            </div>
            <p className="text-xs text-muted mb-4 truncate">{listing.title}{listing.openTime && listing.bookingType === "RESERVATION" ? ` · ${listing.openTime}–${listing.closeTime || ""}` : ""}</p>

            <div className="space-y-3">
              {listing.bookingType === "STAY" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Giriş tarixi</label>
                      <input type="date" value={bk.checkIn} onChange={(e) => setBk({ ...bk, checkIn: e.target.value })} className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Çıxış tarixi</label>
                      <input type="date" value={bk.checkOut} onChange={(e) => setBk({ ...bk, checkOut: e.target.value })} className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Qonaq sayı</label>
                      <input type="number" min={1} value={bk.guests} onChange={(e) => setBk({ ...bk, guests: e.target.value })} className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Otaq sayı</label>
                      <input type="number" min={1} value={bk.rooms} onChange={(e) => setBk({ ...bk, rooms: e.target.value })} className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Tarix</label>
                      <input type="date" value={bk.date} onChange={(e) => setBk({ ...bk, date: e.target.value })} className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Saat</label>
                      <input type="time" value={bk.time} onChange={(e) => setBk({ ...bk, time: e.target.value })} className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Nəfər sayı</label>
                    <input type="number" min={1} value={bk.guests} onChange={(e) => setBk({ ...bk, guests: e.target.value })} className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Ad (istəyə bağlı)</label>
                <input value={bk.contactName} onChange={(e) => setBk({ ...bk, contactName: e.target.value })} placeholder="Adınız" className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Əlaqə nömrəsi *</label>
                <input value={bk.contactPhone} onChange={(e) => setBk({ ...bk, contactPhone: e.target.value })} placeholder="+994..." className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Qeyd (istəyə bağlı)</label>
                <textarea value={bk.note} onChange={(e) => setBk({ ...bk, note: e.target.value })} rows={2} placeholder="Əlavə istəklər..." className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm resize-none" />
              </div>

              <div className="px-3 py-2 bg-input-bg rounded-xl text-[11px] text-muted">ℹ️ Bu, bron sorğusudur — sahib təsdiqlədikdən sonra qüvvəyə minir. Ödəniş yerində olur.</div>

              <button onClick={submitBooking} disabled={bookingBusy}
                className="w-full py-3 bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-white rounded-xl font-semibold disabled:opacity-50">
                {bookingBusy ? "..." : "Bron sorğusu göndər"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
