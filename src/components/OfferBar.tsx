"use client";
// Ödənişli təklifin vəziyyəti və əməliyyatları — chat-da (🔒) və konsultasiya səhifəsində.
//   Alıcı:   gözləyir (geri götür) · qarşı təklif (qəbul et / rədd et)
//   Peşəkar: qəbul et · öz təklifim · rədd et
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

const fmtMin = (m: number) => (m >= 60 && m % 60 === 0 ? `${m / 60} saat` : `${m} dəq`);
const line = (min: number, price: number) => `${fmtMin(min)} / ${price} AZN`;
const left = (iso?: string | null) => {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "müddət bitir";
  const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 3600e3);
  return d > 0 ? `${d} gün ${h} saat qalıb` : `${h || 1} saat qalıb`;
};

export default function OfferBar({ session, onChange }: { session: any; onChange: (s: any) => void }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [counterOpen, setCounterOpen] = useState(false);
  const [cPrice, setCPrice] = useState("");
  const [cMin, setCMin] = useState(Math.round((session?.durationSeconds || 3600) / 60));
  const [cMsg, setCMsg] = useState("");
  if (!session || session.flow !== "OFFER") return null;

  const isPro = session.role === "professional";
  const min = Math.round(session.durationSeconds / 60);
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const post = async (path: string, body?: any) => {
    setBusy(true);
    try {
      const r = await fetch(`${API}/consultations/${session.id}/${path}`, { method: "POST", headers: H, body: body ? JSON.stringify(body) : undefined }).then((x) => x.json());
      if (!r?.success) {
        toast(r?.message || "Xəta", "error");
        return null;
      }
      if (r.session) onChange(r.session);
      return r;
    } catch { toast("Şəbəkə xətası", "error"); return null; } finally { setBusy(false); }
  };
  const pay = async () => {
    const r = await post("pay");
    if (r?.redirectUrl) { try { sessionStorage.setItem("consultPay", String(session.id)); } catch { /* keç */ } window.location.href = r.redirectUrl; }
  };

  const box = "rounded-2xl border px-3.5 py-3 text-[13px]";
  const btn = "px-3.5 py-2 text-xs font-bold disabled:opacity-50";
  const st = session.status;

  if (st === "OFFERED" && session.paymentStatus !== "PAID") {
    return !isPro ? (
      <div className={`${box} border-amber-500/30 bg-amber-500/10`}>
        <p><b>Ödəniş tamamlanmayıb.</b> Təklif ({line(min, session.price)}) ödənişdən sonra göndəriləcək.</p>
        <div className="flex gap-2 mt-2">
          <button onClick={pay} disabled={busy} className={`${btn} text-white bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]`}>💳 Ödə</button>
          <button onClick={() => post("cancel")} disabled={busy} className={`${btn} bg-input-bg`}>Ləğv et</button>
        </div>
      </div>
    ) : null;
  }

  if (st === "OFFERED") {
    if (!isPro) return (
      <div className={`${box} border-card-border bg-input-bg/60`}>
        <p className="flex items-start gap-2"><span className="text-lg leading-none">🔒</span><span>
          <b>Təklifiniz göndərildi: {line(min, session.price)}.</b> Ödəniş platformada saxlanılır.{" "}
          {session.target ? "O, platformaya qoşulub hesabını təsdiqləyəndə təklifi görəcək. " : ""}
          Qəbul edildikdə chat açılacaq · <span className="text-muted">{left(session.expiresAt)}, sonra pul avtomatik qaytarılır.</span>
        </span></p>
        <button onClick={() => { if (confirm("Təklif geri götürülsün? Ödəniş kartınıza qaytarılacaq.")) post("cancel"); }} disabled={busy} className={`${btn} mt-2 bg-card border border-card-border`}>↩︎ Təklifi geri götür</button>
      </div>
    );
    return (
      <div className={`${box} border-[var(--brand-to)]/35 bg-[var(--brand-soft)]`}>
        <p><b>💰 Ödənişli təklif: {line(min, session.price)}</b> — ödəniş platformada saxlanılır, qəbul etsəniz sizə keçir.</p>
        <p className="text-[11.5px] text-muted mt-0.5">{left(session.expiresAt)} · cavab verilməsə pul alıcıya qaytarılacaq.</p>
        {!counterOpen ? (
          <div className="flex flex-wrap gap-2 mt-2.5">
            <button onClick={async () => {
              const r = await fetch(`${API}/consultations/${session.id}/accept`, { method: "POST", headers: H }).then((x) => x.json()).catch(() => null);
              if (r?.success) { onChange(r.session); toast("Qəbul edildi — söhbət açıldı ✓", "success"); }
              else if (r?.code === "NEEDS_VOEN") toast("Ödənişi almaq üçün əvvəlcə VÖEN-li biznes əlavə edin: Profil → Biznes əlavə et", "error");
              else toast(r?.message || "Xəta", "error");
            }} disabled={busy} className={`${btn} text-white bg-emerald-500`}>✓ Qəbul et</button>
            <button onClick={() => { setCounterOpen(true); setCPrice(String(session.price)); }} disabled={busy} className={`${btn} bg-card border border-card-border`}>💬 Öz təklifim</button>
            <button onClick={() => { if (confirm("Təklif rədd edilsin? Ödəniş alıcıya qaytarılacaq.")) post("reject"); }} disabled={busy} className={`${btn} text-red-500 bg-red-500/10`}>✕ Rədd et</button>
          </div>
        ) : (
          <div className="mt-2.5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input value={cPrice} onChange={(e) => setCPrice(e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" placeholder="Qiymət"
                className="w-24 px-3 py-2 bg-card border border-input-border rounded-xl text-sm font-bold" />
              <span className="text-xs">AZN ·</span>
              <input type="number" min={5} max={600} value={cMin} onChange={(e) => setCMin(parseInt(e.target.value) || 5)}
                className="w-20 px-2 py-2 bg-card border border-input-border rounded-xl text-sm text-center" />
              <span className="text-xs">dəq</span>
            </div>
            <input value={cMsg} onChange={(e) => setCMsg(e.target.value)} maxLength={1000} placeholder="Qısa izah (istəyə görə)"
              className="w-full px-3 py-2 bg-card border border-input-border rounded-xl text-sm" />
            <div className="flex gap-2">
              <button onClick={async () => {
                const price = parseFloat(cPrice.replace(",", "."));
                if (!(price >= 1)) { toast("Qiyməti yazın", "error"); return; }
                const r = await fetch(`${API}/consultations/${session.id}/counter`, { method: "POST", headers: H, body: JSON.stringify({ price, minutes: cMin, message: cMsg }) }).then((x) => x.json()).catch(() => null);
                if (r?.success) { onChange(r.session); setCounterOpen(false); toast("Qarşı təklif göndərildi ✓", "success"); }
                else if (r?.code === "NEEDS_VOEN") toast("Ödənişi almaq üçün əvvəlcə VÖEN-li biznes əlavə edin: Profil → Biznes əlavə et", "error");
                else toast(r?.message || "Xəta", "error");
              }} disabled={busy} className={`${btn} text-white bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]`}>Göndər</button>
              <button onClick={() => setCounterOpen(false)} className={`${btn} bg-card border border-card-border`}>Ləğv</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (st === "COUNTERED") {
    const cp = session.counterPrice, cm = session.counterMinutes;
    const diff = Math.round((cp - session.paidAmount) * 100) / 100;
    if (isPro) return (
      <div className={`${box} border-card-border bg-input-bg/60`}>
        🔒 <b>Qarşı təklifiniz göndərildi: {line(cm, cp)}.</b> Alıcının cavabı gözlənilir · <span className="text-muted">{left(session.expiresAt)}</span>
      </div>
    );
    return (
      <div className={`${box} border-[var(--brand-to)]/35 bg-[var(--brand-soft)]`}>
        <p><b>💬 Qarşı təklif: {line(cm, cp)}</b>{session.counterMessage ? ` — «${session.counterMessage}»` : ""}</p>
        <p className="text-[11.5px] text-muted mt-0.5">
          Siz {session.paidAmount} AZN ödəmisiniz. {diff > 0 ? `Razılaşsanız ${diff} AZN əlavə ödəyəcəksiniz.` : diff < 0 ? `Razılaşsanız ${-diff} AZN kartınıza qaytarılacaq.` : "Qiymət eynidir."} · {left(session.expiresAt)}
        </p>
        <div className="flex flex-wrap gap-2 mt-2.5">
          <button onClick={async () => {
            const r = await post("counter/accept");
            if (r?.needsPayment) await pay();
            else if (r) toast("Razılaşdınız — söhbət açıldı ✓", "success");
          }} disabled={busy} className={`${btn} text-white bg-emerald-500`}>{diff > 0 ? `✓ Qəbul et və ${diff} AZN ödə` : "✓ Qəbul et"}</button>
          <button onClick={() => { if (confirm("Qarşı təklif rədd edilsin? Ödədiyiniz məbləğ tam qaytarılacaq.")) post("counter/reject"); }} disabled={busy} className={`${btn} text-red-500 bg-red-500/10`}>✕ Rədd et (pul qaytarılır)</button>
        </div>
      </div>
    );
  }

  if (["CANCELLED", "EXPIRED", "REJECTED"].includes(st)) {
    const why = st === "EXPIRED" ? "Müddət bitdi" : st === "REJECTED" ? "Təklif rədd edildi" : "Təklif geri götürüldü";
    return (
      <div className={`${box} border-card-border bg-input-bg/60 text-muted`}>
        {why} · {session.paymentStatus === "REFUND_PENDING" ? "pul qaytarılır (bank təsdiqi gözlənilir)" : session.paymentStatus === "REFUNDED" ? "pul qaytarıldı" : "ödəniş alınmayıb"}.
        {!isPro && <> <Link href="/consultations" className="text-[var(--brand-to)] font-semibold">Yeni təklif</Link></>}
      </div>
    );
  }
  return null;
}
