"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

export default function MessagesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, token, isLoggedIn, authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activePartner, setActivePartner] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    fetchConversations();
  }, [isLoggedIn, authLoading]);

  // Conversation listəsini hər 8 saniyədə bir yenilə (yeni söhbət üçün)
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      fetch(`${API}/messages/conversations`, { headers })
        .then((r) => r.json())
        .then((d) => setConversations(d.conversations || []))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [isLoggedIn, token]);

  // Aktiv söhbətdəki mesajları hər 3 saniyədə bir yenilə (real-time hissi)
  useEffect(() => {
    if (!activePartner || !isLoggedIn) return;
    const interval = setInterval(() => {
      fetch(`${API}/messages/${activePartner.id}?limit=50`, { headers })
        .then((r) => r.json())
        .then((d) => {
          const incoming = d.messages || [];
          setMessages((prev) => {
            // Yalnız yeni mesaj varsa state-i yenilə (re-render minimum)
            if (prev.length !== incoming.length) {
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
              return incoming;
            }
            const lastNew = incoming[incoming.length - 1];
            const lastPrev = prev[prev.length - 1];
            if (lastNew?.id !== lastPrev?.id) {
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
              return incoming;
            }
            return prev;
          });
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [activePartner, isLoggedIn, token]);

  const fetchConversations = () => {
    setLoading(true);
    fetch(`${API}/messages/conversations`, { headers })
      .then((r) => r.json())
      .then((d) => setConversations(d.conversations || []))
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoading(false));
  };

  const openConversation = (partner: any) => {
    setActivePartner(partner);
    setHasMore(false);
    fetch(`${API}/messages/${partner.id}?limit=50`, { headers })
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages || []);
        setHasMore(d.hasMore || false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        setConversations((prev) =>
          prev.map((c) => c.partner.id === partner.id ? { ...c, unreadCount: 0 } : c)
        );
      })
      .catch(() => { toast(t('error'), 'error'); });
  };

  const loadOlderMessages = () => {
    if (!activePartner || !messages.length || loadingMore) return;
    const oldestId = messages[0]?.id;
    setLoadingMore(true);
    fetch(`${API}/messages/${activePartner.id}?limit=50&before=${oldestId}`, { headers })
      .then((r) => r.json())
      .then((d) => {
        const older = d.messages || [];
        if (older.length > 0) {
          setMessages((prev) => [...older, ...prev]);
        }
        if (older.length < 50) setHasMore(false);
      })
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoadingMore(false));
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !activePartner) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/messages`, {
        method: "POST", headers,
        body: JSON.stringify({ receiverId: activePartner.id, content: newMsg }),
      });
      if (res.ok) {
        setNewMsg("");
        // Re-fetch messages
        const d = await fetch(`${API}/messages/${activePartner.id}`, { headers }).then((r) => r.json());
        setMessages(d.messages || []);
        fetchConversations();
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch { toast(t('error'), 'error'); } finally { setSending(false); }
  };

  if (authLoading || !isLoggedIn) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const typeColor = (type: string) => type === "MECHANIC" ? "from-green-500 to-emerald-600" : type === "PARTS_SELLER" ? "from-purple-500 to-violet-600" : "from-blue-500 to-blue-600";

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">{t("messages")}</h1>

      <div className="bg-card border border-card-border rounded-2xl overflow-hidden flex" style={{ height: "calc(100vh - 180px)", minHeight: 400 }}>
        {/* Conversations List */}
        <div className={`${activePartner ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-80 border-r border-card-border shrink-0`}>
          <div className="p-3 border-b border-card-border">
            <p className="text-sm font-medium text-muted">{t("messages")}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-10 px-4">
                <svg className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                <p className="text-muted text-sm">{t("noMessages")}</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.partner.id}
                  onClick={() => openConversation(conv.partner)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-input-bg/50 transition-colors text-left border-b border-card-border/30 ${
                    activePartner?.id === conv.partner.id ? "bg-input-bg" : ""
                  }`}
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${typeColor(conv.partner.type)} rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                    {conv.partner.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{conv.partner.name}</span>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-muted text-xs truncate">
                      {conv.lastMessage?.content?.slice(0, 40)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${activePartner ? 'flex' : 'hidden sm:flex'} flex-col flex-1`}>
          {activePartner ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-3 border-b border-card-border">
                <button onClick={() => setActivePartner(null)} className="sm:hidden p-1 text-muted hover:text-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className={`w-9 h-9 bg-gradient-to-br ${typeColor(activePartner.type)} rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {activePartner.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <Link href={`/seller/${activePartner.id}`} className="font-medium text-sm hover:text-orange-500 transition-colors">{activePartner.name}</Link>
                  <p className="text-muted text-xs">{activePartner.phone}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {hasMore && (
                  <div className="text-center py-2">
                    <button onClick={loadOlderMessages} disabled={loadingMore}
                      className="text-xs text-orange-500 hover:text-orange-400 disabled:opacity-50">
                      {loadingMore ? (
                        <span className="inline-flex items-center gap-1">
                          <div className="w-3 h-3 border border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </span>
                      ) : "Daha köhnə mesajları yüklə"}
                    </button>
                  </div>
                )}
                {messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm break-words ${
                        isMine
                          ? "bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-br-md"
                          : "bg-input-bg border border-input-border text-foreground rounded-bl-md"
                      }`}>
                        {msg.listing && (
                          <Link href={`/marketplace/${msg.listing.id}`} className={`block text-[10px] mb-1 ${isMine ? 'text-white/70' : 'text-orange-500'} hover:underline`}>
                            {t("messageAbout")}: {msg.listing.title}
                          </Link>
                        )}
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-white/50' : 'text-muted'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-card-border flex gap-2">
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={t("messagePlaceholder")}
                  className="flex-1 px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMsg.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white font-medium text-sm hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50 shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted">
              <div className="text-center">
                <svg className="w-16 h-16 text-muted-foreground/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                <p className="text-sm">{t("noMessages")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
