"use client";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { copyText, shareLink, canNativeShare, fmtDate } from "@/lib/referral";

/** Hazır referal link: URL + Kopyala + Paylaş + bitmə tarixi. */
export default function ReferralLinkBox({ url, expiresAt, percent, title, summary, onReset }: {
  url: string;
  expiresAt?: string | null;
  percent?: number | null;
  title?: string;
  /** Alıcının ödəyəcəyi məbləğ və link sahibinin təxmini qazancı. */
  summary?: { goodsTotal: number; commission: number } | null;
  onReset?: () => void;
}) {
  const { toast } = useToast();
  // Yalnız link yaradılandan sonra (klientdə) göstərilir — lazy init təhlükəsizdir.
  const [nativeShare] = useState(() => canNativeShare());

  const copy = async () => {
    const ok = await copyText(url);
    toast(ok ? "Link kopyalandı" : "Kopyalamaq alınmadı", ok ? "success" : "error");
  };
  const share = async () => {
    const r = await shareLink(url, title);
    if (r === "copied") toast("Link kopyalandı", "success");
    else if (r === "failed") toast("Paylaşmaq alınmadı", "error");
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-green-500 font-medium">✓ Link hazırdır — alıcıya göndərin:</p>
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="flex-1 min-w-0 px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
        <button onClick={copy} className="px-3.5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold shrink-0">Kopyala</button>
        {nativeShare && (
          <button onClick={share} className="px-3.5 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-semibold shrink-0">Paylaş</button>
        )}
      </div>
      {/* Kim nə qədər ödəyir / qazanır — açıq göstərilir. */}
      {summary && summary.goodsTotal > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-input-bg/60 border border-input-border px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted">Alıcı ödəyəcək</p>
            <p className="text-sm font-bold">{summary.goodsTotal.toFixed(2)} AZN</p>
            <p className="text-[10px] text-muted">tam qiymət — sizin ixtisas endiriminiz ona keçmir</p>
          </div>
          <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-orange-600">Sizin qazancınız</p>
            <p className="text-sm font-bold text-orange-600">≈ {summary.commission.toFixed(2)} AZN</p>
            <p className="text-[10px] text-muted">çatdırılma haqqı daxil deyil</p>
          </div>
        </div>
      )}
      <p className="text-[11px] text-muted">
        {percent != null ? <>Komissiya <b className="text-orange-500">{percent}%</b> · </> : null}
        Link {fmtDate(expiresAt)} tarixinədək etibarlıdır. Komissiya məhsul çatdırılıb qaytarma müddəti bitəndən sonra ödənilir.
      </p>
      {onReset && <button onClick={onReset} className="text-xs text-orange-500 font-medium">Yeni link yarat</button>}
    </div>
  );
}
