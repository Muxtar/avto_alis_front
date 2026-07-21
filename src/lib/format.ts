// Qiyməti minlik ayırıcı (nöqtə) ilə formatla: 100000 → "100.000", 1234.5 → "1.234,5".
// de-DE lokalı minliyi nöqtə, onluğu vergüllə göstərir (Azərbaycan üslubu).
export function formatPrice(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (v == null || Number.isNaN(v)) return '0';
  return v.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Çox böyük qiymətlər tam yazılanda kartdan/qutudan daşır
// (məs. 1.000.000.000.000). Milyondan yuxarısını qısaldırıq:
// 1.500.000 → "1,5 mln", 2.300.000.000 → "2,3 mlrd", 1e12 → "1 trln".
// Tam dəyər `title` atributunda göstərilə bilər — formatPrice() ilə.
export function formatPriceShort(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (v == null || Number.isNaN(v)) return '0';
  const abs = Math.abs(v);
  const units: [number, string][] = [
    [1e12, 'trln'],
    [1e9, 'mlrd'],
    [1e6, 'mln'],
  ];
  for (const [step, label] of units) {
    if (abs >= step) {
      const scaled = v / step;
      // 1 onluq rəqəm bəs edir; "1,0 mln" yerine "1 mln" yazırıq.
      const txt = scaled.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
      return `${txt} ${label}`;
    }
  }
  return formatPrice(v);
}
