"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import ListingCard from "@/components/ListingCard";
import ComplaintButton from "@/components/ComplaintButton";
import { API, UPLOADS } from "@/lib/api";
import { groupSelectedParts } from "@/lib/sellerCategories";
import { SOCIAL_META } from "@/lib/social";
import SocialIcon from "@/components/SocialIcon";

export default function SellerProfilePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token, isLoggedIn } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [reqBusy, setReqBusy] = useState<number | null>(null);
  // İxtisas bölməsindən gəlibsə (?from=ixtisas) → məhsul satışı gizlədilir, Rəy yönümlü kompakt profil.
  const [ixtisasMode, setIxtisasMode] = useState(false);
  useEffect(() => { setIxtisasMode(new URLSearchParams(window.location.search).get("from") === "ixtisas"); }, []);

  const requestConsultation = async (offerId: number) => {
    if (!isLoggedIn) { router.push("/"); return; }
    setReqBusy(offerId);
    try {
      const r = await fetch(`${API}/consultations/request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ offerId }),
      }).then((x) => x.json());
      if (r.success) {
        toast(r.needsVoen ? "Sorğu göndərildi (peşəkar VÖEN əlavə edənə qədər ödəniş donur)" : "Sorğu göndərildi ✓", "success");
        router.push(`/consultations/${r.session.id}`);
      } else toast(r.message || t("error"), "error");
    } catch { toast(t("error"), "error"); } finally { setReqBusy(null); }
  };

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

  const computeAge = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso); const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a >= 0 && a < 130 ? a : null;
  };
  const age = computeAge(user.birthDate);

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
              {user.type !== "CAR_OWNER" && (
                <span className={`px-3 py-1 bg-gradient-to-r ${typeColor} rounded-lg text-xs font-medium text-white`}>
                  {typeLabel}
                </span>
              )}
              {user.idVerifyStatus === "APPROVED" && (
                <span className="px-2.5 py-1 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium">✓ Təsdiqlənmiş</span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted mb-4">
              {!ixtisasMode && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {user.phone}
              </span>
              )}
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {t("sellerMember")}: {memberDate}
              </span>
              {user.gender && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  {user.gender}{age !== null ? `, ${age} yaş` : ""}
                </span>
              )}
              {!user.gender && age !== null && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  {age} yaş
                </span>
              )}
              {user.profession && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>
                  {user.profession}
                </span>
              )}
            </div>

            {user.bio && (
              <p className="text-sm text-foreground/80 mb-4 whitespace-pre-line max-w-prose">{user.bio}</p>
            )}

            {/* Rəy konsultasiyası təklifləri (çoxlu) */}
            {user.consultationOffers?.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs font-semibold text-muted flex items-center gap-1.5">🗣️ Rəy konsultasiyası</p>
                {user.consultationOffers.map((o: any) => (
                  <div key={o.id} className="p-3.5 bg-orange-500/5 border border-orange-500/30 rounded-xl flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{o.title || "Rəy konsultasiyası"}</p>
                      <p className="text-xs text-muted">{o.durationMinutes} dəq · <b className="text-foreground">{o.price} AZN</b></p>
                    </div>
                    <button onClick={() => requestConsultation(o.id)} disabled={reqBusy === o.id} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                      {reqBusy === o.id ? "..." : "Rəy al"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Profil haqqında şikayət */}
            <div className="mb-3">
              <ComplaintButton targetUserId={Number(params.id)} label="⚠ Bu profil haqqında şikayət et" className="text-xs text-muted hover:text-red-500" />
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

          {/* Stats — İxtisas rejimində məhsul saylarını göstərmirik (kompakt) */}
          {!ixtisasMode && (
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
          )}
        </div>
      </div>

      {/* İctimai CV və peşə sənədləri */}
      {(user.cvFile || user.professionDocuments?.length > 0) && (
        <div className="bg-card border border-card-border rounded-2xl p-5 sm:p-6 mb-6">
          <h2 className="text-base font-semibold mb-3">Sənədlər və ixtisas</h2>
          <div className="flex flex-wrap gap-2.5">
            {user.cvFile && (
              <a href={`${UPLOADS}/${user.cvFile}`} target="_blank" rel="noreferrer"
                 className="flex items-center gap-2 px-3.5 py-2 bg-input-bg border border-input-border rounded-xl text-sm hover:border-orange-500/50 transition-colors">
                <span>📄 CV-yə bax</span>
                <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded text-[11px] font-bold">YES</span>
              </a>
            )}
            {user.professionDocuments?.map((d: any) => (
              <a key={d.id} href={`${UPLOADS}/${d.image}`} target="_blank" rel="noreferrer"
                 className="flex items-center gap-2 px-3.5 py-2 bg-input-bg border border-input-border rounded-xl text-sm hover:border-orange-500/50 transition-colors">
                <span className="font-medium">{d.title}</span>
                {d.documentType && <span className="text-[11px] text-muted">· {d.documentType}</span>}
                <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded text-[11px] font-bold">YES</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* İxtisas rejimi: məhsul satışı yox — yalnız Rəy konsultasiyası */}
      {ixtisasMode ? (
        <div className="text-center py-8 text-muted text-sm bg-card border border-card-border rounded-2xl">
          {user.consultationOffers?.length > 0
            ? <>🗣️ Bu peşəkarla əlaqə <b className="text-foreground">Rəy konsultasiyası</b> üzərindən qurulur. Yuxarıdakı təklifdən «Rəy al» düyməsinə basın.</>
            : <>🗣️ Bu peşəkar hələ <b className="text-foreground">Rəy konsultasiyası</b> təklifi yaratmayıb. Daha sonra yenidən yoxlayın.</>}
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
