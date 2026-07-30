"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

interface Msg { role: "user" | "assistant"; content: string }
interface Pending { type: string; endpoint: string; method: string; body: any; summary: string }

// Mətndəki daxili linkləri (/marketplace/12, /object/3, /seller/5) kliklənən edir.
function renderText(text: string) {
  const parts = text.split(/(\/(?:marketplace|object|seller)\/\d+)/g);
  return parts.map((p, i) =>
    /^\/(?:marketplace|object|seller)\/\d+$/.test(p)
      ? <Link key={i} href={p} className="text-orange-500 underline underline-offset-2 hover:text-orange-400">{p}</Link>
      : <span key={i}>{p}</span>
  );
}

export default function AIAssistantPage() {
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [confirming, setConfirming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, pending]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    if (!isLoggedIn) { toast("Əvvəlcə daxil olun", "error"); return; }
    setPending(null);
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      let d: any = null;
      try { d = await res.json(); } catch { /* qeyri-JSON cavab (məs. 404 HTML) */ }
      if (res.ok && d?.success) {
        setMessages((m) => [...m, { role: "assistant", content: d.reply || "..." }]);
        if (d.pendingAction) setPending(d.pendingAction);
      } else {
        const detail = d?.message || `cavab alınmadı (HTTP ${res.status})`;
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${detail}` }]);
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ Şəbəkə xətası: ${e?.message || "əlaqə yoxdur"}` }]);
    } finally { setBusy(false); }
  };

  // Təsdiqlənmiş əməli MÖVCUD real endpoint ilə icra et (AI özü icra etmir).
  const confirmAction = async () => {
    if (!pending) return;
    setConfirming(true);
    try {
      const res = await fetch(`${API}${pending.endpoint}`, {
        method: pending.method || "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(pending.body),
      });
      const d = await res.json();
      if (res.ok && d.success !== false) {
        toast("İcra olundu ✓", "success");
        setMessages((m) => [...m, { role: "assistant", content: "✓ Tamamlandı." }]);
        setPending(null);
      } else {
        toast(d.message || "Alınmadı", "error");
      }
    } catch { toast("Xəta baş verdi", "error"); } finally { setConfirming(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col min-h-[calc(100vh-64px)]">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white text-lg shrink-0">✨</div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold">AI Köməkçi</h1>
          <p className="text-xs text-muted">Təbii dildə soruş — məhsul tap, sifarişlərinə bax, mesaj göndər.</p>
        </div>
      </div>

      {/* Söhbət */}
      <div className="flex-1 space-y-3 mb-3">
        {messages.length === 0 && (
          <div className="surface p-4 text-sm text-muted">Salam! Mən tradixai AI köməkçisiyəm 👋 Sizə necə kömək edə bilərəm?</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
              m.role === "user" ? "bg-orange-500 text-white rounded-br-md" : "surface rounded-bl-md"
            }`}>
              {m.role === "assistant" ? renderText(m.content) : m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="surface px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="w-1.5 h-1.5 bg-muted rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}

        {/* Təsdiq kartı — AI əməli icra etmir, istifadəçi təsdiqləyir */}
        {pending && (
          <div className="surface border-orange-500/40 p-4 rounded-2xl">
            <p className="text-sm font-semibold mb-1 flex items-center gap-1.5">⚠️ Təsdiq tələb olunur</p>
            <p className="text-sm text-muted mb-3">{pending.summary}</p>
            <div className="flex gap-2">
              <button onClick={confirmAction} disabled={confirming} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {confirming ? "İcra olunur…" : "Təsdiqlə və icra et"}
              </button>
              <button onClick={() => setPending(null)} disabled={confirming} className="px-4 py-2 bg-input-bg border border-input-border rounded-xl text-sm">Ləğv et</button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Giriş */}
      {!isLoggedIn ? (
        <button onClick={() => router.push("/")} className="w-full py-3 surface rounded-xl text-sm text-muted">AI köməkçidən istifadə üçün daxil olun</button>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 sticky bottom-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Sualını yaz…"
            className="flex-1 px-4 py-3 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
          <button type="submit" disabled={busy || !input.trim()} className="px-5 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Göndər</button>
        </form>
      )}
    </div>
  );
}
