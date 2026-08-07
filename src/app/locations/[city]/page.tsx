"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { API, imgUrl } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

interface Seller {
  id: number;
  name: string;
  type: string;
  avatar?: string | null;
  phone: string;
  avgRating: number | null;
  ratingCount: number;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  workplaces: { name: string; address: string }[];
  _count: { listings: number };
}

interface Listing {
  id: number;
  title: string;
  price: number;
  category: string;
  images: string[];
  type: string;
  user: { id: number; name: string; type: string };
}

const typeColor = (t: string) =>
  t === "MECHANIC" ? "from-green-500 to-emerald-600" : t === "PARTS_SELLER" ? "from-purple-500 to-violet-600" : "from-blue-500 to-blue-600";

export default function CityDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const city = decodeURIComponent(String(params.city || ""));
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sellers" | "listings">("sellers");

  const typeLabel = (type: string) =>
    type === "MECHANIC" ? t('userTypeMechanic') : type === "PARTS_SELLER" ? t('userTypePartsSeller') : t('userTypeCarOwner');

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    fetch(`${API}/search/by-city/${encodeURIComponent(city)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSellers(d.sellers || []);
          setListings(d.listings || []);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [city]);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
      <Link href="/locations" className="inline-flex items-center gap-1 text-sm text-muted hover:text-orange-500 transition-colors mb-3">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        {t('backToAllCities')}
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-2">
          📍 {city}
        </h1>
        <p className="text-muted text-sm">
          {t('cityStats').replace('{sellers}', String(sellers.length)).replace('{listings}', String(listings.length))}
        </p>
      </div>

      <div className="flex gap-1 bg-input-bg border border-input-border rounded-xl p-1 mb-5 w-fit">
        <button
          onClick={() => setTab("sellers")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "sellers" ? "bg-orange-500 text-white shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          {t('citySellersTab')} ({sellers.length})
        </button>
        <button
          onClick={() => setTab("listings")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "listings" ? "bg-orange-500 text-white shadow-sm" : "text-muted hover:text-foreground"
          }`}
        >
          {t('cityListingsTab')} ({listings.length})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === "sellers" ? (
        sellers.length === 0 ? (
          <div className="text-center py-12 surface text-muted">
            {t('noSellersInCity')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sellers.map((s) => (
              <Link
                key={s.id}
                href={`/seller/${s.id}`}
                className="surface p-4 hover:border-orange-500/40 transition-colors group flex gap-3"
              >
                {s.avatar ? (
                  <img src={imgUrl(s.avatar)} alt={s.name} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className={`w-14 h-14 bg-gradient-to-br ${typeColor(s.type)} rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0`}>
                    {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate group-hover:text-orange-500 transition-colors">{s.name}</h3>
                  </div>
                  {/* "Avtomobil sahibi" ümumi etiketi gizlədilir — yalnız usta/satıcı göstərilir. */}
                  {s.type !== "CAR_OWNER" && (
                    <span className={`inline-block px-2 py-0.5 bg-gradient-to-r ${typeColor(s.type)} rounded text-[10px] font-medium text-white mb-1`}>
                      {typeLabel(s.type)}
                    </span>
                  )}
                  {s.address && (
                    <p className="text-xs text-muted truncate">{s.address}</p>
                  )}
                  {!s.address && s.workplaces[0]?.address && (
                    <p className="text-xs text-muted truncate">{s.workplaces[0].address}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted">
                    <span>{s._count.listings} {t('listingsCount')}</span>
                    {s.avgRating && (
                      <span>⭐ {s.avgRating.toFixed(1)} ({s.ratingCount})</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : listings.length === 0 ? (
        <div className="text-center py-12 surface text-muted">
          {t('noListingsInCity')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {listings.map((l) => (
            <Link
              key={l.id}
              href={`/marketplace/${l.id}`}
              className="bg-card border border-card-border rounded-xl overflow-hidden flex flex-col group hover:border-orange-500/30 transition-colors"
            >
              <div className="aspect-[4/3] bg-input-bg overflow-hidden relative">
                {l.images && l.images.length > 0 ? (
                  <img
                    src={l.images[0].startsWith("http") ? l.images[0] : `${imgUrl(l.images[0])}`}
                    alt={l.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">—</div>
                )}
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${l.type === "SERVICE" ? "bg-emerald-500 text-white" : "bg-orange-500 text-white"}`}>
                  {l.type === "SERVICE" ? t('service') : t('product')}
                </span>
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <span className="px-1.5 py-0.5 bg-input-bg border border-input-border rounded text-[10px] w-fit mb-1.5 truncate max-w-full">{l.category}</span>
                <h3 className="font-medium text-sm truncate">{l.title}</h3>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-orange-500 font-bold text-sm">{l.price} AZN</span>
                  <span className="text-[10px] text-muted truncate ml-2">{l.user.name}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
