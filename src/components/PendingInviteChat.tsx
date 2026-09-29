"use client";
// QEYDİYYATSIZ NÖMRƏ İLƏ SÖHBƏT — yazılanlar gözləmədə qalır; həmin nömrə ilə
// qeydiyyat tamamlananda hamısı (mesajlar + Rəy sorğusu) ona çatdırılır.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

type Registered = { id: number; name: string; avatar?: string | null };

export default function PendingInviteChat({ phone, name, onClose, onRegistered }: {
  phone: string; name: string; onClose: () => void;
  /** Nömrə artıq platformadadır — adi söhbəti aç. */
  onRegistered?: (u: Registered) => void;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [note, setNote] = useState("");
  const [minutes, setMinutes] = useState(30);
  const endRef = useRef<HTMLDivElement>(null);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    const r = await fetch(`${API}/me/invites/${encodeURIComponent(phone.replace(/\D/g, ""))}`, { headers }).then((x) => x.json()).catch(() => null);
    if (r?.registered && onRegistered) { onRegistered(r.registered); return; }
    if (r?.success) setItems(r.items || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone, token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [items.length]);

  const post = async (body: any) => {
    setBusy(true);
    try {
      const r = await fetch(`${API}/me/invites`, { method: "POST", headers, body: JSON.stringify({ phone, ...body }) }).then((x) => x.json());
      if (r?.code === "REGISTERED" && onRegistered) { toast(`${name} artıq platformadadır — söhbət açılır`, "success"); onRegistered(r.user); return false; }
      if (!r?.success) { toast(r?.message || "Göndərilmədi", "error"); return false; }
      setItems((p) => [...p, r.item]);
      return true;
    } finally { setBusy(false); }
  };
  const send = async () => { if (text.trim() && await post({ content: text.trim() })) setText(""); };
  const askConsult = async () => {
    if (await post({ kind: "CONSULTATION", content: note.trim(), durationMinutes: minutes })) { setConsultOpen(false); setNote(""); toast("Rəy sorğusu gözləmədə ✓", "success"); }
  };
  const remove = async (id: number) => {
    const r = await fetch(`${API}/me/invites/item/${id}`, { method: "DELETE", headers }).then((x) => x.json()).catch(() => null);
    if (r?.success) setItems((p) => p.filter((i) => i.id !== id));
  };

  const site = typeof window !== "undefined" ? window.location.origin : "https://www.tradixai.io";
  const inviteText = `Salam! Sizə tradixai-da mesaj yazmışam. Bu nömrə ilə qeydiyyatdan keçin, mesajlarım sizə çatacaq: ${site}`;
  const digits = phone.replace(/\D/g, "");
  const waNumber = digits.length === 9 ? `994${digits}` : digits.length === 10 && digits.startsWith("0") ? `994${digits.slice(1)}` : digits;
  const hasConsult = items.some((i) => i.kind === "CONSULTATION");

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="modern-page w-full sm:max-w-md h-[85vh] sm:h-[620px] bg-card sm:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Başlıq */}
        <div className="px-4 py-3 border-b border-card-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 text-white font-bold text-sm flex items-center justify-center shrink-0">
            {name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{name}</p>
            <p className="text-[11px] text-muted truncate">{phone} · ⏳ platformada deyil</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg text-muted hover:text-foreground" aria-label="Bağla">✕</button>
        </div>

        <div className="px-4 py-2.5 text-[11.5px] bg-amber-500/10 text-amber-800 border-b border-amber-500/20 leading-relaxed">
          Bu nömrə hələ qeydiyyatdan keçməyib. Yazdıqlarınız saxlanılır. <b>Bu nömrə ilə qeydiyyatdan keçəndə</b> hamısı ona çatacaq, sizə də bildiriş gələcək.
          <div className="flex flex-wrap gap-1.5 mt-2">
            <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(inviteText)}`} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-full bg-white/70 border border-amber-500/30 font-semibold">WhatsApp ilə dəvət et</a>
            <a href={`sms:${phone.replace(/\s/g, "")}?&body=${encodeURIComponent(inviteText)}`} className="px-2.5 py-1 rounded-full bg-white/70 border border-amber-500/30 font-semibold">SMS ilə dəvət et</a>
          </div>
        </div>

        {/* Gözləyən mesajlar */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.length === 0 && <p className="text-center text-muted text-sm py-8">Hələ heç nə yazmamısınız.</p>}
          {items.map((i) => (
            <div key={i.id} className="flex justify-end group">
              <button onClick={() => { if (confirm("Bu gözləyən mesaj geri götürülsün?")) remove(i.id); }} title="Geri götür"
                className="self-center mr-1.5 text-[11px] text-muted opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-500">✕</button>
              <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${i.kind === "CONSULTATION" ? "bg-[var(--brand-soft)] border border-[var(--brand-to)]/30" : "bg-orange-500 text-white"}`}>
                {i.kind === "CONSULTATION" ? (
                  <>
                    <p className="font-bold text-[13px]">🗣️ Rəy sorğusu · {i.durationMinutes} dəq</p>
                    <p className="text-[11px] text-muted">Qiyməti qəbul edəndə o yazacaq, sonra ödəyirsiniz.</p>
                    {i.content && <p className="mt-1 whitespace-pre-wrap">{i.content}</p>}
                  </>
                ) : <span className="whitespace-pre-wrap">{i.content}</span>}
                <span className={`block text-right text-[10px] mt-0.5 ${i.kind === "CONSULTATION" ? "text-muted" : "text-white/70"}`}>
                  {new Date(i.createdAt).toLocaleString("az-AZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · ⏳
                </span>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Rəy sorğusu formu */}
        {consultOpen && (
          <div className="p-3 border-t border-card-border space-y-2 bg-input-bg/40">
            <p className="text-sm font-bold">🗣️ Rəy (ödənişli konsultasiya) istə</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} placeholder="Nə barədə rəy istəyirsiniz? (istəyə görə)"
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm resize-none" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Müddət:</span>
              {[15, 30, 60].map((m) => (
                <button key={m} onClick={() => setMinutes(m)} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${minutes === m ? "bg-[var(--brand-to)] text-white border-transparent" : "border-input-border"}`}>{m} dəq</button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConsultOpen(false)} className="flex-1 py-2 rounded-xl border border-input-border text-sm">Ləğv</button>
              <button onClick={askConsult} disabled={busy} className="flex-1 py-2 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] disabled:opacity-50">Sorğunu saxla</button>
            </div>
          </div>
        )}

        {/* Yazı sahəsi */}
        {!consultOpen && (
          <div className="p-2.5 border-t border-card-border flex items-end gap-2">
            <button onClick={() => setConsultOpen(true)} disabled={hasConsult} title={hasConsult ? "Rəy sorğusu artıq göndərilib" : "Rəy istə"}
              className="shrink-0 h-10 px-3 rounded-xl bg-[var(--brand-soft)] text-[var(--brand-to)] text-xs font-bold disabled:opacity-40">🗣️ Rəy</button>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000} placeholder="Mesaj yazın…"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              className="flex-1 px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm resize-none max-h-28" />
            <button onClick={send} disabled={busy || !text.trim()} className="shrink-0 h-10 px-4 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-orange-500 to-orange-600 disabled:opacity-50">Göndər</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
