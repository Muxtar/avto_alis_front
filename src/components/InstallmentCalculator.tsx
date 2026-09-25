"use client";
import { useState } from "react";
import { monthlyPayment, useInstallmentConfig, feePercentFor } from "@/lib/installment";

/**
 * HİSSƏLİ ALIŞ KALKULYATORU — məhsul səhifəsində və səbətdə.
 *
 * Planlar admin paneldən gəlir (GET /installment/config). Komissiyanı alıcı
 * ödəyirsə aylıq məbləğə daxil edilir və düymədə «+X%» göstərilir.
 */
export default function InstallmentCalculator({
  amount, value, onChange, compact, months: allowed,
}: {
  amount: number;
  value?: number | null;
  onChange?: (months: number | null) => void;
  compact?: boolean;
  /** Bu məhsul(lar) üçün icazəli planlar (aktiv planlar ∩ satıcı limiti). */
  months?: number[];
}) {
  const cfg = useInstallmentConfig();
  const OPTIONS = allowed && allowed.length ? allowed : cfg?.months || [];
  const fallback = OPTIONS.includes(6) ? 6 : OPTIONS[0];
  const [own, setOwn] = useState<number | null>(null);
  const months = value !== undefined ? value : own;
  const set = (m: number | null) => { if (value === undefined) setOwn(m); onChange?.(m); };
  if (!OPTIONS.length || fallback == null) return null;

  const active = months != null && OPTIONS.includes(months) ? months : fallback;
  const fee = cfg?.buyerPaysFee ? feePercentFor(cfg, active) : 0;
  const payable = Math.round(amount * (100 + fee)) / 100;
  const { monthly } = monthlyPayment(payable, active);

  return (
    <div className={`border border-card-border rounded-2xl ${compact ? "p-3" : "p-4"}`}>
      <p className="font-bold text-sm">Hissəli alış kalkulyatoru</p>
      <p className="text-[11px] text-muted mb-3">Şərtlər endirimli qiymətə tətbiq olunur</p>

      <div className="flex items-stretch gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
          {OPTIONS.map((m) => {
            const on = m === active;
            const f = cfg?.buyerPaysFee ? feePercentFor(cfg, m) : 0;
            return (
              <button key={m} type="button" onClick={() => set(m)} aria-pressed={on}
                className={`relative w-14 h-14 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                  on ? "bg-foreground text-background" : "bg-input-bg text-foreground hover:bg-input-bg/70"
                }`}>
                <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold whitespace-nowrap ${on ? "text-[var(--brand-to)]" : "text-muted"}`}>{f > 0 ? `+${f}%` : "0%"}</span>
                {m} ay
              </button>
            );
          })}
        </div>
        <div className="shrink-0 sm:border-l border-card-border sm:pl-4 flex sm:flex-col items-center sm:items-end justify-between gap-2 min-w-[120px]">
          <span className="text-[11px] text-muted">Aylıq</span>
          <span className="text-xl font-extrabold whitespace-nowrap">
            {monthly.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼
          </span>
          {fee > 0 && <span className="text-[10px] text-muted whitespace-nowrap">cəmi {payable.toFixed(2)} ₼ (+{fee}%)</span>}
        </div>
      </div>

      <p className="text-[11px] text-muted mt-3 flex items-start gap-1.5">
        <span aria-hidden>ℹ️</span>
        <span>
          Seçdiyiniz plan banka ötürülür və ödəniş <b>BirKart və ya digər taksit kartı</b> ilə aylara bölünür.
          Adi (debet) kartla ödəsəniz məbləğ bir dəfəyə çıxılır.
        </span>
      </p>
    </div>
  );
}
