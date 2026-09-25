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

const AZ_MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];

/** Elanın yerləşdirilmə vaxtı: «Bu gün, 11:10» / «Dünən, 18:45» / «12 sentyabr, 09:05» (başqa ildə ilə birlikdə). */
export function formatPostedAt(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(new Date()) - startOf(date)) / 86400000);
  if (diffDays === 0) return `Bu gün, ${time}`;
  if (diffDays === 1) return `Dünən, ${time}`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return `${date.getDate()} ${AZ_MONTHS[date.getMonth()]}${sameYear ? "" : ` ${date.getFullYear()}`}, ${time}`;
}
