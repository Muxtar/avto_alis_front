"use client";
/* ──────────────────────────────────────────────────────────────────────────
   ƏL İLƏ KİMLİK DOĞRULAMASI — Veriff söndürüləndə işləyən axın.

   Admin paneldə «Kimlik doğrulaması: Veriff (test)» açarı SÖNDÜRÜLƏNDƏ
   istifadəçi Veriff-ə getmir: burada Veriff pəncərəsinin özü kimi üç addımla
   şəkil çəkir/yükləyir —
     1) vəsiqənin ÖN tərəfi
     2) vəsiqənin ARXA tərəfi
     3) selfie (üz)
   Göndərilən müraciət admin panelindəki «Kimlik yoxlaması» növbəsinə düşür və
   admin gözlə baxıb təsdiqləyir. Veriff yenidən açılanda bu ekran çıxmır.
   ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from "react";
import { API } from "@/lib/api";

type StepKey = "idCardImage" | "idCardBackImage" | "selfieImage";

const STEPS: { key: StepKey; title: string; hint: string; facing: "environment" | "user" }[] = [
  {
    key: "idCardImage",
    title: "Şəxsiyyət vəsiqəsi — ÖN tərəf",
    hint: "Vəsiqəni düz səthə qoyun. Bütün künclər kadrda olsun, işıq düşsün, yazılar oxunaqlı olsun.",
    facing: "environment",
  },
  {
    key: "idCardBackImage",
    title: "Şəxsiyyət vəsiqəsi — ARXA tərəf",
    hint: "Arxa tərəfdəki maşın oxunan zolaq (MRZ) tam görünməlidir.",
    facing: "environment",
  },
  {
    key: "selfieImage",
    title: "Selfie — üzünüz",
    hint: "Üzünüz kadrın mərkəzində olsun. Eynək, maska və papaq olmasın.",
    facing: "user",
  },
];

export default function IdentityManualModal({
  token, onClose, onSubmitted,
}: {
  token: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [step, setStep] = useState(0);
  const [shots, setShots] = useState<Partial<Record<StepKey, { file: File; url: string }>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [camOn, setCamOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cur = STEPS[step];
  const done = STEPS.every((s) => shots[s.key]);

  // Kamera axını — addım dəyişəndə (ön/arxa kamera fərqlidir) yenidən qurulur.
  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  };
  const startCam = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cur.facing } });
      streamRef.current = stream;
      setCamOn(true);
      // Video elementi render olunandan sonra bağlanır.
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 0);
    } catch {
      setError("Kamera açılmadı — şəkli qalereyadan seçin.");
    }
  };
  useEffect(() => stopCam, []);       // modal bağlananda kameranı burax
  useEffect(() => { stopCam(); }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext("2d")?.drawImage(v, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `${cur.key}.jpg`, { type: "image/jpeg" });
      setShots((p) => ({ ...p, [cur.key]: { file, url: URL.createObjectURL(file) } }));
      stopCam();
    }, "image/jpeg", 0.9);
  };

  const pickFile = (f: File | null) => {
    if (!f) return;
    setShots((p) => ({ ...p, [cur.key]: { file: f, url: URL.createObjectURL(f) } }));
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      for (const s of STEPS) {
        const shot = shots[s.key];
        if (shot) fd.append(s.key, shot.file);
      }
      const res = await fetch(`${API}/me/identity`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSubmitted();
        onClose();
      } else {
        setError(data.message || "Göndərilmədi");
      }
    } catch {
      setError("Şəbəkə xətası — yenidən cəhd edin");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
         onClick={(e) => { if (e.target === e.currentTarget) { stopCam(); onClose(); } }}>
      <div className="w-full max-w-lg bg-card border border-card-border rounded-2xl overflow-hidden">
        {/* Başlıq — addım göstəricisi */}
        <div className="px-5 py-4 border-b border-card-border flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[15px]">🪪 Kimlik doğrulaması</h2>
            <p className="text-[11px] text-muted mt-0.5">Addım {step + 1} / {STEPS.length} — admin yoxlaması</p>
          </div>
          <button onClick={() => { stopCam(); onClose(); }} className="text-muted hover:text-foreground text-xl leading-none">✕</button>
        </div>

        {/* Addım nöqtələri */}
        <div className="flex gap-1.5 px-5 pt-4">
          {STEPS.map((s, i) => (
            <div key={s.key}
                 className={`h-1.5 flex-1 rounded-full transition-colors ${
                   shots[s.key] ? "bg-emerald-500" : i === step ? "bg-orange-500" : "bg-input-border"}`} />
          ))}
        </div>

        <div className="p-5 space-y-3">
          <div>
            <p className="font-semibold text-sm">{cur.title}</p>
            <p className="text-[12px] text-muted mt-1 leading-relaxed">{cur.hint}</p>
          </div>

          {/* Kadr sahəsi: çəkilmiş şəkil / canlı kamera / boş çərçivə */}
          <div className="relative rounded-xl overflow-hidden bg-input-bg border border-input-border aspect-[4/3] flex items-center justify-center">
            {shots[cur.key] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shots[cur.key]!.url} alt="" className="w-full h-full object-contain" />
            ) : camOn ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            ) : (
              <span className="text-muted text-sm">Şəkil seçilməyib</span>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Əməliyyat düymələri */}
          <div className="flex flex-wrap gap-2">
            {shots[cur.key] ? (
              <button onClick={() => setShots((p) => { const n = { ...p }; delete n[cur.key]; return n; })}
                      className="px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-sm font-medium">
                Yenidən çək
              </button>
            ) : camOn ? (
              <>
                <button onClick={capture}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold">
                  📸 Çək
                </button>
                <button onClick={stopCam} className="px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-sm">
                  Dayandır
                </button>
              </>
            ) : (
              <button onClick={startCam}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold">
                📷 Kamera aç
              </button>
            )}
            <button onClick={() => fileRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-sm font-medium">
              🖼 Qalereyadan seç
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
                   onChange={(e) => { pickFile(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
          </div>

          {/* Naviqasiya */}
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
                    className="text-sm text-muted disabled:opacity-40">← Geri</button>
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep((s) => s + 1)} disabled={!shots[cur.key]}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold disabled:opacity-40">
                Növbəti →
              </button>
            ) : (
              <button onClick={submit} disabled={!done || busy}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold disabled:opacity-40">
                {busy ? "Göndərilir…" : "Yoxlamaya göndər"}
              </button>
            )}
          </div>

          <p className="text-[11px] text-muted leading-relaxed border-t border-card-border pt-3">
            Şəkilləriniz yalnız kimliyin yoxlanılması üçün istifadə olunur. Müraciətiniz
            admin tərəfindən baxıldıqdan sonra bildiriş alacaqsınız.
          </p>
        </div>
      </div>
    </div>
  );
}
