"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { API, imgUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { COUNTRY_BY_CODE } from "@/lib/countries";

interface Listing {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  type: "PRODUCT" | "SERVICE";
  images: string[];
  viewCount?: number;
  createdAt?: string;
  condition?: "NEW" | "USED" | "REFURBISHED";
  country?: string;
  brand?: string;
  stock?: number;
  forVehicle?: string;
  unit?: string;
  unitValue?: number;
  year?: number;
  model?: string;
  city?: string;
  fuelType?: "GASOLINE" | "DIESEL" | "HYBRID" | "ELECTRIC" | "GAS" | "OTHER";
  paymentType?: "CASH" | "CREDIT" | "BOTH";
  barter?: boolean;
  forRent?: boolean;
  user: { id?: number; name: string; avgRating?: number | null; ratingCount?: number };
  businessObject?: { id: number; name: string } | null;
  _count?: { comments: number; favorites?: number };
}

function timeAgo(dateStr: string, t: any): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return `${mins} ${t("minutesAgo")} ${t("timeAgo")}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${t("hoursAgo")} ${t("timeAgo")}`;
  const days = Math.floor(hours / 24);
  return `${days} ${t("daysAgo")} ${t("timeAgo")}`;
}

function isNew(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 3 * 24 * 60 * 60 * 1000;
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  const { user, token, isLoggedIn } = useAuth();
  const { addToCart } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const isService = listing.type === "SERVICE";
  const isOwner = isLoggedIn && user?.id === listing.user.id;
  const outOfStock = listing.stock !== undefined && listing.stock <= 0;
  const canBuy = !isService && isLoggedIn && !isOwner && !outOfStock;

  // Favori durumunu kontrol et
  useEffect(() => {
    if (!isLoggedIn || !token || isOwner) return;
    fetch(`${API}/favorites/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ listingIds: [listing.id] }),
    }).then(r => r.json()).then(d => {
      setIsFavorited((d.favorites || []).includes(listing.id));
    }).catch(() => {});
  }, [isLoggedIn, token, listing.id, isOwner]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) { window.location.href = "/"; return; }
    const newState = !isFavorited;
    setIsFavorited(newState);
    try {
      if (newState) {
        await fetch(`${API}/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ listingId: listing.id }),
        });
      } else {
        await fetch(`${API}/favorites/${listing.id}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      setIsFavorited(!newState); // geri al
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      window.location.href = "/";
      return;
    }
    setAdding(true);
    const result = await addToCart(listing.id, 1);
    if (result.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
    setAdding(false);
  };

  // İndi al — səbətə əlavə edib birbaşa səbətə/ödənişə keç.
  const buyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) { window.location.href = "/"; return; }
    setAdding(true);
    const result = await addToCart(listing.id, 1);
    setAdding(false);
    if (result.success) window.location.href = "/cart";
  };

  return (
    <Link href={`/marketplace/${listing.id}`} className="block group">
      <div className="surface card-hover overflow-hidden h-full flex flex-col">
        {/* Image */}
        <div className="aspect-square sm:aspect-[4/3] bg-input-bg overflow-hidden relative">
          {/* Favori butonu */}
          {!isOwner && (
            <button
              onClick={toggleFavorite}
              className="absolute top-2 right-2 z-10 p-1.5 bg-black/40 backdrop-blur-sm rounded-full hover:bg-black/60 transition-colors"
              aria-label="favorite"
            >
              {isFavorited ? (
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              )}
            </button>
          )}
          {listing.images.length > 0 ? (
            <img src={listing.images[0].startsWith('http') ? listing.images[0] : `${imgUrl(listing.images[0])}`} alt={listing.title} loading="lazy"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isService ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                )}
              </svg>
            </div>
          )}

          {/* Top Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md shadow-sm ${isService ? "bg-emerald-500/95 text-white" : "bg-orange-500/95 text-white"}`}>
                {isService ? t("service") : t("product")}
              </span>
              {listing.createdAt && isNew(listing.createdAt) && (
                <span className="px-2 py-0.5 bg-sky-500/95 text-white rounded-full text-[10px] font-semibold backdrop-blur-md shadow-sm">{t("newBadge")}</span>
              )}
              {listing.forRent && (
                <span className="px-2 py-0.5 bg-indigo-500/95 text-white rounded-full text-[10px] font-semibold backdrop-blur-md shadow-sm">🔑 İcarə</span>
              )}
              {listing.barter && (
                <span className="px-2 py-0.5 bg-purple-500/95 text-white rounded-full text-[10px] font-semibold backdrop-blur-md shadow-sm">🔄 Barter</span>
              )}
            </div>
            {listing.condition && !isService && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold w-fit backdrop-blur-md shadow-sm ${
                listing.condition === 'NEW' ? 'bg-emerald-600/95 text-white' :
                listing.condition === 'USED' ? 'bg-amber-600/95 text-white' :
                'bg-sky-600/95 text-white'
              }`}>
                {listing.condition === 'NEW' ? t("conditionNew") : listing.condition === 'USED' ? t("conditionUsed") : t("conditionRefurbished")}
              </span>
            )}
          </div>

          {/* Out of stock overlay */}
          {outOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">{t("outOfStock")}</span>
            </div>
          )}

          {/* View count */}
          {listing.viewCount !== undefined && listing.viewCount > 0 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded-md text-white text-[10px]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              {listing.viewCount}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col">
          {/* Brand + Country + Model + Year */}
          {(listing.brand || listing.country || listing.model || listing.year) && (
            <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground flex-wrap">
              {listing.brand && <span className="font-semibold text-muted">{listing.brand}</span>}
              {listing.country && (
                <span title={listing.country}>
                  {COUNTRY_BY_CODE[listing.country]?.flag || "🌍"}{" "}
                  {COUNTRY_BY_CODE[listing.country]?.az || listing.country}
                </span>
              )}
              {listing.model && <span>· {listing.model}</span>}
              {listing.year && <span>· {listing.year}</span>}
            </div>
          )}
          {/* City + Fuel + Payment */}
          {(listing.city || listing.fuelType || listing.paymentType) && (
            <div className="flex items-center gap-2 mb-1 text-[10px] text-muted-foreground flex-wrap">
              {listing.city && (
                <span className="inline-flex items-center gap-0.5">
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  {listing.city}
                </span>
              )}
              {listing.fuelType && <span>· {t(`fuel${listing.fuelType.charAt(0) + listing.fuelType.slice(1).toLowerCase()}` as any)}</span>}
              {listing.paymentType && <span>· {t(`payment${listing.paymentType.charAt(0) + listing.paymentType.slice(1).toLowerCase()}` as any)}</span>}
            </div>
          )}

          <h3 className="font-semibold text-sm sm:text-[15px] mb-1 line-clamp-1 group-hover:text-orange-500 transition-colors">{listing.title}</h3>

          {/* Vehicle + Unit info */}
          {(listing.forVehicle || (listing.unit && listing.unitValue)) && (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {listing.forVehicle && (
                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[10px] font-medium">
                  🚗 {listing.forVehicle}
                </span>
              )}
              {listing.unit && listing.unitValue && (
                <span className="px-1.5 py-0.5 bg-orange-500/10 text-orange-500 rounded text-[10px] font-medium">
                  {listing.unitValue} {listing.unit === 'LITER' ? t("unitLiter") : listing.unit === 'KG' ? t("unitKg") : listing.unit === 'ML' ? t("unitMl") : listing.unit === 'PIECE' ? t("unitPiece") : listing.unit === 'METER' ? t("unitMeter") : listing.unit}
                </span>
              )}
            </div>
          )}

          <p className="text-muted text-xs mb-2 line-clamp-2 flex-1">{listing.description}</p>

          {/* Price + Meta */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-baseline gap-0.5">
              <span className="brand-text font-bold text-lg leading-none">{formatPrice(listing.price)}</span>
              <span className="text-muted-foreground text-[11px] font-medium ml-0.5">{t("azn")}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
              {listing._count && listing._count.comments > 0 && (
                <span className="flex items-center gap-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  {listing._count.comments}
                </span>
              )}
              {listing.createdAt && <span>{timeAgo(listing.createdAt, t)}</span>}
            </div>
          </div>

          {/* Seller + Add to cart */}
          <div className="flex items-center justify-between gap-2">
            {listing.businessObject ? (
              /* VÖEN elan — məhsul obyektin adına satılır: şəxs yox, obyekt göstərilir */
              <span
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/object/${listing.businessObject!.id}`; }}
                className="text-muted-foreground text-xs flex items-center gap-1 hover:text-orange-500 transition-colors cursor-pointer truncate"
              >
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" /></svg>
                <span className="truncate">{listing.businessObject.name}</span>
                <span className="text-[10px] text-muted-foreground/70 shrink-0">№{listing.businessObject.id}</span>
              </span>
            ) : (
              <span
                onClick={(e) => { if (listing.user.id) { e.preventDefault(); e.stopPropagation(); window.location.href = `/seller/${listing.user.id}`; } }}
                className="text-muted-foreground text-xs flex items-center gap-1 hover:text-orange-500 transition-colors cursor-pointer truncate"
              >
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="truncate">{listing.user.name}</span>
                {listing.user.avgRating && (
                  <span className="flex items-center gap-0.5 text-amber-400 shrink-0 ml-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.3L5.8 21l1.6-7L2 9.2l7.2-.6L12 2l2.8 6.6 7.2.6-5.4 4.8 1.6 7z" /></svg>
                    <span className="text-[10px]">{listing.user.avgRating.toFixed(1)}</span>
                  </span>
                )}
              </span>
            )}
            {canBuy && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={buyNow}
                  disabled={adding}
                  className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  ⚡ İndi al
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={adding}
                  title={t("addToCart")}
                  className={`p-2 rounded-lg transition-all active:scale-95 ${
                    added ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25' : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white hover:shadow-md hover:shadow-orange-500/25'
                  } disabled:opacity-50`}
                >
                  {added ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
