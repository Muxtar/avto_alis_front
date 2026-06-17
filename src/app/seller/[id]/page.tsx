"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import ListingCard from "@/components/ListingCard";
import { API, UPLOADS } from "@/lib/api";
import { groupSelectedParts } from "@/lib/sellerCategories";
import { SOCIAL_META } from "@/lib/social";
import SocialIcon from "@/components/SocialIcon";

export default function SellerProfilePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`${API}/sellers/${params.id}`)
      .then((r) => r.json())
      .then(setData)
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

  if (!data?.user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-muted">{t("adminNoData")}</p>
      </div>
    );
  }

  const { user, listings, stats } = data;
  const typeLabel = user.type === "MECHANIC" ? t("tabMechanic") : user.type === "PARTS_SELLER" ? t("tabPartsSeller") : t("tabCarOwner");
  const typeColor = user.type === "MECHANIC" ? "from-green-500 to-emerald-600" : user.type === "PARTS_SELLER" ? "from-purple-500 to-violet-600" : "from-blue-500 to-blue-600";
  const memberDate = new Date(user.createdAt).toLocaleDateString("az-AZ", { year: "numeric", month: "long", day: "numeric" });

  const filteredListings = typeFilter === "all" ? listings : listings.filter((l: any) => l.type === typeFilter);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Back */}
      <Link href="/elanlar" className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-400 mb-4 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t("backToMarket")}
      </Link>

      {/* Seller Profile Card */}
      <div className="bg-card border border-card-border rounded-2xl p-5 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${UPLOADS}/${user.avatar}`} alt={user.name} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-full shrink-0 shadow-lg ring-4 ring-card" />
          ) : (
            <div className={`w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br ${typeColor} rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl shrink-0 shadow-lg ring-4 ring-card`}>
              {user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
          )}

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold">{user.name}</h1>
              <span className={`px-3 py-1 bg-gradient-to-r ${typeColor} rounded-lg text-xs font-medium text-white`}>
                {typeLabel}
              </span>
              {user.idVerifyStatus === "APPROVED" && (
                <span className="px-2.5 py-1 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium">✓ Təsdiqlənmiş</span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted mb-4">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {user.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {t("sellerMember")}: {memberDate}
              </span>
            </div>

            {/* Workplaces */}
            {user.workplaces?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {user.workplaces.map((w: any) => (
                  <div key={w.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs">
                    <svg className="w-3.5 h-3.5 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span className="font-medium">{w.name}</span>
                    <span className="text-muted">- {w.address}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Təsdiqlənmiş sosial media hesabları */}
            {user.socialLinks?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {user.socialLinks.map((s: any) => {
                  const meta = SOCIAL_META[s.platform] || { label: s.platform, icon: "🔗" };
                  return (
                    <a key={s.platform} href={s.url} target="_blank" rel="noreferrer"
                       className="flex items-center gap-1.5 px-3 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs hover:border-orange-500/50 transition-colors">
                      <SocialIcon platform={s.platform} className="w-4 h-4" />
                      <span className="font-medium">{meta.label}</span>
                      <span className="text-green-500">✓</span>
                    </a>
                  );
                })}
              </div>
            )}

            {/* Xidmət markaları */}
            {(user.serviceAllBrands || user.serviceBrands?.length > 0) && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted mb-1.5">{t("serviceBrandsTitle")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {user.serviceAllBrands ? (
                    <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 rounded-lg text-xs font-medium text-orange-500">
                      {t("allBrands")}
                    </span>
                  ) : (
                    user.serviceBrands.map((b: string) => (
                      <span key={b} className="px-2.5 py-1 bg-input-bg border border-input-border rounded-lg text-xs font-medium">{b}</span>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* İxtisas kateqoriyaları */}
            {user.serviceCategories?.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-muted">{t("serviceCategoriesTitle")}</p>
                {groupSelectedParts(user.serviceCategories).map(({ category, parts }) => (
                  <div key={category.id}>
                    <p className="text-xs font-medium mb-1">{category.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {parts.map((p) => (
                        <span key={p.id} className="px-2.5 py-1 bg-input-bg border border-input-border rounded-lg text-[11px] text-muted">{p.name}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-4 sm:gap-6 shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{stats.totalListings}</p>
              <p className="text-xs text-muted">{t("sellerAllListings")}</p>
            </div>
            {stats.totalProducts > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-400">{stats.totalProducts}</p>
                <p className="text-xs text-muted">{t("productsFilter")}</p>
              </div>
            )}
            {stats.totalServices > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">{stats.totalServices}</p>
                <p className="text-xs text-muted">{t("servicesFilter")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter + Listings */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t("sellerListings")}</h2>
        <div className="flex gap-1 bg-input-bg border border-input-border rounded-xl p-1">
          {[
            { id: "all", label: t("all") },
            { id: "PRODUCT", label: t("productsFilter") },
            { id: "SERVICE", label: t("servicesFilter") },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setTypeFilter(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                typeFilter === btn.id ? "bg-orange-500 text-white shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {filteredListings.length === 0 ? (
        <div className="text-center py-16 text-muted">{t("noResults")}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredListings.map((listing: any) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
