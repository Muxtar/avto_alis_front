"use client";
/* ──────────────────────────────────────────────────────────────────────────
   KİMLİK DOĞRULAMASI — ÜSUL SEÇİMİ.

   İstifadəçiyə iki yol təklif olunur:

     1) Veriff ilə — nəticə saniyələr içində gəlir, profil DƏRHAL aktiv olur.
        Ödənişlidir: tarif admin panelindən idarə olunur (`veriff_fee_azn`).
        Admin Veriff-i söndürübsə bu seçim GÖRÜNÜR, amma seçilə bilmir.

     2) Admin yoxlaması — pulsuz. İstifadəçi vəsiqə və selfie göndərir,
        admin gözlə baxır; adətən 1–2 gün çəkir.

   Ödəniş yalnız Veriff seçiləndə alınır və TƏSDİQ anında xərclənir —
   doğrulama alınmasa pul yanmır, təkrar ödəniş tələb olunmur.
   ────────────────────────────────────────────────────────────────────────── */
import type { IdentityStatus } from "@/lib/veriff";

export default function IdentityChoiceModal({
  status, busy, onVeriff, onManual, onClose,
}: {
  status: IdentityStatus | null;
  busy?: boolean;
  onVeriff: () => void;
  onManual: () => void;
  onClose: () => void;
}) {
  const veriffOn = !!status?.veriffAvailable;
  const fee = status?.fee;
  // Tarif 0-dırsa və ya artıq ödənilibsə əlavə pul istənmir.
  const priceLabel = !fee?.required
    ? "Pulsuz"
    : fee.paid
      ? "Ödənilib ✓"
      : `${fee.amount.toFixed(2)} AZN`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-card-border flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-[15px]">🪪 Kimliyi necə təsdiqləyək?</h2>
            <p className="text-[11px] text-muted mt-0.5">Bir üsul seçin</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl leading-none">✕</button>
        </div>

        <div className="p-4 space-y-3">
          {/* ── Veriff — dərhal, ödənişli ── */}
          <button
            onClick={() => { if (veriffOn && !busy) onVeriff(); }}
            disabled={!veriffOn || busy}
            className={`w-full text-left p-4 rounded-2xl border transition-all ${
              veriffOn
                ? "border-input-border hover:border-orange-500/60 hover:bg-orange-500/5 cursor-pointer"
                : "border-input-border opacity-50 cursor-not-allowed"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm flex items-center gap-2">
                  ⚡ Veriff ilə
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 text-[10px] font-bold">
                    DƏRHAL
                  </span>
                </p>
                <p className="text-[12px] text-muted mt-1 leading-relaxed">
                  Sənəd və üz doğrulaması avtomatik aparılır — təsdiqləndiyi anda
                  profiliniz aktiv olur, gözləmək lazım deyil.
                </p>
              </div>
              <span className={`shrink-0 text-sm font-bold ${fee?.paid ? "text-emerald-600" : "text-orange-500"}`}>
                {priceLabel}
              </span>
            </div>
            {!veriffOn && (
              <p className="text-[11px] text-amber-600 mt-2">
                Hazırda əlçatan deyil — aşağıdakı üsulla davam edin.
              </p>
            )}
          </button>

          {/* ── Admin yoxlaması — pulsuz, 1-2 gün ── */}
          <button
            onClick={() => { if (!busy) onManual(); }}
            disabled={busy}
            className="w-full text-left p-4 rounded-2xl border border-input-border hover:border-orange-500/60 hover:bg-orange-500/5 transition-all disabled:opacity-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm">👤 Admin yoxlaması</p>
                <p className="text-[12px] text-muted mt-1 leading-relaxed">
                  Vəsiqənin ön/arxa şəklini və selfie göndərirsiniz, komandamız
                  gözlə yoxlayır.
                </p>
                <p className="text-[11px] text-amber-600 mt-1.5">⏳ 1–2 gün vaxt ala bilər</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-emerald-600">Pulsuz</span>
            </div>
          </button>

          <p className="text-[11px] text-muted leading-relaxed border-t border-card-border pt-3">
            Veriff seçsəniz ödəniş yalnız təsdiq alındıqda xərclənir — doğrulama
            alınmasa təkrar ödəniş tələb olunmur.
          </p>
        </div>
      </div>
    </div>
  );
}
