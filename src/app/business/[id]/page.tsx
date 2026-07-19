"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import ShareButton from "@/components/ShareButton";
import QRShare from "@/components/QRShare";
import { API } from "@/lib/api";

// Public biznes səhifəsi — QR/link ilə açılır, biznesə aid obyektləri göstərir.
export default function PublicBusinessPage() {
  const { toast } = useToast();
  const params = useParams();
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/businesses/${params.id}`)
      .then((r) => r.json())
      .then((d) => setBusiness(d.success ? d.business : null))
      .catch(() => toast("Xəta", "error"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-muted">Biznes tapılmadı</p>
      </div>
    );
  }

  const socials = [
    { label: "🌐 Sayt", v: business.website },
    { label: "📸 Instagram", v: business.instagram },
    { label: "👍 Facebook", v: business.facebook },
    { label: "🎵 TikTok", v: business.tiktok },
    { label: "▶️ YouTube", v: business.youtube },
    { label: "💼 LinkedIn", v: business.linkedin },
  ].filter((s) => s.v);

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Biznes başlığı */}
      <div className="bg-card border border-card-border rounded-2xl p-5 sm:p-7 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-3xl shrink-0">🏢</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{business.name}</h1>
                <p className="text-xs text-muted">Biznes №{business.id}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ShareButton title={business.name} text={`${business.name} — tradixai`} compact className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-input-bg border border-input-border text-muted hover:text-orange-500 hover:border-orange-500/50 transition-all" />
                <QRShare path={`/business/${business.id}`} title={business.name} subtitle={`Biznes №${business.id}`} compact className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-input-bg border border-input-border text-muted hover:text-orange-500 hover:border-orange-500/50 transition-all" />
              </div>
            </div>

            {business.phone && (
              <a href={`tel:${business.phone}`} className="inline-block text-sm text-muted hover:text-orange-500 transition-colors mt-1">📞 {business.phone}</a>
            )}

            {socials.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {socials.map((s) => (
                  <a key={s.label} href={s.v.startsWith("http") ? s.v : `https://${s.v}`} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-input-bg border border-input-border text-xs hover:border-orange-500/50 transition-all">
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Obyektlər */}
      <h2 className="font-semibold mb-3">Obyektlər ({business.objects.length})</h2>
      {business.objects.length === 0 ? (
        <p className="text-muted text-sm">Hələ obyekt yoxdur.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {business.objects.map((o: any) => (
            <div key={o.id} className="bg-card border border-card-border rounded-2xl p-4 hover:border-orange-500/40 transition-all">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/object/${o.id}`} className="flex items-center gap-3 min-w-0 group flex-1">
                  <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center text-xl shrink-0">🏪</div>
                  <div className="min-w-0">
                    <p className="font-medium truncate group-hover:text-orange-500 transition-colors">{o.name}</p>
                    <p className="text-xs text-muted">Obyekt №{o.id} · {o._count?.listings ?? 0} məhsul</p>
                  </div>
                </Link>
                <QRShare path={`/object/${o.id}`} title={o.name} subtitle={`Obyekt №${o.id}`} compact className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-input-bg border border-input-border text-muted hover:text-orange-500 hover:border-orange-500/50 transition-all" />
              </div>
              {(o.city || o.address) && (
                <p className="text-xs text-muted mt-2 truncate">📍 {[o.city, o.address].filter(Boolean).join(" · ")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
