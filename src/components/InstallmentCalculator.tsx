"use client";
import { useState } from "react";
import { INSTALLMENT_MONTHS, monthlyPayment } from "@/lib/installment";

/**
 * HİSSƏLİ ALIŞ KALKULYATORU — məhsul səhifəsində.
 *
 * Ay seçilir, sağda aylıq məbləğ görünür. Seçim yuxarıya ötürülür ki, səbətə
 * əlavə edərkən sifarişə yazılsın.
 *
 * Dürüstlük qeydi (istifadəçiyə də göstərilir): ödəniş şlüzü məbləği bölmür.
 * Taksit alıcının öz taksit kartı ilə işləyir — satıcı tam məbləği alır, bank
 * onu kart sahibi üçün aylara bölür.
 */
export default function InstallmentCalculator({
  amount, value, onChange, compact, months: allowed,
}: {
  amount: number;
  value?: number | null;
  onChange?: (months: number | null) => void;
  compact?: boolean;
  /** Satıcının icazə verdiyi ay variantları. Verilməsə hamısı. */
  months?: number[];
}) {
  // Satıcı ay limiti qoya bilər (məs. ən çox 6 ay) — kalkulyator yalnız
  // icazəli variantları göstərməlidir, əks halda alıcı seçə bilməyəcəyi
  // planın hesabını görür.
  const OPTIONS = allowed && allowed.length ? allowed : [...INSTALLMENT_MONTHS];
  const fallback = OPTIONS[Math.min(1, OPTIONS.length - 1)];
  // Kontrolsuz işlədilə bilsin deyə daxili vəziyyət də var.
  const [own, setOwn] = useState<number | null>(fallback);
  const months = value !== undefined ? value : own;
  const set = (m: number | null) => { if (value === undefined) setOwn(m); onChange?.(m); };

  const active = months != null && OPTIONS.includes(months) ? months : fallback;
  const { monthly } = monthlyPayment(amount, active);

  return (
    <div className={`border border-card-border rounded-2xl ${compact ? "p-3" : "p-4"}`}>
      <p className="font-bold text-sm">Hissəli alış kalkulyatoru</p>
      <p className="text-[11px] text-muted mb-3">Şərtlər endirimli qiymətə tətbiq olunur</p>

      <div className="flex items-stretch gap-3 flex-wrap sm:flex-nowrap">
        {/* Ay seçimi */}
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
          {OPTIONS.map((m) => {
            const on = m === active;
            return (
              <button
                key={m}
                type="button"
                onClick={() => set(m)}
                aria-pressed={on}
                className={`relative w-14 h-14 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                  on ? "bg-foreground text-background" : "bg-input-bg text-foreground hover:bg-input-bg/70"
                }`}
              >
                {/* "0%" nişanı — bütün planlar faizsizdir */}
                <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold ${on ? "text-[var(--brand-to)]" : "text-muted"}`}>0%</span>
                {m} ay
              </button>
            );
          })}
        </div>

        {/* Aylıq məbləğ */}
        <div className="shrink-0 sm:border-l border-card-border sm:pl-4 flex sm:flex-col items-center sm:items-end justify-between gap-2 min-w-[120px]">
          <span className="text-[11px] text-muted">Aylıq</span>
          <span className="text-xl font-extrabold whitespace-nowrap">
            {monthly.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼
          </span>
        </div>
      </div>

      <p className="text-[11px] text-muted mt-3 flex items-start gap-1.5">
        <span aria-hidden>ℹ️</span>
        <span>
          Taksit <b>bankınızın taksit kartı</b> ilə tətbiq olunur (BirKart, Tamkart və s.).
          Ödəniş zamanı tam məbləğ kartdan keçir, bölgünü bankınız edir.
          Sifarişin rəsmiləşdirilməsi zamanı bank komissiyası əlavə oluna bilər.
        </span>
      </p>
    </div>
  );
}
