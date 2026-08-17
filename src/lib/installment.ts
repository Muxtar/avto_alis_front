// HİSSƏLİ ALIŞ (taksit) — serverdəki `services/installment.ts` ilə eyni qaydalar.
//
// Taksit YALNIZ biznes üzərindən paylaşılan məhsullarda açıqdır: şəxsi elanın
// arxasında VÖEN-li satıcı və hesablaşma yoxdur.
//
// VACİB: ödəniş şlüzü məbləği hissələrə BÖLMÜR — YIĞIM/MAGNET API-də taksit
// parametri yoxdur (spesifikasiya yoxlanılıb). Taksit alıcının öz taksit kartı
// (BirKart, Tamkart və s.) ilə tətbiq olunur: satıcı tam məbləği alır, bank onu
// kart sahibi üçün aylara bölür. Burada plan seçilir, hesablanır və sifarişdə
// qeyd olunur — pul axını dəyişmir.

export const INSTALLMENT_MONTHS = [3, 6, 9, 12, 18] as const;
export const INSTALLMENT_MIN_AMOUNT = 30;

// Məhsul biznesə aiddirmi (elan obyektə bağlıdırsa — bəli).
export const isBusinessListing = (l: any): boolean =>
  !!(l?.businessObjectId || l?.businessObject?.id || l?.businessId);

export const installmentAllowed = (amount: number, isBusiness: boolean): boolean =>
  isBusiness && amount >= INSTALLMENT_MIN_AMOUNT;

// Aylıq ödəniş — 0% ilə bərabər bölgü. Yuvarlaqlaşdırma fərqi SON aya yazılır,
// beləliklə ayların cəmi həmişə tam məbləğə bərabər olur.
export function monthlyPayment(amount: number, months: number): { monthly: number; last: number } {
  const cents = Math.round(amount * 100);
  const per = Math.floor(cents / months);
  return { monthly: per / 100, last: (cents - per * (months - 1)) / 100 };
}

export const installmentPlans = (amount: number) =>
  INSTALLMENT_MONTHS.map((months) => ({ months, ...monthlyPayment(amount, months) }));
