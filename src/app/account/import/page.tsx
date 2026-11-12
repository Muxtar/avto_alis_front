"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { CATEGORY_NAMES, getSubs, buildCat } from "@/lib/categories";
import { EXCEL_COLUMNS, parseSheetRows, type ImportRow } from "@/lib/excelImport";

// Hər məhsul üçün eyni kateqoriya seçilir (Excel-də kateqoriya sütunu yoxdur).
const DEFAULT_IMPORT_CATEGORY = "Digər";

interface ServerIssue { excelRow: number; title: string; message: string }

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

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [headerSkipped, setHeaderSkipped] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ created: number; errors: ServerIssue[]; warnings: ServerIssue[] } | null>(null);
  const [catMain, setCatMain] = useState(DEFAULT_IMPORT_CATEGORY);
  const [catSub, setCatSub] = useState("");

  // VÖEN-li toplu yükləmə: bütün elanlar bir təsdiqlənmiş biznes obyektinə bağlanır.
  const searchParams = useSearchParams();
  const isVoen = searchParams.get("mode") === "voen";
  const [bizObjects, setBizObjects] = useState<{ id: number; label: string }[]>([]);
  const [approvedBizNoObj, setApprovedBizNoObj] = useState<{ id: number; name: string }[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>(searchParams.get("obj") || "");

  useEffect(() => {
    if (!token || !isVoen) return;
    fetch(`${API}/me/businesses`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const opts: { id: number; label: string }[] = [];
        const noObj: { id: number; name: string }[] = [];
        (d.businesses || []).filter((b: any) => b.status === "APPROVED").forEach((b: any) => {
          const objs = (b.objects || []);
          if (objs.length === 0) noObj.push({ id: b.id, name: b.name });
          objs.forEach((o: any) => opts.push({ id: o.id, label: `${b.name} — ${o.name}` }));
        });
        setBizObjects(opts);
        setApprovedBizNoObj(noObj);
      })
      .catch(() => undefined);
  }, [token, isVoen]);

  if (!authLoading && !token) {
    router.push("/");
    return null;
  }

  // Nümunə .xlsx şablonu — sütunlar məhz idxalın oxuduğu sırada.
  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const aoa: (string | number)[][] = [
      [...EXCEL_COLUMNS],
      [1, "Coca-Cola 0.5 l", 1.2, 48, "MK-0001", "5449000000996", "", "Qazlı içki, şüşə"],
      [2, "Çörək ağ, 500 q", 0.8, 30, "MK-0002", "", "https://example.com/qr/MK-0002", ""],
      [3, "Ərzaq dəsti", "12,50", 5, "MK-0003", "", "", "Qiymət vergüllə də yazıla bilər"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Barkod / kod / QR sütunları mətn olsun — Excel uzun rəqəmi 4.76E+12 kimi göstərməsin.
    for (let r = 1; r < aoa.length; r++) {
      for (const c of [4, 5, 6]) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (ws[ref]) { ws[ref].t = "s"; ws[ref].v = String(ws[ref].v); ws[ref].z = "@"; }
      }
    }
    ws["!cols"] = [{ wch: 9 }, { wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 32 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Məhsullar");
    XLSX.writeFile(wb, "tradixai-mehsul-shablonu.xlsx");
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
      const firstRow = ws?.["!ref"] ? XLSX.utils.decode_range(ws["!ref"]).s.r + 1 : 1;
      const aoa = ws ? XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, blankrows: true, defval: "" }) : [];
      const { rows: parsed, headerSkipped: hs } = parseSheetRows(aoa, firstRow);
      setHeaderSkipped(hs);
      if (parsed.length === 0) toast("Faylda məhsul sətri tapılmadı", "error");
      setRows(parsed);
    } catch (err: any) {
      toast(err?.message || "Fayl oxunmadı", "error");
      setRows([]);
    } finally {
      setParsing(false);
    }
  };

  const validRows = rows.filter((r) => !r.error);
  const badRows = rows.filter((r) => r.error);
  const category = catSub ? buildCat(catMain, catSub) : catMain;

  const submit = async () => {
    if (validRows.length === 0) return;
    if (isVoen && !selectedObjectId) {
      toast("VÖEN-li toplu yükləmə üçün biznes obyekti seçin", "error");
      return;
    }
    setSubmitting(true);
    setResult(null);
    let created = 0;
    const errors: ServerIssue[] = [];
    const warnings: ServerIssue[] = [];
    const CHUNK = 500; // backend bir sorğuda max 500 qəbul edir
    setProgress({ done: 0, total: validRows.length });
    try {
      for (let i = 0; i < validRows.length; i += CHUNK) {
        const part = validRows.slice(i, i + CHUNK);
        const items = part.map((r) => ({
          title: r.title,
          price: r.price,
          stock: r.stock,
          category,
          type: "PRODUCT",
          condition: "NEW",
          description: r.note || undefined,
          sku: r.sku || undefined,
          barcode: r.barcode || undefined,
          qrCode: r.qrCode || undefined,
        }));
        try {
          const res = await fetch(`${API}/me/listings/bulk`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ items, listingMode: isVoen ? "voen" : "novoen", businessObjectId: isVoen ? selectedObjectId : undefined }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success) {
            created += data.created?.length || 0;
            const map = (x: { index: number; message: string }) => ({ excelRow: part[x.index]?.excelRow ?? 0, title: part[x.index]?.title ?? "", message: x.message });
            (data.errors || []).forEach((x: any) => errors.push(map(x)));
            (data.warnings || []).forEach((x: any) => warnings.push(map(x)));
          } else {
            const msg = data?.message || `Server xətası (${res.status})`;
            part.forEach((r) => errors.push({ excelRow: r.excelRow, title: r.title, message: msg }));
          }
        } catch {
          part.forEach((r) => errors.push({ excelRow: r.excelRow, title: r.title, message: "Şəbəkə xətası — yenidən cəhd edin" }));
        }
        setProgress({ done: Math.min(i + CHUNK, validRows.length), total: validRows.length });
      }
      setResult({ created, errors, warnings });
      if (created > 0) toast(`${created} elan əlavə edildi`, "success");
      else toast("Heç bir elan əlavə olunmadı", "error");
    } finally {
      setSubmitting(false);
      setProgress(null);
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
        ) : approvedBizNoObj.length > 0 ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
            <p className="font-semibold text-sm text-green-600">✓ Biznesiniz təsdiqlənib{approvedBizNoObj.length === 1 ? `: ${approvedBizNoObj[0].name}` : ""}</p>
            <p className="text-xs text-muted mt-0.5">Sahibkar kimi satış üçün bu biznesə ən azı bir <b>obyekt (mağaza / filial)</b> əlavə etməlisiniz.</p>
            <a href="/business" className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600">＋ Obyekt əlavə et →</a>
          </div>
        ) : (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4">
            <p className="font-semibold text-sm">Təsdiqlənmiş biznesiniz yoxdur</p>
            <p className="text-xs text-muted mt-0.5">VÖEN-li toplu yükləmə üçün əvvəlcə biznes (VÖEN) əlavə edin, admin təsdiqindən sonra ona obyekt bağlayın.</p>
            <a href="/business" className="inline-block mt-2 text-sm text-orange-500 font-semibold hover:text-orange-400">Biznes əlavə et →</a>
          </div>
        )
      )}

      {/* Addım 1 — şablon */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold mb-1">1. {t("excelStep1")}</p>
        <p className="text-xs text-muted mb-2">Sütunlar məhz bu sırada olmalıdır (başlıq sətri olsa da, olmasa da oxunur):</p>
        <ol className="text-xs text-muted mb-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 list-decimal list-inside">
          {EXCEL_COLUMNS.map((c, i) => (
            <li key={c}>
              {c}
              {i === 1 || i === 2 ? <span className="text-orange-500"> *</span> : null}
              {i === 4 ? <span className="text-muted"> — marketin öz kodu</span> : null}
              {i === 7 ? <span className="text-muted"> — elanın təsviri olur</span> : null}
            </li>
          ))}
        </ol>
        <p className="text-[11px] text-muted mb-3">
          <span className="text-orange-500">*</span> məcburidir. Miqdar boşdursa 1 yazılır. Şəkil Excel-dən gəlmir — elanlar şəkilsiz yaradılır, şəkli sonra elanı redaktə edərək əlavə edə bilərsiniz.
        </p>
        <button onClick={downloadTemplate} className="px-4 py-2 bg-input-bg border border-input-border rounded-lg text-sm font-medium hover:opacity-80">
          ⬇ {t("excelDownloadTemplate")}
        </button>
      </div>

      {/* Kateqoriya — bütün məhsullar üçün bir dəfə */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold mb-1">Kateqoriya</p>
        <p className="text-xs text-muted mb-3">Faylda kateqoriya sütunu yoxdur — bütün məhsullar seçdiyiniz kateqoriyaya yazılır. Sonra hər elanı ayrıca dəyişə bilərsiniz.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select value={catMain} onChange={(e) => { setCatMain(e.target.value); setCatSub(""); }} className={inputCls}>
            {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={catSub} onChange={(e) => setCatSub(e.target.value)} className={inputCls}>
            <option value="">— Alt kateqoriya (könüllü) —</option>
            {getSubs(catMain).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Addım 2 — fayl seç */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold mb-3">2. {t("excelStep2")}</p>
        <label className={`${inputCls} flex items-center justify-between cursor-pointer`}>
          <span className="text-muted text-sm truncate">{fileName || t("excelPickFile")}</span>
          <span className="text-orange-500 text-sm font-medium shrink-0 ml-2">{t("excelBrowse")}</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { onPickFile(e.target.files?.[0] || null); e.target.value = ""; }} />
        </label>
        {parsing && <p className="text-xs text-orange-500 mt-2">{t("excelParsing")}</p>}
      </div>

      {/* Addım 3 — önizləmə + təsdiq */}
      {rows.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-sm font-semibold">3. {t("excelPreview")}</p>
            <p className="text-xs text-muted">
              Hazır: <span className="text-green-500 font-semibold">{validRows.length}</span>
              {badRows.length > 0 && <> · <span className="text-red-500 font-semibold">{badRows.length} səhv sətir</span></>}
              {headerSkipped && <> · başlıq sətri atıldı</>}
            </p>
          </div>

          {badRows.length > 0 && (
            <div className="mb-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-xs">
              <p className="font-semibold text-red-500 mb-1">Bu sətirlər əlavə olunmayacaq:</p>
              <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                {badRows.map((r) => (
                  <li key={r.excelRow}><b>{r.excelRow}-ci sətir</b>{r.title ? ` («${r.title}»)` : ""}: {r.error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto max-h-80 overflow-y-auto border border-input-border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-input-bg sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left">Sətir</th>
                  <th className="px-2 py-1.5 text-left">Ad</th>
                  <th className="px-2 py-1.5 text-right">Qiymət</th>
                  <th className="px-2 py-1.5 text-right">Miqdar</th>
                  <th className="px-2 py-1.5 text-left">Kod</th>
                  <th className="px-2 py-1.5 text-left">Barkod</th>
                  <th className="px-2 py-1.5 text-left">{t("excelStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 300).map((r) => (
                  <tr key={r.excelRow} className={`border-t border-input-border/50 ${r.error ? "bg-red-500/5" : ""}`}>
                    <td className="px-2 py-1.5 text-muted">{r.excelRow}</td>
                    <td className="px-2 py-1.5 max-w-[220px] truncate">{r.title}</td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">{r.price !== null ? `${r.price} ₼` : r.priceRaw}</td>
                    <td className="px-2 py-1.5 text-right">{r.stock}</td>
                    <td className="px-2 py-1.5 text-muted">{r.sku}</td>
                    <td className="px-2 py-1.5 text-muted">{r.barcode}</td>
                    <td className="px-2 py-1.5">
                      {r.error ? <span className="text-red-500">{r.error}</span>
                        : r.warning ? <span className="text-amber-500">⚠ {r.warning}</span>
                        : <span className="text-green-500">✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 300 && <p className="text-[11px] text-muted mt-1">İlk 300 sətir göstərilir ({rows.length} ümumi) — hamısı yüklənəcək.</p>}

          <button
            onClick={submit}
            disabled={submitting || validRows.length === 0 || (isVoen && !selectedObjectId)}
            className="mt-4 w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-semibold text-white disabled:opacity-50"
          >
            {submitting
              ? (progress ? `Yüklənir… ${progress.done}/${progress.total}` : t("submitting"))
              : `${validRows.length} məhsulu elan kimi əlavə et`}
          </button>

          {result && (
            <div className="mt-3 p-3 bg-input-bg rounded-lg text-sm space-y-2">
              <p>
                ✅ {result.created} elan əlavə edildi (moderasiyadan sonra saytda görünəcək)
                {result.errors.length > 0 && <> · ❌ {result.errors.length} alınmadı</>}
                {badRows.length > 0 && <> · {badRows.length} səhv sətir göndərilmədi</>}
              </p>
              {result.errors.length > 0 && (
                <ul className="text-xs text-red-500 space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => <li key={i}><b>{e.excelRow}-ci sətir</b>{e.title ? ` («${e.title}»)` : ""}: {e.message}</li>)}
                </ul>
              )}
              {result.warnings.length > 0 && (
                <ul className="text-xs text-amber-600 space-y-0.5 max-h-32 overflow-y-auto">
                  {result.warnings.map((e, i) => <li key={i}>⚠ <b>{e.excelRow}-ci sətir</b>{e.title ? ` («${e.title}»)` : ""}: {e.message}</li>)}
                </ul>
              )}
              <div><Link href="/account" className="text-orange-500 font-medium">{t("excelGoToListings")} →</Link></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
