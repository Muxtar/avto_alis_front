"use client";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { API, imgUrl } from "@/lib/api";
import { loadActiveAds, trackImpressions, adImg, type PublicAd } from "@/components/HomeCarousel";

type Banner = { id: number; image: string; link: string | null; title: string | null; position?: string };

// Karuselin sağındakı kiçik promo bannerlər (birmarket üslubu) — admin idarəli.
export default function SideBanners() {
  const [items, setItems] = useState<Banner[]>([]);
  const [ads, setAds] = useState<PublicAd[]>([]);

  useEffect(() => {
    fetch(`${API}/banners`).then((r) => r.json())
      .then((d) => { if (d.success) setItems((d.banners || []).filter((b: Banner) => b.position === "SIDE").slice(0, 3)); })
      .catch(() => {});
    // Ödənişli yan banner reklamları — hər yükləmədə təsadüfi 3-ü (növbə ilə).
    loadActiveAds().then((all) => {
      const side = all.filter((a) => a.placement === "SIDE").sort(() => Math.random() - 0.5).slice(0, 3);
      setAds(side);
    });
  }, []);

  // Yalnız böyük ekranda görünür — göstərilmə də yalnız orada sayılsın.
  useEffect(() => {
    if (ads.length && typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches) trackImpressions(ads.map((a) => a.id));
  }, [ads]);

  if (ads.length > 0) {
    // Reklamlar + (yer qalırsa) admin bannerləri; cəmi 3 plitə.
    const fill = items.slice(0, Math.max(0, 3 - ads.length));
    return (
      <div className="hidden xl:flex flex-col gap-2 h-full">
        {ads.map((a) => (
          <a key={`ad${a.id}`} href={a.href}
            onClick={() => { try { navigator.sendBeacon?.(`${API}/ads/${a.id}/click`, new Blob(["{}"], { type: "application/json" })); } catch { /* keç */ } }}
            className="relative flex-1 min-h-[96px] rounded-xl overflow-hidden bg-[#140f3a] ring-1 ring-black/10 group/side flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={adImg(a.image || a.productImage)} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover blur-xl brightness-[0.5] scale-110" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={adImg(a.productImage || a.image)} alt={a.headline}
              className="absolute right-2 top-2 bottom-2 w-[42%] h-[calc(100%-1rem)] object-contain rounded-lg transition-transform duration-500 group-hover/side:scale-105" />
            <div className="relative z-10 w-[58%] p-2.5 flex flex-col justify-center text-white">
              <span className="self-start rounded-full bg-amber-400 text-[#1c1917] px-1.5 py-px text-[8.5px] font-extrabold uppercase tracking-[.12em] mb-1">
                Reklam · {a.sellerKind === "BUSINESS" ? "Sahibkar" : "Fərdi"}
              </span>
              <p className="font-extrabold text-[12px] leading-tight line-clamp-2" style={{ textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>{a.headline}</p>
              {typeof a.price === "number" && a.price > 0 && <p className="text-[12px] font-black mt-1">{a.price} <span className="text-[10px] text-white/70">AZN</span></p>}
            </div>
          </a>
        ))}
        {fill.map((b) => (
          <a key={b.id} href={b.link || "#"} className="relative flex-1 min-h-[96px] rounded-xl overflow-hidden ring-1 ring-black/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={/^(https?:|data:)/.test(b.image) ? b.image : imgUrl(b.image)} alt={b.title || "banner"} className="absolute inset-0 w-full h-full object-cover" />
          </a>
        ))}
      </div>
    );
  }

  // Admin banner qoymayıbsa sahə boş qalmasın — saytın öz bölmələrinə aparan
  // 3 plitə göstərilir (uydurma promo yox, real daxili linklər).
  if (items.length === 0) {
    const tiles = [
      { href: "/elanlar?sort=newest", title: "Ən son elanlar", sub: "Yeni əlavə olunanlar", cls: "from-indigo-500 to-violet-600" },
      { href: "/elanlar?type=PROFESSION", title: "İxtisas sahibləri", sub: "Peşəkardan onlayn rəy", cls: "from-sky-500 to-cyan-500" },
      { href: "/reklam", title: "📣 Reklam ver", sub: "Məhsulunuz burada görünsün", cls: "from-fuchsia-500 to-pink-500" },
    ];
    return (
      <div className="hidden xl:flex flex-col gap-2 h-full">
        {tiles.map((tl) => (
          <a key={tl.href} href={tl.href}
            className={`relative flex-1 min-h-[96px] rounded-xl overflow-hidden bg-gradient-to-br ${tl.cls} p-3 flex flex-col justify-center text-white hover:brightness-110 transition-all`}>
            <span className="absolute -right-5 -bottom-7 w-20 h-20 rounded-full bg-white/15" />
            <p className="text-[13.5px] font-extrabold leading-tight relative">{tl.title}</p>
            <p className="text-[11px] text-white/85 mt-0.5 leading-snug relative">{tl.sub}</p>
          </a>
        ))}
      </div>
    );
  }

  return (
    <motion.div className="hidden xl:flex flex-col gap-2 h-full" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}>
      {items.map((b) => {
        const src = /^(https?:|data:)/.test(b.image) ? b.image : imgUrl(b.image);
        const inner = (
          <div className="relative flex-1 min-h-[96px] rounded-xl overflow-hidden ring-1 ring-black/10 bg-black group/side">
            {/* Bulanıq arxa fon — şəkil kəsilmir. will-change/translateZ YOXDUR:
                ayrıca GPU qatında blur hər scroll kadrında yenidən hesablanırdı (ağ flash). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover blur-xl brightness-[0.6] scale-110" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={b.title || "banner"} className="absolute inset-0 w-full h-full object-contain transition-transform duration-500 group-hover/side:scale-105" />
            {b.title && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <p className="absolute left-2.5 right-2.5 bottom-2 text-white font-bold text-xs leading-tight line-clamp-2" style={{ textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>{b.title}</p>
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
