"use client";
import { useState, useRef, useEffect } from "react";
import { API } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { compareFaces, FaceResult } from "@/lib/faceMatch";

// Kimlik (şəxsiyyət vəsiqəsi) + selfie ilə üz təsdiqi. /me/identity-ə göndərir.
export default function IdentityVerify({ token, onDone }: { token: string | null; onDone?: () => void }) {
  const { toast } = useToast();
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardUrl, setIdCardUrl] = useState("");
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfieUrl, setSelfieUrl] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [checking, setChecking] = useState(false);
  const [faceResult, setFaceResult] = useState<FaceResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idName, setIdName] = useState<string | null>(null); // AI-ın vəsiqədən oxuduğu ad-soyad
  const [idReading, setIdReading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setCameraOn(false);
  };
  useEffect(() => () => stopCamera(), []);

  const onPickIdCard = (file: File | null) => {
    if (!file) return;
    setIdCardFile(file);
    setIdCardUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    readIdName(file);
  };

  // AI ilə vəsiqədən ad-soyadı oxu (təsdiqdə profil adını da yeniləyəcəyik).
  const readIdName = async (file: File) => {
    if (!token) return;
    setIdReading(true); setIdName(null);
    try {
      const fd = new FormData();
      fd.append("idCardImage", file);
      const res = await fetch(`${API}/me/extract-id-name`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (res.ok && data.success && data.fullName) setIdName(data.fullName);
    } catch { /* səssiz keç */ } finally { setIdReading(false); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    } catch {
      toast("Kameraya icazə verilmədi", "error");
    }
  };

  const captureSelfie = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth || 480;
    c.height = v.videoHeight || 480;
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      if (!blob) return;
      setSelfieBlob(blob);
      setSelfieUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
    }, "image/jpeg", 0.9);
    stopCamera();
  };

  const loadImg = (url: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  useEffect(() => {
    if (!idCardUrl || !selfieUrl) { setFaceResult(null); return; }
    let cancelled = false;
    (async () => {
      setChecking(true); setFaceResult(null);
      try {
        const [a, b] = await Promise.all([loadImg(idCardUrl), loadImg(selfieUrl)]);
        const r = await compareFaces(a, b);
        if (!cancelled) setFaceResult(r);
      } catch { if (!cancelled) setFaceResult({ ok: false, reason: "load_error" }); }
      finally { if (!cancelled) setChecking(false); }
    })();
    return () => { cancelled = true; };
  }, [idCardUrl, selfieUrl]);

  const submit = async () => {
    if (!idCardFile || !selfieBlob) { toast("Şəxsiyyət vəsiqəsi şəkli və selfie tələb olunur", "error"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (faceResult?.ok) fd.append("faceMatchScore", String(faceResult.score));
      if (idName) fd.append("name", idName); // vəsiqədən oxunan ad-soyad profil adını yeniləsin
      fd.append("idCardImage", idCardFile);
      fd.append("selfieImage", new File([selfieBlob], "selfie.jpg", { type: "image/jpeg" }));
      const res = await fetch(`${API}/me/identity`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (res.ok && data.success) { toast("Kimlik təsdiqə göndərildi", "success"); onDone?.(); }
      else toast(data.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setSubmitting(false); }
  };

  const faceBadge = () => {
    if (checking) return <span className="text-orange-500">Üz yoxlanılır…</span>;
    if (!faceResult) return null;
    if (!faceResult.ok) {
      const msg = faceResult.reason === "id_no_face" ? "Kimlik şəklində üz tapılmadı"
        : faceResult.reason === "selfie_no_face" ? "Selfidə üz tapılmadı"
        : "Üz yoxlaması alınmadı (admin əl ilə yoxlayacaq)";
      return <span className="text-amber-500">⚠ {msg}</span>;
    }
    const pct = Math.round(faceResult.score * 100);
    return faceResult.matched
      ? <span className="text-green-500">✓ Üz uyğunluğu: {pct}%</span>
      : <span className="text-amber-500">⚠ Üz oxşarlığı aşağı: {pct}% (admin yoxlayacaq)</span>;
  };

  const box = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-foreground";

  return (
    <div className="space-y-3">
      {/* Kimlik vəsiqəsi şəkli */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Şəxsiyyət vəsiqəsi şəkli</label>
        {idCardUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={idCardUrl} alt="kimlik" className="w-full h-40 object-cover rounded-xl border border-input-border" />
            <label className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-1 rounded-lg cursor-pointer">
              Dəyiş
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickIdCard(e.target.files?.[0] || null)} />
            </label>
          </div>
        ) : (
          <label className={`${box} flex items-center justify-center gap-2 cursor-pointer text-muted`}>
            <span>📷 Vəsiqənin şəklini yüklə</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickIdCard(e.target.files?.[0] || null)} />
          </label>
        )}
        {idReading && <p className="text-xs text-orange-500 mt-1">🤖 AI vəsiqədən ad-soyadı oxuyur…</p>}
        {idName && !idReading && <p className="text-xs text-green-500 mt-1">✓ Vəsiqədən: <b>{idName}</b> — təsdiqdə profilə yazılacaq</p>}
      </div>

      {/* Selfie */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Selfie (üz təsdiqi)</label>
        {cameraOn ? (
          <div className="space-y-2">
            <video ref={videoRef} playsInline muted className="w-full h-48 object-cover rounded-xl border border-input-border bg-black" />
            <div className="flex gap-2">
              <button type="button" onClick={captureSelfie} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold">Çək</button>
              <button type="button" onClick={stopCamera} className="px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm">Ləğv et</button>
            </div>
          </div>
        ) : selfieUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selfieUrl} alt="selfie" className="w-full h-48 object-cover rounded-xl border border-input-border" />
            <button type="button" onClick={startCamera} className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-1 rounded-lg">Yenidən çək</button>
          </div>
        ) : (
          <button type="button" onClick={startCamera} className={`${box} flex items-center justify-center gap-2 text-muted`}>🤳 Kameranı aç və selfie çək</button>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {(checking || faceResult) && (
        <div className="text-sm text-center font-medium py-2 rounded-xl bg-input-bg">{faceBadge()}</div>
      )}

      <button onClick={submit} disabled={submitting || !idCardFile || !selfieBlob} className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white disabled:opacity-50">
        {submitting ? "Göndərilir…" : "Təsdiqə göndər"}
      </button>
    </div>
  );
}
