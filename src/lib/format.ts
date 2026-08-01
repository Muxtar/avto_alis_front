// Qiyməti minlik ayırıcı (nöqtə) ilə formatla: 100000 → "100.000", 1234.5 → "1.234,5".
// de-DE lokalı minliyi nöqtə, onluğu vergüllə göstərir (Azərbaycan üslubu).
export function formatPrice(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (v == null || Number.isNaN(v)) return '0';
  return v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Qiyməti TAM, nöqtə ilə minlik ayırıcı ilə göstər — istifadəçi tələbi:
// 10000 → "10.000", 1000000 → "1.000.000" (oxunması asan olsun).
// Yalnız astronomik böyük dəyərləri (≥ 1 trilyon) qısaldırıq ki, qutudan daşmasın.
export function formatPriceShort(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (v == null || Number.isNaN(v)) return '0';
  if (Math.abs(v) >= 1e12) {
    const txt = (v / 1e12).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    return `${txt} trln`;
  }
  return formatPrice(v);
}
