"use client";
// ÇEK QR OXUDUCU — e-kassa çekinin QR kodu (monitoring.e-kassa.gov.az/#/index?doc=…).
//   📷 Kamera — canlı oxuma (jsQR, kadr-kadr), telefon və noutbuk kamerası;
//   🖼 Şəkil  — çekin fotosu: əvvəl QR axtarılır, tapılmasa foto birbaşa AI ilə oxunur;
//   🔗 Link   — QR linki və ya fiskal ID yapışdırılır.
// Nəticə: /receipts/<id> səhifəsi (çek + məhsulların saytdakı qarşılıqları).
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

type Tab = "camera" | "photo" | "link";

export default function ReceiptScanner({ onClose }: { onClose: () => void }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("camera");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [link, setLink] = useState("");
  const [camErr, setCamErr] = useState("");
  const [portalDown, setPortalDown] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const stopCam = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => () => stopCam(), [stopCam]);

  const finish = (receiptId: number) => { stopCam(); onClose(); router.push(`/receipts/${receiptId}`); };

  const sendText = async (text: string) => {
    if (busy) return;
    setBusy(true); setStatus("Çek e-kassa portalından alınır və oxunur…");
    try {
      const r = await fetch(`${API}/receipts/scan`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ text }) }).then((x) => x.json());
      if (!r?.success) {
        toast(r?.message || "Çek oxunmadı", "error"); setStatus(""); doneRef.current = false;
        // Portal əlçatan deyil — çekin fotosu ilə davam etmək təklif olunur.
        if (/fotosunu|portal/i.test(r?.message || "")) { stopCam(); setTab("photo"); setStatus(""); setPortalDown(true); }
        return;
      }
      finish(r.receipt.id);
    } catch { toast("Şəbəkə xətası", "error"); setStatus(""); doneRef.current = false; }
    finally { setBusy(false); }
  };

  // ── Canlı kamera ──
  useEffect(() => {
    if (tab !== "camera") { stopCam(); return; }
    let alive = true;
    setCamErr("");
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream; await v.play().catch(() => {});
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const tick = () => {
          if (!alive || doneRef.current) return;
          if (v.readyState >= 2 && v.videoWidth) {
            // Mərkəzdəki kvadrat — QR adətən orada tutulur, emal də sürətlənir.
            const s = Math.min(v.videoWidth, v.videoHeight);
            const sx = (v.videoWidth - s) / 2, sy = (v.videoHeight - s) / 2;
            const size = Math.min(640, s);
            canvas.width = size; canvas.height = size;
            ctx.drawImage(v, sx, sy, s, s, 0, 0, size, size);
            const img = ctx.getImageData(0, 0, size, size);
            const code = jsQR(img.data, size, size, { inversionAttempts: "dontInvert" });
            if (code?.data) { doneRef.current = true; navigator.vibrate?.(60); sendText(code.data); return; }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        setCamErr("Kameraya icazə verilmədi və ya kamera yoxdur. «Şəkil» və ya «Link» ilə davam edin.");
      }
    })();
    return () => { alive = false; stopCam(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ── Şəkil: QR tap, tapılmasa fotonu AI oxusun ──
  const onPhoto = async (file: File | null) => {
    if (!file) return;
    setBusy(true); setStatus("QR axtarılır…");
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d")!; ctx.drawImage(bmp, 0, 0, w, h);
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h);
      if (code?.data) { setBusy(false); await sendText(code.data); return; }
      setStatus("QR tapılmadı — çekin özü oxunur (AI)…");
      const fd = new FormData(); fd.append("image", file);
      const r = await fetch(`${API}/receipts/scan-photo`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }).then((x) => x.json());
      if (!r?.success) { toast(r?.message || "Çek oxunmadı", "error"); setStatus(""); return; }
      finish(r.receipt.id);
    } catch { toast("Şəkil oxunmadı", "error"); setStatus(""); }
    finally { setBusy(false); }
  };

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { stopCam(); onClose(); }}>
      <div className="umenu w-full sm:max-w-md rounded-b-none sm:rounded-[20px] max-h-[92vh] overflow-y-auto text-foreground" onClick={(e) => e.stopPropagation()}>
        <div className="brand-band px-4 pt-3.5 pb-3">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/20 ring-1 ring-white/30 flex items-center justify-center text-lg shrink-0">🧾</span>
            <div className="flex-1 min-w-0">
              <p className="brand-band-kicker">tradixai · çek oxut</p>
              <p className="font-bold text-[15px] leading-tight">E-kassa çekinin QR kodunu oxudun</p>
              <p className="text-[11.5px] opacity-85 mt-0.5">Çekdəki məhsullar saytda axtarılır — eynisini daha ucuz tapın.</p>
            </div>
            <button onClick={() => { stopCam(); onClose(); }} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0" aria-label="Bağla">✕</button>
          </div>
          <div className="mt-3 flex gap-1 p-1 rounded-full bg-white/12 ring-1 ring-white/15">
            {([["camera", "📷 Kamera"], ["photo", "🖼 Şəkil"], ["link", "🔗 Link"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`umenu-pill flex-1 text-[12px] font-semibold py-1.5 transition-colors ${tab === k ? "bg-white text-[var(--brand-to)]" : "text-white/85 hover:text-white"}`}>{l}</button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {tab === "camera" && (
            camErr ? <p className="text-sm text-amber-700 bg-amber-500/10 rounded-xl p-3">{camErr}</p> : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                {/* Nişangah */}
                <div className="absolute inset-[18%] rounded-2xl ring-4 ring-white/80" style={{ boxShadow: "0 0 0 999px rgba(0,0,0,.35)" }} />
                <p className="absolute bottom-2 inset-x-0 text-center text-white text-xs font-semibold">QR kodu çərçivəyə tutun</p>
              </div>
            )
          )}
          {tab === "photo" && portalDown && (
            <p className="mb-3 text-[12px] rounded-xl px-3 py-2 bg-amber-500/10 text-amber-800 border border-amber-500/25">
              e-kassa portalı hazırda cavab vermir. Çekin <b>bütün məhsulları görünən</b> fotosunu çəkin — çek şəkildən oxunacaq.
            </p>
          )}
          {tab === "photo" && (
            <label className="block rounded-2xl border-2 border-dashed border-[var(--brand-to)]/40 p-6 text-center cursor-pointer hover:bg-[var(--brand-soft)]">
              <div className="text-3xl mb-1">🧾</div>
              <p className="font-semibold text-sm">Çekin şəklini seçin</p>
              <p className="text-xs text-muted mt-0.5">QR kod görünən foto — QR yoxdursa çekin özü oxunur.</p>
              <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => onPhoto(e.target.files?.[0] || null)} />
            </label>
          )}
          {tab === "link" && (
            <div className="space-y-2">
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://monitoring.e-kassa.gov.az/#/index?doc=…"
                className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
              <button onClick={() => link.trim() && sendText(link.trim())} disabled={busy || !link.trim()}
                className="w-full py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] disabled:opacity-50">Çeki oxu</button>
            </div>
          )}
          {status && (
            <p className="mt-3 flex items-center gap-2 text-sm text-[var(--brand-to)] font-semibold">
              <span className="w-4 h-4 border-2 border-[var(--brand-to)] border-t-transparent rounded-full animate-spin" /> {status}
            </p>
          )}
          <p className="mt-3 text-[11px] text-muted leading-relaxed">
            Çek məlumatı Dövlət Vergi Xidmətinin açıq e-kassa portalından (monitoring.e-kassa.gov.az) alınır. Oxunan çeklər «Çeklərim» bölməsində saxlanır.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
