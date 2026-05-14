"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { API } from "@/lib/api";
import { useLanguage } from "@/lib/LanguageContext";

interface CitySummary {
  city: string;
  listings: number;
  sellers: number;
}

export default function LocationsPage() {
  const { t } = useLanguage();
  const [cities, setCities] = useState<CitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${API}/search/cities-summary`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCities(d.cities || []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.city.toLowerCase().includes(q));
  }, [cities, query]);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
          <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          {t('locationsTitle')}
        </h1>
        <p className="text-muted text-sm">
          {t('locationsSubtitle')}
        </p>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('searchCity')}
        className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm mb-5"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 surface text-muted">
          {t('noCityResults')}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((c) => (
            <Link
              key={c.city}
              href={`/locations/${encodeURIComponent(c.city)}`}
              className="surface p-4 hover:border-orange-500/40 transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-semibold group-hover:text-orange-500 transition-colors">
                  {c.city}
                </h2>
                <svg className="w-5 h-5 text-orange-500 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-muted">
                  <span className="font-medium text-foreground">{c.listings}</span> {t('listingsCount')}
                </span>
                <span className="text-muted">
                  <span className="font-medium text-foreground">{c.sellers}</span> {t('sellersCount')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
