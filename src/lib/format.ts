// Qiyməti minlik ayırıcı (nöqtə) ilə formatla: 100000 → "100.000", 1234.5 → "1.234,5".
// de-DE lokalı minliyi nöqtə, onluğu vergüllə göstərir (Azərbaycan üslubu).
export function formatPrice(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (v == null || Number.isNaN(v)) return '0';
  return v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
