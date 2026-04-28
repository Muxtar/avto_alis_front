"use client";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import ListingCard from "@/components/ListingCard";
import { API } from "@/lib/api";

type TypeFilter = "all" | "PRODUCT" | "SERVICE";

export default function MarketplacePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<TypeFilter>("all");
  const [conditionFilter, setConditionFilter] = useState<string>("");
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [minYear, setMinYear] = useState<string>("");
  const [maxYear, setMaxYear] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "priceAsc" | "priceDesc" | "popular" | "yearAsc" | "yearDesc">("newest");
  const [loading, setLoading] = useState(true);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

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
      if (minYear) params.set("min_year", minYear);
      if (maxYear) params.set("max_year", maxYear);
      // Sort param'i backend'e gonder
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
  }, [searchQuery, selectedCategory, activeType, sortBy, conditionFilter, countryFilter, minYear, maxYear]);

  const typeButtons: { id: TypeFilter; label: string }[] = [
    { id: "all", label: t("all") },
    { id: "PRODUCT", label: t("productsFilter") },
    { id: "SERVICE", label: t("servicesFilter") },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)]">
      {/* Hero / Search Section */}
      <div className="bg-card/50 border-b border-card-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">{t("marketplace")}</h1>

          {/* Search + Type Filter */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <div className="relative flex-1">
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
            {/* Sort dropdown */}
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

          {/* Extra filters row */}
          <div className="flex flex-wrap gap-2 mt-3">
            <select value={conditionFilter} onChange={(e) => setConditionFilter(e.target.value)}
              className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-xs text-foreground focus:outline-none cursor-pointer">
              <option value="">{t("allConditions")}</option>
              <option value="NEW">{t("conditionNew")}</option>
              <option value="USED">{t("conditionUsed")}</option>
              <option value="REFURBISHED">{t("conditionRefurbished")}</option>
            </select>
            <input value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
              placeholder={t("country")}
              className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-xs text-foreground focus:outline-none placeholder-muted-foreground basis-[calc(50%-0.25rem)] sm:basis-auto sm:w-40" />
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear() + 1}
              value={minYear}
              onChange={(e) => setMinYear(e.target.value)}
              placeholder={t("yearFrom")}
              className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-xs text-foreground focus:outline-none placeholder-muted-foreground basis-[calc(50%-0.25rem)] sm:basis-auto sm:w-28"
            />
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear() + 1}
              value={maxYear}
              onChange={(e) => setMaxYear(e.target.value)}
              placeholder={t("yearTo")}
              className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-xs text-foreground focus:outline-none placeholder-muted-foreground basis-[calc(50%-0.25rem)] sm:basis-auto sm:w-28"
            />
          </div>
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
