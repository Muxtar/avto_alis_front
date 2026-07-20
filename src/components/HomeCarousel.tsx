"use client";
import { useState, useEffect, useRef } from "react";
import { API, imgUrl } from "@/lib/api";

type Banner = { id: number; image: string; link: string | null; title: string | null };

// Ana səhifə karuseli — admin panelindən idarə olunur (endirim/banner şəkilləri).
export default function HomeCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const timer = useRef<any>(null);

  useEffect(() => {
    fetch(`${API}/banners`).then((r) => r.json()).then((d) => { if (d.success) setBanners(d.banners || []); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    clearInterval(timer.current);
    timer.current = setInterval(() => setIdx((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(timer.current);
  }, [banners.length]);

  if (banners.length === 0) return null;
  const go = (i: number) => setIdx(((i % banners.length) + banners.length) % banners.length);
  const b = banners[idx];

  const Slide = (
    <div className="relative w-full aspect-[16/6] sm:aspect-[16/5] bg-input-bg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgUrl(b.image)} alt={b.title || "banner"} className="w-full h-full object-cover" />
      {b.title && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <p className="text-white font-semibold text-sm sm:text-lg drop-shadow">{b.title}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative rounded-2xl overflow-hidden border border-card-border mb-5 group">
      {b.link ? <a href={b.link} target={b.link.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{Slide}</a> : Slide}

      {banners.length > 1 && (
        <>
          <button onClick={() => go(idx - 1)} aria-label="Əvvəlki" className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => go(idx + 1)} aria-label="Növbəti" className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button key={i} onClick={() => go(i)} aria-label={`Slayd ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
