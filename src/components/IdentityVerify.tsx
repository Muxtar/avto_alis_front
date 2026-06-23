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
  const [idCardBackFile, setIdCardBackFile] = useState<File | null>(null);
  const [idCardBackUrl, setIdCardBackUrl] = useState("");
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfieUrl, setSelfieUrl] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [checking, setChecking] = useState(false);
  const [faceResult, setFaceResult] = useState<FaceResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Kimlikdən AI ilə oxunan və istifadəçinin yoxladığı sahələr.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState(""); // YYYY-MM-DD
  const [gender, setGender] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [idReading, setIdReading] = useState(false);
  const [idFilled, setIdFilled] = useState(false);

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

  const onPickIdCardBack = (file: File | null) => {
    if (!file) return;
    setIdCardBackFile(file);
    setIdCardBackUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
  };

  // AI ilə vəsiqədən bütün məlumatları oxu və input-ları doldur.
  const readIdName = async (file: File) => {
    if (!token) return;
    setIdReading(true); setIdFilled(false);
    try {
      const fd = new FormData();
      fd.append("idCardImage", file);
      const res = await fetch(`${API}/me/extract-id-name`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        if (data.birthDate) setBirthDate(data.birthDate);
        if (data.gender) setGender(data.gender);
        if (data.idNumber) setIdNumber(data.idNumber);
        if (data.firstName || data.lastName) setIdFilled(true);
      }
    } catch { /* səssiz keç */ } finally { setIdReading(false); }
  };

  const age = (() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    const d = new Date(birthDate); const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a >= 0 && a < 130 ? a : null;
  })();

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
    if (!firstName.trim() || !lastName.trim()) { toast("Ad və soyad boşdur — vəsiqəni yenidən yükləyin və ya əl ilə doldurun", "error"); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (faceResult?.ok) fd.append("faceMatchScore", String(faceResult.score));
      fd.append("name", `${firstName.trim()} ${lastName.trim()}`);
      if (birthDate) fd.append("birthDate", birthDate);
      if (gender.trim()) fd.append("gender", gender.trim());
      if (idNumber.trim()) fd.append("idNumber", idNumber.trim());
      fd.append("idCardImage", idCardFile);
      if (idCardBackFile) fd.append("idCardBackImage", idCardBackFile);
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
        {idReading && <p className="text-xs text-orange-500 mt-1">🤖 AI vəsiqədən məlumatları oxuyur…</p>}
      </div>

      {/* Kimlik vəsiqəsinin arxa tərəfi (istəyə bağlı) */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Vəsiqənin arxa tərəfi <span className="text-muted font-normal">(istəyə bağlı)</span></label>
        {idCardBackUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={idCardBackUrl} alt="kimlik arxa" className="w-full h-40 object-cover rounded-xl border border-input-border" />
            <label className="absolute bottom-2 right-2 text-xs bg-black/60 text-white px-2 py-1 rounded-lg cursor-pointer">
              Dəyiş
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickIdCardBack(e.target.files?.[0] || null)} />
            </label>
          </div>
        ) : (
          <label className={`${box} flex items-center justify-center gap-2 cursor-pointer text-muted`}>
            <span>📷 Arxa tərəfin şəklini yüklə</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickIdCardBack(e.target.files?.[0] || null)} />
          </label>
        )}
      </div>

      {/* Vəsiqədən AI ilə oxunan məlumatlar — yoxlayıb düzəldin, sonra Yadda saxla */}
      {(idFilled || idReading || firstName || lastName) && (
        <div className="space-y-2 p-3 bg-input-bg/50 border border-input-border rounded-xl">
          <p className="text-xs font-semibold text-muted">{idFilled ? "✓ Vəsiqədən oxundu — yoxlayın və lazımsa düzəldin:" : "Vəsiqə məlumatları:"}</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ad" className={`${box} text-sm`} />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Soyad" className={`${box} text-sm`} />
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={`${box} text-sm`} />
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={`${box} text-sm`}>
              <option value="">Cins</option>
              <option value="Kişi">Kişi</option>
              <option value="Qadın">Qadın</option>
            </select>
            <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="FIN" className={`${box} text-sm col-span-2`} />
          </div>
          {age !== null && <p className="text-[11px] text-muted">Yaş: <b>{age}</b></p>}
        </div>
      )}

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
        {submitting ? "Yadda saxlanılır…" : "💾 Yadda saxla"}
      </button>
    </div>
  );
}
