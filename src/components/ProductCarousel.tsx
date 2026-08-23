"use client";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CarouselItem = {
  id: number | string;
  image: string;
  title?: string;
  subtitle?: string;
  href?: string;
};

// Saytın reklam slaydları — public/promo/ altındakı SVG-lər (xarici mənbə yoxdur).
export const PROMO_ITEMS: CarouselItem[] = [
  { id: 1, image: "/promo/1.svg", title: "Minlərlə məhsul", subtitle: "Al, sat, kəşf et", href: "/elanlar" },
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

type Props = {
  items?: CarouselItem[];
  /**
   * hero — ana səhifə banneri: ekranda 1 böyük slayd, 16:9, şəkil kəsilmir
   * (contain + bulanıq arxa fon), mətn şəklin üstündə.
   * Default (hero=false) — kart rejimi: masaüstü 4 / planşet 2 / mobil 1.
   */
  hero?: boolean;
  /**
   * fill — hero slaydı 16:9 əvəzinə SÜTUNUN HÜNDÜRLÜYÜNÜ doldurur (yalnız lg+).
   * Ana səhifə hero blokunda karusel, sol kateqoriya reydi və sağ promo plitələri
   * eyni hündürlükdə olsun deyə lazımdır (birmarket/umico quruluşu).
   */
  fill?: boolean;
};

export default function ProductCarousel({ items = PROMO_ITEMS, hero = false, fill: fillHeight = false }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    // watchDrag — Embla v8-də sürükləmə seçimi (köhnə adı: draggable).
    { loop: true, align: "start", duration: 25, watchDrag: true },
    // Mouse üstünə gələndə dayanır; stopOnInteraction=false olmasa
    // istifadəçi sürüşdürəndən sonra bir daha başlamazdı.
    [Autoplay({ delay: AUTOPLAY_DELAY, stopOnMouseEnter: true, stopOnInteraction: false })],
  );

  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);
  // Şəklin öz nisbəti — 16:9-a yaxınsa çərçivəni tam doldururuq (cover),
  // uzaqsa kəsməmək üçün contain + bulanıq arxa fon işlədirik.
  const [ratios, setRatios] = useState<Record<string, number>>({});

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
    "absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white shadow-md " +
    "flex items-center justify-center text-gray-800 transition-transform duration-200 " +
    "hover:scale-110 active:scale-95";

  return (
    <div className={cn(fillHeight && "lg:h-full lg:flex lg:flex-col")}>
      {/* Oxlar KARUSELƏ görə mərkəzlənsin deyə ayrıca relative sarğı —
          nöqtələr bu sarğının kənarındadır, əks halda oxlar aşağı sürüşürdü. */}
      <div className={cn("relative", fillHeight && "lg:flex-1 lg:min-h-0")}>
        {/* Kart rejimində kartlar arası 16px boşluq (-ml-4 / pl-4); hero-da boşluq yoxdur */}
        <div className={cn("overflow-hidden", fillHeight && "lg:h-full")} ref={emblaRef}>
          <div className={cn("flex", !hero && "-ml-4", fillHeight && "lg:h-full")}>
            {items.map((it) => {
              // 16:9-dan ±12% kənara çıxmayan şəkil "cover" ilə tam doldurulur
              // (kəsilmə gözlə seçilmir); daha fərqli nisbətlərdə kəsmirik.
              const ratio = ratios[String(it.id)];
              // fillHeight rejimində sətrin nisbəti 16:9 deyil — "cover" bannerin
              // kənarlarını kəsərdi, ona görə həmişə "contain" + bulanıq arxa fon.
              const fill = !fillHeight && ratio != null && ratio > 1.56 && ratio < 2.03;

              const inner = hero ? (
                <div className={cn(
                  "relative w-full overflow-hidden bg-input-bg",
                  fillHeight ? "aspect-[16/9] max-h-[560px] lg:aspect-auto lg:h-full lg:max-h-none" : "aspect-[16/9] max-h-[560px]",
                )}>
                  {/* Bulanıq arxa fon — yalnız şəkil çərçivəni doldurmayanda lazımdır */}
                  {/* Öz kompozit qatı (translateZ): blur BİR DƏFƏ rasterləşir, hər
                      scroll kadrında yenidən hesablanmır — sticky header-də flash səbəbi. */}
                  {!fill && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt="" aria-hidden
                      style={{ willChange: "transform", transform: "translateZ(0)" }}
                      className="absolute inset-0 w-full h-full object-cover blur-2xl brightness-90 scale-125" />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.image} alt={it.title || "banner"} draggable={false}
                    onLoad={(e) => {
                      const im = e.currentTarget;
                      if (im.naturalWidth && im.naturalHeight) {
                        setRatios((p) => p[String(it.id)] ? p : { ...p, [String(it.id)]: im.naturalWidth / im.naturalHeight });
                      }
                    }}
                    className={cn("absolute inset-0 w-full h-full select-none", fill ? "object-cover" : "object-contain drop-shadow-2xl")} />
                  {(it.title || it.subtitle) && (
                    <>
                      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
                        {it.title && (
                          <h2 className="text-white font-black text-lg sm:text-3xl lg:text-4xl leading-[1.1] tracking-tight max-w-2xl"
                            style={{ textShadow: "0 2px 12px rgba(0,0,0,.45)" }}>
                            {it.title}
                          </h2>
                        )}
                        {it.subtitle && (
                          <p className="text-white/85 text-xs sm:text-base mt-1.5 max-w-xl" style={{ textShadow: "0 1px 6px rgba(0,0,0,.4)" }}>{it.subtitle}</p>
                        )}
                        {it.href && (
                          <span className="mt-3 sm:mt-5 inline-flex items-center gap-2 bg-white text-gray-900 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold shadow-lg">
                            Ətraflı bax <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                // ── Kart rejimi ──
                <div className="overflow-hidden rounded-2xl bg-card border border-card-border h-full">
                  <div className="aspect-[16/10] bg-input-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.image} alt={it.title || "reklam"} draggable={false} loading="lazy"
                      className="w-full h-full object-cover select-none" />
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
                // hero: 1 slayd; kart rejimi: mobil 1, planşet 2, masaüstü 4
                <div
                  key={it.id}
                  className={cn(
                    "min-w-0",
                    hero ? "flex-[0_0_100%]" : "pl-4 flex-[0_0_100%] md:flex-[0_0_50%] lg:flex-[0_0_25%]",
                    fillHeight && "lg:h-full",
                  )}
                >
                  {it.href ? (
                    <a href={it.href} className="block h-full" draggable={false}
                      target={it.href.startsWith("http") ? "_blank" : undefined}
                      rel={it.href.startsWith("http") ? "noreferrer" : undefined}>
                      {inner}
                    </a>
                  ) : inner}
                </div>
              );
            })}
          </div>
        </div>

        {/* Ox düymələri — dikey mərkəzdə, kənardan 16px içəridə */}
        {items.length > 1 && (
          <>
            <button type="button" onClick={scrollPrev} aria-label="Əvvəlki" className={cn(arrowCls, "left-4")}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" onClick={scrollNext} aria-label="Növbəti" className={cn(arrowCls, "right-4")}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Hero-da nöqtələr şəklin üstündə olsun ki, yer tutmasın */}
        {hero && snaps.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-black/60 ring-1 ring-white/20">
            {snaps.map((_, i) => (
              <button key={i} type="button" onClick={() => scrollTo(i)} aria-label={`Slayd ${i + 1}`} aria-current={i === selected}
                className={cn("h-2 rounded-full transition-all duration-300", i === selected ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80")} />
            ))}
          </div>
        )}
      </div>

      {/* Kart rejimində nöqtələr altda — aktiv olan daha geniş və tünd */}
      {!hero && snaps.length > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          {snaps.map((_, i) => (
            <button key={i} type="button" onClick={() => scrollTo(i)} aria-label={`Slayd ${i + 1}`} aria-current={i === selected}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === selected ? "w-6 bg-gray-800 dark:bg-white" : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400",
              )} />
          ))}
        </div>
      )}
    </div>
  );
}
