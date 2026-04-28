"use client";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import ListingCard from "@/components/ListingCard";
import { API } from "@/lib/api";
import { AZ_CITIES, FUEL_TYPES, PAYMENT_TYPES } from "@/lib/cities";

type TypeFilter = "all" | "PRODUCT" | "SERVICE";

export default function MarketplacePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<TypeFilter>("all");
  // Filterler
  const [conditionFilter, setConditionFilter] = useState<string>("");
  const [countryFilter, setCountryFilter] = useState<string>("");
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
  const activeFilterCount = [conditionFilter, countryFilter, brandFilter, modelFilter, cityFilter, fuelFilter, paymentFilter, minYear, maxYear, minPrice, maxPrice].filter(Boolean).length;

  const resetFilters = () => {
    setConditionFilter(""); setCountryFilter(""); setBrandFilter(""); setModelFilter("");
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

  // Fetch listings with debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory) params.set("category", selectedCategory);
      if (activeType !== "all") params.set("type", activeType);
      if (conditionFilter) params.set("condition", conditionFilter);
      if (countryFilter) params.set("country", countryFilter);
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
      params.set("limit", "50");

      fetch(`${API}/listings?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setListings(data.listings || []);
        })
        .catch(() => { toast(t('error'), 'error'); })
        .finally(() => setLoading(false));
    }, 300);

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery, selectedCategory, activeType, sortBy, conditionFilter, countryFilter, brandFilter, modelFilter, cityFilter, fuelFilter, paymentFilter, minYear, maxYear, minPrice, maxPrice]);

  const typeButtons: { id: TypeFilter; label: string }[] = [
    { id: "all", label: t("all") },
    { id: "PRODUCT", label: t("productsFilter") },
    { id: "SERVICE", label: t("servicesFilter") },
  ];

  const compactInput = "w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/30 placeholder-muted-foreground";

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)]">
      {/* Hero / Search Section */}
      <div className="bg-card/50 border-b border-card-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">{t("marketplace")}</h1>

          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <div className="relative flex-1 min-w-0">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full pl-10 pr-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground transition-all text-foreground text-sm"
              />
            </div>
            <div className="flex gap-1.5 bg-input-bg border border-input-border rounded-xl p-1">
              {typeButtons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setActiveType(btn.id)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeType === btn.id
                      ? "bg-orange-500 text-white shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none cursor-pointer">
              <option value="newest">{t("sortNewest")}</option>
              <option value="priceAsc">{t("sortPriceAsc")}</option>
              <option value="priceDesc">{t("sortPriceDesc")}</option>
              <option value="popular">{t("sortPopular")}</option>
              <option value="yearDesc">{t("sortYearDesc")}</option>
              <option value="yearAsc">{t("sortYearAsc")}</option>
            </select>
          </div>

          {/* Advanced filters toggle row */}
          <div className="flex items-center justify-between mt-4 gap-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 px-3 py-2 bg-input-bg border border-input-border rounded-xl text-xs sm:text-sm text-foreground hover:border-orange-500/50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4.5h18M6 12h12M10.5 19.5h3" />
              </svg>
              {t("advancedFilters")}
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <svg className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="px-3 py-2 text-xs sm:text-sm text-orange-500 hover:text-orange-400 transition-colors whitespace-nowrap"
              >
                {t("resetFilters")}
              </button>
            )}
          </div>

          {/* Advanced Filter Panel */}
          {showAdvanced && (
            <div className="mt-3 p-3 sm:p-4 bg-card border border-card-border rounded-2xl">
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
                {/* Country */}
                <div>
                  <label className="block text-[10px] sm:text-xs text-muted mb-1">{t("country")}</label>
                  <input value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
                    placeholder={t("country")} className={compactInput} />
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

      {/* Categories */}
      {categories.length > 0 && (
        <div className="border-b border-card-border bg-card/30">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex gap-2 py-3 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  !selectedCategory
                    ? "bg-orange-500 text-white"
                    : "bg-input-bg border border-input-border text-muted hover:text-foreground"
                }`}
              >
                {t("allCategories")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    selectedCategory === cat
                      ? "bg-orange-500 text-white"
                      : "bg-input-bg border border-input-border text-muted hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Listings Grid */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-muted">{t("noResults")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
