"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

/**
 * SATICI MÜQAVİLƏSİ — biznes kartının içində.
 *
 * Satıcı imzalamazdan ƏVVƏL öz məlumatları ilə dolmuş müqaviləni görür.
 * İmza DocuSign-da atılır: əvvəlcə satıcı, sonra platforma. İmzalanmış sənəd
 * PDF kimi endirilir.
 *
 * Müqavilə YALNIZ biznes admin tərəfindən təsdiqləndikdən sonra göndərilir.
 */

const ST: Record<string, { label: string; cls: string }> = {
  NOT_SENT: { label: "İmzalanmayıb", cls: "bg-amber-500/15 text-amber-600" },
  SENT: { label: "İmza gözlənilir", cls: "bg-blue-500/15 text-blue-600" },
  SIGNED: { label: "✓ İmzalanıb", cls: "bg-green-500/15 text-green-600" },
  DECLINED: { label: "İmtina edilib", cls: "bg-red-500/15 text-red-500" },
  VOIDED: { label: "Ləğv edilib", cls: "bg-red-500/15 text-red-500" },
};

export default function SellerContract({ businessId }: { businessId: number }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [d, setD] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const H = useCallback(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/me/businesses/${businessId}/contract`, { headers: H() }).then((x) => x.json());
      if (r.success) setD(r);
    } catch { /* şəbəkə */ }
  }, [businessId, H]);

  useEffect(() => { if (token) load(); }, [token, load]);

  const send = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${API}/me/businesses/${businessId}/contract/send`, { method: "POST", headers: H() }).then((x) => x.json());
      if (r.success) { toast("Müqavilə imza üçün e-poçtunuza göndərildi ✓", "success"); load(); }
      else toast(r.message || "Göndərilmədi", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  const downloadPdf = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/me/businesses/${businessId}/contract/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast("PDF endirilmədi", "error"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `muqavile-${businessId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  if (!d) return null;
  const st = ST[d.contractStatus] || ST.NOT_SENT;
  const signed = d.contractStatus === "SIGNED";

  return (
    <div className="border-t border-card-border pt-3 mt-3">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <p className="ui-section-title">📄 Satıcı ilə Əməkdaşlıq Müqaviləsi</p>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${st.cls}`}>{st.label}</span>
      </div>

      {/* Nə çatışmır — imzaya göndərmək üçün doldurulmalıdır */}
      {!d.ready && d.missing?.length > 0 && (
        <div className="text-[11px] text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-2 mb-2">
          Müqavilə üçün çatışmayan məlumat: <b>{d.missing.join(", ")}</b>
        </div>
      )}
      {!d.ready && d.message && !d.missing?.length && (
        <p className="text-[11px] text-amber-700 mb-2">{d.message}</p>
      )}
      {d.ready && !d.businessApproved && (
        <p className="text-[11px] text-muted mb-2">Biznes təsdiqləndikdən sonra müqavilə imzaya göndəriləcək.</p>
      )}
      {d.ready && d.businessApproved && !d.docusignReady && d.contractStatus === "NOT_SENT" && (
        <p className="text-[11px] text-amber-700 mb-2">DocuSign hələ qurulmayıb — imza göndərilə bilmir.</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {d.text && (
          <button onClick={() => setOpen((v) => !v)} className="ui-btn ui-btn-sm ui-btn-ghost">
            {open ? "Gizlət" : "Müqaviləyə bax"}
          </button>
        )}
        {d.ready && d.businessApproved && d.docusignReady && !signed && (
          <button onClick={send} disabled={busy} className="ui-btn ui-btn-sm ui-btn-primary">
            {busy ? "…" : d.contractStatus === "SENT" ? "Yenidən göndər" : "İmzaya göndər"}
          </button>
        )}
        {signed && (
          <button onClick={downloadPdf} disabled={busy} className="ui-btn ui-btn-sm ui-btn-soft">
            {busy ? "…" : "⬇ İmzalanmış PDF"}
          </button>
        )}
      </div>

      {d.contractStatus === "SENT" && (
        <p className="text-[11px] text-muted mt-1.5">
          İmza dəvəti e-poçtunuza göndərilib. Siz imzaladıqdan sonra platforma imzalayacaq.
        </p>
      )}

      {/* Dolmuş müqavilə mətni — imzalamazdan əvvəl oxunsun */}
      {open && d.text && (
        <pre className="mt-2 max-h-[420px] overflow-y-auto whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed bg-input-bg border border-input-border p-3">
          {d.text}
        </pre>
      )}
    </div>
  );
}
