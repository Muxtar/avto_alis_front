'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useToast } from '@/components/Toast';
import { API } from '@/lib/api';

interface Message { role: 'user' | 'assistant'; text: string }
interface Pending { type: string; endpoint: string; method: string; body: any; summary: string }

// Mətndəki daxili linkləri (/marketplace/12, /object/3, /seller/5) kliklənən edir.
function renderText(text: string) {
  const parts = text.split(/(\/(?:marketplace|object|seller)\/\d+)/g);
  return parts.map((p, i) =>
    /^\/(?:marketplace|object|seller)\/\d+$/.test(p)
      ? <Link key={i} href={p} className="text-orange-500 underline underline-offset-2">{p}</Link>
      : <span key={i}>{p}</span>
  );
}

// Sağ tərəfdə üzən AI köməkçi chat paneli — Claude agent ilə işləyir.
export default function InquiryChatbot() {
  const { token, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Mobil klaviatura idarəetməsi — görünən viewport (top/height). Desktopda null (md: class-lar işləyir).
  const [vp, setVp] = useState<{ top: number; height: number } | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !initialized) {
      setMessages([{ role: 'assistant', text: 'Salam! Mən tradixai AI köməkçisiyəm 👋 Sizə necə kömək edə bilərəm?' }]);
      setInitialized(true);
    }
  }, [open, initialized]);

  // Scroll-u YALNIZ mesaj konteyneri daxilində et (scrollIntoView səhifəni sürüşdürüb "donma" yaradırdı).
  useEffect(() => {
    const el = listRef.current;
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [messages, pending, loading]);

  // Mobil footer-dəki mərkəzi düymə bu hadisə ilə chat-i açıb-bağlayır.
  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    window.addEventListener('toggle-inquiry-chat', toggle);
    return () => window.removeEventListener('toggle-inquiry-chat', toggle);
  }, []);

  // Panel açıqkən mobil görünən viewport-a uyğunlaş — klaviatura açılanda header/input
  // itməsin, üfüqi daşma olmasın (messages səhifəsindəki kimi visualViewport ilə).
  useEffect(() => {
    if (!open) { setVp(null); return; }
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const apply = () => {
      if (window.innerWidth >= 768) { setVp(null); return; } // desktop → md: class-lar
      const height = vv ? vv.height : window.innerHeight;
      const top = vv ? vv.offsetTop : 0;
      setVp({ top: Math.round(top), height: Math.round(height) });
    };
    apply();
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, [open]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    if (!isLoggedIn) {
      setMessages((prev) => [...prev, { role: 'user', text: q }, { role: 'assistant', text: '⚠️ İstifadə üçün əvvəlcə daxil olun.' }]);
      setInput('');
      return;
    }
    setPending(null);
    const next: Message[] = [...messages.filter((m) => m.role === 'user' || m.role === 'assistant'), { role: 'user', text: q }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.text })) }),
      });
      let d: any = null;
      try { d = await res.json(); } catch { /* qeyri-JSON */ }
      if (res.ok && d?.success) {
        setMessages((m) => [...m, { role: 'assistant', text: d.reply || '...' }]);
        if (d.pendingAction) setPending(d.pendingAction);
      } else {
        setMessages((m) => [...m, { role: 'assistant', text: `⚠️ ${d?.message || `cavab alınmadı (HTTP ${res.status})`}` }]);
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', text: `⚠️ Şəbəkə xətası: ${e?.message || 'əlaqə yoxdur'}` }]);
    } finally { setLoading(false); }
  };

  // Təsdiqlənmiş əməli MÖVCUD real endpoint ilə icra et.
  const confirmAction = async () => {
    if (!pending) return;
    setConfirming(true);
    try {
      const res = await fetch(`${API}${pending.endpoint}`, {
        method: pending.method || 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(pending.body),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success !== false) {
        toast('İcra olundu ✓', 'success');
        setMessages((m) => [...m, { role: 'assistant', text: '✓ Tamamlandı.' }]);
        setPending(null);
      } else { toast(d.message || 'Alınmadı', 'error'); }
    } catch { toast('Xəta baş verdi', 'error'); } finally { setConfirming(false); }
  };

  return (
    <>
      {/* Üzən düymə — yalnız desktop (md+). Mobil-də footer mərkəzi düymədən açılır. */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="AI Köməkçi"
        className="hidden md:flex fixed md:bottom-24 md:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:scale-110 transition-transform items-center justify-center"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
            <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
            <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
          </svg>
        )}
      </button>

      {/* Chat paneli — desktopda sağ altda; mobil-də görünən viewport-a sığır (klaviatura təhlükəsiz) */}
      {open && (
        <div
          style={vp ? { top: vp.top, left: 0, right: 0, height: vp.height, bottom: 'auto', maxHeight: 'none', borderRadius: 0 } : undefined}
          className="fixed z-50 top-2 left-2 right-2 bottom-2 md:top-auto md:left-auto md:bottom-[168px] md:right-6 md:w-[440px] md:h-[78vh] md:max-h-[720px] bg-card border border-card-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Başlıq */}
          <div className="shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <div>
                <div className="font-bold text-sm">AI Köməkçi</div>
                <div className="text-xs opacity-80">Təbii dildə soruş — hər şeyi bacarır</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="close" className="shrink-0 w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Mesajlar */}
          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex min-w-0 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {/* overflow-wrap:anywhere — `break-words` boşluqsuz uzun URL-ləri
                    həmişə kəsmir; bu, hər halda kəsir və balonu daşmadan saxlayır. */}
                <div className={`max-w-[85%] min-w-0 overflow-hidden [overflow-wrap:anywhere] px-3 py-2 rounded-xl text-sm whitespace-pre-line break-words ${
                  msg.role === 'user' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'bg-input-bg text-foreground border border-input-border'
                }`}>
                  {msg.role === 'assistant' ? renderText(msg.text) : msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-input-bg border border-input-border px-3 py-2 rounded-xl text-sm text-muted"><span className="animate-pulse">Düşünürəm…</span></div>
              </div>
            )}
            {/* Təsdiq kartı — AI əməli icra etmir, istifadəçi təsdiqləyir */}
            {pending && (
              <div className="rounded-xl border border-orange-500/40 bg-orange-500/[0.05] p-3">
                <p className="text-xs font-semibold mb-1 flex items-center gap-1">⚠️ Təsdiq tələb olunur</p>
                <p className="text-xs text-muted mb-2">{pending.summary}</p>
                <div className="flex gap-2">
                  <button onClick={confirmAction} disabled={confirming} className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                    {confirming ? 'İcra olunur…' : 'Təsdiqlə'}
                  </button>
                  <button onClick={() => setPending(null)} disabled={confirming} className="px-3 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs">Ləğv</button>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Giriş */}
          {/* Giriş sətri.
              • pb + env(safe-area-inset-bottom): iPhone-da alt "home indicator"
                zolağı ~34px yer tutur; panel tam ekran olduğu üçün göndər düyməsi
                onun altında qalırdı.
              • Düymə `shrink-0` — uzun mətn yazılanda flex onu sıxa bilməsin. */}
          <div className="shrink-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-card-border">
            <div className="flex gap-2 items-end">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                /* Klaviatura açılanda brauzer bəzən sətri görünən sahədən aşağı
                   buraxır — fokusdan sonra özümüz görünürə gətiririk. */
                onFocus={(e) => {
                  const el = e.currentTarget;
                  setTimeout(() => el.scrollIntoView({ block: 'nearest' }), 300);
                }}
                placeholder={t('chatbotPlaceholder') || 'Sualını yaz…'}
                className="flex-1 min-w-0 bg-input-bg border border-input-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-orange-500"
                disabled={loading}
              />
              <button onClick={send} disabled={loading || !input.trim()} aria-label="Göndər"
                className="shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
