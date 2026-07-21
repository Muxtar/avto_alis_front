"use client";
import { useState, useEffect } from "react";
import { API, imgUrl } from "@/lib/api";
import ProductCarousel, { PROMO_ITEMS, type CarouselItem } from "@/components/ProductCarousel";

type Banner = { id: number; image: string; link: string | null; title: string | null; position?: string };

// Ana səhifə karuseli — embla ilə (ProductCarousel, hero rejimi).
// Məzmun: admin panelindən idarə olunan MAIN bannerləri; heç biri yoxdursa
// saytın öz reklam slaydları (public/promo) göstərilir ki, sahə boş qalmasın.
export default function HomeCarousel() {
  const [items, setItems] = useState<CarouselItem[] | null>(null);

  useEffect(() => {
    fetch(`${API}/banners`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { setItems(PROMO_ITEMS); return; }
        const mapped: CarouselItem[] = (d.banners || [])
          .filter((b: Banner) => (b.position || "MAIN") === "MAIN")
          .map((b: Banner) => ({
            id: b.id,
            image: /^(https?:|data:)/.test(b.image) ? b.image : imgUrl(b.image),
            title: b.title || undefined,
            href: b.link || undefined,
          }));
        setItems(mapped.length > 0 ? mapped : PROMO_ITEMS);
      })
      .catch(() => setItems(PROMO_ITEMS));
  }, []);

  // Yüklənənə qədər ölçü sabit qalsın ki, səhifə sıçramasın.
  if (items === null) return <div className="w-full aspect-[16/9] max-h-[560px] bg-input-bg animate-pulse" />;

  return <ProductCarousel items={items} hero />;
}
