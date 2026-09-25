// HİSSƏLİ ALIŞ (taksit) — serverdəki `services/installment.ts` ilə eyni qaydalar.
//
// Taksit YALNIZ biznes üzərindən paylaşılan məhsullarda açıqdır: şəxsi elanın
// arxasında VÖEN-li satıcı və hesablaşma yoxdur.
//
// Seçilən plan Kapital Bank-a «TAKSIT=N» kimi ötürülür — bank ödənişi BirKart /
// taksit kartı sahibi üçün aylara bölür, satıcı tam məbləği alır. YIĞIM şlüzü
// taksiti dəstəkləmir — onda config.available=false və taksit göstərilmir.
// Planlar, minimal məbləğ və komissiya admin paneldən idarə olunur.

import { useEffect, useState } from "react";
import { API } from "@/lib/api";

// Mümkün bütün planlar — hansının AKTİV olduğunu admin seçir (GET /installment/config).
export const INSTALLMENT_MONTHS = [2, 3, 6, 9, 12, 18, 24] as const;
export const INSTALLMENT_MIN_AMOUNT = 30;

export interface InstallmentConfig {
  available: boolean;          // şlüz (Kapital) + admin açarı — false olsa taksit heç yerdə göstərilmir
  reason: string | null;
  months: number[];            // aktiv planlar
  plans: { months: number; feePercent: number }[];
  minAmount: number;
  buyerPaysFee: boolean;
}

// Bir dəfə yüklənir, bütün komponentlər paylaşır (hər kartda ayrıca sorğu olmasın).
let cfgPromise: Promise<InstallmentConfig | null> | null = null;
export function loadInstallmentConfig(): Promise<InstallmentConfig | null> {
  if (!cfgPromise) {
    cfgPromise = fetch(`${API}/installment/config`).then((r) => r.json())
      .then((d) => (d?.success ? d as InstallmentConfig : null))
      .catch(() => { cfgPromise = null; return null; });
  }
  return cfgPromise;
}
export function useInstallmentConfig(): InstallmentConfig | null {
  const [cfg, setCfg] = useState<InstallmentConfig | null>(null);
  useEffect(() => { let on = true; loadInstallmentConfig().then((c) => { if (on) setCfg(c); }); return () => { on = false; }; }, []);
  return cfg;
}
export const feePercentFor = (cfg: InstallmentConfig | null, months: number): number =>
  cfg?.plans.find((p) => p.months === months)?.feePercent || 0;

// Məhsul biznesə aiddirmi (elan obyektə bağlıdırsa — bəli).
export const isBusinessListing = (l: any): boolean =>
  !!(l?.businessObjectId || l?.businessObject?.id || l?.businessId);

export const installmentAllowed = (amount: number, isBusiness: boolean, minAmount = INSTALLMENT_MIN_AMOUNT): boolean =>
  isBusiness && amount >= minAmount;

// ── SATICININ SEÇİMİ ──
// Elanı qoyan taksiti bağlaya və ya ay limiti (məs. ən çox 6 ay) qoya bilər.
// Köhnə elanlarda sahə boşdur → açıq sayılır.

/** Bu elan üçün seçilə bilən planlar (aktiv planlar ∩ satıcının limiti). */
export const monthsForListing = (l: any, active: readonly number[] = INSTALLMENT_MONTHS): number[] => {
  if (!isBusinessListing(l) || l?.installmentEnabled === false) return [];
  const max = l?.installmentMaxMonths;
  return active.filter((m) => !max || m <= max);
};

/** Səbətdəki BÜTÜN məhsullar üçün ortaq planlar (ən dar məhdudiyyət). */
export const monthsForListings = (list: any[], active: readonly number[] = INSTALLMENT_MONTHS): number[] =>
  !list.length ? [] : list.reduce<number[]>(
    (acc, l) => acc.filter((m) => monthsForListing(l, active).includes(m)),
    [...active],
  );

/** Elan taksitlə satılırmı — config yüklənməyibsə və ya taksit bağlıdırsa YOX. */
export const listingInstallmentAllowed = (l: any, amount: number, cfg: InstallmentConfig | null): boolean =>
  !!cfg?.available && monthsForListing(l, cfg.months).length > 0 && amount >= cfg.minAmount;

// Aylıq ödəniş — 0% ilə bərabər bölgü. Yuvarlaqlaşdırma fərqi SON aya yazılır,
// beləliklə ayların cəmi həmişə tam məbləğə bərabər olur.
export function monthlyPayment(amount: number, months: number): { monthly: number; last: number } {
  const cents = Math.round(amount * 100);
  const per = Math.floor(cents / months);
  return { monthly: per / 100, last: (cents - per * (months - 1)) / 100 };
}

export const installmentPlans = (amount: number, active: readonly number[] = INSTALLMENT_MONTHS) =>
  active.map((months) => ({ months, ...monthlyPayment(amount, months) }));
