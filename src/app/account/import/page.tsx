"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

// Excel sütun başlıqları — şablon faylındakı və oxunan başlıqlar.
const COLUMNS = [
  "title", "price", "category", "description",
  "brand", "model", "year", "city", "stock", "type", "condition", "forVehicle",
] as const;
const REQUIRED = ["title", "price", "category"] as const;

type Row = Record<string, unknown>;

interface ParsedRow {
  index: number;
  data: Row;
  error: string | null;
}

export default function ExcelImportPage() {
  const router = useRouter();
  const { token, authLoading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);

  if (!authLoading && !token) {
    router.push("/");
    return null;
  }

  // Şablon .xlsx faylı yarat və endir.
  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const example = {
      title: "Mühərrik yağı 5W-30",
      price: 45,
      category: "Filtrlər və servis hissələri",
      description: "Original, 4 litr",
      brand: "Toyota",
      model: "Camry",
      year: 2020,
      city: "Bakı",
      stock: 10,
      type: "PRODUCT",
      condition: "NEW",
      forVehicle: "Camry 2018-2023",
    };
    const ws = XLSX.utils.json_to_sheet([example], { header: COLUMNS as unknown as string[] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Elanlar");
    XLSX.writeFile(wb, "avtobazar-elan-shablonu.xlsx");
  };

  const validateRow = (data: Row): string | null => {
    for (const k of REQUIRED) {
      const v = data[k];
      if (v === undefined || v === null || String(v).trim() === "") {
        return `"${k}" boşdur`;
      }
    }
    if (isNaN(parseFloat(String(data.price)))) return `"price" rəqəm olmalıdır`;
    return null;
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    setResult(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
      if (json.length === 0) {
        toast("Faylda sətir tapılmadı", "error");
        setRows([]);
        return;
      }
      const parsed: ParsedRow[] = json.map((data, i) => ({
        index: i,
        data,
        error: validateRow(data),
      }));
      setRows(parsed);
    } catch (err: any) {
      toast(err?.message || "Fayl oxunmadı", "error");
      setRows([]);
    } finally {
      setParsing(false);
    }
  };

  const validRows = rows.filter((r) => !r.error);

  const submit = async () => {
    if (validRows.length === 0) return;
    setSubmitting(true);
    setResult(null);
    let created = 0;
    let failed = 0;
    try {
      // Backend bir sorğuda max 100 element qəbul edir.
      for (let i = 0; i < validRows.length; i += 100) {
        const chunk = validRows.slice(i, i + 100).map((r) => {
          const d = r.data;
          return {
            title: d.title,
            price: d.price,
            category: d.category,
            description: d.description || undefined,
            brand: d.brand || undefined,
            model: d.model || undefined,
            year: d.year || undefined,
            city: d.city || undefined,
            stock: d.stock || undefined,
            type: d.type || undefined,
            condition: d.condition || undefined,
            forVehicle: d.forVehicle || undefined,
          };
        });
        const res = await fetch(`${API}/me/listings/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items: chunk }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          created += data.created?.length || 0;
          failed += data.errors?.length || 0;
        } else {
          failed += chunk.length;
        }
      }
      setResult({ created, failed });
      if (created > 0) toast(`${created} elan əlavə edildi`, "success");
    } catch {
      toast(t("error"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-foreground";

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6">
      <Link href="/account" className="text-sm text-orange-500 hover:text-orange-400">← {t("backToAccount") || "Hesaba qayıt"}</Link>
      <h1 className="text-2xl font-bold mt-2 mb-1">{t("excelImportTitle")}</h1>
      <p className="text-muted text-sm mb-5">{t("excelImportDesc")}</p>

      {/* Addım 1 — şablon */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold mb-1">1. {t("excelStep1")}</p>
        <p className="text-xs text-muted mb-3">
          {t("excelRequiredCols")}: <b>title, price, category</b>. {t("excelOptionalCols")}: description, brand, model, year, city, stock, type, condition, forVehicle.
        </p>
        <button onClick={downloadTemplate} className="px-4 py-2 bg-input-bg border border-input-border rounded-lg text-sm font-medium hover:opacity-80">
          ⬇ {t("excelDownloadTemplate")}
        </button>
      </div>

      {/* Addım 2 — fayl seç */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold mb-3">2. {t("excelStep2")}</p>
        <label className={`${inputCls} flex items-center justify-between cursor-pointer`}>
          <span className="text-muted text-sm">{fileName || t("excelPickFile")}</span>
          <span className="text-orange-500 text-sm font-medium">{t("excelBrowse")}</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0] || null)} />
        </label>
        {parsing && <p className="text-xs text-orange-500 mt-2">{t("excelParsing")}</p>}
      </div>

      {/* Addım 3 — önizləmə + təsdiq */}
      {rows.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">3. {t("excelPreview")}</p>
            <p className="text-xs text-muted">
              {t("excelValidCount")}: <span className="text-green-500 font-semibold">{validRows.length}</span>
              {rows.length - validRows.length > 0 && <> · <span className="text-red-500">{rows.length - validRows.length} {t("excelErrorCount")}</span></>}
            </p>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto border border-input-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-input-bg sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left">#</th>
                  <th className="px-2 py-1.5 text-left">title</th>
                  <th className="px-2 py-1.5 text-left">price</th>
                  <th className="px-2 py-1.5 text-left">category</th>
                  <th className="px-2 py-1.5 text-left">{t("excelStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r) => (
                  <tr key={r.index} className={`border-t border-input-border/50 ${r.error ? "bg-red-500/5" : ""}`}>
                    <td className="px-2 py-1.5 text-muted">{r.index + 1}</td>
                    <td className="px-2 py-1.5">{String(r.data.title ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.data.price ?? "")}</td>
                    <td className="px-2 py-1.5">{String(r.data.category ?? "")}</td>
                    <td className="px-2 py-1.5">
                      {r.error ? <span className="text-red-500">{r.error}</span> : <span className="text-green-500">✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 200 && <p className="text-[11px] text-muted mt-1">İlk 200 sətir göstərilir ({rows.length} ümumi).</p>}

          <button
            onClick={submit}
            disabled={submitting || validRows.length === 0}
            className="mt-4 w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white disabled:opacity-50"
          >
            {submitting ? t("submitting") : `${validRows.length} ${t("excelSubmitBtn")}`}
          </button>

          {result && (
            <div className="mt-3 p-3 bg-input-bg rounded-lg text-sm">
              ✅ {result.created} {t("excelCreated")}
              {result.failed > 0 && <> · ❌ {result.failed} {t("excelFailed")}</>}
              <div className="mt-2"><Link href="/account" className="text-orange-500 font-medium">{t("excelGoToListings")} →</Link></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
