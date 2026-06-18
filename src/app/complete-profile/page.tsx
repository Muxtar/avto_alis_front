"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { compareFaces, FaceResult } from "@/lib/faceMatch";
import { searchProfessions } from "@/lib/professions";

export default function CompleteProfilePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token, user, login, authLoading } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profession, setProfession] = useState("");
  const [profList, setProfList] = useState<string[]>([]);
  const [showProfList, setShowProfList] = useState(false);
  const [loading, setLoading] = useState(false);
  const [idReading, setIdReading] = useState(false); // AI vəsiqədən məlumat oxuyur
  const [idNameFilled, setIdNameFilled] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [idNumber, setIdNumber] = useState("");

  const onProfessionChange = (v: string) => {
    setProfession(v);
    setProfList(searchProfessions(v));
    setShowProfList(true);
  };
  const pickProfession = (p: string) => {
    setProfession(p);
    setShowProfList(false);
  };

  // Kimlik şəkli + selfie
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardUrl, setIdCardUrl] = useState("");
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfieUrl, setSelfieUrl] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [checking, setChecking] = useState(false);
  const [faceResult, setFaceResult] = useState<FaceResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push("/"); return; }
    // Yalnız kimlik artıq göndərilibsə geri at — yoxsa istifadəçi kimliyi tamamlamalıdır.
    // (profileComplete ad/tip üçündür; biznes üçün isə kimlik təsdiqi lazımdır.)
    if ((user as { idVerifyStatus?: string } | null)?.idVerifyStatus) { router.push("/elanlar"); return; }
    if (user?.name) {
      const parts = user.name.trim().split(/\s+/);
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
  }, [token, user, authLoading, router]);

  // Kamera axınını təmizlə (unmount / kamera bağlananda).
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
    // AI ilə vəsiqədən ad-soyadı oxuyub avtomatik doldur.
    readIdName(file);
  };

  const readIdName = async (file: File) => {
    if (!token) return;
    setIdReading(true); setIdNameFilled(false);
    try {
      const fd = new FormData();
      fd.append("idCardImage", file);
      const res = await fetch(`${API}/me/extract-id-name`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
        if (data.birthDate) setBirthDate(data.birthDate);
        if (data.gender) setGender(data.gender);
        if (data.idNumber) setIdNumber(data.idNumber);
        if (data.firstName || data.lastName) setIdNameFilled(true);
      }
    } catch { /* səssiz keç — istifadəçi əl ilə yaza bilər */ } finally { setIdReading(false); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setCameraOn(true);
      // video elementi render olduqdan sonra bağla
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      }, 50);
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

  // İki şəkil hazır olanda üzləri brauzerdə müqayisə et.
  const loadImg = (url: string) => new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
  });
  useEffect(() => {
    if (!idCardUrl || !selfieUrl) { setFaceResult(null); return; }
    let cancelled = false;
    (async () => {
      setChecking(true); setFaceResult(null);
      try {
        const [a, b] = await Promise.all([loadImg(idCardUrl), loadImg(selfieUrl)]);
        const r = await compareFaces(a, b);
        if (!cancelled) setFaceResult(r);
      } catch {
        if (!cancelled) setFaceResult({ ok: false, reason: "load_error" });
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [idCardUrl, selfieUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { toast(t("nameRequired") || "Ad və soyad tələb olunur", "error"); return; }
    if (!idCardFile || !selfieBlob) { toast("Şəxsiyyət vəsiqəsi şəkli və selfie tələb olunur", "error"); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", `${firstName.trim()} ${lastName.trim()}`);
      if (profession.trim()) fd.append("profession", profession.trim());
      if (birthDate) fd.append("birthDate", birthDate);
      if (gender.trim()) fd.append("gender", gender.trim());
      if (idNumber.trim()) fd.append("idNumber", idNumber.trim());
      if (faceResult?.ok) fd.append("faceMatchScore", String(faceResult.score));
      fd.append("idCardImage", idCardFile);
      fd.append("selfieImage", new File([selfieBlob], "selfie.jpg", { type: "image/jpeg" }));
      const res = await fetch(`${API}/register/complete-id`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        login(token!, data.user);
        router.push("/elanlar");
      } else {
        toast(data.message || t("error"), "error");
      }
    } catch {
      toast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground transition-all text-foreground";

  // Üz nəticəsi rəngarəng göstər
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

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)] flex items-center justify-center py-6 sm:py-12 px-3 sm:px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t("completeProfileTitle")}</h1>
          <p className="text-muted text-sm sm:text-base">{t("completeProfileSimpleSub") || "Davam etmək üçün məlumatlarınızı daxil edin"}</p>
        </div>

        <form onSubmit={handleSubmit} className="surface p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("firstName") || "Ad"}</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder={t("firstName") || "Ad"} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("lastName") || "Soyad"}</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder={t("lastName") || "Soyad"} className={inputClass} />
            </div>
          </div>
          {idReading && <p className="text-xs text-orange-500">🤖 AI vəsiqədən məlumatları oxuyur…</p>}
          {idNameFilled && !idReading && <p className="text-xs text-green-500">✓ Məlumatlar vəsiqədən avtomatik dolduruldu (lazımsa düzəldin)</p>}

          {/* Vəsiqədən oxunan əlavə məlumatlar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Doğum tarixi</label>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Cins</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
                <option value="">Seçin</option>
                <option value="Kişi">Kişi</option>
                <option value="Qadın">Qadın</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">FIN (şəxsiyyət vəsiqəsi nömrəsi)</label>
            <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="FIN" className={inputClass} />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium mb-1.5">{t("profession") || "Məslək"}</label>
            <input
              value={profession}
              onChange={(e) => onProfessionChange(e.target.value)}
              onFocus={() => { if (profession.trim()) { setProfList(searchProfessions(profession)); setShowProfList(true); } }}
              onBlur={() => setTimeout(() => setShowProfList(false), 150)}
              placeholder={t("professionPlaceholder") || "Məs: Həkim, Mühəndis, Satıcı, Tələbə"}
              className={inputClass}
              autoComplete="off"
            />
            {showProfList && profList.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-card border border-input-border rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                {profList.map((p) => (
                  <li key={p}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); pickProfession(p); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-500/10 transition-colors"
                    >
                      {p}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
              <label className={`${inputClass} flex items-center justify-center gap-2 cursor-pointer text-muted`}>
                <span>📷 Vəsiqənin şəklini yüklə</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickIdCard(e.target.files?.[0] || null)} />
              </label>
            )}
            <p className="text-[11px] text-muted mt-1">Üz aydın görünməlidir. Məlumatlarınız təhlükəsiz saxlanılır.</p>
          </div>

          {/* Selfie (canlı kamera) */}
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
              <button type="button" onClick={startCamera} className={`${inputClass} flex items-center justify-center gap-2 text-muted`}>
                🤳 Kameranı aç və selfie çək
              </button>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Üz uyğunluğu nəticəsi */}
          {(checking || faceResult) && (
            <div className="text-sm text-center font-medium py-2 rounded-xl bg-input-bg">{faceBadge()}</div>
          )}

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50">
            {loading ? t("submitting") : (t("save") || "Yadda saxla")}
          </button>
          <p className="text-[11px] text-muted text-center">Kimliyiniz admin tərəfindən yoxlanılacaq.</p>
        </form>
      </div>
    </div>
  );
}
