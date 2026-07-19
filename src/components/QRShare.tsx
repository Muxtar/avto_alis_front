"use client";
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "@/components/Toast";

// Hər profil / biznes / obyekt üçün unikal QR kod.
// QR-in içi həmin səhifənin tam linkidir — skan edən birbaşa o səhifəyə düşür.
// Paylaş (link + QR şəkli) və şəkil yüklə imkanları var.
export default function QRShare({
  path,
  title,
  subtitle,
  buttonLabel,
  compact,
  className,
}: {
  path: string; // məs. "/seller/12" — QR bu linkə aparır
  title?: string; // modalda göstərilən ad (məs. obyekt adı)
  subtitle?: string; // ikinci sətir (məs. "Obyekt №12")
  buttonLabel?: string; // düymə mətni (compact deyilsə)
  compact?: boolean; // yalnız ikon
  className?: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setUrl(`${window.location.origin}${path}`);
  }, [path]);

  const getCanvas = (): HTMLCanvasElement | null =>
    wrapRef.current?.querySelector("canvas") || null;

  const download = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `tradixai-qr${path.replace(/\//g, "-")}.png`;
    a.click();
    toast("QR kod yükləndi ✓", "success");
  };

  const shareLink = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: title || "tradixai", text: subtitle || title || "", url });
        return;
      } catch {
        /* ləğv edildi */
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link kopyalandı ✓", "success");
    } catch {
      toast("Linki kopyalamaq mümkün olmadı", "error");
    }
  };

  // QR şəklini fayl kimi paylaş (dəstəklənən cihazlarda).
  const shareImage = async () => {
    const canvas = getCanvas();
    if (!canvas) return shareLink();
    canvas.toBlob(async (blob) => {
      if (!blob) return shareLink();
      const file = new File([blob], "tradixai-qr.png", { type: "image/png" });
      const nav = navigator as any;
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: title || "tradixai", text: subtitle || title || "" });
          return;
        } catch {
          return;
        }
      }
      // Fayl paylaşımı dəstəklənmir — linki paylaş.
      shareLink();
    }, "image/png");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="QR kod"
        aria-label="QR kod"
        className={
          className ||
          "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-input-bg border border-input-border text-foreground hover:border-orange-500/50 transition-all text-sm font-medium"
        }
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 6.75h.008v.008H6.75V6.75zM6.75 16.5h.008v.008H6.75V16.5zM16.5 6.75h.008v.008H16.5V6.75zM13.5 13.5h.008v.008H13.5V13.5zM13.5 19.5h.008v.008H13.5V19.5zM19.5 13.5h.008v.008H19.5V13.5zM19.5 19.5h.008v.008H19.5V19.5zM16.5 16.5h.008v.008H16.5V16.5z" />
        </svg>
        {!compact && <span>{buttonLabel || "QR kod"}</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background border border-input-border rounded-2xl w-full max-w-xs p-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {title && <p className="font-semibold text-foreground truncate">{title}</p>}
            {subtitle && <p className="text-xs text-muted mb-1">{subtitle}</p>}
            <p className="text-[11px] text-muted mb-3">Skan edərək birbaşa səhifəyə keçin</p>

            <div ref={wrapRef} className="inline-flex p-3 bg-white rounded-xl">
              {url && (
                <QRCodeCanvas
                  value={url}
                  size={200}
                  level="M"
                  marginSize={2}
                  fgColor="#0f172a"
                  bgColor="#ffffff"
                />
              )}
            </div>

            <p className="text-[10px] text-muted mt-2 break-all">{url}</p>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={shareImage}
                className="py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
              >
                Paylaş
              </button>
              <button
                onClick={download}
                className="py-2.5 rounded-xl bg-input-bg border border-input-border text-foreground text-sm font-medium hover:border-orange-500/50 transition-all"
              >
                Şəkil yüklə
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              Bağla
            </button>
          </div>
        </div>
      )}
    </>
  );
}
