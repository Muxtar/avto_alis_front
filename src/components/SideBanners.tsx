"use client";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { API, imgUrl } from "@/lib/api";

type Banner = { id: number; image: string; link: string | null; title: string | null; position?: string };

// Karuselin sağındakı kiçik promo bannerlər (birmarket üslubu) — admin idarəli.
export default function SideBanners() {
  const [items, setItems] = useState<Banner[]>([]);

  useEffect(() => {
    fetch(`${API}/banners`).then((r) => r.json())
      .then((d) => { if (d.success) setItems((d.banners || []).filter((b: Banner) => b.position === "SIDE").slice(0, 3)); })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <motion.div className="hidden lg:flex flex-col gap-3 h-full" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}>
      {items.map((b) => {
        const src = /^(https?:|data:)/.test(b.image) ? b.image : imgUrl(b.image);
        const inner = (
          <div className="relative flex-1 min-h-[110px] rounded-2xl overflow-hidden ring-1 ring-black/10 bg-black group/side">
            {/* Bulanıq arxa fon — şəkil kəsilmir */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover blur-xl brightness-[0.6] scale-110" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={b.title || "banner"} className="absolute inset-0 w-full h-full object-contain transition-transform duration-500 group-hover/side:scale-105" />
            {b.title && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <p className="absolute left-3 right-3 bottom-2.5 text-white font-bold text-sm leading-tight drop-shadow-lg line-clamp-2">{b.title}</p>
              </>
            )}
          </div>
        );
        const V = { hidden: { opacity: 0, x: 24 }, show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 280, damping: 26 } } };
        return b.link ? (
          <motion.a key={b.id} variants={V} whileHover={{ y: -3 }} href={b.link} target={b.link.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="flex-1 flex">{inner}</motion.a>
        ) : (
          <motion.div key={b.id} variants={V} whileHover={{ y: -3 }} className="flex-1 flex">{inner}</motion.div>
        );
      })}
    </motion.div>
  );
}
