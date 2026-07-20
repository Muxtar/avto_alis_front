"use client";
import { useState, useEffect, useRef } from "react";
import { API, imgUrl } from "@/lib/api";

type Banner = { id: number; image: string; link: string | null; title: string | null };

// Ana səhifə karuseli — mərkəzdə, avtomatik dəyişən, sürüşən keçidli premium dizayn.
// Admin panelindən idarə olunur (endirim/banner şəkilləri).
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
    timer.current = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4500);
    return () => clearInterval(timer.current);
  }, [banners.length, paused]);

  if (banners.length === 0) return null;
  const go = (i: number) => setIdx(((i % banners.length) + banners.length) % banners.length);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-card-border shadow-lg group h-[200px] sm:h-[300px] lg:h-[380px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Sürüşən lent */}
      <div className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]" style={{ transform: `translateX(-${idx * 100}%)` }}>
        {banners.map((b, i) => {
          const inner = (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl(b.image)}
                alt={b.title || "banner"}
                className={`w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${i === idx ? "scale-105" : "scale-100"}`}
              />
              {b.title && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4 sm:p-6">
                  <p className="text-white font-extrabold text-base sm:text-2xl lg:text-3xl drop-shadow-lg max-w-2xl leading-tight">{b.title}</p>
                </div>
              )}
            </>
          );
          return (
            <div key={b.id} className="relative w-full h-full shrink-0 bg-input-bg">
              {b.link ? (
                <a href={b.link} target={b.link.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="block w-full h-full">{inner}</a>
              ) : inner}
            </div>
          );
        })}
      </div>

      {banners.length > 1 && (
        <>
          <button onClick={() => go(idx - 1)} aria-label="Əvvəlki" className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 text-gray-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => go(idx + 1)} aria-label="Növbəti" className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/85 text-gray-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/25 backdrop-blur-sm">
            {banners.map((_, i) => (
              <button key={i} onClick={() => go(i)} aria-label={`Slayd ${i + 1}`} className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
