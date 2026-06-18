"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { CATEGORIES, CATEGORY_NAMES, getSubs, parseCat, buildCat } from "@/lib/categories";

// Excel sütun başlıqları — şablon faylındakı və oxunan başlıqlar.
const COLUMNS = [
  "title", "price", "category", "description",
  "brand", "model", "year", "city", "stock", "type", "condition", "forVehicle",
] as const;
const REQUIRED = ["title", "price", "category"] as const;

// Bütün etibarlı kateqoriyalar (ana + "Ana › Alt") — şablon vərəqi və validasiya üçün.
const ALL_CATEGORY_PATHS: string[] = CATEGORIES.flatMap((c) => [
  c.name,
  ...getSubs(c.name).map((s) => buildCat(c.name, s)),
]);
const CATEGORY_SET = new Set(ALL_CATEGORY_PATHS);

// Kateqoriya dəyəri tanınırmı? Ya tam yol ("Ana › Alt"), ya ana adı.
function isValidCategory(raw: string): boolean {
  const v = raw.trim();
  if (CATEGORY_SET.has(v)) return true;
  // Yalnız alt ad verilibsə də qəbul et, amma yalnız bircə ana altında varsa (qeyri-müəyyənlik olmasın).
  const { main } = parseCat(v);
  return CATEGORY_NAMES.includes(main);
}

type Row = Record<string, unknown>;

interface ParsedRow {
  index: number;
  data: Row;
  error: string | null;
}

export default function ExcelImportPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ExcelImportInner />
    </Suspense>
  );
}

function ExcelImportInner() {
  const router = useRouter();
  const { token, authLoading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);

  // VÖEN-li toplu yükləmə: bütün elanlar bir təsdiqlənmiş biznes obyektinə bağlanır.
  const searchParams = useSearchParams();
  const isVoen = searchParams.get("mode") === "voen";
  const [bizObjects, setBizObjects] = useState<{ id: number; label: string }[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>("");

  useEffect(() => {
    if (!token || !isVoen) return;
    fetch(`${API}/me/businesses`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const opts: { id: number; label: string }[] = [];
        (d.businesses || []).filter((b: any) => b.status === "APPROVED").forEach((b: any) => {
          (b.objects || []).forEach((o: any) => opts.push({ id: o.id, label: `${b.name} — ${o.name}` }));
        });
        setBizObjects(opts);
      })
      .catch(() => undefined);
  }, [token, isVoen]);

  if (!authLoading && !token) {
    router.push("/");
    return null;
  }

  // Şablon .xlsx faylı yarat və endir.
  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const examples = [
      {
        title: "iPhone 14 Pro 128GB",
        price: 1800,
        category: "Elektronika › Telefonlar",
        description: "İdeal vəziyyətdə",
        brand: "Apple", model: "", year: "",
        city: "Bakı", stock: 1, type: "PRODUCT", condition: "USED", forVehicle: "",
      },
      {
        title: "Mühərrik yağı 5W-30",
        price: 45,
        category: "Avtomobil ehtiyat hissələri › Filtrlər və yağlar",
        description: "Original, 4 litr",
        brand: "Toyota", model: "Camry", year: 2020,
        city: "Bakı", stock: 10, type: "PRODUCT", condition: "NEW", forVehicle: "Camry 2018-2023",
      },
    ];
    const ws = XLSX.utils.json_to_sheet(examples, { header: COLUMNS as unknown as string[] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Elanlar");
    // İkinci vərəq — bütün etibarlı kateqoriyalar (kopyala-yapışdır üçün).
    const catSheet = XLSX.utils.json_to_sheet(
      ALL_CATEGORY_PATHS.map((p) => ({ kateqoriya: p })),
      { header: ["kateqoriya"] }
    );
    XLSX.utils.book_append_sheet(wb, catSheet, "Kateqoriyalar");
    XLSX.writeFile(wb, "tradixai-elan-shablonu.xlsx");
  };

  const validateRow = (data: Row): string | null => {
    for (const k of REQUIRED) {
      const v = data[k];
      if (v === undefined || v === null || String(v).trim() === "") {
        return `"${k}" boşdur`;
      }
    }
    if (isNaN(parseFloat(String(data.price)))) return `"price" rəqəm olmalıdır`;
    if (!isValidCategory(String(data.category))) {
      return `"category" tanınmır — "Kateqoriyalar" vərəqindəki dəyərdən istifadə edin`;
    }
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
    if (isVoen && !selectedObjectId) {
      toast("VÖEN-li toplu yükləmə üçün biznes obyekti seçin", "error");
      return;
    }
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
          body: JSON.stringify({ items: chunk, listingMode: isVoen ? "voen" : "novoen", businessObjectId: isVoen ? selectedObjectId : undefined }),
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

      {/* VÖEN-li toplu yükləmə üçün biznes obyekti seçimi (mütləq) */}
      {isVoen && (
        bizObjects.length > 0 ? (
          <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
            <label className="block text-sm font-semibold mb-1.5">
              Biznes obyekti <span className="text-orange-500">*</span>
            </label>
            <select value={selectedObjectId} onChange={(e) => setSelectedObjectId(e.target.value)} className={inputCls} required>
              <option value="">— Obyekt seçin —</option>
              {bizObjects.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <p className="text-[11px] text-muted mt-1">Bütün bu elanlar seçilmiş obyekt üzərindən satılacaq və kartla alına biləcək.</p>
          </div>
        ) : (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4">
            <p className="font-semibold text-sm">Təsdiqlənmiş biznes obyektiniz yoxdur</p>
            <p className="text-xs text-muted mt-0.5">VÖEN-li toplu yükləmə üçün əvvəlcə biznes əlavə edin, ona obyekt bağlayın və admin təsdiqini gözləyin.</p>
            <a href="/business" className="inline-block mt-2 text-sm text-orange-500 font-semibold hover:text-orange-400">Biznes əlavə et →</a>
          </div>
        )
      )}

      {/* Addım 1 — şablon */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold mb-1">1. {t("excelStep1")}</p>
        <p className="text-xs text-muted mb-3">
          {t("excelRequiredCols")}: <b>title, price, category</b>. {t("excelOptionalCols")}: description, brand, model, year, city, stock, type, condition, forVehicle.
          <br />
          <span className="text-orange-500">ℹ️</span> <b>category</b> dəyəri şablondakı <b>&quot;Kateqoriyalar&quot;</b> vərəqindən kopyalanmalıdır (məs. <i>Elektronika › Telefonlar</i>).
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
