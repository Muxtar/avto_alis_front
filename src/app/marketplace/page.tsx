"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import ListingCard from "@/components/ListingCard";
import AddListingMenu from "@/components/AddListingMenu";
import { API } from "@/lib/api";
import { AZ_CITIES, FUEL_TYPES, PAYMENT_TYPES } from "@/lib/cities";
import { CATEGORY_NAMES } from "@/lib/categories";

type TypeFilter = "all" | "PRODUCT" | "SERVICE";

export default function MarketplacePage() {
  const { t } = useLanguage();
  const { isLoggedIn, token } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  // Cheap-search inquiry modal
  const [cheapModalOpen, setCheapModalOpen] = useState(false);
  const [cheapInquiryText, setCheapInquiryText] = useState("");
  const [cheapInquiryCities, setCheapInquiryCities] = useState<string[]>([]);
  const [cheapInquirySending, setCheapInquirySending] = useState(false);

  const openCheapModal = () => {
    if (!isLoggedIn) { router.push("/"); return; }
    setCheapInquiryText(searchQuery || "");
    setCheapInquiryCities(cityFilter ? [cityFilter] : []);
    setCheapModalOpen(true);
  };

  const submitCheapInquiry = async () => {
    if (!cheapInquiryText.trim()) return;
    setCheapInquirySending(true);
    try {
      const res = await fetch(`${API}/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: cheapInquiryText.trim(), cities: cheapInquiryCities }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.message || t("error"), "error");
        return;
      }
      toast(`${data.matchedSellers || 0} ${t("sellersMatched")}`, "success");
      setCheapModalOpen(false);
      router.push("/inquiries");
    } catch {
      toast(t("error"), "error");
    } finally {
      setCheapInquirySending(false);
    }
  };

  const toggleCheapCity = (city: string) => {
    setCheapInquiryCities((prev) => prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]);
  };
  const [listings, setListings] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<TypeFilter>("all");
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

  // Read URL params on mount (used by GlobalSearchBar redirects).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("search")) setSearchQuery(p.get("search") || "");
    if (p.get("brand")) setBrandFilter(p.get("brand") || "");
    if (p.get("model")) setModelFilter(p.get("model") || "");
    if (p.get("city")) setCityFilter(p.get("city") || "");
    if (p.get("year")) {
      setMinYear(p.get("year") || "");
      setMaxYear(p.get("year") || "");
    }
    if (p.get("category")) setSelectedCategory(p.get("category"));
    if (p.get("type")) setActiveType((p.get("type") || "all") as TypeFilter);
  }, []);

  const buildParams = (pageNum: number) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (selectedCategory) params.set("category", selectedCategory);
    if (activeType !== "all") params.set("type", activeType);
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
      fetch(`${API}/listings?${buildParams(1)}`)
        .then((r) => r.json())
        .then((data) => {
          setListings(data.listings || []);
          setTotalPages(data.totalPages || 0);
        })
        .catch(() => { toast(t('error'), 'error'); })
        .finally(() => setLoading(false));
    }, 300);

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, activeType, sortBy, conditionFilter, brandFilter, modelFilter, cityFilter, fuelFilter, paymentFilter, minYear, maxYear, minPrice, maxPrice]);

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

  const typeButtons: { id: TypeFilter; label: string }[] = [
    { id: "all", label: t("all") },
    { id: "PRODUCT", label: t("productsFilter") },
    { id: "SERVICE", label: t("servicesFilter") },
  ];

  const compactInput = "w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 placeholder-muted-foreground";

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)]">
      {/* Hero / Search Section */}
      <div className="hero-bg border-b border-card-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7">
          <div className="mb-3 sm:mb-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="section-title">{t("marketplace")}</h1>
              <p className="text-muted text-xs sm:text-sm mt-0.5">{t("footerDesc")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/locations"
                className="inline-flex shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-xs sm:text-sm font-semibold hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-500 transition-all whitespace-nowrap"
                title={t("locationsTitle")}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="hidden xs:inline">{t("browseByLocation")}</span>
              </Link>
              <AddListingMenu />
            </div>
          </div>

          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
            <div className="relative flex-1 min-w-0">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full pl-11 pr-4 py-3 input-base placeholder-muted-foreground text-sm shadow-sm"
              />
            </div>
            <button
              type="button"
              onClick={openCheapModal}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-500/20 transition-all whitespace-nowrap"
              title={t("cheaperSearchTitle")}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {t("cheaperSearch")}
            </button>
            <div className="segmented shrink-0">
              {typeButtons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setActiveType(btn.id)}
                  className={activeType === btn.id ? "active" : ""}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-3 input-base text-sm cursor-pointer shadow-sm">
              <option value="newest">{t("sortNewest")}</option>
              <option value="priceAsc">{t("sortPriceAsc")}</option>
              <option value="priceDesc">{t("sortPriceDesc")}</option>
              <option value="popular">{t("sortPopular")}</option>
              <option value="yearDesc">{t("sortYearDesc")}</option>
              <option value="yearAsc">{t("sortYearAsc")}</option>
            </select>
          </div>

          {/* Advanced filters toggle row */}
          <div className="flex items-center justify-between mt-3 sm:mt-4 gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 px-3 py-2 bg-input-bg border border-input-border rounded-xl text-xs sm:text-sm text-foreground hover:border-orange-500/50 hover:text-orange-500 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4.5h18M6 12h12M10.5 19.5h3" />
              </svg>
              {t("advancedFilters")}
              {activeFilterCount > 0 && (
                <span className="min-w-[20px] h-5 px-1 brand-gradient text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {activeFilterCount}
                </span>
              )}
              <svg className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-xs sm:text-sm text-orange-500 hover:text-orange-400 transition-colors whitespace-nowrap font-medium"
              >
                {t("resetFilters")}
              </button>
            )}
          </div>

          {/* Advanced Filter Panel */}
          {showAdvanced && (
            <div className="mt-3 p-3 sm:p-4 surface animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {/* Brand */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-muted mb-1">{t("brand")}</label>
                  <input value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}
                    placeholder="BMW, Mercedes..." className={compactInput} />
                </div>
                {/* Model */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-muted mb-1">{t("vehicleModel")}</label>
                  <input value={modelFilter} onChange={(e) => setModelFilter(e.target.value)}
                    placeholder={t("vehicleModelPlaceholder")} className={compactInput} />
                </div>
                {/* City */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-muted mb-1">{t("city")}</label>
                  <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className={compactInput}>
                    <option value="">{t("allCities")}</option>
                    {AZ_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {/* Fuel */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-muted mb-1">{t("fuelType")}</label>
                  <select value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)} className={compactInput}>
                    <option value="">{t("allFuelTypes")}</option>
                    {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{t(f.azKey)}</option>)}
                  </select>
                </div>
                {/* Payment */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-muted mb-1">{t("paymentType")}</label>
                  <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className={compactInput}>
                    <option value="">{t("allPaymentTypes")}</option>
                    {PAYMENT_TYPES.map((p) => <option key={p.value} value={p.value}>{t(p.azKey)}</option>)}
                  </select>
                </div>
                {/* Condition */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-muted mb-1">{t("condition")}</label>
                  <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)} className={compactInput}>
                    <option value="">{t("allConditions")}</option>
                    <option value="NEW">{t("conditionNew")}</option>
                    <option value="USED">{t("conditionUsed")}</option>
                    <option value="REFURBISHED">{t("conditionRefurbished")}</option>
                  </select>
                </div>
                {/* Year min */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-muted mb-1">{t("yearFrom")}</label>
                  <input type="number" min="1900" max={new Date().getFullYear() + 1}
                    value={minYear} onChange={(e) => setMinYear(e.target.value)}
                    placeholder="2010" className={compactInput} />
                </div>
                {/* Year max */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-muted mb-1">{t("yearTo")}</label>
                  <input type="number" min="1900" max={new Date().getFullYear() + 1}
                    value={maxYear} onChange={(e) => setMaxYear(e.target.value)}
                    placeholder="2025" className={compactInput} />
                </div>
                {/* Price min */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-muted mb-1">{t("priceFrom")}</label>
                  <input type="number" min="0" step="0.01"
                    value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0" className={compactInput} />
                </div>
                {/* Price max */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-muted mb-1">{t("priceTo")}</label>
                  <input type="number" min="0" step="0.01"
                    value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="100000" className={compactInput} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ümumi kateqoriya filtri — 16 əsas kateqoriya (avto-hissə breadcrumb-ları əvəzinə) */}
      <div className="border-b border-card-border bg-card/40 backdrop-blur-sm sticky top-14 sm:top-16 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex gap-2 py-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                !selectedCategory ? "brand-gradient text-white shadow-md shadow-orange-500/25" : "bg-input-bg border border-input-border text-muted hover:text-foreground hover:border-orange-500/40"
              }`}
            >
              {t("allCategories")}
            </button>
            {CATEGORY_NAMES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  selectedCategory === cat ? "brand-gradient text-white shadow-md shadow-orange-500/25" : "bg-input-bg border border-input-border text-muted hover:text-foreground hover:border-orange-500/40"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listings Grid with side ads */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="lg:grid lg:grid-cols-[160px_1fr_160px] lg:gap-6">
          {/* Left ad column */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <div className="w-[160px] h-[600px] surface overflow-hidden flex flex-col items-center justify-center text-muted text-xs">
                <svg className="w-8 h-8 mb-2 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                <span>Reklam</span>
              </div>
            </div>
          </aside>

          {/* Center column - listings */}
          <div className="min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
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
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 animate-fade-in">
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
          </div>

          {/* Right ad column */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <div className="w-[160px] h-[600px] surface overflow-hidden flex flex-col items-center justify-center text-muted text-xs">
                <svg className="w-8 h-8 mb-2 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
                <span>Reklam</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Cheap-search inquiry modal */}
      {cheapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setCheapModalOpen(false)}>
          <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">🔻 {t("cheaperSearch")}</h3>
                <p className="text-muted text-xs">{t("cheaperSearchDesc")}</p>
              </div>
              <button onClick={() => setCheapModalOpen(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">{t("searchPlaceholder")}</label>
                <textarea
                  value={cheapInquiryText}
                  onChange={(e) => setCheapInquiryText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:border-orange-500"
                  placeholder={t("cheaperSearchTextPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  📍 {t("cheaperSearchCities")} {cheapInquiryCities.length > 0 && `(${cheapInquiryCities.length})`}
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-input-bg/50 border border-input-border rounded-xl">
                  {AZ_CITIES.map((c) => {
                    const active = cheapInquiryCities.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCheapCity(c)}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                          active
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-card border-input-border text-muted hover:text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted mt-1.5">{t("cheaperSearchCitiesHint")}</p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-card-border flex gap-2 justify-end">
              <button onClick={() => setCheapModalOpen(false)} className="px-4 py-2 bg-input-bg border border-input-border rounded-xl text-sm">
                {t("adminCancel")}
              </button>
              <button
                onClick={submitCheapInquiry}
                disabled={cheapInquirySending || !cheapInquiryText.trim()}
                className="px-5 py-2 brand-gradient rounded-xl text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50"
              >
                {cheapInquirySending ? "..." : t("cheaperSearchSubmit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
