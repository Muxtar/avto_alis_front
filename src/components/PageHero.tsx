// Səhifə başlığı — profil kimlik kartlarının dili: brend qradiyenti + vəsiqə naxışı,
// başlıq, alt mətn, statistika çipləri və şüşə düymələr (Elanlarım, Biznes kabineti və s.).
import type { ReactNode } from "react";

export default function PageHero({
  icon, kicker, title, subtitle, stats, actions, children,
}: {
  icon: ReactNode; kicker: string; title: ReactNode; subtitle?: ReactNode;
  stats?: { label: string; value: ReactNode; tone?: "ok" | "warn" | "bad" }[];
  actions?: ReactNode; children?: ReactNode;
}) {
  return (
    <section className="brand-band page-hero mb-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="w-12 h-12 rounded-2xl bg-white/20 ring-1 ring-white/30 flex items-center justify-center text-xl shrink-0">{icon}</span>
        <div className="min-w-0 sm:min-w-[260px] flex-1">
          <p className="brand-band-kicker">{kicker}</p>
          <h1 className="text-xl sm:text-2xl font-extrabold leading-tight whitespace-nowrap">{title}</h1>
          {subtitle && <p className="text-[12.5px] opacity-85 mt-0.5 line-clamp-2">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">{actions}</div>}
      </div>
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white/12 ring-1 ring-white/15 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider opacity-80 flex items-center gap-1">
                {s.tone && <span className={`w-1.5 h-1.5 rounded-full ${s.tone === "ok" ? "bg-emerald-300" : s.tone === "warn" ? "bg-amber-300" : "bg-rose-300"}`} />}
                {s.label}
              </p>
              <p className="text-lg font-extrabold tabular-nums leading-tight">{s.value}</p>
            </div>
          ))}
        </div>
      )}
      {children}
    </section>
  );
}

/** Başlıqdakı şüşə düymə/link üslubu. */
export const heroBtn = "hero-btn inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-white bg-white/15 ring-1 ring-white/25 hover:bg-white/25 transition-colors";
export const heroBtnPrimary = "hero-btn inline-flex items-center gap-1.5 h-9 px-4 text-sm font-bold bg-white text-[var(--brand-to)] shadow-md hover:brightness-105 transition";
