// «Excel ilə məhsul əlavə et» — sətirlərin oxunması və yoxlanması.
//
// Sütunlar MÖVQEYƏ görə oxunur (başlıq adına görə yox), sıra belədir:
//   1 Sıra sayı · 2 Məhsulun adı · 3 Məhsulun qiyməti · 4 Məhsulun miqdarı ·
//   5 Məhsulun kodu (marketin öz kodu) · 6 Məhsulun barkodu ·
//   7 Məhsulun QR kodu · 8 Qeyd
// Başlıq sətri olsa da, olmasa da işləyir: ilk dolu sətir başlığa oxşayırsa atılır.
// Boş sətirlər atılır. Səhv sətir (adı/qiyməti yoxdur, qiymət rəqəm deyil)
// idxalı dayandırmır — `error`-da səbəbi yazılır və o sətir göndərilmir.

export const EXCEL_COLUMNS = [
  "Sıra sayı",
  "Məhsulun adı",
  "Məhsulun qiyməti",
  "Məhsulun miqdarı",
  "Məhsulun kodu",
  "Məhsulun barkodu",
  "Məhsulun QR kodu",
  "Qeyd",
] as const;

export interface ImportRow {
  /** Excel-dəki real sətir nömrəsi (1-dən) — istifadəçiyə bu göstərilir. */
  excelRow: number;
  seq: string;
  title: string;
  priceRaw: string;
  price: number | null;
  stock: number;
  sku: string;
  barcode: string;
  qrCode: string;
  note: string;
  /** Sətir göndərilməyəcək — səbəb. */
  error: string | null;
  /** Sətir göndəriləcək, amma nəsə düzəldilib (məs. miqdar səhvdir → 1). */
  warning: string | null;
}

/** Hüceyrəni mətnə çevir. Böyük rəqəmlər (barkod) eksponentsiz yazılır. */
export function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    if (Number.isInteger(v)) return v.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 0 });
    return String(v);
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).replace(/ /g, " ").trim();
}

/** "12,50", "1 250.00 AZN", "₼ 3" → rəqəm; tanınmırsa null. */
export function parsePrice(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = cellText(v).toLowerCase().replace(/azn|manat|man\.?|₼/g, "").replace(/[\s']/g, "");
  if (!s) return null;
  const hasComma = s.includes(","), hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Hansı sonra gəlirsə o onluq ayırıcıdır, digəri minlik.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

const HEADER_RE = /məhsul|mehsul|\badı\b|\badi\b|qiym|price|name|sıra|sira|miqdar|barkod|barcode|\bkod\b|qeyd|№|артикул|наимен|цена/i;

function isHeaderRow(cells: string[], priceCell: unknown): boolean {
  if (parsePrice(priceCell) !== null) return false;
  return cells.some((c) => HEADER_RE.test(c));
}

/**
 * `aoa` — XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: true, defval: "" }).
 * `firstRow` — vərəqin istifadə olunan aralığının ilk sətri (1-dən), adətən 1.
 */
export function parseSheetRows(aoa: unknown[][], firstRow = 1): { rows: ImportRow[]; headerSkipped: boolean } {
  const rows: ImportRow[] = [];
  let headerSkipped = false;
  let seenData = false;

  aoa.forEach((raw, i) => {
    const r = Array.isArray(raw) ? raw : [];
    const cells = Array.from({ length: 8 }, (_, k) => cellText(r[k]));
    // Yalnız sıra sayı dolu olan (əvvəlcədən nömrələnmiş) sətir də boş sayılır.
    if (cells.slice(1).every((c) => c === "")) return;

    if (!seenData) {
      seenData = true;
      if (isHeaderRow(cells, r[2])) { headerSkipped = true; return; }
    }

    const [seq, title, priceRaw, stockRaw, sku, barcode, qrCode, note] = cells;
    const price = parsePrice(r[2]);
    let error: string | null = null;
    let warning: string | null = null;
    if (!title) error = "Məhsulun adı boşdur";
    else if (!priceRaw) error = "Qiymət boşdur";
    else if (price === null) error = `Qiymət rəqəm deyil: «${priceRaw}»`;
    else if (price <= 0) error = "Qiymət 0-dan böyük olmalıdır";

    let stock = 1;
    if (stockRaw) {
      const q = parsePrice(r[3]);
      if (q === null || q < 0) warning = `Miqdar rəqəm deyil («${stockRaw}») — 1 yazıldı`;
      else stock = Math.floor(q);
    }

    rows.push({
      excelRow: firstRow + i,
      seq, title: title.slice(0, 200), priceRaw, price, stock,
      sku, barcode, qrCode, note,
      error, warning,
    });
  });

  return { rows, headerSkipped };
}
