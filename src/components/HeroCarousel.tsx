"use client";
// ANA SƏHİFƏ KARUSELİ v2.
//
// Üç növ slayd:
//   • site  — saytın hazır dizayn slaydları (lib/siteSlides) — kodla çəkilir
//   • image — admin yüklədiyi banner şəkli (Ken Burns yaxınlaşması ilə)
//   • ad    — istifadəçinin ödənişli reklamı (məhsul vitrini)
//
// İdarə: yuxarıda hekayə tipli irəliləmə zolaqları, aşağıda slayd adları ilə
// tablar (kompüter), oxlar, ← → klaviatura, sürüşdürmə (telefon), fasilə düyməsi.
// Siçan üstündə olanda və vərəq gizli olanda avtomatik keçid dayanır.
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SiteSlide } from "@/lib/siteSlides";

export type HeroSlide = {
  id: string;
  kind: "site" | "image" | "ad";
  label: string;
  href?: string;
  title?: string;
  subtitle?: string;
  cta?: string;
  site?: SiteSlide;
  image?: string;
  ad?: {
    id: number; sellerKind: string; sourceType: string;
    price?: number | null; city?: string | null; productImage?: string | null;
  };
};

const DELAY = 6500;
const fmtPrice = (n: number) => new Intl.NumberFormat("az-AZ", { maximumFractionDigits: 2 }).format(n);

const textStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 240, damping: 26 } },
};

function trackAdClick(api: string | undefined, id: number) {
  if (!api) return;
  try {
    const url = `${api}/ads/${id}/click`;
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob(["{}"], { type: "application/json" }));
    else fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  } catch { /* keç */ }
}

// ── Slayd görünüşləri ────────────────────────────────────────────────────────

function Cta({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <motion.span variants={rise}
      className={cn(
        "mt-4 sm:mt-6 inline-flex self-start items-center gap-2 rounded-full px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-extrabold shadow-xl transition-transform group-hover/hero:translate-x-0.5",
        light ? "bg-white text-[#1e1b4b]" : "hero-cta text-white",
      )}>
      {children} <ArrowRight className="w-4 h-4" />
    </motion.span>
  );
}

