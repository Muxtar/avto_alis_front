"use client";
// Kompüterdə veb-kamera ilə şəkil çəkmək (getUserMedia).
// Telefonda `capture` atributlu fayl girişi birbaşa kameranı açır, amma kompüter
// brauzerləri bu atributa məhəl qoymur — orada yalnız fayl pəncərəsi açılır.
// Bu pəncərə kamera görüntüsünü göstərir, «Çək» basılanda JPEG fayl qaytarır.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function WebcamCapture({ open, onClose, onCapture, title = "Şəkil çək" }: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(""); setReady(false);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.name === "NotAllowedError"
          ? "Kameraya icazə verilmədi. Brauzerin ünvan sətrindən kamera icazəsini açın."
          : e?.name === "NotFoundError" || e?.message === "unsupported"
            ? "Kamera tapılmadı. Şəkli fayldan seçə bilərsiniz."
            : "Kamera açılmadı. Yenidən cəhd edin.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `kamera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      onClose();
    }, "image/jpeg", 0.9);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-xl bg-card text-foreground border border-card-border rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
          <p className="font-semibold text-sm">{title}</p>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground text-sm" aria-label="Bağla">✕</button>
        </div>
        <div className="relative bg-black aspect-video flex items-center justify-center">
          {error ? (
            <p className="text-sm text-white/90 px-6 text-center">{error}</p>
          ) : (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} playsInline muted onLoadedData={() => setReady(true)} className="w-full h-full object-contain" />
              {!ready && <span className="absolute w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <p className="text-[11px] text-muted">Məhsulu kadrın ortasında saxlayın.</p>
          <button type="button" onClick={snap} disabled={!!error || !ready}
            className="px-5 py-2 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] disabled:opacity-50">
            📸 Çək və axtar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
