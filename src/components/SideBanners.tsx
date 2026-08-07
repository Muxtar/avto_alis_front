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

  // Admin banner qoymayıbsa sahə boş qalmasın — saytın öz bölmələrinə aparan
  // 3 plitə göstərilir (uydurma promo yox, real daxili linklər).
  if (items.length === 0) {
    const tiles = [
      { href: "/elanlar?sort=newest", title: "Ən son elanlar", sub: "Yeni əlavə olunanlar", cls: "from-indigo-500 to-violet-600" },
      { href: "/elanlar?type=PROFESSION", title: "İxtisas sahibləri", sub: "Peşəkardan onlayn rəy", cls: "from-sky-500 to-cyan-500" },
      { href: "/locations", title: "Yer üzrə axtar", sub: "Yaxınlıqdakı elanlar", cls: "from-fuchsia-500 to-pink-500" },
    ];
    return (
      <div className="hidden lg:flex flex-col gap-2 h-full">
        {tiles.map((tl) => (
          <a key={tl.href} href={tl.href}
            className={`relative flex-1 min-h-[122px] rounded overflow-hidden bg-gradient-to-br ${tl.cls} p-4 flex flex-col justify-center text-white hover:brightness-110 transition-all`}>
            <span className="absolute -right-6 -bottom-8 w-28 h-28 rounded-full bg-white/15" />
            <p className="text-[17px] font-extrabold leading-tight relative">{tl.title}</p>
            <p className="text-[12px] text-white/85 mt-0.5 relative">{tl.sub}</p>
          </a>
        ))}
      </div>
    );
  }

  return (
    <motion.div className="hidden lg:flex flex-col gap-2 h-full" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}>
      {items.map((b) => {
        const src = /^(https?:|data:)/.test(b.image) ? b.image : imgUrl(b.image);
        const inner = (
          <div className="relative flex-1 min-h-[122px] rounded overflow-hidden ring-1 ring-black/10 bg-black group/side">
            {/* Bulanıq arxa fon — şəkil kəsilmir */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" aria-hidden="true" style={{ willChange: "transform", transform: "translateZ(0)" }} className="absolute inset-0 w-full h-full object-cover blur-xl brightness-[0.6] scale-110" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={b.title || "banner"} className="absolute inset-0 w-full h-full object-contain transition-transform duration-500 group-hover/side:scale-105" />
            {b.title && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <p className="absolute left-3 right-3 bottom-2.5 text-white font-bold text-sm leading-tight line-clamp-2" style={{ textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>{b.title}</p>
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
