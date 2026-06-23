"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import ListingCard from "@/components/ListingCard";
import { API } from "@/lib/api";

export default function ObjectPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/objects/${params.id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => { toast(t("error"), "error"); })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.object) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-muted">Obyekt tapılmadı</p>
      </div>
    );
  }

  const { object, listings } = data;
  const mapHref = object.latitude && object.longitude
    ? `https://www.openstreetmap.org/?mlat=${object.latitude}&mlon=${object.longitude}#map=17/${object.latitude}/${object.longitude}`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      <Link href="/locations" className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-400 mb-4 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Xəritəyə qayıt
      </Link>

      {/* Obyekt başlığı */}
      <div className="bg-card border border-card-border rounded-2xl p-5 sm:p-7 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-3xl shrink-0">🏪</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-1">{object.name}</h1>
            {object.business?.name && (
              <p className="text-sm text-muted mb-2">Biznes: <span className="font-medium text-foreground">{object.business.name}</span></p>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
              {(object.city || object.address) && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  {[object.city, object.address].filter(Boolean).join(", ")}
                </span>
              )}
              {object.phone && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  {object.phone}
                </span>
              )}
              {mapHref && (
                <a href={mapHref} target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-400">Xəritədə aç →</a>
              )}
            </div>
            {object.activityAreas?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {object.activityAreas.map((a: string) => (
                  <span key={a} className="px-2.5 py-1 bg-input-bg border border-input-border rounded-lg text-[11px] text-muted">{a}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Məhsullar / Xidmətlər ({listings?.length || 0})</h2>
      {!listings || listings.length === 0 ? (
        <div className="text-center py-16 text-muted">{t("noResults")}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {listings.map((listing: any) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
