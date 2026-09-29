"use client";
// Elanın ŞTRİX-KODU — məhsulun qutusundakı EAN/UPC kodu (siqaret, qida, məişət və s.).
// Kamera ilə oxuma (cihazın BarcodeDetector-u), yoxlama rəqəmi, və kod tanınırsa:
// digər mağazalardakı qiymətlər (oxudulan çeklərdən) + ad təklifi.
import { useEffect, useRef, useState } from "react";
import { API } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { normalizeGtin } from "@/lib/gtin";

export default function BarcodeField({ value, onChange, onSuggestName, inputCls }: {
  value: string; onChange: (v: string) => void; onSuggestName?: (name: string) => void; inputCls: string;
}) {
  const [scan, setScan] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const code = normalizeGtin(value);
  const hasDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    setInfo(null);
    if (!code) return;
    const tm = setTimeout(() => {
      fetch(`${API}/barcodes/${code}`).then((r) => r.json()).then((d) => d?.success && setInfo(d)).catch(() => {});
    }, 300);
    return () => clearTimeout(tm);
  }, [code]);

  useEffect(() => {
    if (!scan) return;
    let alive = true; let stream: MediaStream | null = null; let t: any;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
        const v = videoRef.current!; v.srcObject = stream; await v.play().catch(() => {});
        const det = new (window as any).BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "itf"] });
        const loop = async () => {
          if (!alive) return;
          try {
            const r = await det.detect(v);
            const hit = r.map((x: any) => normalizeGtin(x.rawValue)).find(Boolean);
            if (hit) { navigator.vibrate?.(60); onChangeRef.current(hit); setScan(false); return; }
          } catch { /* növbəti kadr */ }
          t = setTimeout(loop, 120);
        };
        loop();
      } catch { setScan(false); }
    })();
    return () => { alive = false; clearTimeout(t); stream?.getTracks().forEach((x) => x.stop()); };
  }, [scan]);

  const bad = value.trim() !== "" && !code;
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">Ştrix-kod (barkod) <span className="text-muted font-normal text-xs">— istəyə bağlı</span></label>
      <div className="flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d\s-]/g, ""))} inputMode="numeric" placeholder="məs. 4760012345678" className={`${inputCls} ${bad ? "!border-red-400" : ""}`} />
        {hasDetector && (
          <button type="button" onClick={() => setScan((v) => !v)} className="shrink-0 px-3 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-to)] text-sm font-semibold">{scan ? "✕" : "📷 Oxut"}</button>
        )}
      </div>
      {scan && (
        <div className="mt-2 relative rounded-xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <div className="absolute inset-x-[12%] top-[35%] bottom-[35%] border-2 border-white/80 rounded-lg" />
        </div>
      )}
      <p className={`text-[11px] mt-1 ${bad ? "text-red-500" : "text-muted"}`}>
        {bad ? "Kod düzgün deyil — qutudakı 8/12/13/14 rəqəmi tam yazın." : code ? "✓ Kod düzgündür" : "Qutudakı ştrix-kodun altındakı rəqəmlər. Alıcılar çekdəki eyni məhsulu sizin elanla müqayisə edə biləcək."}
      </p>
      {info && (info.stores?.length > 0 || info.suggestedName) && (
        <div className="mt-2 rounded-xl p-2.5 bg-input-bg border border-input-border text-[12px] space-y-1">
          {info.suggestedName && onSuggestName && (
            <p>Tanındı: <b>{info.suggestedName}</b> <button type="button" onClick={() => onSuggestName(info.suggestedName)} className="ml-1 text-[var(--brand-to)] font-semibold">başlığa yaz</button></p>
          )}
          {info.stores?.length > 0 && (
            <p className="text-muted">🏪 Mağazalarda: {info.stores.slice(0, 4).map((s: any) => `${s.store || "?"} ${formatPrice(s.price)} ₼`).join(" · ")}</p>
          )}
        </div>
      )}
    </div>
  );
}
