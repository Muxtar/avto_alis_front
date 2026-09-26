// KİMLİK KARTI üslubu — profilin bütün bölmələri (telefon, avtomobil, sosial
// hesablar, sənədlər…) eyni «vəsiqə» görünüşündə: rəngli başlıq zolağı,
// ikon, başlıq, təsdiq möhürü; içində etiket + dəyər sahələri.
import type { ReactNode } from "react";

export type IdTone = "brand" | "blue" | "green" | "teal" | "purple" | "pink" | "slate" | "amber";
export type IdStamp = "ok" | "pending" | "none" | null | undefined;

const TONES: Record<IdTone, string> = {
  brand: "from-[var(--brand-from)] to-[var(--brand-to)]",
  blue: "from-sky-500 to-blue-600",
  green: "from-emerald-500 to-green-600",
  teal: "from-teal-500 to-cyan-600",
  purple: "from-violet-500 to-purple-600",
  pink: "from-pink-500 to-rose-600",
  slate: "from-slate-600 to-slate-800",
  amber: "from-amber-500 to-orange-600",
};

export function Stamp({ state, okText = "Təsdiqli", pendingText = "Gözləyir", noneText }: { state: IdStamp; okText?: string; pendingText?: string; noneText?: string }) {
  if (state === "ok") return <span className="id-stamp id-stamp-ok">✓ {okText}</span>;
  if (state === "pending") return <span className="id-stamp id-stamp-pending">⏳ {pendingText}</span>;
  if (state === "none" && noneText) return <span className="id-stamp id-stamp-none">{noneText}</span>;
  return null;
}

/**
 * Bölmə kartı (böyük). `collapsible` olanda default BAĞLIDIR — başlığa klik
 * edəndə aşağıya doğru açılır. Məzmun bağlı olanda da mount qalır (içindəki
 * komponentlərin vəziyyəti və statusu itmir), sadəcə gizlədilir.
 */
export default function IdCard({
  id, icon, title, subtitle, summary, tone = "brand", stamp, stampText, actions, children, className = "",
  collapsible = false, open = true, onToggle,
}: {
  id?: string; icon: ReactNode; title: ReactNode; subtitle?: ReactNode; summary?: ReactNode; tone?: IdTone;
  stamp?: IdStamp; stampText?: { ok?: string; pending?: string; none?: string };
  actions?: ReactNode; children?: ReactNode; className?: string;
  collapsible?: boolean; open?: boolean; onToggle?: () => void;
}) {
  const shown = !collapsible || open;
  return (
    <section id={id} className={`id-card mb-3 ${collapsible ? "id-card-collapsible" : ""} ${shown ? "is-open" : ""} ${className}`}>
      <header
        className={`id-card-band bg-gradient-to-r ${TONES[tone]} ${collapsible ? "cursor-pointer select-none" : ""}`}
        {...(collapsible ? {
          role: "button", tabIndex: 0, "aria-expanded": shown,
          onClick: onToggle,
          onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle?.(); } },
        } : {})}
      >
        <span className="id-card-icon">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="id-card-kicker">tradixai · kimlik</p>
          <h2 className="id-card-title">{title}</h2>
          {summary && <p className="id-card-summary">{summary}</p>}
        </div>
        <Stamp state={stamp} okText={stampText?.ok} pendingText={stampText?.pending} noneText={stampText?.none} />
        {actions && shown && <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>{actions}</div>}
        {collapsible && (
          <span className="id-card-chevron" aria-hidden="true">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
          </span>
        )}
      </header>
      <div className={shown ? "id-card-body" : "hidden"}>
        {subtitle && <p className="px-4 sm:px-5 pt-3 text-xs text-muted">{subtitle}</p>}
        {children !== undefined && <div className="p-4 sm:p-5">{children}</div>}
      </div>
    </section>
  );
}

/** Kiçik kart — bölmənin içindəki bir element (avtomobil, sosial hesab, iş yeri…). */
export function IdMini({
  icon, title, sub, tone = "brand", stamp, stampText, actions, children, className = "",
}: {
  icon: ReactNode; title: ReactNode; sub?: ReactNode; tone?: IdTone; stamp?: IdStamp;
  stampText?: { ok?: string; pending?: string; none?: string };
  actions?: ReactNode; children?: ReactNode; className?: string;
}) {
  return (
    <div className={`id-mini ${className}`}>
      <span className={`id-mini-stripe bg-gradient-to-b ${TONES[tone]}`} aria-hidden="true" />
      <div className="flex items-start gap-3">
        <span className={`id-mini-icon bg-gradient-to-br ${TONES[tone]}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm truncate">{title}</p>
            <Stamp state={stamp} okText={stampText?.ok} pendingText={stampText?.pending} noneText={stampText?.none} />
          </div>
          {sub && <div className="text-xs text-muted truncate mt-0.5">{sub}</div>}
        </div>
        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

/** Vəsiqədəki kimi sahə: kiçik böyük hərfli etiket + qalın dəyər. */
export function IdField({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <p className="id-field-label">{label}</p>
      <p className={`id-field-value ${mono ? "font-mono tracking-wide" : ""}`}>{value}</p>
    </div>
  );
}
