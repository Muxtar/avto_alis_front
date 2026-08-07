"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { AZ_CITIES } from "@/lib/cities";
import { API } from "@/lib/api";

const CURRENT_YEAR = new Date().getFullYear();

export default function GlobalSearchBar() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token, isLoggedIn } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [city, setCity] = useState("");
  const [knownBrands, setKnownBrands] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Pull list of brands from /api/stats for the brand select.
  useEffect(() => {
    fetch(`${API}/stats`)
      .then((r) => r.json())
      .then((d) => setKnownBrands(d.brands || []))
      .catch(() => undefined);
  }, []);

  // Sync inputs from URL params on mount (and when the user navigates with the global search).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      const p = new URLSearchParams(window.location.search);
      setSearch(p.get("search") || "");
      setBrand(p.get("brand") || "");
      setModel(p.get("model") || "");
      setYear(p.get("year") || "");
      setCity(p.get("city") || "");
    };
    sync();
    // re-sync on browser back/forward
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (brand) params.set("brand", brand);
    if (model.trim()) params.set("model", model.trim());
    if (year) params.set("year", year);
    if (city) params.set("city", city);
    router.push(`/marketplace${params.toString() ? `?${params}` : ""}`);
  };

  const onImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isLoggedIn || !token) {
      toast(t("loginRequired") || "Login required", "error");
      e.target.value = "";
      router.push("/");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast(t("error"), "error");
      e.target.value = "";
      return;
    }
    setImageLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API}/search/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast(data.message || t("error"), "error");
        return;
      }
      // Apply analysis to the search inputs and submit.
      const a = data.analysis;
      const params = new URLSearchParams();
      if (data.searchQuery) params.set("search", data.searchQuery);
      if (a?.brand) { setBrand(a.brand); params.set("brand", a.brand); }
      if (a?.vehicleModel) { setModel(a.vehicleModel); params.set("model", a.vehicleModel); }
      if (a?.vehicleYear) { setYear(String(a.vehicleYear)); params.set("year", String(a.vehicleYear)); }
      setSearch(data.searchQuery || a?.summary || "");
      router.push(`/marketplace?${params.toString()}`);
    } catch {
      toast(t("error"), "error");
    } finally {
      setImageLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="border-b border-card-border bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          {/* Main text input */}
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("globalSearchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Inline filters on desktop */}
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="hidden md:block px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:border-orange-500">
            <option value="">{t("brand")}</option>
            {knownBrands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={t("vehicleModel")}
            className="hidden md:block w-32 px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:border-orange-500"
          />
          <select value={year} onChange={(e) => setYear(e.target.value)} className="hidden md:block px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:border-orange-500">
            <option value="">{t("manufacturingYear")}</option>
            {Array.from({ length: 30 }).map((_, i) => {
              const y = CURRENT_YEAR - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="hidden lg:block px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:border-orange-500">
            <option value="">{t("city")}</option>
            {AZ_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Image upload (1688-style) */}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onImagePick} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={imageLoading}
            className="p-2 bg-input-bg border border-input-border rounded-lg hover:bg-orange-500/10 hover:border-orange-500 transition-all"
            title={t("globalSearchImage")}
          >
            {imageLoading ? (
              <span className="block w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            )}
          </button>

          {/* Mobile: toggle advanced */}
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="md:hidden p-2 bg-input-bg border border-input-border rounded-lg hover:bg-orange-500/10 transition-all" aria-label="filter">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
          </button>

          <button type="submit" className="px-4 py-2 brand-gradient rounded-lg text-white text-sm font-semibold hover:brightness-110">
            {t("search") || "Axtar"}
          </button>
        </form>

        {/* Mobile advanced filters */}
        {showAdvanced && (
          <div className="md:hidden mt-2 grid grid-cols-2 gap-2">
            <select value={brand} onChange={(e) => setBrand(e.target.value)} className="px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:border-orange-500">
              <option value="">{t("brand")}</option>
              {knownBrands.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t("vehicleModel")}
              className="px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:border-orange-500"
            />
            <select value={year} onChange={(e) => setYear(e.target.value)} className="px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:border-orange-500">
              <option value="">{t("manufacturingYear")}</option>
              {Array.from({ length: 30 }).map((_, i) => {
                const y = CURRENT_YEAR - i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </select>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:border-orange-500">
              <option value="">{t("city")}</option>
              {AZ_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
