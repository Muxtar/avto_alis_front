"use client";
import { useState, useEffect } from "react";
import { API, imgUrl } from "@/lib/api";
import ProductCarousel, { PROMO_ITEMS, type CarouselItem } from "@/components/ProductCarousel";

type Banner = { id: number; image: string; link: string | null; title: string | null; position?: string };
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
    // 2 dəqiqədən sonra yenidən yüklənsin (yeni təsdiqlənən reklamlar).
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

// Reklamları ədalətli növbə ilə qarışdır (hər yükləmədə fərqli reklam birinci olsun).
function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

const CTA_ITEM: CarouselItem = { id: "ad-cta", image: "", href: "/reklam", cta: true };

// Ana səhifə karuseli — embla ilə (ProductCarousel, hero rejimi).
// Məzmun: istifadəçilərin ödənişli reklamları + admin MAIN bannerləri, sonda
// «Reklamınız burada» slaydı. Heç biri yoxdursa saytın öz promo slaydları.
export default function HomeCarousel({ fill = false }: { fill?: boolean } = {}) {
  const [items, setItems] = useState<CarouselItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${API}/banners`).then((r) => r.json()).catch(() => null),
      loadActiveAds(),
    ]).then(([d, ads]) => {
      if (!alive) return;
      const banners: CarouselItem[] = (d?.success ? d.banners || [] : [])
        .filter((b: Banner) => (b.position || "MAIN") === "MAIN")
        .map((b: Banner) => ({ id: `b${b.id}`, image: adImg(b.image), title: b.title || undefined, href: b.link || undefined }));
      const adItems: CarouselItem[] = shuffle(ads.filter((a) => a.placement === "MAIN")).map((a) => ({
        id: `ad${a.id}`, image: adImg(a.image || a.productImage), title: a.headline, subtitle: a.subtitle || undefined, href: a.href,
        ad: { id: a.id, sellerKind: a.sellerKind, sourceType: a.sourceType, price: a.price, city: a.city, productImage: a.image && a.productImage && a.image !== a.productImage ? adImg(a.productImage) : null },
      }));
      const base = banners.length > 0 ? banners : PROMO_ITEMS.slice(0, adItems.length ? 3 : PROMO_ITEMS.length);
      // Reklam və bannerlər növbə ilə: reklam, banner, reklam, banner...
      const merged: CarouselItem[] = [];
      const n = Math.max(adItems.length, base.length);
      for (let i = 0; i < n; i++) {
        if (adItems[i]) merged.push(adItems[i]);
        if (base[i]) merged.push(base[i]);
      }
      merged.splice(Math.min(merged.length, 3), 0, CTA_ITEM);
      setItems(merged);
      if (adItems.length) trackImpressions(adItems.map((a) => a.ad!.id));
    });
    return () => { alive = false; };
  }, []);

  // Yüklənənə qədər ölçü sabit qalsın ki, səhifə sıçramasın.
  if (items === null) return <div className={`w-full bg-input-bg animate-pulse rounded-[20px] ${fill ? "aspect-[16/9] max-h-[560px] lg:aspect-auto lg:h-full lg:max-h-none" : "aspect-[16/9] max-h-[560px]"}`} />;

  return <ProductCarousel items={items} hero fill={fill} api={API} />;
}
