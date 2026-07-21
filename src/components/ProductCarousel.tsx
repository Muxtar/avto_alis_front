"use client";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CarouselItem = {
  id: number | string;
  image: string;
  title?: string;
  subtitle?: string;
  href?: string;
};

// Saytın reklam slaydları — public/promo/ altındakı SVG-lər (xarici mənbə yoxdur).
const DEFAULT_ITEMS: CarouselItem[] = [
  { id: 1, image: "/promo/1.svg", title: "Minlərlə məhsul", subtitle: "Hər şey bir platformada", href: "/elanlar" },
  { id: 2, image: "/promo/2.svg", title: "Yango ilə çatdırılma", subtitle: "Sifarişin qapına gəlsin", href: "/elanlar" },
  { id: 3, image: "/promo/3.svg", title: "Endirimlər", subtitle: "Kampaniyaları qaçırma", href: "/elanlar" },
  { id: 4, image: "/promo/4.svg", title: "Peşəkardan rəy", subtitle: "Onlayn konsultasiya", href: "/consultations" },
  { id: 5, image: "/promo/5.svg", title: "Təhlükəsiz ödəniş", subtitle: "Kartla rahat al", href: "/elanlar" },
  { id: 6, image: "/promo/6.svg", title: "Biznesini qeydiyyatdan keçir", subtitle: "VÖEN ilə obyekt yarat", href: "/account" },
  { id: 7, image: "/promo/7.svg", title: "Şəkillə axtarış", subtitle: "Şəkil çək, məhsulu tap", href: "/elanlar" },
  { id: 8, image: "/promo/8.svg", title: "Xəritədə tap", subtitle: "Yaxınındakı obyektlər", href: "/locations" },
  { id: 9, image: "/promo/9.svg", title: "Barter imkanı", subtitle: "Dəyiş-düş elanları", href: "/elanlar" },
  { id: 10, image: "/promo/10.svg", title: "Pulsuz elan yerləşdir", subtitle: "Dəqiqələr içində sat", href: "/account?new=1" },
];

const AUTOPLAY_DELAY = 4000;

export default function ProductCarousel({ items = DEFAULT_ITEMS }: { items?: CarouselItem[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    // watchDrag — Embla v8-də sürükləmə seçimi (köhnə adı: draggable).
    { loop: true, align: "start", duration: 25, watchDrag: true },
    // Mouse üstünə gələndə dayanır; stopOnInteraction=false olmasa
    // istifadəçi sürüşdürəndən sonra bir daha başlamazdı.
    [Autoplay({ delay: AUTOPLAY_DELAY, stopOnMouseEnter: true, stopOnInteraction: false })],
  );

  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on("select", onSelect).on("reInit", () => {
      setSnaps(emblaApi.scrollSnapList());
      onSelect();
    });
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  if (items.length === 0) return null;

  const arrowCls =
    "absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-md " +
    "flex items-center justify-center text-gray-800 transition-transform duration-200 " +
    "hover:scale-110 active:scale-95 disabled:opacity-40";

  return (
    <div>
      {/* Oxlar KARUSELƏ görə mərkəzlənsin deyə ayrıca relative sarğı —
          nöqtələr bu sarğının kənarındadır, əks halda oxlar aşağı sürüşürdü. */}
      <div className="relative">
      {/* Görüntü sahəsi — kartlar arası 16px boşluq (-ml-4 / pl-4) */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4">
          {items.map((it) => {
            const Card = (
              <div className="overflow-hidden rounded-2xl bg-card border border-card-border h-full">
                <div className="aspect-[16/10] bg-input-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.image}
                    alt={it.title || "reklam"}
                    draggable={false}
                    loading="lazy"
                    className="w-full h-full object-cover select-none"
                  />
                </div>
                {(it.title || it.subtitle) && (
                  <div className="p-3">
                    {it.title && <p className="font-semibold text-sm truncate">{it.title}</p>}
                    {it.subtitle && <p className="text-xs text-muted truncate mt-0.5">{it.subtitle}</p>}
                  </div>
                )}
              </div>
            );
            return (
              // Mobil 1, tablet 2, masaüstü 4 kart
              <div key={it.id} className="pl-4 min-w-0 flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_25%]">
                {it.href ? (
                  <a href={it.href} className="block h-full" draggable={false}>{Card}</a>
                ) : Card}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ox düymələri — dikey mərkəzdə, kənardan 16px içəridə */}
      <button type="button" onClick={scrollPrev} aria-label="Əvvəlki" className={cn(arrowCls, "left-4")}>
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button type="button" onClick={scrollNext} aria-label="Növbəti" className={cn(arrowCls, "right-4")}>
        <ChevronRight className="w-5 h-5" />
      </button>
      </div>

      {/* Nöqtələr — aktiv olan daha geniş və tünd */}
      {snaps.length > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          {snaps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Slayd ${i + 1}`}
              aria-current={i === selected}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === selected ? "w-6 bg-gray-800 dark:bg-white" : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
