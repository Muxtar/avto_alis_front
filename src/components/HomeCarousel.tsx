"use client";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { API, imgUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

type Banner = { id: number; image: string; link: string | null; title: string | null; position?: string };
const INTERVAL = 5500;

// Ana səhifə karuseli — Framer Motion ilə: spring keçid, sürüşdürmə (drag/swipe),
// pilləli mətn animasiyası. Şəkil kəsilmir (contain + bulanıq arxa fon).
const slide = {
  enter: (dir: number) => ({ x: dir >= 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? "-35%" : "35%", opacity: 0 }),
};

export default function HomeCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [[idx, dir], setPage] = useState<[number, number]>([0, 0]);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    fetch(`${API}/banners`).then((r) => r.json())
      .then((d) => { if (d.success) setBanners((d.banners || []).filter((b: Banner) => (b.position || "MAIN") === "MAIN")); })
      .catch(() => {});
  }, []);

  const n = banners.length;
  const paginate = useCallback((d: number) => setPage(([i]) => [((i + d) % n + n) % n, d]), [n]);
  const goTo = (i: number) => setPage(([c]) => [i, i > c ? 1 : -1]);

  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = setInterval(() => paginate(1), INTERVAL);
    return () => clearInterval(t);
  }, [n, paused, paginate, idx]);

  if (n === 0) return null;
  const b = banners[idx];
  const src = /^(https?:|data:)/.test(b.image) ? b.image : imgUrl(b.image);
  const multi = n > 1;

  const Media = (
    <>
      {/* Bulanıq arxa fon — şəkil kəsilmir, boşluqlar dolur */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover blur-2xl saturate-125 brightness-[0.72] scale-110" />
      {/* Əsas şəkil — tam görünür */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={b.title || "banner"} draggable={false} className="absolute inset-0 w-full h-full object-contain select-none" />
      {b.title && <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />}
    </>
  );

  return (
    <div
      className="relative w-full aspect-[16/9] max-h-[560px] overflow-hidden bg-black select-none group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={b.id}
          custom={dir}
          variants={reduce ? undefined : slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ x: { type: "spring", stiffness: 260, damping: 32, mass: 0.9 }, opacity: { duration: 0.35 } }}
          drag={multi ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.16}
          onDragEnd={(_, { offset, velocity }) => {
            const power = offset.x * 0.6 + velocity.x * 0.12;
            if (power < -80) paginate(1);
            else if (power > 80) paginate(-1);
          }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          {b.link ? (
            <a href={b.link} target={b.link.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="block absolute inset-0" draggable={false}>{Media}</a>
          ) : Media}

          {/* Mətn — pilləli (stagger) giriş */}
          {b.title && (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.18 } } }}
              className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10 pointer-events-none"
            >
              {[
                <div key="k" className="flex items-center gap-2 mb-2 sm:mb-3">
                  <span className="h-5 sm:h-7 w-1.5 rounded-full bg-primary" />
                  <span className="text-white/85 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">Kampaniya</span>
                </div>,
                <h2 key="t" className="text-white font-black text-lg sm:text-3xl lg:text-4xl leading-[1.1] tracking-tight drop-shadow-2xl max-w-2xl">{b.title}</h2>,
                b.link ? (
                  <span key="c" className="mt-3 sm:mt-5 inline-flex items-center gap-2 bg-white text-gray-900 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold shadow-lg">
                    Ətraflı bax <ArrowRight className="w-4 h-4" />
                  </span>
                ) : null,
              ].filter(Boolean).map((child, i) => (
                <motion.div key={i} variants={{ hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } } }}>
                  {child}
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {multi && (
        <>
          {[-1, 1].map((d) => (
            <motion.button
              key={d}
              onClick={() => paginate(d)}
              aria-label={d < 0 ? "Əvvəlki" : "Növbəti"}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full",
                "bg-white/20 backdrop-blur-md text-white ring-1 ring-white/30 flex items-center justify-center",
                "opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/35",
                d < 0 ? "left-3 sm:left-4" : "right-3 sm:right-4"
              )}
            >
              {d < 0 ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </motion.button>
          ))}

          <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-semibold tabular-nums ring-1 ring-white/15">
            {idx + 1} / {n}
          </div>

          {/* Nöqtələr — aktiv olan layoutId ilə axıcı şəkildə sürüşür */}
          <div className="absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 px-2.5 py-1.5 rounded-full bg-black/30 backdrop-blur-md ring-1 ring-white/15">
            {banners.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} aria-label={`Slayd ${i + 1}`} className="relative h-2 w-2 rounded-full bg-white/45 hover:bg-white/70 transition-colors">
                {i === idx && <motion.span layoutId="carousel-dot" className="absolute -inset-y-0 -left-0 h-2 w-7 rounded-full bg-white" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
              </button>
            ))}
          </div>

          {/* Avtomatik keçid göstəricisi */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15 z-20 overflow-hidden">
            <motion.div
              key={`${idx}-${paused}`}
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: paused ? "0%" : "100%" }}
              transition={{ duration: paused ? 0 : INTERVAL / 1000, ease: "linear" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
