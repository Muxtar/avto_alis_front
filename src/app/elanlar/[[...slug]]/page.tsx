"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import ListingCard from "@/components/ListingCard";
import HomeCarousel from "@/components/HomeCarousel";
import SideBanners from "@/components/SideBanners";
import TrustBar from "@/components/TrustBar";
import RecentlyViewed from "@/components/RecentlyViewed";
import AddListingMenu from "@/components/AddListingMenu";
import ShareButton from "@/components/ShareButton";
import CategoryIcon, { SubCategoryIcon } from "@/components/CategoryIcon";
import CategoryFilterPanel from "@/components/CategoryFilterPanel";
import CategoryMegaMenu from "@/components/CategoryMegaMenu";
import { API, imgUrl } from "@/lib/api";
import { getSocket } from "@/lib/callSocket";
import { FUEL_TYPES, PAYMENT_TYPES } from "@/lib/cities";
import { CATEGORIES, parseCat, buildCat, catToSlugs, slugsToCat } from "@/lib/categories";
import { IXTISAS_SECTORS } from "@/lib/ixtisas";

type TypeFilter = "all" | "PRODUCT" | "SERVICE" | "PROFESSION" | "GROUP_BUY";

export default function MarketplacePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <MarketplacePage />
    </Suspense>
  );
}

