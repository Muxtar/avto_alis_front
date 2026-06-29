"use client";
import { useState } from "react";
import { useToast } from "@/components/Toast";

// Paylaşma düyməsi — mobil cihazlarda yerli paylaşım pəncərəsi (navigator.share),
// dəstəklənmirsə linki panoya kopyalayır.
export default function ShareButton({
  title,
  text,
  path,
  className,
  compact,
}: {
  title?: string;
  text?: string;
  path?: string; // verilməzsə cari səhifə URL-i istifadə olunur
  className?: string;
  compact?: boolean; // yalnız ikon
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (typeof window === "undefined") return;
    const url = path ? `${window.location.origin}${path}` : window.location.href;
    // Mobil/dəstəkli cihazlarda yerli paylaşım pəncərəsi.
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: title || document.title, text: text || title || "", url });
      } catch {
        /* istifadəçi ləğv etdi və ya dəstəklənmir — heç nə etmə */
      }
      return;
    }
    // Fallback: panoya kopyala.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Link kopyalandı ✓", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Linki kopyalamaq mümkün olmadı", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      title="Paylaş"
      aria-label="Paylaş"
      className={
        className ||
        "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-input-bg border border-input-border text-foreground hover:border-orange-500/50 transition-all text-sm font-medium"
      }
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
      {!compact && <span>{copied ? "Kopyalandı" : "Paylaş"}</span>}
    </button>
  );
}
