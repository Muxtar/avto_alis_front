"use client";
import { useState, useEffect } from "react";
import { API, imgUrl } from "@/lib/api";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import { SITE_SLIDES, SITE_SLIDE_MAP } from "@/lib/siteSlides";

export type BannerRow = {
  id: number; image: string; link: string | null; title: string | null; subtitle?: string | null; ctaLabel?: string | null;
  position?: string; kind?: string; siteKey?: string | null; active?: boolean; sortOrder?: number;
};
export type PublicAd = {
  id: number; placement: string; sourceType: string; sellerKind: string;
  headline: string; subtitle: string | null; image: string | null; productImage: string | null;
  price: number | null; city: string | null; href: string;
};

export const adImg = (src: string | null | undefined) => (!src ? "" : /^(https?:|data:)/.test(src) ? src : imgUrl(src));

// Ana səhifə reklamları — bir dəfə yüklənir, karusel və yan bannerlər paylaşır.
let adsPromise: Promise<PublicAd[]> | null = null;
export function loadActiveAds(): Promise<PublicAd[]> {
  if (!adsPromise) {
    adsPromise = fetch(`${API}/ads/active`).then((r) => r.json()).then((d) => (d?.success ? d.ads || [] : [])).catch(() => []);
    setTimeout(() => { adsPromise = null; }, 2 * 60 * 1000);
  }
  return adsPromise!;
}

const seenImpressions = new Set<number>();
export function trackImpressions(ids: number[]) {
  const fresh = ids.filter((id) => !seenImpressions.has(id));
  if (!fresh.length) return;
  fresh.forEach((id) => seenImpressions.add(id));
  fetch(`${API}/ads/impressions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: fresh }) }).catch(() => {});
}

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

/** Admin cərgəsini karusel slaydına çevir (admin paneldəki önizləmə də bunu işlədir). */
export function bannerToSlide(b: BannerRow): HeroSlide | null {
  if (b.kind === "SITE") {
    const s = b.siteKey ? SITE_SLIDE_MAP.get(b.siteKey) : undefined;
    if (!s) return null;
    return {
      id: `s${b.id}`, kind: "site", site: s, label: s.label,
      title: b.title || undefined, subtitle: b.subtitle || undefined, cta: b.ctaLabel || undefined, href: b.link || s.href,
    };
  }
  return {
    id: `b${b.id}`, kind: "image", image: adImg(b.image), label: b.title || "Kampaniya",
    title: b.title || undefined, subtitle: b.subtitle || undefined, cta: b.ctaLabel || undefined, href: b.link || undefined,
  };
}

export const defaultSiteSlides = (): HeroSlide[] =>
  SITE_SLIDES.map((s) => ({ id: `d-${s.key}`, kind: "site" as const, site: s, label: s.label, href: s.href }));

export function adToSlide(a: PublicAd): HeroSlide {
  return {
    id: `ad${a.id}`, kind: "ad", label: a.headline, image: adImg(a.image || a.productImage),
    title: a.headline, subtitle: a.subtitle || undefined, href: a.href,
    ad: {
      id: a.id, sellerKind: a.sellerKind, sourceType: a.sourceType, price: a.price, city: a.city,
      productImage: a.image && a.productImage && a.image !== a.productImage ? adImg(a.productImage) : null,
    },
  };
}

// Ana səhifə karuseli.
// Sıra: ödənişli reklamlar admin məzmunu ilə növbələşir (reklam, məzmun, reklam...).
// Admin məzmunu = admin paneldə sıralanmış şəkil bannerləri + seçilmiş sayt slaydları.
// Admin hələ sayt slaydı seçməyibsə — bütün sayt slaydları göstərilir.
export default function HomeCarousel({ fill = false }: { fill?: boolean } = {}) {
  const [slides, setSlides] = useState<HeroSlide[] | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${API}/banners`).then((r) => r.json()).catch(() => null),
      loadActiveAds(),
    ]).then(([d, ads]) => {
      if (!alive) return;
      const rows: BannerRow[] = (d?.success ? d.banners || [] : []).filter((b: BannerRow) => (b.position || "MAIN") === "MAIN");
      let content = rows.map(bannerToSlide).filter((x): x is HeroSlide => !!x);
      if (!d?.siteConfigured) content = [...content, ...defaultSiteSlides()];
      const adSlides = shuffle(ads.filter((a) => a.placement === "MAIN")).map(adToSlide);
      const merged: HeroSlide[] = [];
      const n = Math.max(adSlides.length, content.length);
      for (let i = 0; i < n; i++) {
        if (adSlides[i]) merged.push(adSlides[i]);
        if (content[i]) merged.push(content[i]);
      }
      setSlides(merged.length ? merged : defaultSiteSlides());
      if (adSlides.length) trackImpressions(adSlides.map((a) => a.ad!.id));
    });
    return () => { alive = false; };
  }, []);

  if (slides === null) return <div className={`w-full bg-input-bg animate-pulse rounded-[24px] ${fill ? "aspect-[16/9] max-h-[560px] lg:aspect-auto lg:h-full lg:max-h-none" : "aspect-[16/9] max-h-[560px]"}`} />;

  return <HeroCarousel slides={slides} fill={fill} api={API} />;
}