function SiteView({ s, slide, scale, w, h }: { s: SiteSlide; slide: HeroSlide; scale: number; w: number; h: number }) {
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(125deg, ${s.from} 0%, ${s.via} 55%, ${s.to} 100%)` }}>
      {/* İşıq ləkələri + incə tor */}
      <div aria-hidden className="absolute -right-[10%] -top-[30%] w-[60%] aspect-square rounded-full opacity-50 blur-3xl" style={{ background: s.glow }} />
      <div aria-hidden className="absolute -left-[12%] -bottom-[45%] w-[55%] aspect-square rounded-full opacity-30 blur-3xl" style={{ background: s.to }} />
      <div aria-hidden className="absolute inset-0 opacity-[.18]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)", backgroundSize: "44px 44px", maskImage: "radial-gradient(ellipse at 75% 40%, #000 0%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at 75% 40%, #000 0%, transparent 70%)" }} />
      {/* Vizual — telefonda kiçildilir ki, mətnin üstünə düşməsin */}
      <motion.div aria-hidden className="absolute inset-0"
        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
        {/* Vizual karuselin ENİNƏ görə kiçilir (ekrana yox) — dar sütunda mətnin üstünə düşməsin */}
        {/* Vizual sabit «kətan» üzərində çəkilir və bütöv kiçilir — nisbətlər pozulmur */}
        <div className="absolute right-0 top-0" style={{ width: w / scale, height: h / scale, transform: `scale(${scale})`, transformOrigin: "100% 0" }}>
          {s.visual()}
        </div>
      </motion.div>
      <motion.div variants={textStagger} initial="hidden" animate="show"
        className="absolute inset-y-0 left-0 w-[60%] flex flex-col justify-center" style={{ padding: "clamp(16px, 6cqw, 56px)", paddingTop: "max(44px, clamp(16px, 6cqw, 56px))" }}>
        {w >= 420 && (
          <motion.span variants={rise} className="hero-glass inline-flex self-start items-center gap-1.5 rounded-full px-2.5 py-1 mb-3 text-[9.5px] sm:text-[11px] font-bold uppercase tracking-[.16em]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" /> {s.kicker}
          </motion.span>
        )}
        <motion.h2 variants={rise} className="text-white font-black leading-[1.05] tracking-tight" style={{ fontSize: "clamp(20px, 4.9cqw, 54px)", textShadow: "0 4px 24px rgba(0,0,0,.25)" }}>
          {slide.title || s.title}
        </motion.h2>
        <motion.p variants={rise} className="text-white/80 mt-2 sm:mt-3 max-w-xl line-clamp-3" style={{ fontSize: "clamp(11px, 1.7cqw, 18px)" }}>
          {slide.subtitle || s.subtitle}
        </motion.p>
        <Cta light>{slide.cta || s.cta}</Cta>
      </motion.div>
    </div>
  );
}

function ImageView({ slide }: { slide: HeroSlide }) {
  const hasText = !!(slide.title || slide.subtitle);
  return (
    <div className="absolute inset-0 bg-[#0f0b2e]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slide.image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl brightness-[.55] scale-125" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slide.image} alt={slide.title || "banner"} draggable={false} className="hero-kb absolute inset-0 w-full h-full object-contain select-none" />
      {hasText && (
        <>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-tr from-[#0f0b2e]/90 via-[#0f0b2e]/30 to-transparent" />
          <motion.div variants={textStagger} initial="hidden" animate="show" className="absolute left-0 bottom-0 max-w-2xl p-5 sm:p-10 lg:p-14 pb-14 sm:pb-20 flex flex-col">
            {slide.title && <motion.h2 variants={rise} className="text-white font-black leading-[1.08] tracking-tight" style={{ fontSize: "clamp(18px, 4.4cqw, 50px)", textShadow: "0 3px 18px rgba(0,0,0,.5)" }}>{slide.title}</motion.h2>}
            {slide.subtitle && <motion.p variants={rise} className="text-white/85 text-xs sm:text-base mt-2">{slide.subtitle}</motion.p>}
            {slide.href && <Cta>{slide.cta || "Ətraflı bax"}</Cta>}
          </motion.div>
        </>
      )}
    </div>
  );
}

function AdView({ slide }: { slide: HeroSlide }) {
  const ad = slide.ad!;
  const product = ad.productImage || slide.image;
  return (
    <div className="absolute inset-0 bg-[#0f0b2e]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slide.image} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-3xl brightness-[.4] saturate-150 scale-125" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#0f0b2e] via-[#0f0b2e]/75 to-transparent" />
      <div aria-hidden className="absolute right-[8%] top-1/2 -translate-y-1/2 w-[46%] aspect-square rounded-full bg-white/10 blur-3xl" />
      {/* Məhsul — işıqlı kart üstündə, kəsilmədən */}
      <motion.div className="absolute inset-y-0 right-0 w-[44%] sm:w-[46%] flex items-center justify-center p-3 sm:p-8 lg:p-10"
        initial={{ opacity: 0, scale: 0.92, rotate: 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 160, damping: 20 }}>
        <div className="relative w-full h-full rounded-[22px] sm:rounded-[28px] overflow-hidden bg-gradient-to-br from-white/20 to-white/5 ring-1 ring-white/20 shadow-[0_40px_80px_-30px_rgba(0,0,0,.8)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product} alt={slide.title || "reklam"} draggable={false}
            className={cn("hero-kb absolute inset-0 w-full h-full select-none", ad.productImage ? "object-contain p-3 sm:p-6" : "object-cover")} />
          {typeof ad.price === "number" && ad.price > 0 && (
            <span className="absolute right-2 bottom-2 sm:right-3 sm:bottom-3 rounded-xl sm:rounded-2xl bg-white text-[#1e1b4b] px-2.5 sm:px-3.5 py-1 sm:py-1.5 font-black text-sm sm:text-xl shadow-xl">
              {fmtPrice(ad.price)} <span className="text-[10px] sm:text-xs font-bold text-[#1e1b4b]/60">AZN</span>
            </span>
          )}
        </div>
      </motion.div>
      <motion.div variants={textStagger} initial="hidden" animate="show" className="absolute inset-y-0 left-0 w-[56%] sm:w-[52%] flex flex-col justify-center p-4 sm:p-10 lg:p-14">
        <motion.div variants={rise} className="flex flex-wrap items-center gap-1.5 mb-2 sm:mb-4">
          <span className="rounded-full bg-gradient-to-r from-amber-300 to-amber-500 text-[#1c1917] px-2 py-0.5 text-[9px] sm:text-[10.5px] font-extrabold uppercase tracking-[.14em]">Sponsorlu</span>
          <span className="hero-glass rounded-full px-2 py-0.5 text-[9px] sm:text-[10.5px] font-bold">{ad.sellerKind === "BUSINESS" ? "🏢 Sahibkar" : "👤 Fərdi"}</span>
          {ad.city && <span className="hidden sm:inline text-[11px] text-white/70">📍 {ad.city}</span>}
        </motion.div>
        <motion.h2 variants={rise} className="text-white font-black leading-[1.08] tracking-tight line-clamp-3" style={{ fontSize: "clamp(16px, 4.2cqw, 46px)", textShadow: "0 3px 18px rgba(0,0,0,.45)" }}>{slide.title}</motion.h2>
        {slide.subtitle && <motion.p variants={rise} className="hidden sm:block text-white/80 text-sm lg:text-lg mt-2 sm:mt-3 line-clamp-2">{slide.subtitle}</motion.p>}
        <Cta>{ad.sourceType === "OBJECT" ? "Obyektə bax" : "Elana bax"}</Cta>
      </motion.div>
    </div>
  );
}

// ── Karusel ──────────────────────────────────────────────────────────────────

export default function HeroCarousel({ slides, fill = false, api }: { slides: HeroSlide[]; fill?: boolean; api?: string }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [hover, setHover] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const barRef = useRef<HTMLElement | null>(null);
  const elapsed = useRef(0);
  const dragged = useRef(false); // sürüşdürmədən sonra gələn klik keçid etməsin
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [height, setHeight] = useState(500);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => { setWidth(e.contentRect.width); setHeight(e.contentRect.height); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Vizualın miqyası: 1000px enli karuseldə 1, darda kiçilir.
  const visualScale = Math.max(0.36, Math.min(1, width / 900));
  const n = slides.length;
  const paused = hover || userPaused || hidden || n < 2;

  const go = useCallback((to: number, d?: number) => {
    if (n === 0) return;
    const next = ((to % n) + n) % n;
    setDir(d ?? (next > index ? 1 : -1));
    elapsed.current = 0;
    setIndex(next);
  }, [n, index]);
  const next = useCallback(() => go(index + 1, 1), [go, index]);
  const prev = useCallback(() => go(index - 1, -1), [go, index]);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  useEffect(() => { if (index >= n && n > 0) setIndex(0); }, [n, index]);

  // Avtomatik keçid — rAF ilə: fasilədə vaxt dayanır, davam edəndə qaldığı yerdən.
  useEffect(() => {
    if (n < 2) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last; last = t;
      if (!paused) elapsed.current += dt;
      const p = Math.min(1, elapsed.current / DELAY);
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      if (p >= 1) { next(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, next, n, index]);

  if (n === 0) return null;
  const slide = slides[index];

  const body = slide.kind === "site" && slide.site ? <SiteView s={slide.site} slide={slide} scale={visualScale} w={width} h={height} />
    : slide.kind === "ad" ? <AdView slide={slide} />
    : <ImageView slide={slide} />;

  // Tablar: aktivin ətrafında ən çox 5 ad (çox slayd olanda zolaq sıxılmasın).
  const tabStart = Math.max(0, Math.min(index - 2, n - 5));
  const tabs = slides.slice(tabStart, tabStart + 5).map((s, i) => ({ s, i: tabStart + i }));

  return (
    <div ref={rootRef} style={{ containerType: "inline-size" }}
      className={cn(
        "relative w-full overflow-hidden rounded-[24px] bg-[#0f0b2e] select-none group/hero shadow-[0_24px_50px_-28px_rgba(30,27,75,.7)]",
        fill ? "aspect-[16/9] max-h-[560px] lg:aspect-auto lg:h-full lg:max-h-none lg:min-h-[380px]" : "aspect-[16/9] max-h-[560px]",
      )}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => { if (e.key === "ArrowRight") next(); else if (e.key === "ArrowLeft") prev(); }}
      tabIndex={0} role="region" aria-roledescription="carousel" aria-label="Ana səhifə karuseli"
    >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div key={slide.id} custom={dir} className="absolute inset-0"
          variants={{
            enter: (d: number) => ({ opacity: 0, x: d > 0 ? "6%" : "-6%", scale: 1.02 }),
            center: { opacity: 1, x: 0, scale: 1 },
            exit: (d: number) => ({ opacity: 0, x: d > 0 ? "-4%" : "4%", scale: 0.98 }),
          }}
          initial="enter" animate="center" exit="exit"
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          drag={n > 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18}
          onDragStart={() => { dragged.current = true; }}
          onDragEnd={(_, info) => {
            setTimeout(() => { dragged.current = false; }, 50);
            if (info.offset.x < -60) next(); else if (info.offset.x > 60) prev();
          }}
        >
          {slide.href ? (
            <a href={slide.href} draggable={false} className="block absolute inset-0"
              target={slide.href.startsWith("http") ? "_blank" : undefined} rel={slide.href.startsWith("http") ? "noreferrer" : undefined}
              onClick={(e) => { if (dragged.current) { e.preventDefault(); return; } if (slide.ad) trackAdClick(api, slide.ad.id); }}>
              {body}
            </a>
          ) : body}
        </motion.div>
      </AnimatePresence>

      {n > 1 && (
        <>
          {/* Yuxarı — hekayə tipli irəliləmə zolaqları + idarə */}
          <div data-hero-ctrl className="absolute top-0 inset-x-0 z-20 p-3 sm:p-4 flex items-center gap-2 bg-gradient-to-b from-black/30 to-transparent">
            <div className="flex-1 flex gap-1 sm:gap-1.5">
              {slides.map((s, i) => (
                <button key={s.id} type="button" onClick={() => go(i)} aria-label={`Slayd ${i + 1}: ${s.label}`} aria-current={i === index}
                  className="flex-1 py-1.5 -my-1.5">
                  <span className={cn("hero-prog block", i < index && "is-done")}>
                    <i ref={i === index ? (el) => { barRef.current = el; } : undefined} style={i === index ? { transform: "scaleX(0)" } : undefined} />
                  </span>
                </button>
              ))}
            </div>
            <span className="text-white/90 text-[10px] sm:text-[11px] font-bold tabular-nums shrink-0">
              {String(index + 1).padStart(2, "0")}<span className="opacity-60">/{String(n).padStart(2, "0")}</span>
            </span>
            <button type="button" onClick={() => setUserPaused((v) => !v)} aria-label={userPaused ? "Davam et" : "Dayandır"}
              className="hero-glass w-7 h-7 rounded-full flex items-center justify-center shrink-0 hover:bg-white/30">
              {userPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Oxlar — siçan üstünə gələndə */}
          <button data-hero-ctrl type="button" onClick={prev} aria-label="Əvvəlki"
            className="hero-glass absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full hidden sm:flex items-center justify-center opacity-0 group-hover/hero:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white/30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button data-hero-ctrl type="button" onClick={next} aria-label="Növbəti"
            className="hero-glass absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full hidden sm:flex items-center justify-center opacity-0 group-hover/hero:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white/30">
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Aşağı — slayd adları (kompüter) */}
          <div data-hero-ctrl className="hidden md:flex absolute bottom-3 left-1/2 -translate-x-1/2 z-20 items-center gap-1 p-1 rounded-full bg-black/35 ring-1 ring-white/15 max-w-[92%]">
            {tabs.map(({ s, i }) => (
              <button key={s.id} type="button" onClick={() => go(i)}
                className={cn("hero-tab rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-white/85 whitespace-nowrap max-w-[150px] truncate", i === index && "is-active")}>
                {s.kind === "ad" && <span className="mr-1">⭐</span>}{s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
