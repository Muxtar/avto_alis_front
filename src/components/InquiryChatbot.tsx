'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { AZ_CITIES } from '@/lib/cities';
import { API } from '@/lib/api';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

export default function InquiryChatbot() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [showCityFilter, setShowCityFilter] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const toggleCity = (city: string) => {
    setSelectedCities((prev) => prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]);
  };

  useEffect(() => {
    if (open && !initialized) {
      setMessages([{ role: 'bot', text: t('chatbotWelcome') }]);
      setInitialized(true);
    }
  }, [open, initialized, t]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mobil footer-dəki mərkəzi düymə bu hadisə ilə chat-i açıb-bağlayır.
  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    window.addEventListener('toggle-inquiry-chat', toggle);
    return () => window.removeEventListener('toggle-inquiry-chat', toggle);
  }, []);

  const send = async () => {
    if (!input.trim() || loading) return;

    if (!token) {
      setMessages(prev => [...prev, { role: 'user', text: input }, { role: 'bot', text: `⚠️ ${t('chatbotLoginRequired')}` }]);
      setInput('');
      return;
    }

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      // Akilli chat endpoint - DeepSeek karar verir: sohbet mi inquiry mi
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: userMsg, cities: selectedCities }),
      });
      const data = await res.json();

      if (!data.success) {
        setMessages(prev => [...prev, { role: 'bot', text: `⚠️ ${data.message || t('error')}` }]);
        setLoading(false);
        return;
      }

      if (data.type === 'chat') {
        // Normal sohbet cevabi
        setMessages(prev => [...prev, { role: 'bot', text: data.reply }]);
      } else if (data.type === 'no_sellers') {
        // Inquiry ama satici bulunamadi
        const analysis = data.aiAnalysis;
        let botText = `🔍 ${analysis?.summary || userMsg}\n\n`;
        botText += `⚠️ ${t('chatbotNoSellers')}`;
        setMessages(prev => [...prev, { role: 'bot', text: botText }]);
      } else if (data.type === 'inquiry') {
        // Basarili inquiry
        const analysis = data.aiAnalysis;
        let botText = `✅ ${t('chatbotSuccess')}\n\n`;
        botText += `🔍 ${t('chatbotAnalysis')}: ${analysis?.summary || userMsg}\n`;
        if (analysis?.vehicleBrand) botText += `🚗 ${t('chatbotVehicle')}: ${analysis.vehicleBrand} ${analysis.vehicleModel || ''}\n`;
        if (analysis?.productType) botText += `📦 ${t('chatbotProduct')}: ${analysis.productType}\n`;
        if (analysis?.category) botText += `📁 ${t('chatbotCategory')}: ${analysis.category}\n`;
        botText += `\n👥 ${data.matchedSellers} ${t('sellersMatched')}.`;
        botText += `\n${t('chatbotViewOffers')}`;
        setMessages(prev => [...prev, { role: 'bot', text: botText }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: `⚠️ ${t('chatbotServerError')}` }]);
    }
    setLoading(false);
  };

  return (
    <>
      {/* Floating Button — yalnız desktop-da (md+). Mobil-də chat footer-dəki
          mərkəzi düymədən açılır, ona görə üzən düymə gizlədilir. */}
      <button
        onClick={() => setOpen(!open)}
        className="hidden md:flex fixed md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg hover:scale-110 transition-transform items-center justify-center"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-[340px] h-[460px] max-h-[calc(100vh-9rem)] bg-card border border-card-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-600 px-4 py-3 text-white flex items-center justify-between gap-2">
            <div>
              <div className="font-bold text-sm">{t('chatbotTitle')}</div>
              <div className="text-xs opacity-80">{t('chatbotSubtitle')}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="close"
              className="shrink-0 w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                      : 'bg-input-bg text-foreground border border-input-border'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-input-bg border border-input-border px-3 py-2 rounded-xl text-sm text-muted">
                  <span className="animate-pulse">{t('chatbotAnalyzing')}</span>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* City filter */}
          <div className="border-t border-card-border">
            <button
              onClick={() => setShowCityFilter((s) => !s)}
              className="w-full px-3 py-2 text-xs text-muted hover:text-foreground flex items-center justify-between"
            >
              <span>📍 {t('chatbotCityFilter')} {selectedCities.length > 0 && `(${selectedCities.length})`}</span>
              <span>{showCityFilter ? '▲' : '▼'}</span>
            </button>
            {showCityFilter && (
              <div className="px-3 pb-2 max-h-32 overflow-y-auto flex flex-wrap gap-1">
                {AZ_CITIES.map((city) => {
                  const active = selectedCities.includes(city);
                  return (
                    <button
                      key={city}
                      onClick={() => toggleCity(city)}
                      className={`text-[11px] px-2 py-1 rounded-full border transition-all ${
                        active
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-input-bg border-input-border text-muted hover:text-foreground'
                      }`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-card-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder={t('chatbotPlaceholder')}
                className="flex-1 bg-input-bg border border-input-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-orange-500"
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
