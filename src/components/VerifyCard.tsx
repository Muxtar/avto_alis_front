"use client";
/* ──────────────────────────────────────────────────────────────────────────
   Profil doğrulama kartı — "kimlik kartı" görünüşü.
   Kimlik təsdiqi / telefon nömrəsi / iş yeri kimi bölmələr artıq uzun siyahı
   deyil, orta ölçülü karta bənzəyir: təsdiqlənibsə ✓ (yaşıl), yoxdursa ✕
   (qırmızı), gözləyirsə ⏳ (narıncı) nişanı olur. Karta klikləyəndə həmin
   bölmənin ətraflı paneli açılır (aşağıda).
   ────────────────────────────────────────────────────────────────────────── */
import React, { useId } from "react";

export type VerifyState = "ok" | "pending" | "none";
export type CardVariant = "id" | "phone" | "work" | "business" | "object";

const GLYPH: Record<CardVariant, React.ReactNode> = {
  id: (<><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><circle cx="8.5" cy="11" r="2.2" /><path d="M5 16.2c.7-1.4 2-2.2 3.5-2.2s2.8.8 3.5 2.2M14.5 9.5h4.5M14.5 12.5h4.5M14.5 15.5h3" /></>),
  phone: (<><rect x="6.5" y="2.5" width="11" height="19" rx="2.6" /><path d="M10.5 18.5h3" /></>),
  work: (<><path d="M3.5 20.5V9.2L12 4l8.5 5.2v11.3" /><path d="M9.5 20.5v-5h5v5" /><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01" /></>),
  business: (<><rect x="2.8" y="8.5" width="8" height="12" rx="1.2" /><rect x="12.2" y="3.5" width="8" height="17" rx="1.2" /><path d="M5.3 12h3M5.3 16h3M14.7 7h3M14.7 11h3M14.7 15h3" /></>),
  object: (<><path d="M4 9.8h16V20.5H4z" /><path d="M2.8 9.8L4.4 5.2h15.2l1.6 4.6" /><path d="M9.8 20.5V15h4.4v5.5" /><path d="M2.8 9.8a2.6 2.6 0 0 0 5.2 0 2.6 2.6 0 0 0 5.2 0 2.6 2.6 0 0 0 5.2 0" /></>),
};

function StatusBadge({ state, onDark }: { state: VerifyState; onDark: boolean }) {
  const map = {
    ok: { cls: "bg-emerald-500 text-white", icon: <path d="M5 12.5l4.5 4.5L19 7.5" /> },
    pending: { cls: "bg-amber-500 text-white", icon: <><circle cx="12" cy="12" r="7.5" /><path d="M12 8v4.3l2.6 1.6" /></> },
    none: { cls: "bg-red-500 text-white", icon: <path d="M7 7l10 10M17 7L7 17" /> },
  }[state];
  return (
    <span className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md shrink-0 ${map.cls} ${onDark ? "ring-2 ring-white/40" : "ring-2 ring-card"}`}>
      <svg viewBox="0 0 24 24" className="w-[19px] h-[19px]" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
        {map.icon}
      </svg>
    </span>
  );
}

export default function VerifyCard({
  variant, title, value, hint, state, open, onClick, cta = "Təsdiqlə", compact = false,
}: {
  variant: CardVariant;
  title: string;        // kartın üst etiketi (məs. "KİMLİK TƏSDİQİ")
  value: string;        // əsas dəyər (ad, nömrə, şirkət)
  hint?: string;        // altdakı kiçik izah
  state: VerifyState;
  open: boolean;
  onClick: () => void;
  cta?: string;         // təsdiq yoxdursa kartdakı çağırış ("Təsdiqlə", "Əlavə et")
  compact?: boolean;    // daha alçaq kart (məs. obyekt siyahısı — çox sayda olur)
}) {
  const ok = state === "ok";
  const chipId = useId(); // eyni səhifədə bir neçə kart olanda SVG id-ləri toqquşmasın
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`group relative w-full text-left rounded-2xl border overflow-hidden p-4 sm:p-[18px] flex flex-col justify-between
        ${compact ? "min-h-[118px]" : "aspect-[1.62/1] min-h-[164px]"} transition-all duration-200
        ${ok ? "text-white border-transparent shadow-lg shadow-[var(--brand-to)]/25" : "bg-card border-card-border"}
        ${open ? "ring-2 ring-[var(--brand-to)] ring-offset-2 ring-offset-[var(--background)]" : "hover:-translate-y-0.5 hover:shadow-xl"}`}
      style={ok ? { backgroundImage: "linear-gradient(135deg, var(--brand-from) 0%, var(--brand-to) 55%, #7c3aed 100%)" } : undefined}
    >
      {/* Dekor — kartın "holoqram" dairələri / təsdiqsizdə solğun ləkə */}
      <span aria-hidden className={`pointer-events-none absolute -right-10 -top-12 w-36 h-36 rounded-full ${ok ? "bg-white/12" : "bg-[var(--brand-soft)]"}`} />
      <span aria-hidden className={`pointer-events-none absolute -right-6 -bottom-14 w-28 h-28 rounded-full ${ok ? "bg-white/8" : "bg-[var(--brand-soft)]/60"}`} />
      {/* Böyük şəffaf ikon (fon nişanı) */}
      <svg aria-hidden viewBox="0 0 24 24" className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-[72px] h-[72px] ${ok ? "text-white/[.14]" : "text-foreground/[.045]"}`}
        fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
        {GLYPH[variant]}
      </svg>

      {/* Üst sətir — etiket + status nişanı */}
      <div className="relative flex items-start justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[.13em] ${ok ? "text-white/85" : "text-muted"}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            {GLYPH[variant]}
          </svg>
          {title}
        </span>
        <StatusBadge state={state} onDark={ok} />
      </div>

      {/* Orta — kimlik kartında "çip" + maskalanmış rəqəmlər; təsdiq yoxdursa CTA */}
      <div className={`relative flex items-center gap-2.5 ${compact ? "mt-1.5" : "min-h-[28px]"}`}>
        {variant === "id" && (
          <>
            <svg viewBox="0 0 36 28" className={`w-9 h-7 shrink-0 ${ok ? "" : "opacity-60"}`} aria-hidden>
              <defs>
                <linearGradient id={chipId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <rect x="0.6" y="0.6" width="34.8" height="26.8" rx="4.5"
                fill={ok ? `url(#${chipId})` : "var(--input-bg)"} stroke={ok ? "rgba(255,255,255,.5)" : "var(--card-border)"} strokeWidth="1.2" />
              <g stroke={ok ? "rgba(120,53,15,.55)" : "var(--card-border)"} strokeWidth="1.1" fill="none">
                <rect x="11" y="8" width="14" height="12" rx="2" />
                <path d="M11 12H2.5M11 16H2.5M25 12h8.5M25 16h8.5M15 8V0.6M15 27.4V20M21 8V0.6M21 27.4V20" />
              </g>
            </svg>
            <span className={`text-[12.5px] font-mono tracking-[.2em] ${ok ? "text-white/80" : "text-muted/70"}`}>•••• •••• ••••</span>
          </>
        )}
        {!ok && (
          <span className={`ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold
            ${state === "pending" ? "bg-amber-500/12 text-amber-600" : "bg-[var(--brand-soft)] text-[var(--brand-to)]"}`}>
            {state === "pending" ? "Yoxlanılır" : cta} <span aria-hidden>→</span>
          </span>
        )}
      </div>

      {/* Alt sətir — dəyər + izah + ox */}
      <div className="relative flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-[15px] font-bold leading-tight truncate ${ok ? "text-white" : "text-foreground"}`}>{value}</p>
          {hint && <p className={`text-[11.5px] mt-0.5 leading-snug line-clamp-2 ${ok ? "text-white/75" : "text-muted"}`}>{hint}</p>}
        </div>
        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-200 ${ok ? "bg-white/20 text-white" : "bg-input-bg text-muted group-hover:text-[var(--brand-to)]"} ${open ? "rotate-180" : ""}`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 9l-7 7-7-7" /></svg>
        </span>
      </div>
    </button>
  );
}
