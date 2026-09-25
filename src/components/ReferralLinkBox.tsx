"use client";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { copyText, shareLink, canNativeShare, fmtDate } from "@/lib/referral";

/** Hazır referal link: URL + Kopyala + Paylaş + bitmə tarixi. */
export default function ReferralLinkBox({ url, expiresAt, percent, title, onReset }: {
  url: string;
  expiresAt?: string | null;
  percent?: number | null;
  title?: string;
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
      <p className="text-[11px] text-muted">
        {percent != null ? <>Komissiya <b className="text-orange-500">{percent}%</b> · </> : null}
        Link {fmtDate(expiresAt)} tarixinədək etibarlıdır. Komissiya məhsul çatdırılıb qaytarma müddəti bitəndən sonra ödənilir.
      </p>
      {onReset && <button onClick={onReset} className="text-xs text-orange-500 font-medium">Yeni link yarat</button>}
    </div>
  );
}