function MarketplacePage() {
  const { t } = useLanguage();
  const { isLoggedIn, token } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  // URL slug → seçilmiş kateqoriya (/elanlar/elektronika/audio-video).
  const slugKey = Array.isArray((params as any)?.slug)
    ? ((params as any).slug as string[]).join("/")
    : ((params as any)?.slug || "");
  // Kateqoriya kartına klikləyəndə URL-i dəyişdir (state slug-dan törəyir).
  //
  // AXTARIŞ SAXLANILIR: əvvəl bura yalnız `/elanlar` yazılırdı, ona görə
  // «Məhsullar → Xidmətlər» sekməsinə keçəndə (goCat(null)) URL-dən `?search=`
  // düşürdü və axtarış İTİRDİ — istifadəçi «xidmət axtarışında saytdakı
  // nəticələr çıxmır» vəziyyəti ilə qarşılaşırdı.
  // gbMode — «Birgə alış» bölməsi URL-də saxlanır (?type=GROUP_BUY): kateqoriya
  // dəyişəndə və səhifə yenilənəndə bölmə itmir.
  const goCat = (cat: string | null, gbMode?: boolean) => {
    const slugs = cat ? catToSlugs(cat) : [];
    const base = slugs.length ? `/elanlar/${slugs.join("/")}` : "/elanlar";
    const q = new URLSearchParams();
    if (searchQuery.trim()) q.set("search", searchQuery.trim());
    if (gbMode ?? activeType === "GROUP_BUY") q.set("type", "GROUP_BUY");
    const qs = q.toString();
    router.push(qs ? `${base}?${qs}` : base);
  };

  const [listings, setListings] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  // Üst axtarışdan ixtisas/ad üzrə tapılan mütəxəssislər (məhsul/xidmət rejimində də göstərilir)
  const [matchedPros, setMatchedPros] = useState<any[]>([]);
  /* İNTERNET NƏTİCƏLƏRİ — saytdakı elanlardan SONRA, ayrıca bölmədə.
     Sayt nəticələri həmişə yuxarıda qalır; internet nəticələri onları
     əvəz etmir, aşağıda əlavə olunur. Sorğu 12 saat serverdə keşlənir. */
  const [webResults, setWebResults] = useState<any[]>([]);
  const [webSummary, setWebSummary] = useState("");
  const [webLoading, setWebLoading] = useState(false);
  const [webNeedLogin, setWebNeedLogin] = useState(false);
  const webForQuery = useRef("");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<TypeFilter>("PRODUCT");
  /* İstifadəçi növ düyməsinə (Məhsullar / Xidmətlər) ÖZÜ basıbmı.
     Axtarışda basmayıbsa həm məhsul, həm xidmət göstərilir: ana ekrandakı
     axtarış «məhsul və xidmət» axtarışıdır, açılışda isə növ PRODUCT olduğu
     üçün xidmət elanları nəticələrdən kənarda qalırdı. */
  const [typeTouched, setTypeTouched] = useState(false);
  // Kateqoriya gridini yığcam göstər (çox olduqda "Daha çox" ilə aç).
  const [showAllCats, setShowAllCats] = useState(false);
  const COLLAPSED_CATS = 11;
  const SHOW_TAPAZ_GRID: boolean = false; // tap.az grid söndürülüb — kateqoriyalar sol paneldədir
  // Ana səhifə = kateqoriya seçilməyib və axtarış yoxdur.
  const isHome = !selectedCategory && !searchQuery.trim() && activeType !== "GROUP_BUY";
  const isGroupBuy = activeType === "GROUP_BUY";
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Filterler
  const [conditionFilter, setConditionFilter] = useState<string>("");
  const [brandFilter, setBrandFilter] = useState<string>("");
  const [modelFilter, setModelFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [fuelFilter, setFuelFilter] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [minYear, setMinYear] = useState<string>("");
  const [maxYear, setMaxYear] = useState<string>("");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "priceAsc" | "priceDesc" | "popular" | "yearAsc" | "yearDesc">("newest");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Aktiv filter sayini hesabla (badge ucun)
  const activeFilterCount = [conditionFilter, brandFilter, modelFilter, cityFilter, fuelFilter, paymentFilter, minYear, maxYear, minPrice, maxPrice].filter(Boolean).length;

  const resetFilters = () => {
    setConditionFilter(""); setBrandFilter(""); setModelFilter("");
    setCityFilter(""); setFuelFilter(""); setPaymentFilter("");
    setMinYear(""); setMaxYear(""); setMinPrice(""); setMaxPrice("");
  };

  // Fetch categories once
  useEffect(() => {
    fetch(`${API}/listings/categories`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => { toast(t('error'), 'error'); });
  }, []);

  // «Birgə alış» bölməsi URL ilə sinxron: ?type=GROUP_BUY varsa açılır; başqa
  // linklə (məs. header kataloqu) gəlinəndə bölmədən çıxılır.
  useEffect(() => {
    const ty = searchParams.get("type");
    if (ty === "GROUP_BUY") setActiveType("GROUP_BUY");
    else setActiveType((cur) => (cur === "GROUP_BUY" ? "PRODUCT" : cur));
  }, [searchParams]);

  // Header axtarışı (?search=) reaktiv sinxronlaşır — istifadəçi /elanlar-da olsa belə yenilənir.
  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  // Digər URL paramlarını mount-da oxu (GlobalSearchBar yönləndirmələri üçün).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("brand")) setBrandFilter(p.get("brand") || "");
    if (p.get("model")) setModelFilter(p.get("model") || "");
    if (p.get("city")) setCityFilter(p.get("city") || "");
    if (p.get("year")) {
      setMinYear(p.get("year") || "");
      setMaxYear(p.get("year") || "");
    }
    if (p.get("type")) setActiveType((p.get("type") || "PRODUCT") as TypeFilter);
  }, []);

  // URL slug dəyişəndə seçilmiş kateqoriyanı sinxronla (mount + naviqasiya).
  useEffect(() => {
    const arr = slugKey ? slugKey.split("/") : [];
    setSelectedCategory(slugsToCat(arr) || null);
  }, [slugKey]);

  // Grid konteksti dəyişəndə (kateqoriya/tip) yenidən yığcam göstər.
  useEffect(() => { setShowAllCats(false); }, [slugKey, activeType]);

  // Saytdakı nəticələr göstərildikdən sonra internetdən də axtar.
  const runWebSearch = async (q: string) => {
    if (!q || webForQuery.current === q) return;
    webForQuery.current = q;
    setWebResults([]); setWebSummary(""); setWebNeedLogin(false);
    if (!token) { setWebNeedLogin(true); return; }
    setWebLoading(true);
    try {
      const r = await fetch(`${API}/search/web`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: q, mode: "product" }),
      }).then((x) => x.json());
      if (r?.success) { setWebResults(r.results || []); setWebSummary(r.summary || ""); }
      else setWebSummary(r?.message || "İnternetdə nəticə tapılmadı.");
    } catch { setWebSummary("İnternet axtarışı alınmadı."); } finally { setWebLoading(false); }
  };
  // Axtarış dəyişəndə (debounce ilə) internet bölməsi də yenilənir.
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || activeType === "PROFESSION") { setWebResults([]); setWebSummary(""); setWebNeedLogin(false); webForQuery.current = ""; return; }
    const id = setTimeout(() => runWebSearch(q), 900);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeType]);

  const buildParams = (pageNum: number) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (selectedCategory) params.set("category", selectedCategory);
    // Axtarış var və növ əl ilə seçilməyibsə — məhsul + xidmət birlikdə.
    if (activeType === "GROUP_BUY") { params.set("type", "PRODUCT"); params.set("groupBuy", "1"); }
    else if (activeType !== "all" && !(searchQuery.trim() && !typeTouched)) params.set("type", activeType);
    if (conditionFilter) params.set("condition", conditionFilter);
    if (brandFilter) params.set("brand", brandFilter);
    if (modelFilter) params.set("model", modelFilter);
    if (cityFilter) params.set("city", cityFilter);
    if (fuelFilter) params.set("fuelType", fuelFilter);
    if (paymentFilter) params.set("paymentType", paymentFilter);
    if (minYear) params.set("min_year", minYear);
    if (maxYear) params.set("max_year", maxYear);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    const sortMap: Record<string, string> = {
      newest: "date_desc",
      priceAsc: "price_asc",
      priceDesc: "price_desc",
      popular: "popular",
      yearAsc: "year_asc",
      yearDesc: "year_desc",
    };
    params.set("sort", sortMap[sortBy] || "date_desc");
    params.set("limit", "20");
    params.set("page", String(pageNum));
    return params;
  };

  // Fetch first page on filter change (debounced). Resets pagination.
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (page !== 1) setPage(1);
    searchTimeout.current = setTimeout(() => {
      setLoading(true);
      // İxtisas rejimi → mütəxəssis axtarışı (peşəyə görə).
      if (activeType === "PROFESSION") {
        const p = new URLSearchParams();
        if (searchQuery) p.set("q", searchQuery);
        if (cityFilter) p.set("city", cityFilter);
        fetch(`${API}/professionals?${p.toString()}`)
          .then((r) => r.json())
          .then((data) => { setProfessionals(data.professionals || []); setTotalPages(0); })
          .catch(() => { toast(t('error'), 'error'); })
          .finally(() => setLoading(false));
        return;
      }
      fetch(`${API}/listings?${buildParams(1)}`)
        .then((r) => r.json())
        .then((data) => {
          setListings(data.listings || []);
          setTotalPages(data.totalPages || 0);
        })
        .catch(() => { toast(t('error'), 'error'); })
        .finally(() => setLoading(false));
      // Axtarış varsa — həmin XİDMƏTİ verən mütəxəssisləri də tap (növ seçmədən).
      // `match=profession`: ad üzrə axtarış ana səhifəyə deyil, chat-a aiddir;
      // burada yalnız peşə (xidmət) uyğunluğu axtarılır.
      if (searchQuery.trim()) {
        const pp = new URLSearchParams(); pp.set("q", searchQuery.trim()); pp.set("match", "profession"); if (cityFilter) pp.set("city", cityFilter);
        fetch(`${API}/professionals?${pp.toString()}`).then((r) => r.json()).then((d) => setMatchedPros(d.professionals || [])).catch(() => {});
      } else setMatchedPros([]);
    }, 300);

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, activeType, typeTouched, sortBy, conditionFilter, brandFilter, modelFilter, cityFilter, fuelFilter, paymentFilter, minYear, maxYear, minPrice, maxPrice]);

  // Fetch additional pages when `page` increments past 1.
  useEffect(() => {
    if (page === 1) return;
    setLoadingMore(true);
    fetch(`${API}/listings?${buildParams(page)}`)
      .then((r) => r.json())
      .then((data) => {
        const next = data.listings || [];
        setListings((prev) => [...prev, ...next]);
        setTotalPages(data.totalPages || 0);
      })
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const hasMore = page < totalPages;
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll: increment page when sentinel scrolls into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "300px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading]);

  /* ── ANLIQ VİTRİN ──
     Admin elanı təsdiqləyəndə (və ya elan/biznes gizlədiləndə) server
     `public:listings` göndərir. İstifadəçi siyahının başındadırsa birinci
     səhifə səssizcə təzələnir. Aşağı sürüşdürübsə siyahını əlinin altından
     dəyişmirik — yuxarıda "Yeni elanlar" düyməsi çıxır. */
  const [freshAvailable, setFreshAvailable] = useState(false);
  const reloadFirstPage = () => {
    if (activeType === "PROFESSION") return;
    fetch(`${API}/listings?${buildParams(1)}`)
      .then((r) => r.json())
      .then((data) => {
        setListings(data.listings || []);
        setTotalPages(data.totalPages || 0);
        setPage(1);
        setFreshAvailable(false);
      })
      .catch(() => {});
  };
  const liveRef = useRef({ reload: reloadFirstPage, page, loading });
  useEffect(() => { liveRef.current = { reload: reloadFirstPage, page, loading }; });
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Tab gizli ikən gələn xəbər — tab-a qayıdanda emal olunur.
    let pendingReason: string | null = null;
    const apply = (reason?: string) => {
      const { reload, page: pg, loading: busy } = liveRef.current;
      if (busy) return;
      const atTop = window.scrollY < 400 && pg === 1;
      if (atTop) reload();
      else if (reason === "approved") setFreshAvailable(true);
    };
    const onPublic = (e: { reason?: string }) => {
      if (timer) clearTimeout(timer);
      // Hamı eyni anda sorğu göndərməsin — kiçik təsadüfi gecikmə.
      timer = setTimeout(() => {
        timer = null;
        if (document.visibilityState === "hidden") {
          // "approved" daha vacibdir — "removed" onu üstələməsin.
          if (pendingReason !== "approved") pendingReason = e?.reason || "removed";
          return;
        }
        apply(e?.reason);
      }, 500 + Math.random() * 1500);
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !pendingReason) return;
      const r = pendingReason;
      pendingReason = null;
      apply(r);
    };
    socket.on("public:listings", onPublic);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      socket.off("public:listings", onPublic);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token]);

  // Chat başlığındakı seg-tabs üslubu — hər bölmənin nazik xətli ikonu var.
  const segIco = (d: string) => (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d={d} /></svg>
  );
  const typeButtons: { id: TypeFilter; label: string; icon: React.ReactNode }[] = [
    { id: "PRODUCT", label: t("productsFilter"), icon: segIco("M21 8 12 3 3 8m18 0v8l-9 5m9-13-9 5m0 8-9-5V8m9 13v-8M3 8l9 5") },
    { id: "SERVICE", label: t("servicesFilter"), icon: segIco("M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z") },
    { id: "PROFESSION", label: "İxtisas", icon: segIco("M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1ZM10 5h4v2h-4V5Zm-7 7h18") },
    { id: "GROUP_BUY", label: "Birgə alış", icon: segIco("M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20v-1a4 4 0 0 0-3-3.9M15 4.1a3.5 3.5 0 0 1 0 6.8") },
  ];

  const compactInput = "w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 placeholder-muted-foreground";

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)]">
      {freshAvailable && (
        <button
          onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); reloadFirstPage(); }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-orange-500 text-white text-sm font-semibold shadow-lg hover:bg-orange-600"
        >
          ⬆ Yeni elanlar var
        </button>
      )}
      {/* Hero / Search Section */}
      <div className="hero-bg border-b border-card-border">
        <div className="page-wrap py-2 sm:py-2.5">
          {/* Tək sətirli yığcam alət paneli — başlıq legv edildi ki, karusel
              headerə mümkün qədər yaxın olsun. */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="seg-tabs shrink-0 w-full sm:w-auto [&_svg]:hidden sm:[&_svg]:block" role="tablist" aria-label="Bölmələr">
              {typeButtons.map((btn) => (
                <button
                  key={btn.id}
                  role="tab"
                  aria-selected={activeType === btn.id}
                  onClick={() => { setActiveType(btn.id); setTypeTouched(true); goCat(btn.id === "GROUP_BUY" ? selectedCategory : null, btn.id === "GROUP_BUY"); }}
                  className={`seg-tab px-1.5 sm:px-3.5 ${activeType === btn.id ? "is-active" : ""}`}
                >
                  {btn.icon}{btn.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-w-0 hidden sm:block" />

            <Link
              href="/locations"
              className="inline-flex shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2 bg-input-bg border border-input-border rounded-xl text-xs sm:text-sm font-semibold hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-500 transition-all whitespace-nowrap"
              title={t("locationsTitle")}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="hidden xs:inline">{t("browseByLocation")}</span>
            </Link>
            <AddListingMenu />

            {(selectedCategory || searchQuery.trim() || isGroupBuy) ? (
              <div className="relative shrink-0">
                <button type="button" onClick={() => setSortOpen((v) => !v)}
                  className="inline-flex items-center gap-2 px-4 py-2 input-base text-sm font-medium hover:border-primary transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7h18M6 12h12M10 17h4" /></svg>
                  Sıralama
                </button>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setSortOpen(false)} />
                    <div className="absolute right-0 mt-1 z-30 w-48 bg-card border border-card-border shadow-xl p-1">
                      {[
                        { v: "newest", l: "Tarix üzrə" },
                        { v: "priceDesc", l: "Öncə baha" },
                        { v: "priceAsc", l: "Öncə ucuz" },
                      ].map((o) => (
                        <button key={o.v} onClick={() => { setSortBy(o.v as any); setSortOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-input-bg transition-colors ${sortBy === o.v ? "text-primary font-semibold" : ""}`}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {/* Aktiv axtarış göstəricisi (header-dən gələn) — təmizləmək üçün */}
          {searchQuery && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 text-orange-500 border border-orange-500/30 rounded-lg text-sm font-medium">
                «{searchQuery}» üçün nəticələr
                <button onClick={() => router.push(slugKey ? `/elanlar/${slugKey}` : "/elanlar")} className="hover:text-orange-400" title="Təmizlə">✕</button>
              </span>
            </div>
          )}

        </div>
      </div>

      {/* tap.az üslublu kateqoriya gridi söndürüldü — kateqoriyalar artıq sol paneldədir (umico üslubu). */}
      {SHOW_TAPAZ_GRID && activeType !== "PROFESSION" && (
      <div className="border-b border-card-border bg-card/30">
        <div className="page-wrap py-5 sm:py-6">
          {(() => {
            const selMain = selectedCategory ? parseCat(selectedCategory).main : "";
            const cat = CATEGORIES.find((c) => c.name === selMain);
            // Çox kateqoriya olduqda yığcam göstər + "Daha çox" düyməsi.
            const moreBtn = (total: number) => total > COLLAPSED_CATS ? (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setShowAllCats((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-orange-500 bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-all"
                >
                  {showAllCats ? t("showLessCats") : `${t("showMoreCats")} (+${total - COLLAPSED_CATS})`}
                  <svg className={`w-4 h-4 transition-transform ${showAllCats ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
            ) : null;
            if (!cat) {
              // Xidmətlər seçilibsə → xidmət alt-kateqoriyaları kart kimi.
              if (activeType === "SERVICE") {
                const svc = CATEGORIES.find((c) => c.service)!;
                const visible = showAllCats ? svc.subs : svc.subs.slice(0, COLLAPSED_CATS);
                return (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                      {visible.map((s) => (
                        <button
                          key={s.name}
                          onClick={() => goCat(buildCat(svc.name, s.name))}
                          className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-card-border hover:border-orange-500/50 hover:shadow-md transition-all text-center group"
                        >
                          <SubCategoryIcon name={s.name} parent={svc.name} className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform" />
                          <span className="text-[11px] sm:text-xs font-medium leading-tight">{s.name}</span>
                        </button>
                      ))}
                    </div>
                    {moreBtn(svc.subs.length)}
                  </>
                );
              }
              // Məhsullar → xidmət kateqoriyası xaric; Hamısı → hamısı.
              const mains = activeType === "PRODUCT" || activeType === "GROUP_BUY" ? CATEGORIES.filter((c) => !c.service) : CATEGORIES;
              const visible = showAllCats ? mains : mains.slice(0, COLLAPSED_CATS);
              return (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                    {visible.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => goCat(c.name)}
                        className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-card-border hover:border-orange-500/50 hover:shadow-md transition-all text-center group"
                      >
                        <CategoryIcon name={c.name} className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] sm:text-xs font-medium leading-tight">{c.name}</span>
                      </button>
                    ))}
                  </div>
                  {moreBtn(mains.length)}
                </>
              );
            }
            const sub = parseCat(selectedCategory).sub;
            const cardBase = "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-center group";
            const cardOn = "bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/25 shadow-md";
            const cardOff = "bg-card border-card-border hover:border-orange-500/50 hover:shadow-md";
            return (
              <div>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <button onClick={() => goCat(null)} className="flex items-center gap-1 text-sm text-orange-500 font-medium hover:text-orange-400">
                    ← {t("allCategories")}
                  </button>
                  <span className="text-muted">/</span>
                  <CategoryIcon name={cat.name} className="w-5 h-5" />
                  <h2 className="font-bold text-base sm:text-lg">{cat.name}</h2>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                  <button onClick={() => goCat(cat.name)} className={`${cardBase} ${!sub ? cardOn : cardOff}`}>
                    <CategoryIcon name={cat.name} className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] sm:text-xs font-medium leading-tight">{t("allCategories")}</span>
                  </button>
                  {(showAllCats ? cat.subs : cat.subs.slice(0, COLLAPSED_CATS)).map((s) => (
                    <button
                      key={s.name}
                      onClick={() => goCat(buildCat(cat.name, s.name))}
                      className={`${cardBase} ${sub === s.name ? cardOn : cardOff}`}
                    >
                      <SubCategoryIcon name={s.name} parent={cat.name} className="w-7 h-7 sm:w-8 sm:h-8 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] sm:text-xs font-medium leading-tight">{s.name}</span>
                    </button>
                  ))}
                </div>
                {moreBtn(cat.subs.length)}
              </div>
            );
          })()}
        </div>
      </div>
      )}

      {/* İxtisas rejimi — sektor → ixtisas seçici (axtarışı doldurur) */}
      {activeType === "PROFESSION" && (
        <div className="border-b border-card-border bg-card/30">
          <div className="page-wrap py-4 sm:py-5">
            <p className="text-xs font-semibold text-muted mb-2">Sektor seçin:</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button onClick={() => { setSelectedSector(null); setSearchQuery(""); }} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${!selectedSector ? "bg-orange-500 border-orange-500 text-white" : "bg-input-bg border-input-border hover:border-orange-500/50"}`}>Hamısı</button>
              {IXTISAS_SECTORS.map((s) => (
                <button key={s.sector} onClick={() => { setSelectedSector(s.sector === selectedSector ? null : s.sector); setSearchQuery(""); }} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${selectedSector === s.sector ? "bg-orange-500 border-orange-500 text-white" : "bg-input-bg border-input-border hover:border-orange-500/50"}`}>{s.sector}</button>
              ))}
            </div>
            {selectedSector && (
              <div className="flex flex-wrap gap-1.5">
                {IXTISAS_SECTORS.find((s) => s.sector === selectedSector)?.professions.map((p) => (
                  <button key={p} onClick={() => setSearchQuery(p)} className={`px-2.5 py-1 rounded-lg text-[11px] border ${searchQuery === p ? "bg-orange-500/20 border-orange-500 text-orange-500 font-semibold" : "bg-input-bg border-input-border hover:border-orange-500/50"}`}>{p}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Listings Grid with side ads */}
      <div className="page-wrap py-3 sm:py-4">
        {/* ── ANA SƏHİFƏ HERO BLOKU (umico/birmarket üslubu) ──
            Kateqoriyalar + karusel + promo bannerlər TƏK komponentin içindədir.
            `sticky` YOXDUR: səhifə aşağı sürüşdürüləndə hamısı birlikdə yuxarı qalxır,
            sol kateqoriya sütunu ekranda qalmır. Sol sütun `relative` + panel
            `absolute inset-0` olduğuna görə sətrin hündürlüyünü uzatmır — yəni
            karusellə DƏQİQ eyni hizada bitir və içəridə scroll olur.
            Arxa fon ağ (bg-card) — istifadəçi tələbi. */}
        {isHome && (
          /* umico/birmarket "MPLandingHeader" quruluşu:
               Left   → kateqoriya menyusu
               Middle → karusel + sağda 3 promo plitəsi
               Bottom → güvən zolağı (onların "MPLandingIconBadges"-i)
             Ağ çərçivə (--landing-bg), içəri boşluq 16px, plitələr --landing-tile.
             `sticky` YOXDUR — scroll edəndə hamısı birlikdə yuxarı qalxır. */
          <div className="mb-3 sm:mb-4 border rounded-3xl" style={{ background: "var(--landing-bg)", borderColor: "var(--landing-line)" }}>
            <div className="p-3 sm:p-4">
              {/* Sətrin hündürlüyü SABİTDİR (lg+): sol kateqoriya reydi, karusel və
                  sağ promo plitələri eyni boyda olur. Kateqoriyalar bu hündürlüyü
                  aşanda reydin İÇİNDƏ scroll olunur. */}
              <div className="lg:grid lg:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)_280px] lg:gap-4 lg:h-[535px]">
                {/* Left — kateqoriyalar (sətri uzatmasın deyə absolute) */}
                <div className="hidden lg:block relative">
                  <CategoryMegaMenu variant="landing" fill selectedCategory={selectedCategory} />
                </div>
                {/* Middle — karusel */}
                <HomeCarousel fill />
                {/* Middle sağ — promo plitələri */}
                <SideBanners />
              </div>
            </div>
            {/* Bottom — güvən zolağı, eyni çərçivənin içində */}
            <div className="border-t px-3 sm:px-4" style={{ borderColor: "var(--landing-line)" }}>
              <TrustBar embedded />
            </div>
          </div>
        )}

        {/* Ana səhifədə məzmun TAM ENDƏ (sol sütun yoxdur — o, yuxarıdakı hero blokundadır).
            Kateqoriya/axtarış görünüşündə isə solda filtr/kateqoriya paneli qalır. */}
        <div className={isHome ? "" : "lg:grid lg:grid-cols-[280px_1fr] lg:gap-4"}>
          {!isHome && (
            <aside className="hidden lg:block">
              {selectedCategory || isGroupBuy ? (
                <CategoryFilterPanel
                  category={selectedCategory || ""}
                  type={isGroupBuy ? "PRODUCT" : activeType}
                  linkQuery={isGroupBuy ? "?type=GROUP_BUY" : ""}
                  title={isGroupBuy ? "👥 Birgə alış" : undefined}
                  minPrice={minPrice} setMinPrice={setMinPrice}
                  maxPrice={maxPrice} setMaxPrice={setMaxPrice}
                  city={cityFilter} setCity={setCityFilter}
                  brand={brandFilter} setBrand={setBrandFilter}
                  condition={conditionFilter} setCondition={setConditionFilter}
                  onReset={resetFilters}
                  activeCount={activeFilterCount}
                />
              ) : (
                <CategoryMegaMenu variant="landing" selectedCategory={selectedCategory} />
              )}
            </aside>
          )}

          {/* Center column - listings */}
          <div className="min-w-0">
            {isGroupBuy && (
              <div className="brand-band rounded-2xl px-4 py-3.5 mb-3 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-white/20 ring-1 ring-white/30 flex items-center justify-center text-lg shrink-0">👥</span>
                <div className="min-w-0 flex-1">
                  <p className="brand-band-kicker">tradixai · birgə alış</p>
                  <p className="font-bold text-[15px] leading-tight">Nə qədər çox adam alsa, qiymət o qədər düşür</p>
                  <p className="text-[11.5px] opacity-85 mt-0.5">İndi tam qiymətlə alırsınız — pəncərə bağlananda qrupun son qiymətinə görə fərq kartınıza qaytarılır.</p>
                </div>
              </div>
            )}
            {!isHome && activeType !== "PROFESSION" && (
              <button type="button" onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden mb-3 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-card-border bg-card text-sm font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" /></svg>
                Filtrlər{activeFilterCount ? ` (${activeFilterCount})` : ""}
              </button>
            )}
            {/* Hero promo banner ("Hər şey bir platformada") legv edildi —
                kateqoriya/axtarış görünüşündə lazımsızdır (istifadəçi tələbi). */}

            {/* Ana səhifə: əvvəl baxdıqlarınız */}
            {isHome && (
              <>
                <RecentlyViewed />
                {/* Bütün elanların üst başlığı — yalnız ana səhifədə */}
                <p className="mb-3 px-1 text-base sm:text-lg font-bold text-foreground">ən son elanlar</p>
              </>
            )}

            {/* Üst axtarışdan tapılan mütəxəssislər (məhsul/xidmət nəticələrinin üstündə) */}
            {searchQuery && activeType !== "PROFESSION" && matchedPros.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">👤 Bu xidməti verən ixtisas sahibləri</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {matchedPros.slice(0, 8).map((p) => (
                    <Link key={p.id} href={`/seller/${p.id}?from=ixtisas`} className="surface p-3 flex items-center gap-2.5 hover:border-orange-500/50 transition-all">
                      <div className="w-11 h-11 rounded-xl bg-input-bg overflow-hidden flex items-center justify-center text-xl shrink-0">
                        {p.avatar
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={imgUrl(p.avatar)} alt={p.name} className="w-full h-full object-cover" />
                          : "👤"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{p.name || "İstifadəçi"}</p>
                        {(p.professions?.length ? p.professions : (p.profession ? [p.profession] : [])).length > 0 && (
                          <p className="text-[11px] text-orange-500 font-medium truncate">{(p.professions?.length ? p.professions : [p.profession]).join(" · ")}</p>
                        )}
                        {p.city && <p className="text-[10px] text-muted truncate">📍 {p.city}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="product-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="surface overflow-hidden">
                    <div className="aspect-[4/3] skeleton" />
                    <div className="p-3 sm:p-4 space-y-2">
                      <div className="skeleton h-3 w-1/3" />
                      <div className="skeleton h-4 w-3/4" />
                      <div className="skeleton h-3 w-full" />
                      <div className="skeleton h-3 w-2/3" />
                      <div className="flex justify-between items-center pt-1">
                        <div className="skeleton h-5 w-16" />
                        <div className="skeleton h-7 w-7 rounded-lg" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeType === "PROFESSION" ? (
              professionals.length === 0 ? (
                <div className="text-center py-20 animate-fade-in">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center text-4xl">👤</div>
                  <p className="text-foreground font-medium text-base mb-1">Mütəxəssis tapılmadı</p>
                  <p className="text-muted text-sm">İxtisas adı ilə axtarın (məs. Həkim, Mühəndis, Usta)</p>
                </div>
              ) : (
                <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
                  {professionals.map((p) => {
                    const offer = p.consultationOffers?.[0];
                    return (
                      <Link key={p.id} href={`/seller/${p.id}?from=ixtisas`} className="surface overflow-hidden hover:border-orange-500/50 hover:shadow-lg transition-all group">
                        {/* Üst yaşıl başlıq + böyük avatar */}
                        <div className="h-16 bg-gradient-to-r from-orange-500/15 to-emerald-500/15 relative">
                          {/* Birbaşa paylaşma — profili açmadan İxtisas profilini paylaş (kart naviqasiyasını dayandırır) */}
                          <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="absolute top-2 right-2 z-10">
                            <ShareButton title={p.name || "İxtisas profili"} text={`${p.name || "İxtisas"}${p.profession ? ` — ${p.profession}` : ""} · tradixai`} path={`/seller/${p.id}?from=ixtisas`} compact className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-card border border-card-border text-muted hover:text-orange-500 hover:border-orange-500/50 transition-all shadow-sm" />
                          </span>
                        </div>
                        <div className="px-4 pb-4 -mt-9">
                          <div className="w-[72px] h-[72px] rounded-2xl bg-input-bg overflow-hidden ring-4 ring-card shadow-md flex items-center justify-center text-3xl">
                            {p.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`${imgUrl(p.avatar)}`} alt={p.name} className="w-full h-full object-cover" />
                            ) : "👤"}
                          </div>
                          <div className="mt-2.5 flex items-center gap-1.5">
                            <p className="font-bold text-base truncate">{p.name || "İstifadəçi"}</p>
                            {p.idVerifyStatus === "APPROVED" && (
                              <svg viewBox="0 0 24 24" className="w-4 h-4 text-orange-500 shrink-0" fill="currentColor"><path d="M12 2l2.39 1.74 2.95-.02 1.13 2.72 2.46 1.62-.62 2.88.62 2.88-2.46 1.62-1.13 2.72-2.95-.02L12 22l-2.39-1.74-2.95.02-1.13-2.72-2.46-1.62.62-2.88-.62-2.88 2.46-1.62 1.13-2.72 2.95.02L12 2z"/><path d="M10.6 14.6l-2.2-2.2-1.2 1.2 3.4 3.4 6-6-1.2-1.2-4.8 4.8z" fill="#fff"/></svg>
                            )}
                          </div>
                          {(p.professions?.length ? p.professions : (p.profession ? [p.profession] : [])).length > 0 && (
                            <span className="flex flex-wrap gap-1 mt-1">
                              {(p.professions?.length ? p.professions : [p.profession]).map((pr: string) => (
                                <span key={pr} className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-500">{pr}</span>
                              ))}
                            </span>
                          )}
                          {p.bio && <p className="text-xs text-muted mt-2 line-clamp-2">{p.bio}</p>}
                          <div className="flex items-center gap-3 mt-2.5 text-xs text-muted">
                            {p.city && <span className="flex items-center gap-1">📍 {p.city}</span>}
                            {p.ratingCount > 0 && <span className="flex items-center gap-1">⭐ <b className="text-foreground">{p.avgRating?.toFixed(1)}</b> ({p.ratingCount})</span>}
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            {offer ? (
                              <span className="text-sm"><b className="text-orange-500">{offer.price} AZN</b><span className="text-muted text-xs">/{offer.durationMinutes}dəq</span></span>
                            ) : <span className="text-xs text-muted">Profili gör</span>}
                            <span className="px-3 py-1.5 rounded-xl text-white text-xs font-semibold bg-gradient-to-r from-orange-500 to-orange-600 group-hover:opacity-90">
                              {offer ? "Rəy al" : "Profilə bax →"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted text-center mt-4">İxtisas üzrə əlaqə platforma üzərindən (Rəy konsultasiyası) qurulur — telefon nömrəsi göstərilmir.</p>
                </>
              )
            ) : listings.length === 0 ? (
              <div className="text-center py-20 animate-fade-in">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-orange-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <p className="text-foreground font-medium text-base mb-1">{t("noResults")}</p>
                <p className="text-muted text-sm">{t("searchPlaceholder")}</p>
              </div>
            ) : (
              <>
                <div className="product-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>

                {/* Pagination sentinel + spinner */}
                {hasMore && (
                  <div ref={sentinelRef} className="flex justify-center py-8">
                    {loadingMore && (
                      <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                )}
                {!hasMore && listings.length > 0 && (
                  <p className="text-center text-muted text-xs py-8">— {t("noMoreListings")} —</p>
                )}
              </>
            )}

            {/* ── DİGƏR SAYTLARDAN ── həmişə saytın öz elanlarından SONRA ── */}
            {searchQuery.trim() && activeType !== "PROFESSION" && (
              <div className="mt-8 pt-6 border-t border-card-border">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-sm font-bold">🌐 Digər saytlardan</h2>
                  <span className="text-[11px] text-muted">tap.az · turbo.az və digər saytlar</span>
                </div>
                <p className="text-xs text-muted mb-3">«{searchQuery}» üçün internet nəticələri</p>

                {webLoading ? (
                  <div className="flex items-center gap-3 py-6 text-sm text-muted">
                    <span className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    İnternetdə axtarılır...
                  </div>
                ) : webNeedLogin ? (
                  <p className="text-sm text-muted py-3">İnternet nəticələri üçün hesabınıza daxil olun.</p>
                ) : webResults.length === 0 ? (
                  <p className="text-sm text-muted py-3">{webSummary || "İnternetdə uyğun nəticə tapılmadı."}</p>
                ) : (
                  <>
                    {webSummary && <p className="text-sm text-foreground/90 mb-3">{webSummary}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {webResults.slice(0, 12).map((w: any, i: number) => (
                        <a key={`${w.url}-${i}`} href={w.url} target="_blank" rel="noopener noreferrer"
                          className="surface p-3 hover:border-orange-500/50 transition-colors">
                          <p className="text-sm font-semibold line-clamp-2">{w.title || w.url}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {w.price != null && <span className="text-sm font-bold text-orange-500">{typeof w.price === "number" ? `${w.price} AZN` : w.price}</span>}
                            {w.site && <span className="text-[11px] text-muted">{w.site}</span>}
                          </div>
                          {w.snippet && <p className="text-xs text-muted line-clamp-2 mt-1">{w.snippet}</p>}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Telefonda filtrlər — aşağıdan açılan panel (masaüstündəki ilə eyni) */}
      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] bg-black/50 flex items-end" onClick={() => setMobileFiltersOpen(false)}>
          <div className="w-full max-h-[85vh] overflow-y-auto bg-card rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-card flex items-center justify-between px-4 py-3 border-b border-card-border">
              <p className="font-bold">Filtrlər{activeFilterCount ? ` (${activeFilterCount})` : ""}</p>
              <button onClick={() => setMobileFiltersOpen(false)} className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]">Göstər</button>
            </div>
            <CategoryFilterPanel
              embedded
              category={selectedCategory || ""}
              type={isGroupBuy ? "PRODUCT" : activeType}
              linkQuery={isGroupBuy ? "?type=GROUP_BUY" : ""}
              title={isGroupBuy ? "👥 Birgə alış" : undefined}
              minPrice={minPrice} setMinPrice={setMinPrice}
              maxPrice={maxPrice} setMaxPrice={setMaxPrice}
              city={cityFilter} setCity={setCityFilter}
              brand={brandFilter} setBrand={setBrandFilter}
              condition={conditionFilter} setCondition={setConditionFilter}
              onReset={resetFilters}
              activeCount={activeFilterCount}
              onNavigate={() => setMobileFiltersOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
