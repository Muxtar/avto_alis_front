"use client";
import { useEffect, useRef, useState } from "react";

export type Reputation = {
  score: number | null;
  level: string | null;
  completedOrders?: number;
  complaints?: number;
  complaintsAnswered?: number;
  returnsRejected?: number;
  returnsIgnored?: number;
  avgRating?: number | null;
  ratingCount?: number;
};

function tone(score: number) {
  if (score >= 90) return "bg-green-500/10 text-green-600 border-green-500/30";
  if (score >= 75) return "bg-blue-500/10 text-blue-600 border-blue-500/30";
  if (score >= 50) return "bg-amber-500/10 text-amber-600 border-amber-500/30";
  return "bg-red-500/10 text-red-500 border-red-500/30";
}

// Satıcının etibarlılıq reytinqi — kompakt nişan + klikdə detallar.
// Reytinq şikayətlərdən (alıcıların) və iadə davranışından hesablanır.
export default function SellerReputation({ reputation, className = "" }: { reputation?: Reputation | null; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!reputation) return null;

  if (reputation.score == null) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium border bg-input-bg text-muted border-input-border ${className}`}
        title="Etibarlılıq reytinqi üçün hələ kifayət qədər məlumat yoxdur">
        🛡 Yeni satıcı
      </span>
    );
  }

  const score = Math.round(reputation.score);
  const r = reputation;
  const rows: [string, React.ReactNode][] = [
    ["Tamamlanmış sifariş", r.completedOrders ?? 0],
    ["Şikayət", r.complaints ?? 0],
    ["Cavab verilmiş şikayət", r.complaintsAnswered ?? 0],
    ["Rədd edilmiş iadə", r.returnsRejected ?? 0],
    ["Cavabsız iadə", r.returnsIgnored ?? 0],
    ["Orta qiymət", r.avgRating != null ? `${Number(r.avgRating).toFixed(1)} ★${r.ratingCount ? ` (${r.ratingCount})` : ""}` : "—"],
  ];

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        aria-expanded={open}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${tone(score)}`}>
        🛡 Etibarlılıq {score}%{r.level ? ` · ${r.level}` : ""}
        <span className="opacity-60 text-[9px]">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="absolute z-[60] left-0 mt-1.5 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-card-border bg-card shadow-lg p-3 text-xs">
          <p className="font-semibold mb-1.5">Etibarlılıq reytinqi</p>
          <dl className="space-y-1">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[10px] text-muted mt-2 leading-snug">Alıcıların şikayətləri və iadə davranışı əsasında son 12 ay üzrə hesablanır.</p>
        </div>
      )}
    </div>
  );
}
