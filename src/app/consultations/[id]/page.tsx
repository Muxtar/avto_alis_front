"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import ComplaintButton from "@/components/ComplaintButton";
import { API } from "@/lib/api";

function fmt(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60), s = Math.max(0, sec) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ConsultationDetailPage() {
  const { token, user, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [localRemaining, setLocalRemaining] = useState(0);
  // Qiymətləndirmə
  const [stars, setStars] = useState(5);
  const [like, setLike] = useState<boolean | null>(null);
  const [rateText, setRateText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const r = await fetch(`${API}/consultations/${id}`, { headers }).then((x) => x.json());
      if (r.success) { setSession(r.session); setLocalRemaining(r.session.remainingSeconds); }
    } catch { /* keç */ }
    // eslint-disable-next-line
  }, [id, token]);

  const loadMessages = useCallback(async () => {
    try {
      const r = await fetch(`${API}/consultations/${id}/messages`, { headers }).then((x) => x.json());
      if (r.success) setMessages(r.messages || []);
    } catch { /* keç */ }
    // eslint-disable-next-line
  }, [id, token]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    Promise.all([loadSession(), loadMessages()]).finally(() => setLoading(false));
    const iv = setInterval(() => { loadSession(); loadMessages(); }, 4000);
    return () => clearInterval(iv);
    // eslint-disable-next-line
  }, [isLoggedIn, authLoading]);

  // Canlı geri sayım — yalnız sayğac işləyəndə.
  useEffect(() => {
    if (!session?.running) return;
    const iv = setInterval(() => setLocalRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(iv);
  }, [session?.running]);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages.length]);

  const isPro = session?.role === "professional";
  const active = session?.status === "ACTIVE" && localRemaining > 0;

  const act = async (path: string, body?: any) => {
    setBusy(true);
    try {
      const r = await fetch(`${API}/consultations/${id}/${path}`, { method: "POST", headers, body: body ? JSON.stringify(body) : undefined }).then((x) => x.json());
      if (r.success) { if (r.session) { setSession(r.session); setLocalRemaining(r.session.remainingSeconds); } if (r.redirectUrl) window.location.href = r.redirectUrl; }
      else toast(r.message || "Xəta", "error");
      return r;
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  const send = async () => {
    if (!input.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/messages`, { method: "POST", headers, body: JSON.stringify({ receiverId: isPro ? session.buyerId : session.professionalId, consultationId: id, content: input.trim() }) }).then((x) => x.json());
      if (r.success) { setInput(""); await loadMessages(); }
      else toast(r.message || "Mesaj göndərilmədi", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  const submitRate = async () => {
    const r = await act("rate", { stars, like, text: rateText });
    if (r?.success) { toast("Təşəkkürlər, qiymətləndirildi ✓", "success"); await loadSession(); }
  };

  if (loading || !session) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Geri qayıtma qlobal BackButton ilə edilir (layout) */}

      {/* Başlıq + sayğac */}
      <div className="surface p-4 mb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold">{session.title} · {session.price} AZN</p>
            <p className="text-xs text-muted">{isPro ? "Siz peşəkarsınız" : "Siz alıcısınız"}</p>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${active ? "text-green-500" : "text-muted"}`}>{fmt(localRemaining)}</div>
        </div>

        {/* VÖEN xəbərdarlığı */}
        {session.status === "PENDING_VOEN" && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500">
            {isPro
              ? "Bu sorğunu aktivləşdirmək üçün VÖEN (biznes) əlavə etməlisiniz. Profil → Biznes əlavə et."
              : "Peşəkar hələ VÖEN əlavə etməyib — ödəniş hələ aktivləşə bilməz."}
          </div>
        )}

        {/* İdarəetmə düymələri */}
        <div className="mt-3 flex flex-wrap gap-2">
          {isPro ? (
            <>
              {(session.status === "PAID" || session.status === "PAUSED") && localRemaining > 0 && (
                <button onClick={() => act("start")} disabled={busy} className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">▶ Başlat / Davam</button>
              )}
              {session.status === "ACTIVE" && (
                <button onClick={() => act("pause")} disabled={busy} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">⏸ Dayandır</button>
              )}
              {(session.status === "ACTIVE" || session.status === "PAUSED") && (
                <button onClick={() => act("end")} disabled={busy} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm font-semibold disabled:opacity-50">Bitir</button>
              )}
            </>
          ) : (
            <>
              {(session.status === "REQUESTED" || session.status === "ENDED") && session.status !== "PENDING_VOEN" && (
                <button onClick={() => act("pay")} disabled={busy} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {session.status === "ENDED" ? "Yenidən ödə (vaxt artır)" : `Ödə — ${session.price} AZN`}
                </button>
              )}
              {session.status === "PAID" && <span className="text-sm text-blue-500 self-center">Ödənilib — peşəkarın başlatmasını gözləyin</span>}
            </>
          )}
        </div>
      </div>

      {/* Söhbət */}
      <div className="surface p-0 overflow-hidden">
        <div ref={scrollRef} className="h-[46vh] overflow-y-auto p-4 space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-muted text-sm py-8">Hələ mesaj yoxdur.</p>
          ) : messages.map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${mine ? "bg-orange-500 text-white" : "bg-input-bg"}`}>{m.content}</div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-input-border p-2.5 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            disabled={!active || busy}
            placeholder={active ? "Mesaj yazın…" : "Konsultasiya aktiv olduqda yaza bilərsiniz"}
            className="flex-1 px-3.5 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-60"
          />
          <button onClick={send} disabled={!active || busy || !input.trim()} className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Göndər</button>
        </div>
      </div>

      {/* Qiymətləndirmə — alıcı, seans bitəndə */}
      {!isPro && session.status === "ENDED" && !session.rated && (
        <div className="surface p-4 mt-3">
          <p className="font-semibold text-sm mb-2">Peşəkarı qiymətləndirin</p>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setStars(n)} className={`text-2xl ${n <= stars ? "text-amber-400" : "text-muted"}`}>★</button>
            ))}
          </div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setLike(true)} className={`px-3 py-1.5 rounded-lg text-sm ${like === true ? "bg-green-500/20 text-green-500" : "bg-input-bg text-muted"}`}>👍 Bəyəndim</button>
            <button onClick={() => setLike(false)} className={`px-3 py-1.5 rounded-lg text-sm ${like === false ? "bg-red-500/20 text-red-500" : "bg-input-bg text-muted"}`}>👎 Bəyənmədim</button>
          </div>
          <textarea value={rateText} onChange={(e) => setRateText(e.target.value)} rows={2} placeholder="Rəyiniz (istəyə bağlı)…" className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm resize-none mb-2" />
          <button onClick={submitRate} disabled={busy} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Qiymətləndir</button>
        </div>
      )}
      {!isPro && session.rated && <p className="text-center text-sm text-green-500 mt-3">✓ Qiymətləndirildi</p>}

      {/* Şikayət — alıcı (peşəkar vaxtı boşa xərclədisə və s.) */}
      {!isPro && (session.status === "ENDED" || session.status === "ACTIVE" || session.status === "PAUSED") && (
        <div className="text-center mt-4">
          <ComplaintButton consultationId={Number(id)} label="Bu konsultasiyadan şikayət et" className="text-xs text-red-500 hover:underline" />
          <p className="text-[11px] text-muted mt-1">Peşəkar vaxtı boşa xərclədisə və ya rəy vermədisə — admin söhbəti və vaxt loglarını yoxlayacaq.</p>
        </div>
      )}
    </div>
  );
}
