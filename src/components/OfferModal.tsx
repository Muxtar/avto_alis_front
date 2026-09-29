"use client";
// RƏY TƏKLİFİ — «əvvəl ödəniş, sonra qəbul».
// Alıcı hədəfi seçir (saytdakı peşəkar / paket, internetdə tapılan sosial profil, nömrə),
// müddət + qiymət + ilk mesajı yazır və ödəyir. Pul platformada saxlanır; qarşı tərəf
// 7 gün ərzində qəbul etməsə (və ya platformaya qoşulmasa) avtomatik qaytarılır.
import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { PLATFORM_LABEL } from "@/lib/invites";

export type OfferTarget =
  | { kind: "user"; id: number; name: string; avatar?: string | null }
  | { kind: "package"; offerId: number; name: string; title?: string | null; price: number; minutes: number; quantity?: number }
  | { kind: "social"; platform: string; url: string; name: string; avatar?: string | null }
  | { kind: "phone"; phone: string; name: string };

const MINUTES = [15, 30, 60, 120];
const fmtMin = (m: number) => (m >= 60 && m % 60 === 0 ? `${m / 60} saat` : `${m} dəq`);

export default function OfferModal({ target, onClose }: { target: OfferTarget; onClose: () => void }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const pkg = target.kind === "package";
  const [qty, setQty] = useState(pkg ? target.quantity || 1 : 1);
  const [minutes, setMinutes] = useState(pkg ? target.minutes : 60);
  const [price, setPrice] = useState(pkg ? String(target.price) : "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const total = pkg ? Math.round(target.price * qty * 100) / 100 : parseFloat(price.replace(",", ".")) || 0;
  const totalMin = pkg ? target.minutes * qty : minutes;
  const unregistered = target.kind === "social" || target.kind === "phone";

  const submit = async () => {
    if (!token) { toast("Əvvəlcə daxil olun", "error"); return; }
    if (!pkg && !(total >= 1)) { toast("Qiyməti yazın (ən azı 1 AZN)", "error"); return; }
    if (!pkg && message.trim().length < 2) { toast("İlk mesajınızı yazın", "error"); return; }
    const body: any = { message: message.trim() };
    if (target.kind === "package") Object.assign(body, { offerId: target.offerId, quantity: qty });
    else {
      Object.assign(body, { price: total, minutes });
      if (target.kind === "user") body.professionalId = target.id;
      if (target.kind === "social") body.social = { platform: target.platform, url: target.url, name: target.name, avatar: target.avatar || null };
      if (target.kind === "phone") Object.assign(body, { phone: target.phone, name: target.name });
    }
    setBusy(true);
    try {
      const r = await fetch(`${API}/consultations/offer`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json());
      if (r?.redirectUrl) { try { sessionStorage.setItem("consultPay", String(r.session?.id || "")); } catch { /* keç */ } window.location.href = r.redirectUrl; return; }
      toast(r?.message || "Təklif göndərilmədi", "error");
    } catch { toast("Şəbəkə xətası", "error"); } finally { setBusy(false); }
  };

  const who = target.kind === "social" ? `${target.name} · ${PLATFORM_LABEL[target.platform] || target.platform}` : target.kind === "phone" ? `${target.name} · ${target.phone}` : target.name;

  return createPortal(
    <div className="fixed inset-0 z-[140] bg-black/55 flex items-end sm:items-center justify-center" onClick={() => !busy && onClose()}>
      <div className="modern-page w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="brand-band px-5 py-4">
          <p className="brand-band-kicker">tradixai · ödənişli təklif</p>
          <p className="text-[16px] font-bold leading-tight mt-0.5">🗣️ {pkg ? "Rəy al" : "Təklif göndər"}</p>
          <p className="text-[12px] opacity-90 truncate">{who}</p>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {pkg ? (
            <div className="rounded-2xl border border-card-border p-3">
              <p className="text-sm font-semibold">{target.title || "Konsultasiya"} · {fmtMin(target.minutes)} / {target.price} AZN</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted">Neçə dəfə:</span>
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 bg-input-bg font-bold">−</button>
                <span className="w-6 text-center font-bold">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(24, q + 1))} className="w-8 h-8 bg-input-bg font-bold">+</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="id-field-label mb-1.5">Nə qədər vaxt danışmaq istəyirsiniz?</p>
                <div className="flex flex-wrap gap-1.5">
                  {MINUTES.map((m) => (
                    <button key={m} onClick={() => setMinutes(m)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${minutes === m ? "bg-[var(--brand-to)] text-white border-transparent" : "border-input-border"}`}>{fmtMin(m)}</button>
                  ))}
                  <input type="number" min={5} max={1440} value={minutes} onChange={(e) => setMinutes(Math.max(5, Math.min(1440, parseInt(e.target.value) || 5)))}
                    className="w-20 px-2 py-1 bg-input-bg border border-input-border rounded-full text-xs text-center" aria-label="Dəqiqə" />
                  <span className="text-xs text-muted self-center">dəq</span>
                </div>
              </div>
              <label className="block">
                <span className="id-field-label">Təklif etdiyiniz qiymət</span>
                <div className="mt-1 flex items-center gap-2">
                  <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="məs. 50"
                    className="flex-1 px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-lg font-bold" />
                  <span className="font-bold">AZN</span>
                </div>
              </label>
            </>
          )}

          <label className="block">
            <span className="id-field-label">{pkg ? "Mesajınız (istəyə görə)" : "İlk mesajınız"}</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={2000}
              placeholder="Özünüzü təqdim edin və nə barədə danışmaq istədiyinizi yazın…"
              className="mt-1 w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm resize-none" />
          </label>

          <ul className="text-[11.5px] text-muted space-y-1 leading-snug">
            <li>💳 Ödəniş indi alınır və <b className="text-foreground">platformada saxlanılır</b> — qarşı tərəf qəbul edənə qədər ona keçmir.</li>
            <li>🔒 Mesajınız chat-da görünəcək, amma qarşı tərəf qəbul edənə qədər yazışma bağlı qalır.</li>
            <li>💬 Qarşı tərəf öz qiymətini/müddətini təklif edə bilər — razılaşsanız fərq ödənilir və ya artığı qaytarılır.</li>
            <li>↩︎ <b className="text-foreground">7 gün</b> ərzində qəbul edilməsə{unregistered ? " (və ya o platformaya qoşulmasa)" : ""} pul avtomatik qaytarılır. Qəbuldan əvvəl özünüz də geri götürə bilərsiniz.</li>
            {target.kind === "social" && <li>👤 O, tradixai-da qeydiyyatdan keçib bu {PLATFORM_LABEL[target.platform] || ""} hesabını təsdiqləyəndə təklifinizi görəcək. Adminlərimiz ona rəsmi hesabımızdan xəbər verəcək.</li>}
          </ul>
        </div>

        <div className="p-4 border-t border-card-border flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted">{fmtMin(totalMin)}</p>
            <p className="text-lg font-extrabold tabular-nums">{total ? `${total} AZN` : "—"}</p>
          </div>
          <button onClick={onClose} disabled={busy} className="px-4 py-3 border border-input-border text-sm">Ləğv</button>
          <button onClick={submit} disabled={busy} className="px-5 py-3 text-white text-sm font-bold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] disabled:opacity-50">
            {busy ? "…" : "Ödə və göndər"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
