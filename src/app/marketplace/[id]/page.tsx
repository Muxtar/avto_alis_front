"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { useToast } from "@/components/Toast";
import { API, UPLOADS } from "@/lib/api";
import { countryLabel } from "@/lib/countries";
import OrderMap from "@/components/OrderMapWrapper";


export default function ListingDetailPage() {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const { user, token, isLoggedIn } = useAuth();
  const { addToCart } = useCart();
  const params = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [msgSent, setMsgSent] = useState(false);
  const [msgSending, setMsgSending] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [cartQty, setCartQty] = useState(1);
  const [cartAdding, setCartAdding] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const maskPhone = (phone: string | undefined | null) => {
    if (!phone) return "";
    let digitCount = 0;
    let result = "";
    for (const ch of phone) {
      if (/\d/.test(ch)) {
        digitCount++;
        result += digitCount <= 7 ? ch : "*";
      } else {
        result += ch;
      }
    }
    return result;
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
        body: JSON.stringify({ content: commentText }),
      });
      if (res.ok) {
        const data = await res.json();
        setListing({ ...listing, comments: [data.comment, ...(listing.comments || [])] });
        setCommentText("");
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.message || t('error'), 'error');
      }
    } catch { toast(t('error'), 'error'); } finally { setCommentSending(false); }
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
    fetch(`${API}/listings/${params.id}`)
      .then((r) => r.json())
      .then(setListing)
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
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
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Back */}
      <Link href="/elanlar" className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-400 mb-4 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t("backToMarket")}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Left - Image gallery */}
        <div className="lg:col-span-3">
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            <div className="aspect-video bg-input-bg flex items-center justify-center">
              {listing.images?.length > 0 ? (
                <img
                  src={(() => {
                    const img = listing.images[Math.min(activeImageIdx, listing.images.length - 1)];
                    return img.startsWith('http') ? img : `${UPLOADS}/${img}`;
                  })()}
                  loading="lazy"
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
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
                  const src = img.startsWith('http') ? img : `${UPLOADS}/${img}`;
                  const isActive = idx === Math.min(activeImageIdx, listing.images.length - 1);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border-2 transition-all ${
                        isActive ? "border-orange-500 shadow-md shadow-orange-500/25" : "border-transparent opacity-70 hover:opacity-100"
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

          {/* Specifications */}
          {!isService && (
            <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6 mt-4">
              <h3 className="font-semibold mb-3">{t("productInfo")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {listing.condition && (
                  <div>
                    <p className="text-muted text-xs mb-1">{t("condition")}</p>
                    <p className={`font-medium ${listing.condition === 'NEW' ? 'text-green-500' : listing.condition === 'USED' ? 'text-orange-500' : 'text-blue-500'}`}>
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
                      <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.375" /></svg>
                      {listing.forVehicle}
                    </p>
                  </div>
                )}
                {listing.unit && listing.unitValue && (
                  <div>
                    <p className="text-muted text-xs mb-1">{t("unitValue")}</p>
                    <p className="font-medium text-orange-500">
                      {listing.unitValue} {listing.unit === 'LITER' ? t("unitLiter") : listing.unit === 'KG' ? t("unitKg") : listing.unit === 'ML' ? t("unitMl") : listing.unit === 'PIECE' ? t("unitPiece") : listing.unit === 'METER' ? t("unitMeter") : listing.unit}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-muted text-xs mb-1">{t("stock")}</p>
                  <p className={`font-medium ${listing.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {listing.stock > 0 ? `${listing.stock} ${t("items")}` : t("outOfStock")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6 mt-4">
            <h3 className="font-semibold mb-3">{t("description")}</h3>
            <p className="text-muted text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-4 mt-4 p-4 bg-card border border-card-border rounded-2xl text-sm">
            <div className="flex items-center gap-1.5 text-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <span className="font-medium text-foreground">{listing.viewCount || 0}</span> {t("views")}
            </div>
            <div className="flex items-center gap-1.5 text-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <span className="font-medium text-foreground">{listing._count?.comments || listing.comments?.length || 0}</span> {t("comments")}
            </div>
            <div className="flex items-center gap-1.5 text-muted ml-auto">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {new Date(listing.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Comments */}
          <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6 mt-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {t("comments")} ({listing.comments?.length || 0})
            </h3>

            {isLoggedIn ? (
              <div className="mb-4 flex gap-2">
                <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                  placeholder={t("commentPlaceholder")}
                  className="flex-1 px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground" />
                <button onClick={handleAddComment} disabled={!commentText.trim() || commentSending}
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50">
                  {t("addComment")}
                </button>
              </div>
            ) : (
              <div className="mb-4 text-center py-3 bg-input-bg border border-input-border rounded-xl text-muted text-sm">
                <Link href="/" className="text-orange-500 hover:text-orange-400">{t("loginToComment")}</Link>
              </div>
            )}

            {listing.comments?.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">{t("noMessages")}</p>
            ) : (
              <div className="space-y-3">
                {listing.comments?.map((c: any) => (
                  <div key={c.id} className="flex gap-3 p-3 bg-input-bg/50 rounded-xl">
                    <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {c.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/seller/${c.user.id}`} className="font-medium text-sm hover:text-orange-500 transition-colors">{c.user.name}</Link>
                        <span className="text-muted text-[10px]">{new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-muted text-sm">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right - Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Price Card */}
          <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6">
            <div className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium mb-3 ${
              isService ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
            }`}>
              {isService ? t("service") : t("product")}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2">{listing.title}</h1>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl sm:text-3xl font-bold text-orange-500">{listing.price}</span>
              <span className="text-muted text-sm">{t("azn")}</span>
            </div>
            <div className="flex items-center gap-2 text-muted text-sm mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              </svg>
              {listing.category}
            </div>

            {/* Owner actions */}
            {isLoggedIn && user?.id === listing.user.id && (
              <Link
                href={`/account?edit=${listing.id}`}
                className="w-full flex items-center justify-center gap-2 py-3 mb-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white hover:brightness-110 transition-all shadow-lg shadow-orange-500/20"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t("editListing")}
              </Link>
            )}

            {/* Stock Status & Add to Cart */}
            {!isService && (
              <>
                <div className={`flex items-center gap-2 mb-3 text-sm font-medium ${listing.stock > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {listing.stock > 0 ? (listing.stock <= 5 ? `${t("onlyLeft")} ${listing.stock} ${t("items")}` : t("inStock")) : t("outOfStock")}
                </div>

                {isLoggedIn && user?.id !== listing.user.id && listing.stock > 0 && (
                  <>
                    {cartAdded && <div className="mb-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-xs text-center">{t("addedToCart")}</div>}
                    <div className="flex items-center gap-2 mb-3">
                      <button onClick={() => setCartQty(Math.max(1, cartQty - 1))} className="w-8 h-8 bg-input-bg border border-input-border rounded-lg flex items-center justify-center hover:opacity-80">−</button>
                      <span className="flex-1 text-center font-medium">{cartQty}</span>
                      <button onClick={() => setCartQty(Math.min(listing.stock, cartQty + 1))} className="w-8 h-8 bg-input-bg border border-input-border rounded-lg flex items-center justify-center hover:opacity-80">+</button>
                    </div>
                    <button onClick={handleBuyNow} disabled={cartAdding}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      {t("buyNow")}
                    </button>
                    <button onClick={handleAddToCart} disabled={cartAdding}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-input-bg border border-input-border rounded-xl font-semibold text-foreground hover:border-orange-500/50 transition-all disabled:opacity-50 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                      {t("addToCart")}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Seller Card */}
          <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6">
            <h3 className="font-semibold mb-4">{t("sellerInfo")}</h3>
            <Link href={`/seller/${listing.user.id}`} className="flex items-center gap-3 mb-4 group">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 group-hover:shadow-lg group-hover:shadow-orange-500/20 transition-all">
                {listing.user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="font-medium group-hover:text-orange-500 transition-colors">{listing.user.name}</p>
                <p className="text-muted text-xs">{t("sellerProfile")} &rarr;</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={() => setShowPhone(true)}
              className="text-muted text-sm mb-4 hover:text-orange-500 transition-colors cursor-pointer text-left"
              title={showPhone ? "" : "Nömrəni göstər"}
            >
              {showPhone ? (listing.phone || listing.user.phone) : maskPhone(listing.phone || listing.user.phone)}
            </button>

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
                      className="font-medium text-foreground hover:text-orange-500 transition-colors"
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
            {(listing.user.latitude && listing.user.longitude) && (
              <div className="mb-4">
                <OrderMap
                  sellerLat={listing.user.latitude}
                  sellerLng={listing.user.longitude}
                  sellerLabel={listing.user.name}
                  height="180px"
                />
              </div>
            )}

            <a
              href={`tel:${listing.phone || listing.user.phone}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-semibold text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              {t("contactSeller")}
            </a>
          </div>

          {/* Message Card */}
          <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
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
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground resize-none mb-3"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={msgSending || !msgText.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-medium text-white text-sm hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50"
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
    </div>
  );
}
