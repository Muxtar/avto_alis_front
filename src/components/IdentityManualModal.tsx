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

type Facing = "environment" | "user";

const STEPS: { key: StepKey; title: string; hint: string; facing: Facing }[] = [
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
  const [facing, setFacing] = useState<Facing>("environment");
  const [starting, setStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const cur = STEPS[step];
  const done = STEPS.every((s) => shots[s.key]);

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
  };

  /* Kamera açılışı.
     Vəsiqənin ön/arxa tərəfi ARXA kamera ilə çəkilir (facingMode: environment),
     selfie isə ÖN kamera ilə (user). Telefon `exact` şərti qəbul etməsə
     `ideal` ilə, o da alınmasa şərtsiz açılır — masaüstündə tək kamera var. */
  const startCam = async (want: Facing = facing) => {
    if (starting) return;
    setStarting(true);
    setError("");
    stopCam();
    const tries: MediaStreamConstraints[] = [
      { video: { facingMode: { exact: want } } },
      { video: { facingMode: { ideal: want } } },
      { video: true },
    ];
    for (const c of tries) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        streamRef.current = stream;
        setFacing(want);
        setCamOn(true);
        setStarting(false);
        return;
      } catch { /* növbəti variant */ }
    }
    setStarting(false);
    setError("Kamera açılmadı — icazəni yoxlayın və ya şəkli qalereyadan seçin.");
  };

  /* Axını <video>-ya BURADA bağlayırıq.
     Əvvəl `setTimeout` ilə bağlanırdı: element hələ DOM-a düşməmiş olurdu və
     ekran qara qalırdı. İndi video render olunandan sonra effekt işləyir. */
  useEffect(() => {
    const v = videoRef.current;
    if (!camOn || !v || !streamRef.current) return;
    v.srcObject = streamRef.current;
    // Bəzi brauzerlər `autoPlay`-i bloklayır — açıq şəkildə oynadırıq.
    v.play().catch(() => {});
  }, [camOn]);

  // Modal bağlananda kamera mütləq buraxılır (işıq yanıb qalmasın).
  useEffect(() => stopCam, []);

  // Addım dəyişəndə kamera bağlanır və həmin addıma uyğun kamera seçilir.
  useEffect(() => {
    stopCam();
    setFacing(STEPS[step].facing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // DİQQƏT: güzgü YALNIZ ekranda (CSS ilə) tətbiq olunur — kameradan gələn
    // kadrın özü onsuz da düzdür. Burada çevirsək yadda saxlanan selfie tərs
    // düşür və admin onu güzgüdə görür. Ona görə kadr olduğu kimi yazılır.
    ctx.drawImage(v, 0, 0);
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
              <>
                <video ref={videoRef} autoPlay playsInline muted
                       className={`w-full h-full object-cover ${facing === "user" ? "scale-x-[-1]" : ""}`} />
                {/* Kadr köməkçisi — vəsiqə çərçivəyə yerləşdirilsin */}
                <div className={`pointer-events-none absolute inset-0 flex items-center justify-center`}>
                  <div className={facing === "user"
                        ? "w-40 h-52 rounded-[50%] border-2 border-white/70"
                        : "w-[85%] aspect-[1.586/1] rounded-xl border-2 border-white/70"} />
                </div>
                <span className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-[10px]">
                  {facing === "user" ? "Ön kamera" : "Arxa kamera"}
                </span>
              </>
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
                {/* Telefonda kameranı əl ilə dəyişmək (bəzi cihazlar facingMode-a tabe olmur) */}
                <button onClick={() => startCam(facing === "user" ? "environment" : "user")}
                        className="px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-sm">
                  🔄 {facing === "user" ? "Arxa kamera" : "Ön kamera"}
                </button>
                <button onClick={stopCam} className="px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-sm">
                  Dayandır
                </button>
              </>
            ) : (
              <button onClick={() => startCam(cur.facing)} disabled={starting}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold disabled:opacity-50">
                {starting ? "Açılır…" : `📷 Kamera aç (${cur.facing === "user" ? "ön" : "arxa"})`}
              </button>
            )}
            <button onClick={() => fileRef.current?.click()}
                    className="px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-sm font-medium">
              🖼 Qalereyadan seç
            </button>
            {/* Qalereya — `capture` QOYULMUR, yoxsa telefonda kamera açılır. */}
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
