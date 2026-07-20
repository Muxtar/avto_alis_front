"use client";
import { useState, useEffect, useRef } from "react";
import { API, imgUrl } from "@/lib/api";

type Banner = { id: number; image: string; link: string | null; title: string | null };
const INTERVAL = 5000;

// Ana səhifə karuseli — premium dizayn: crossfade + Ken-Burns zoom, animasiyalı
// başlıq, avtomatik keçid göstəricisi (progress bar), zərif idarəetmə. Admin idarəli.
export default function HomeCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<any>(null);

  useEffect(() => {
    fetch(`${API}/banners`).then((r) => r.json()).then((d) => { if (d.success) setBanners(d.banners || []); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    clearInterval(timer.current);
    timer.current = setInterval(() => setIdx((i) => (i + 1) % banners.length), INTERVAL);
    return () => clearInterval(timer.current);
  }, [banners.length, paused, idx]);

  if (banners.length === 0) return null;
  const go = (i: number) => setIdx(((i % banners.length) + banners.length) % banners.length);
  const multi = banners.length > 1;

  return (
    <div
      className="relative w-full aspect-[16/10] sm:aspect-[16/7] rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/10 select-none group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slaydlar — crossfade + Ken-Burns */}
      {banners.map((b, i) => {
        const active = i === idx;
        const inner = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl(b.image)}
              alt={b.title || "banner"}
              className={`absolute inset-0 w-full h-full object-cover transition-transform ease-out ${active ? "scale-110 duration-[6000ms]" : "scale-100 duration-700"}`}
            />
            {/* Qat-qat qradientlər — dərinlik + mətn oxunaqlığı */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-transparent" />
            {/* Vinyet */}
            <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.35)] pointer-events-none" />
            {/* Məzmun */}
            <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 lg:p-10">
              {b.title && (
                <div className={`transition-all duration-700 ${active ? "opacity-100 translate-y-0 delay-200" : "opacity-0 translate-y-5"}`}>
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <span className="h-5 sm:h-7 w-1.5 rounded-full bg-orange-500" />
                    <span className="text-white/80 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">Kampaniya</span>
                  </div>
                  <h2 className="text-white font-black text-lg sm:text-3xl lg:text-4xl leading-[1.1] tracking-tight drop-shadow-2xl max-w-2xl">{b.title}</h2>
                  {b.link && (
                    <span className="mt-3 sm:mt-5 inline-flex items-center gap-2 bg-white text-gray-900 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold shadow-lg group-hover:gap-3 transition-all">
                      Ətraflı bax
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        );
        return (
          <div key={b.id} className={`absolute inset-0 transition-opacity duration-[900ms] ${active ? "opacity-100 z-[1]" : "opacity-0 z-0 pointer-events-none"}`}>
            {b.link ? <a href={b.link} target={b.link.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="block absolute inset-0">{inner}</a> : inner}
          </div>
        );
      })}

      {multi && (
        <>
          {/* Oxlar */}
          <button onClick={() => go(idx - 1)} aria-label="Əvvəlki" className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 backdrop-blur-md text-white ring-1 ring-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/35 active:scale-90">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => go(idx + 1)} aria-label="Növbəti" className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 backdrop-blur-md text-white ring-1 ring-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/35 active:scale-90">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>

          {/* Sayğac */}
          <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-20 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md text-white text-[11px] font-semibold tabular-nums ring-1 ring-white/15">
            {idx + 1} / {banners.length}
          </div>

          {/* Nöqtələr */}
          <div className="absolute bottom-3 sm:bottom-4 right-4 sm:right-6 z-20 flex gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={() => go(i)} aria-label={`Slayd ${i + 1}`} className={`h-2 rounded-full transition-all ${i === idx ? "w-7 bg-white" : "w-2 bg-white/45 hover:bg-white/70"}`} />
            ))}
          </div>

          {/* Avtomatik keçid göstəricisi */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/15 z-20">
            <div key={idx} className="h-full bg-orange-500 carousel-progress" style={{ animationDuration: `${INTERVAL}ms`, animationPlayState: paused ? "paused" : "running" }} />
          </div>
        </>
      )}
    </div>
  );
}
