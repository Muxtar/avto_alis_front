// Saytın HAZIR karusel slaydları — şəkil faylı yoxdur, hər biri kodla çəkilir
// (gradient + işıq ləkələri + kiçik "interfeys" kompozisiyası). Ona görə hər
// ekranda kəskin görünür, yüngüldür və dizayn dəyişəndə bir yerdən dəyişilir.
//
// Admin panel (Karusel) bu siyahıdan hansıların göstəriləcəyini və sırasını seçir.
// Admin heç birini seçməyibsə hamısı göstərilir.
import type { ReactNode } from "react";

export type SiteSlide = {
  key: string;
  label: string;        // naviqasiya zolağındakı qısa ad
  kicker: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  from: string;         // gradient rəngləri
  via: string;
  to: string;
  glow: string;         // işıq ləkəsinin rəngi
  visual: () => ReactNode;
};

// ── Kiçik vizual hissələr ────────────────────────────────────────────────────
const glass = "bg-white/15 ring-1 ring-white/25 shadow-[0_20px_50px_-15px_rgba(0,0,0,.55)]";

function Float({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={`absolute hero-float ${className}`} style={{ animationDelay: `${delay}s` }}>{children}</div>;
}

function MiniCard({ emoji, title, price, tint }: { emoji: string; title: string; price: string; tint: string }) {
  return (
    <div className={`w-[118px] sm:w-[150px] rounded-2xl p-2 ${glass}`}>
      <div className="aspect-square rounded-xl flex items-center justify-center text-4xl sm:text-5xl" style={{ background: tint }}>{emoji}</div>
      <p className="text-white text-[10px] sm:text-xs font-semibold mt-1.5 truncate">{title}</p>
      <p className="text-white font-black text-xs sm:text-sm">{price} <span className="text-white/60 text-[9px]">AZN</span></p>
    </div>
  );
}

function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-bold text-white ${glass} ${className}`}>{children}</span>;
}

// ── Slaydlar ─────────────────────────────────────────────────────────────────
export const SITE_SLIDES: SiteSlide[] = [
  {
    key: "welcome", label: "Al, sat, kəşf et",
    kicker: "tradixai", title: "Minlərlə məhsul — bir yerdə",
    subtitle: "Fərdi satıcılardan və sahibkarlardan elanlar. Al, sat, müqayisə et.",
    cta: "Elanlara bax", href: "/elanlar",
    from: "#1e1b4b", via: "#4338ca", to: "#7c3aed", glow: "#a78bfa",
    visual: () => (
      <>
        <Float className="right-[34%] top-[16%] rotate-[-8deg]" delay={0}><MiniCard emoji="📱" title="iPhone 15 Pro" price="2 150" tint="linear-gradient(135deg,#c7d2fe,#818cf8)" /></Float>
        <Float className="right-[6%] top-[8%] rotate-[6deg]" delay={0.6}><MiniCard emoji="🛋️" title="Dəri divan" price="890" tint="linear-gradient(135deg,#fde68a,#f59e0b)" /></Float>
        <Float className="right-[18%] bottom-[10%] rotate-[3deg]" delay={1.2}><MiniCard emoji="🚲" title="Uşaq velosipedi" price="120" tint="linear-gradient(135deg,#a7f3d0,#10b981)" /></Float>
      </>
    ),
  },
  {
    key: "image-search", label: "Şəkillə axtar",
    kicker: "Süni intellekt", title: "Şəkil çək — məhsulu tap",
    subtitle: "Axtarış sətrindəki 📷 düyməsi ilə məhsulun şəklini çəkin, AI tanısın və saytda tapsın.",
    cta: "Sına", href: "/elanlar",
    from: "#0c4a6e", via: "#0369a1", to: "#06b6d4", glow: "#67e8f9",
    visual: () => (
      <>
        <Float className="right-[10%] top-[12%]" delay={0}>
          <div className="relative w-[170px] h-[170px] sm:w-[230px] sm:h-[230px] flex items-center justify-center">
            {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-3xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-3xl"].map((c) => (
              <span key={c} className={`absolute w-10 h-10 border-white/90 ${c}`} />
            ))}
            <span className="text-[90px] sm:text-[120px] drop-shadow-2xl">👟</span>
            <span className="absolute inset-x-6 top-1/2 h-0.5 bg-cyan-300 shadow-[0_0_18px_4px_rgba(103,232,249,.8)] hero-scan" />
          </div>
        </Float>
        <Float className="right-[30%] bottom-[12%]" delay={0.8}><Chip>✨ AI tanıdı: <span className="text-cyan-200">Nike Air Max</span></Chip></Float>
        <Float className="right-[4%] bottom-[22%]" delay={1.4}><Chip>🔍 24 nəticə</Chip></Float>
      </>
    ),
  },
  {
    key: "door-qr", label: "Qapı QR kodu",
    kicker: "Fərdi satıcılar üçün", title: "Evdə satırsan? Qapına QR yapışdır",
    subtitle: "Keçən şəxs QR-ı skan edir və evdə satdığınız bütün məhsulları görür.",
    cta: "QR kodumu al", href: "/account",
    from: "#422006", via: "#b45309", to: "#f59e0b", glow: "#fde68a",
    visual: () => (
      <>
        <Float className="right-[12%] top-[10%]" delay={0}>
          <div className={`rounded-3xl p-3 sm:p-4 ${glass}`}>
            <div className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] rounded-2xl bg-white p-2 grid grid-cols-7 grid-rows-7 gap-[3px]">
              {Array.from({ length: 49 }).map((_, i) => {
                const corner = [0, 1, 2, 7, 9, 14, 15, 16, 4, 5, 6, 11, 13, 18, 19, 20, 28, 29, 30, 35, 37, 42, 43, 44].includes(i);
                const on = corner || [3, 10, 17, 21, 23, 24, 26, 31, 33, 38, 40, 45, 47].includes(i);
                return <span key={i} className={`rounded-[2px] ${on ? "bg-[#1c1917]" : "bg-transparent"}`} />;
              })}
            </div>
            <p className="text-white text-[10px] sm:text-xs font-bold text-center mt-2">🏠 Evdə satılır</p>
          </div>
        </Float>
        <Float className="right-[36%] bottom-[14%]" delay={0.7}><Chip>📍 Səməd Vurğun 12</Chip></Float>
        <Float className="right-[4%] bottom-[10%]" delay={1.3}><Chip>📦 8 məhsul</Chip></Float>
      </>
    ),
  },
  {
    key: "delivery", label: "Sürətli çatdırılma",
    kicker: "Yango ilə", title: "Sifarişin bir neçə saata qapında",
    subtitle: "Kartla al, kuryer satıcıdan götürüb birbaşa sənə gətirsin. Canlı izləmə ilə.",
    cta: "Alış-verişə başla", href: "/elanlar",
    from: "#052e16", via: "#15803d", to: "#84cc16", glow: "#bef264",
    visual: () => (
      <>
        <svg className="absolute right-[4%] top-[14%] w-[52%] h-[70%] opacity-90" viewBox="0 0 300 200" fill="none" aria-hidden>
          <path d="M20 170 C 90 160, 70 60, 150 80 S 250 40, 280 30" stroke="white" strokeOpacity=".85" strokeWidth="4" strokeDasharray="10 9" className="hero-dash" />
          <circle cx="20" cy="170" r="9" fill="#bef264" /><circle cx="280" cy="30" r="9" fill="#fff" />
        </svg>
        <Float className="right-[30%] top-[38%]" delay={0}><span className="text-6xl sm:text-7xl drop-shadow-2xl">🚗</span></Float>
        <Float className="right-[3%] top-[6%]" delay={0.6}><Chip>🏠 Çatdırıldı · 14:32</Chip></Float>
        <Float className="right-[44%] bottom-[8%]" delay={1.2}><Chip>⏱ ~45 dəq</Chip></Float>
      </>
    ),
  },
  {
    key: "secure-pay", label: "Təhlükəsiz ödəniş",
    kicker: "Alıcı qorunur", title: "Kartla ödə — rahat və təhlükəsiz",
    subtitle: "Ödəniş satıcıya yalnız məhsulu təhvil aldıqdan sonra keçir. Taksit də mövcuddur.",
    cta: "Necə işləyir?", href: "/elanlar",
    from: "#2e1065", via: "#7e22ce", to: "#db2777", glow: "#f0abfc",
    visual: () => (
      <>
        <Float className="right-[14%] top-[14%] rotate-[-10deg]" delay={0}>
          <div className="w-[200px] h-[126px] sm:w-[270px] sm:h-[170px] rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-white/35 to-white/10 ring-1 ring-white/40 shadow-2xl flex flex-col justify-between">
            <div className="flex justify-between items-center"><span className="w-9 h-7 rounded-md bg-amber-200/90" /><span className="text-white font-black italic">VISA</span></div>
            <p className="text-white font-mono tracking-[.2em] text-xs sm:text-base">•••• •••• •••• 4821</p>
          </div>
        </Float>
        <Float className="right-[4%] bottom-[12%]" delay={0.8}><span className="text-6xl sm:text-7xl drop-shadow-2xl">🛡️</span></Float>
        <Float className="right-[40%] bottom-[10%]" delay={1.4}><Chip>✓ Ödəniş qorunur</Chip></Float>
      </>
    ),
  },
  {
    key: "group-buy", label: "Birgə alış",
    kicker: "Birlikdə ucuz", title: "Dostlarla birgə al — endirim qazan",
    subtitle: "Nə qədər çox alıcı qoşulsa, qiymət o qədər düşür. Fərq kartına qaytarılır.",
    cta: "Birgə alışlar", href: "/elanlar?type=GROUP_BUY",
    from: "#450a0a", via: "#c2410c", to: "#f43f5e", glow: "#fda4af",
    visual: () => (
      <>
        <Float className="right-[12%] top-[16%]" delay={0}>
          <div className="flex -space-x-4">
            {["🧑🏻", "👩🏽", "🧔🏻", "👩🏼", "🧑🏾"].map((e, i) => (
              <span key={i} className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-full bg-white/20 ring-4 ring-white/30 flex items-center justify-center text-3xl sm:text-4xl">{e}</span>
            ))}
          </div>
        </Float>
        <Float className="right-[18%] bottom-[16%]" delay={0.7}>
          <div className={`rounded-2xl px-4 py-3 ${glass}`}>
            <p className="text-white/70 text-[10px] sm:text-xs line-through">450 AZN</p>
            <p className="text-white font-black text-2xl sm:text-3xl">360 <span className="text-sm">AZN</span></p>
            <span className="inline-block mt-1 rounded-full bg-emerald-400 text-emerald-950 px-2 text-[10px] font-extrabold">−20% · 5/5 nəfər</span>
          </div>
        </Float>
      </>
    ),
  },
  {
    key: "experts", label: "Peşəkardan rəy",
    kicker: "Onlayn konsultasiya", title: "Peşəkardan rəy al — evdən çıxmadan",
    subtitle: "Mexanik, həkim, hüquqşünas, dizayner — mütəxəssislə çatda və ya zəngdə danış.",
    cta: "Mütəxəssis tap", href: "/elanlar?type=PROFESSION",
    from: "#082f49", via: "#1d4ed8", to: "#6366f1", glow: "#93c5fd",
    visual: () => (
      <>
        <Float className="right-[24%] top-[12%]" delay={0}>
          <div className="rounded-2xl rounded-bl-md px-3.5 py-2.5 bg-white text-[#0f172a] text-xs sm:text-sm font-semibold shadow-2xl max-w-[220px]">Mühərrik səs salır, nə ola bilər? 🤔</div>
        </Float>
        <Float className="right-[6%] top-[42%]" delay={0.7}>
          <div className="rounded-2xl rounded-br-md px-3.5 py-2.5 bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-2xl max-w-[230px]">Videonu göndərin, 5 dəqiqəyə baxım 👨‍🔧</div>
        </Float>
        <Float className="right-[34%] bottom-[10%]" delay={1.3}><Chip>⭐ 4.9 · 230 rəy</Chip></Float>
      </>
    ),
  },
  {
    key: "map", label: "Xəritədə tap",
    kicker: "Yaxınlıqda", title: "Yanındakı mağaza və satıcıları kəşf et",
    subtitle: "Xəritədə ən yaxın obyektləri, açıq mağazaları və elanları gör.",
    cta: "Xəritəni aç", href: "/locations",
    from: "#022c22", via: "#0f766e", to: "#14b8a6", glow: "#5eead4",
    visual: () => (
      <>
        <div className="absolute right-[4%] top-[10%] w-[54%] h-[80%] rounded-3xl overflow-hidden ring-1 ring-white/20 opacity-90"
          style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 1px, transparent 1px 34px)" }}>
          <span className="absolute left-[10%] right-[5%] top-[55%] h-3 bg-white/15 -rotate-12 rounded" />
          <span className="absolute top-[5%] bottom-[5%] left-[55%] w-3 bg-white/15 rotate-6 rounded" />
        </div>
        {[["right-[40%] top-[24%]", 0], ["right-[18%] top-[46%]", 0.5], ["right-[30%] bottom-[16%]", 1]].map(([c, d]) => (
          <Float key={String(c)} className={String(c)} delay={Number(d)}><span className="text-4xl sm:text-5xl drop-shadow-xl">📍</span></Float>
        ))}
        <Float className="right-[6%] top-[14%]" delay={1.4}><Chip>🏪 12 obyekt · 1 km</Chip></Float>
      </>
    ),
  },
  {
    key: "vip", label: "VIP elan",
    kicker: "Daha çox baxış", title: "Elanını VIP et — siyahıda ən önə çıx",
    subtitle: "VIP elanlar bütün siyahılarda birinci göstərilir və xüsusi nişan alır.",
    cta: "Elanlarım", href: "/account",
    from: "#1c1917", via: "#78350f", to: "#ca8a04", glow: "#fde047",
    visual: () => (
      <>
        <Float className="right-[14%] top-[12%]" delay={0}>
          <div className="relative">
            <MiniCard emoji="⌚" title="Apple Watch 9" price="640" tint="linear-gradient(135deg,#fef08a,#eab308)" />
            <span className="absolute -top-3 -left-3 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 text-[#422006] px-2 py-0.5 text-[10px] font-black shadow-lg">👑 VIP</span>
          </div>
        </Float>
        <Float className="right-[40%] bottom-[14%]" delay={0.8}><Chip>📈 5× daha çox baxış</Chip></Float>
      </>
    ),
  },
  {
    key: "advertise", label: "Reklam ver",
    kicker: "Reklam yeri", title: "Məhsulun burada minlərlə alıcıya görünsün",
    subtitle: "Fərdi və ya sahibkar — elanını və obyektini ana səhifədə reklam et. 3 gündən başlayan paketlər.",
    cta: "Reklam ver", href: "/reklam",
    from: "#1e1b4b", via: "#6d28d9", to: "#db2777", glow: "#f9a8d4",
    visual: () => (
      <>
        <Float className="right-[16%] top-[14%]" delay={0}><span className="text-[90px] sm:text-[120px] drop-shadow-2xl -rotate-12 inline-block">📣</span></Float>
        <Float className="right-[4%] bottom-[16%]" delay={0.7}>
          <div className={`rounded-2xl px-4 py-3 ${glass}`}>
            <p className="text-white/70 text-[10px] sm:text-xs">Bu həftə</p>
            <p className="text-white font-black text-xl sm:text-2xl">12 480 <span className="text-xs font-bold text-white/70">baxış</span></p>
            <div className="flex items-end gap-1 h-8 mt-1">{[30, 45, 38, 60, 72, 66, 90].map((h, i) => <span key={i} className="w-2.5 rounded-sm bg-pink-300/90" style={{ height: `${h}%` }} />)}</div>
          </div>
        </Float>
      </>
    ),
  },
];

export const SITE_SLIDE_MAP = new Map(SITE_SLIDES.map((s) => [s.key, s]));
