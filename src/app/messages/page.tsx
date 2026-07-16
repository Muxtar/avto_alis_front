"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { getSocket } from "@/lib/callSocket";
import ContactsPanel from "@/components/ContactsPanel";
import CallModal from "@/components/CallModal";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

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
  const [sideTab, setSideTab] = useState<"chats" | "contacts">("chats");
  const [outgoingCall, setOutgoingCall] = useState<{ partner: any; kind: "audio" | "video"; ts: number } | null>(null);
  // WhatsApp-vari əməliyyatlar
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  // Media (Faza 2)
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [pickerContacts, setPickerContacts] = useState<any[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [videoRecOpen, setVideoRecOpen] = useState(false);
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoSeconds, setVideoSeconds] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePartnerRef = useRef<any>(null);
  const userIdRef = useRef<number | undefined>(undefined);
  const typingSentRef = useRef(false);
  const typingClearRef = useRef<any>(null);
  // Səs yazma
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<any>(null);
  const recordSecondsRef = useRef(0);
  const cancelledRef = useRef(false);
  // Video yazma
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoTimerRef = useRef<any>(null);
  const videoSecondsRef = useRef(0);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => { activePartnerRef.current = activePartner; }, [activePartner]);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);
  // Komponent sökülərkən aktiv media axınlarını dayandır.
  useEffect(() => () => {
    recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    videoStreamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const scrollToEnd = (smooth = true) => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" }), 60);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    fetchConversations();
  }, [isLoggedIn, authLoading]);

  // ── Real-time socket ──
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const socket = getSocket(token);

    const belongsToActive = (m: any) => {
      const ap = activePartnerRef.current; const me = userIdRef.current;
      if (!ap) return false;
      return (m.senderId === ap.id && m.receiverId === me) || (m.senderId === me && m.receiverId === ap.id);
    };
    const upsert = (m: any) => setMessages((prev) => {
      const i = prev.findIndex((x) => x.id === m.id);
      if (i >= 0) { const cp = [...prev]; cp[i] = { ...cp[i], ...m }; return cp; }
      return [...prev, m];
    });

    const onMessage = (m: any) => { if (belongsToActive(m)) { upsert(m); scrollToEnd(); } fetchConversations(); };
    const onUpdated = (m: any) => { if (belongsToActive(m)) upsert(m); };
    const onDeleted = (p: { id: number; deletedAt: string }) => setMessages((prev) => prev.map((x) => x.id === p.id ? { ...x, deletedAt: p.deletedAt, content: "", reactions: [], type: "TEXT" } : x));
    const onReaction = (p: { id: number; reactions: any[] }) => setMessages((prev) => prev.map((x) => x.id === p.id ? { ...x, reactions: p.reactions } : x));
    const onRead = (p: { by: number }) => { const ap = activePartnerRef.current; if (ap && p.by === ap.id) setMessages((prev) => prev.map((x) => x.senderId === userIdRef.current ? { ...x, read: true } : x)); };
    const onDelivered = (p: { ids: number[] }) => setMessages((prev) => prev.map((x) => p.ids.includes(x.id) ? { ...x, deliveredAt: x.deliveredAt || new Date().toISOString() } : x));
    const onTyping = (p: { from: number }) => { const ap = activePartnerRef.current; if (ap && p.from === ap.id) { setPartnerTyping(true); clearTimeout(typingClearRef.current); typingClearRef.current = setTimeout(() => setPartnerTyping(false), 4000); } };
    const onStopTyping = (p: { from: number }) => { const ap = activePartnerRef.current; if (ap && p.from === ap.id) setPartnerTyping(false); };

    socket.on("chat:message", onMessage);
    socket.on("chat:updated", onUpdated);
    socket.on("chat:deleted", onDeleted);
    socket.on("chat:reaction", onReaction);
    socket.on("chat:read", onRead);
    socket.on("chat:delivered", onDelivered);
    socket.on("chat:typing", onTyping);
    socket.on("chat:stopTyping", onStopTyping);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:updated", onUpdated);
      socket.off("chat:deleted", onDeleted);
      socket.off("chat:reaction", onReaction);
      socket.off("chat:read", onRead);
      socket.off("chat:delivered", onDelivered);
      socket.off("chat:typing", onTyping);
      socket.off("chat:stopTyping", onStopTyping);
    };
  }, [isLoggedIn, token]);

  // Söhbət siyahısı ehtiyat yeniləmə (socket əsasdır)
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      fetch(`${API}/messages/conversations`, { headers })
        .then((r) => r.json()).then((d) => setConversations(d.conversations || [])).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [isLoggedIn, token]);

  const fetchConversations = () => {
    fetch(`${API}/messages/conversations`, { headers })
      .then((r) => r.json()).then((d) => setConversations(d.conversations || [])).catch(() => {}).finally(() => setLoading(false));
  };

  const openConversation = (partner: any) => {
    setActivePartner(partner);
    setHasMore(false);
    setReplyTo(null); setEditingMsg(null); setSelectedMsg(null); setPartnerTyping(false); setAttachOpen(false);
    fetch(`${API}/messages/${partner.id}?limit=50`, { headers })
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages || []);
        setHasMore(d.hasMore || false);
        scrollToEnd(false);
        setConversations((prev) => prev.map((c) => c.partner.id === partner.id ? { ...c, unreadCount: 0 } : c));
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
        if (older.length > 0) setMessages((prev) => [...older, ...prev]);
        if (older.length < 50) setHasMore(false);
      })
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoadingMore(false));
  };

  const emitTyping = () => {
    const socket = token ? getSocket(token) : null;
    if (!socket || !activePartner) return;
    if (!typingSentRef.current) { socket.emit("chat:typing", { to: activePartner.id }); typingSentRef.current = true; }
    clearTimeout(typingClearRef.current);
    typingClearRef.current = setTimeout(() => { socket.emit("chat:stopTyping", { to: activePartner.id }); typingSentRef.current = false; }, 2500);
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !activePartner) return;
    setSending(true);
    try {
      if (editingMsg) {
        const res = await fetch(`${API}/messages/${editingMsg.id}`, { method: "PATCH", headers, body: JSON.stringify({ content: newMsg }) });
        const d = await res.json();
        if (res.ok && d.success) { setMessages((prev) => prev.map((x) => x.id === editingMsg.id ? d.message : x)); setEditingMsg(null); setNewMsg(""); }
        else toast(d.message || t('error'), 'error');
      } else {
        const res = await fetch(`${API}/messages`, {
          method: "POST", headers,
          body: JSON.stringify({ receiverId: activePartner.id, content: newMsg, replyToId: replyTo?.id }),
        });
        const d = await res.json();
        if (res.ok && d.success) {
          setNewMsg(""); setReplyTo(null);
          setMessages((prev) => prev.some((x) => x.id === d.message.id) ? prev : [...prev, d.message]);
          scrollToEnd(); fetchConversations();
        } else toast(d.message || t('error'), 'error');
      }
      const socket = token ? getSocket(token) : null;
      socket?.emit("chat:stopTyping", { to: activePartner.id }); typingSentRef.current = false;
    } catch { toast(t('error'), 'error'); } finally { setSending(false); }
  };

  // ── Media göndərmə ──
  const sendMedia = async (file: File, type: string, duration = 0) => {
    if (!activePartner) return;
    setAttachOpen(false); setUploadingMedia(true);
    try {
      const fd = new FormData();
      fd.append("media", file);
      fd.append("receiverId", String(activePartner.id));
      fd.append("type", type);
      if (duration) fd.append("duration", String(duration));
      if (replyTo) fd.append("replyToId", String(replyTo.id));
      const res = await fetch(`${API}/messages/media`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const d = await res.json();
      if (res.ok && d.success) { setMessages((prev) => prev.some((x) => x.id === d.message.id) ? prev : [...prev, d.message]); setReplyTo(null); scrollToEnd(); fetchConversations(); }
      else toast(d.message || t('error'), 'error');
    } catch { toast(t('error'), 'error'); } finally { setUploadingMedia(false); }
  };
  const onPickImage = (f: File | null) => { if (f) sendMedia(f, "IMAGE"); };
  const onPickFile = (f: File | null) => { if (f) sendMedia(f, "FILE"); };

  // Kontakt paylaşma
  const openContactPicker = () => {
    setAttachOpen(false);
    fetch(`${API}/me/contacts`, { headers }).then((r) => r.json())
      .then((d) => { setPickerContacts(d.contacts || (Array.isArray(d) ? d : [])); setContactPickerOpen(true); })
      .catch(() => toast(t('error'), 'error'));
  };
  const sendContact = async (c: any) => {
    setContactPickerOpen(false);
    if (!activePartner) return;
    try {
      const res = await fetch(`${API}/messages/contact`, { method: "POST", headers, body: JSON.stringify({ receiverId: activePartner.id, contactName: c.name, contactPhone: c.phone, contactUserId: c.user?.id || null, replyToId: replyTo?.id }) });
      const d = await res.json();
      if (res.ok && d.success) { setMessages((prev) => [...prev, d.message]); setReplyTo(null); scrollToEnd(); fetchConversations(); }
      else toast(d.message || t('error'), 'error');
    } catch { toast(t('error'), 'error'); }
  };

  // Səs mesajı
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream; chunksRef.current = []; cancelledRef.current = false;
      const mr = new MediaRecorder(stream);
      recorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        recordStreamRef.current?.getTracks().forEach((t) => t.stop()); recordStreamRef.current = null;
        clearInterval(recordTimerRef.current);
        const secs = recordSecondsRef.current;
        setRecording(false); setRecordSeconds(0);
        if (cancelledRef.current || !chunksRef.current.length) return;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        sendMedia(new File([blob], `voice-${Date.now()}.webm`, { type: blob.type }), "AUDIO", secs);
      };
      mr.start();
      setRecording(true); setRecordSeconds(0); recordSecondsRef.current = 0;
      recordTimerRef.current = setInterval(() => { recordSecondsRef.current += 1; setRecordSeconds((s) => s + 1); }, 1000);
    } catch { toast("Mikrofon icazəsi verilmədi", "error"); }
  };
  const stopVoiceSend = () => { cancelledRef.current = false; recorderRef.current?.stop(); };
  const cancelVoice = () => { cancelledRef.current = true; recorderRef.current?.stop(); };

  // Video mesaj (video note)
  const openVideoRec = async () => {
    setAttachOpen(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      videoStreamRef.current = stream; setVideoRecOpen(true);
      setTimeout(() => { if (videoPreviewRef.current) { videoPreviewRef.current.srcObject = stream; videoPreviewRef.current.play().catch(() => {}); } }, 60);
    } catch { toast("Kamera icazəsi verilmədi", "error"); }
  };
  const startVideoRec = () => {
    const stream = videoStreamRef.current; if (!stream) return;
    videoChunksRef.current = [];
    const mr = new MediaRecorder(stream);
    videoRecorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size) videoChunksRef.current.push(e.data); };
    mr.onstop = () => {
      const secs = videoSecondsRef.current;
      const blob = new Blob(videoChunksRef.current, { type: mr.mimeType || "video/webm" });
      videoStreamRef.current?.getTracks().forEach((t) => t.stop()); videoStreamRef.current = null;
      clearInterval(videoTimerRef.current);
      setVideoRecOpen(false); setVideoRecording(false); setVideoSeconds(0);
      if (videoChunksRef.current.length) sendMedia(new File([blob], `video-${Date.now()}.webm`, { type: blob.type }), "VIDEO", secs);
    };
    mr.start();
    setVideoRecording(true); setVideoSeconds(0); videoSecondsRef.current = 0;
    videoTimerRef.current = setInterval(() => { videoSecondsRef.current += 1; setVideoSeconds((s) => s + 1); if (videoSecondsRef.current >= 30) stopVideoSend(); }, 1000);
  };
  const stopVideoSend = () => { videoRecorderRef.current?.stop(); };
  const closeVideoRec = () => { videoStreamRef.current?.getTracks().forEach((t) => t.stop()); videoStreamRef.current = null; setVideoRecOpen(false); setVideoRecording(false); setVideoSeconds(0); };

  const startEdit = (msg: any) => { setEditingMsg(msg); setReplyTo(null); setNewMsg(msg.content); setSelectedMsg(null); setTimeout(() => inputRef.current?.focus(), 50); };
  const startReply = (msg: any) => { setReplyTo(msg); setEditingMsg(null); setSelectedMsg(null); setTimeout(() => inputRef.current?.focus(), 50); };

  const deleteMessage = async (msg: any) => {
    setSelectedMsg(null);
    if (!confirm("Bu mesajı hamı üçün silmək istəyirsiniz?")) return;
    try {
      const res = await fetch(`${API}/messages/${msg.id}`, { method: "DELETE", headers });
      if (res.ok) setMessages((prev) => prev.map((x) => x.id === msg.id ? { ...x, deletedAt: new Date().toISOString(), content: "", reactions: [], type: "TEXT" } : x));
      else toast(t('error'), 'error');
    } catch { toast(t('error'), 'error'); }
  };

  const reactToMessage = async (msg: any, emoji: string) => {
    setSelectedMsg(null);
    try {
      const res = await fetch(`${API}/messages/${msg.id}/react`, { method: "POST", headers, body: JSON.stringify({ emoji }) });
      const d = await res.json();
      if (res.ok && d.success) setMessages((prev) => prev.map((x) => x.id === msg.id ? { ...x, reactions: d.reactions } : x));
    } catch { toast(t('error'), 'error'); }
  };

  if (authLoading || !isLoggedIn) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const typeColor = (type: string) => type === "MECHANIC" ? "from-green-500 to-emerald-600" : type === "PARTS_SELLER" ? "from-purple-500 to-violet-600" : "from-blue-500 to-blue-600";

  const ticks = (msg: any) => {
    if (msg.read) return <span className="text-sky-300" title="Oxundu">✓✓</span>;
    if (msg.deliveredAt) return <span className="opacity-70" title="Çatdırıldı">✓✓</span>;
    return <span className="opacity-70" title="Göndərildi">✓</span>;
  };

  // Söhbət siyahısı / cavab önizləməsi üçün qısa mətn
  const previewText = (m: any) => {
    if (!m) return "";
    if (m.deletedAt) return "🚫 silinmiş mesaj";
    switch (m.type) {
      case "IMAGE": return "📷 Şəkil";
      case "VIDEO": return "🎥 Video mesaj";
      case "AUDIO": return "🎤 Səs mesajı";
      case "FILE": return `📄 ${m.mediaName || "Fayl"}`;
      case "CONTACT": return `👤 ${m.mediaName || "Kontakt"}`;
      default: return m.content?.slice(0, 40) || "";
    }
  };

  const reactionChips = (msg: any) => {
    if (!msg.reactions?.length) return null;
    const counts: Record<string, number> = {};
    let mine = "";
    for (const r of msg.reactions) { counts[r.emoji] = (counts[r.emoji] || 0) + 1; if (r.userId === user?.id) mine = r.emoji; }
    return (
      <div className="flex gap-1 mt-1 flex-wrap">
        {Object.entries(counts).map(([emoji, n]) => (
          <button key={emoji} onClick={() => reactToMessage(msg, emoji)}
            className={`text-[11px] px-1.5 py-0.5 rounded-full border ${mine === emoji ? "bg-orange-500/20 border-orange-500/40" : "bg-input-bg border-input-border"}`}>
            {emoji}{n > 1 ? ` ${n}` : ""}
          </button>
        ))}
      </div>
    );
  };

  // Mesaj gövdəsi — növünə görə (şəkil/video/səs/fayl/kontakt/mətn)
  const renderBody = (msg: any, isMine: boolean, deleted: boolean) => {
    if (deleted) return <p>🚫 Bu mesaj silindi</p>;
    const url = imgUrl(msg.mediaUrl);
    switch (msg.type) {
      case "IMAGE":
        return (<>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="şəkil" onClick={(e) => { e.stopPropagation(); window.open(url, "_blank"); }} className="rounded-xl max-h-64 max-w-full cursor-pointer" />
          {msg.content && <p className="mt-1">{msg.content}</p>}
        </>);
      case "VIDEO":
        return <video src={url} controls playsInline onClick={(e) => e.stopPropagation()} className="rounded-xl max-h-64 max-w-full" />;
      case "AUDIO":
        return <audio src={url} controls onClick={(e) => e.stopPropagation()} className="max-w-[230px]" />;
      case "FILE":
        return (
          <a href={url} target="_blank" rel="noreferrer" download={msg.mediaName} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 hover:underline">
            <span className="text-xl">📄</span>
            <span className="min-w-0"><span className="block truncate max-w-[180px]">{msg.mediaName || "Fayl"}</span>
              {msg.mediaSize ? <span className="text-[10px] opacity-70">{(msg.mediaSize / 1024).toFixed(0)} KB</span> : null}</span>
          </a>
        );
      case "CONTACT":
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">👤</span>
              <div className="min-w-0"><p className="font-semibold truncate">{msg.mediaName}</p><p className="text-[11px] opacity-80">{msg.contactPhone}</p></div>
            </div>
            <div className="flex gap-2 mt-0.5">
              {msg.contactUserId
                ? <button onClick={(e) => { e.stopPropagation(); openConversation({ id: msg.contactUserId, name: msg.mediaName, type: "" }); }} className="text-[11px] underline">💬 Mesaj yaz</button>
                : <a href={`tel:${msg.contactPhone}`} onClick={(e) => e.stopPropagation()} className="text-[11px] underline">📞 Zəng et</a>}
            </div>
          </div>
        );
      default:
        return <p>{msg.content}</p>;
    }
  };

  const canEdit = (m: any) => m?.senderId === user?.id && (!m.type || m.type === "TEXT") && !m.deletedAt;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">{t("messages")}</h1>

      <div className="surface overflow-hidden flex" style={{ height: "calc(100vh - 180px)", minHeight: 400 }}>
        {/* Conversations List */}
        <div className={`${activePartner ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-80 border-r border-card-border shrink-0`}>
          <div className="p-2 border-b border-card-border">
            <div className="grid grid-cols-2 gap-1 bg-input-bg/60 rounded-xl p-1">
              <button onClick={() => setSideTab("chats")}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${sideTab === "chats" ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>
                💬 {t("messages")}
              </button>
              <button onClick={() => setSideTab("contacts")}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${sideTab === "contacts" ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>
                👥 Kontaktlar
              </button>
            </div>
          </div>

          {sideTab === "contacts" ? (
            <ContactsPanel onMessage={(u) => { setSideTab("chats"); openConversation({ id: u.id, name: u.name, type: "" }); }} />
          ) : (
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
                <button key={conv.partner.id} onClick={() => openConversation(conv.partner)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-input-bg/50 transition-colors text-left border-b border-card-border/30 ${activePartner?.id === conv.partner.id ? "bg-input-bg" : ""}`}>
                  <div className={`w-10 h-10 bg-gradient-to-br ${typeColor(conv.partner.type)} rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                    {conv.partner.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate flex items-center gap-1">
                        {conv.lastMessage?.consultationId && <span title="Rəy konsultasiyası">🗣️</span>}
                        {conv.partner.name}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">{conv.unreadCount}</span>
                      )}
                    </div>
                    <p className="text-muted text-xs truncate">{previewText(conv.lastMessage)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          )}
        </div>

        {/* Chat Area */}
        <div className={`${activePartner ? 'flex' : 'hidden sm:flex'} flex-col flex-1`}>
          {activePartner ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 p-3 border-b border-card-border">
                <button onClick={() => setActivePartner(null)} className="sm:hidden p-1 text-muted hover:text-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className={`w-9 h-9 bg-gradient-to-br ${typeColor(activePartner.type)} rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {activePartner.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/seller/${activePartner.id}`} className="font-medium text-sm hover:text-orange-500 transition-colors">{activePartner.name}</Link>
                  <p className="text-muted text-xs h-4">{partnerTyping ? <span className="text-orange-500">yazır...</span> : activePartner.phone}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => setOutgoingCall({ partner: activePartner, kind: "audio", ts: Date.now() })} title="Səsli zəng"
                    className="w-9 h-9 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500/20 transition-colors">📞</button>
                  <button onClick={() => setOutgoingCall({ partner: activePartner, kind: "video", ts: Date.now() })} title="Görüntülü zəng"
                    className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500/20 transition-colors">🎥</button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {hasMore && (
                  <div className="text-center py-2">
                    <button onClick={loadOlderMessages} disabled={loadingMore} className="text-xs text-orange-500 hover:text-orange-400 disabled:opacity-50">
                      {loadingMore ? <span className="inline-flex items-center gap-1"><div className="w-3 h-3 border border-orange-500 border-t-transparent rounded-full animate-spin" /></span> : "Daha köhnə mesajları yüklə"}
                    </button>
                  </div>
                )}
                {messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  const deleted = !!msg.deletedAt;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[75%]">
                        <div onClick={() => !deleted && setSelectedMsg(selectedMsg?.id === msg.id ? null : msg)}
                          className={`px-3.5 py-2.5 rounded-2xl text-sm break-words cursor-pointer ${
                            deleted ? "bg-input-bg/50 border border-input-border text-muted italic"
                              : isMine ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-br-md"
                              : "bg-input-bg border border-input-border text-foreground rounded-bl-md"}`}>
                          {msg.replyTo && !deleted && (
                            <div className={`text-[11px] mb-1 px-2 py-1 rounded-lg border-l-2 ${isMine ? "bg-white/15 border-white/50" : "bg-orange-500/10 border-orange-500/50"}`}>
                              {previewText(msg.replyTo)}
                            </div>
                          )}
                          {msg.listing && !deleted && (
                            <Link href={`/marketplace/${msg.listing.id}`} onClick={(e) => e.stopPropagation()} className={`block text-[10px] mb-1 ${isMine ? 'text-white/70' : 'text-orange-500'} hover:underline`}>
                              {t("messageAbout")}: {msg.listing.title}
                            </Link>
                          )}
                          {msg.consultationId && !deleted && (
                            <Link href={`/consultations/${msg.consultationId}`} onClick={(e) => e.stopPropagation()} className={`block text-[10px] mb-1 ${isMine ? 'text-white/70' : 'text-orange-500'} hover:underline`}>
                              🗣️ Rəy konsultasiyası — aç
                            </Link>
                          )}
                          {renderBody(msg, isMine, deleted)}
                          <p className={`text-[10px] mt-1 flex items-center gap-1 ${isMine ? 'text-white/50 justify-end' : 'text-muted'}`}>
                            {msg.editedAt && !deleted && <span title="Redaktə edilib">redaktə</span>}
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {isMine && !deleted && ticks(msg)}
                          </p>
                        </div>
                        {reactionChips(msg)}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Cavab / redaktə banneri */}
              {(replyTo || editingMsg) && (
                <div className="px-3 pt-2 flex items-center gap-2 border-t border-card-border">
                  <div className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-lg bg-input-bg border-l-2 border-orange-500">
                    <span className="text-orange-500 font-semibold">{editingMsg ? "✏️ Redaktə edilir" : "↩︎ Cavab"}</span>
                    <span className="text-muted truncate block">{previewText(editingMsg || replyTo)}</span>
                  </div>
                  <button onClick={() => { setReplyTo(null); setEditingMsg(null); setNewMsg(""); }} className="text-muted hover:text-foreground text-lg px-1">✕</button>
                </div>
              )}

              {/* Input / media panel */}
              <div className="p-3 border-t border-card-border">
                {recording ? (
                  <div className="flex items-center gap-3">
                    <button onClick={cancelVoice} className="text-red-500 text-sm font-medium">✕ Ləğv</button>
                    <span className="flex-1 flex items-center gap-2 text-sm text-red-500"><span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> Səs yazılır · {fmtSecs(recordSeconds)}</span>
                    <button onClick={stopVoiceSend} className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center relative">
                    <button onClick={() => setAttachOpen((v) => !v)} title="Əlavə et" className="w-10 h-10 rounded-xl bg-input-bg border border-input-border flex items-center justify-center text-lg shrink-0">📎</button>
                    {attachOpen && (
                      <div className="absolute bottom-12 left-0 bg-card border border-card-border rounded-xl p-1.5 space-y-0.5 z-20 shadow-lg">
                        <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-input-bg text-sm w-full whitespace-nowrap">🖼️ Şəkil</button>
                        <button onClick={openVideoRec} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-input-bg text-sm w-full whitespace-nowrap">🎥 Video mesaj</button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-input-bg text-sm w-full whitespace-nowrap">📄 Sənəd / Fayl</button>
                        <button onClick={openContactPicker} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-input-bg text-sm w-full whitespace-nowrap">👤 Kontakt</button>
                      </div>
                    )}
                    <input ref={inputRef} value={newMsg}
                      onChange={(e) => { setNewMsg(e.target.value); emitTyping(); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder={t("messagePlaceholder")}
                      className="flex-1 px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground" />
                    {newMsg.trim() || editingMsg ? (
                      <button onClick={handleSend} disabled={sending} className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                      </button>
                    ) : (
                      <button onClick={startVoice} title="Səs mesajı" className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center text-lg shrink-0">🎤</button>
                    )}
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onPickImage(e.target.files?.[0] || null); e.target.value = ""; }} />
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { onPickFile(e.target.files?.[0] || null); e.target.value = ""; }} />
                  </div>
                )}
                {uploadingMedia && <p className="text-[11px] text-muted mt-1">📤 Yüklənir…</p>}
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

      {/* Mesaj əməliyyat menyusu */}
      {selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setSelectedMsg(null)}>
          <div className="bg-card border border-card-border rounded-t-2xl sm:rounded-2xl w-full sm:w-80 p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-around py-1">
              {QUICK_REACTIONS.map((emoji) => (
                <button key={emoji} onClick={() => reactToMessage(selectedMsg, emoji)} className="text-2xl hover:scale-125 transition-transform">{emoji}</button>
              ))}
            </div>
            <div className="border-t border-card-border pt-2 space-y-1">
              <button onClick={() => startReply(selectedMsg)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-input-bg text-sm flex items-center gap-2">↩︎ Cavabla</button>
              {canEdit(selectedMsg) && (
                <button onClick={() => startEdit(selectedMsg)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-input-bg text-sm flex items-center gap-2">✏️ Redaktə et</button>
              )}
              {selectedMsg.senderId === user?.id && (
                <button onClick={() => deleteMessage(selectedMsg)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500 text-sm flex items-center gap-2">🗑 Hamı üçün sil</button>
              )}
              <button onClick={() => setSelectedMsg(null)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-input-bg text-sm text-muted flex items-center gap-2">✕ Bağla</button>
            </div>
          </div>
        </div>
      )}

      {/* Kontakt seçici */}
      {contactPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setContactPickerOpen(false)}>
          <div className="bg-card border border-card-border rounded-t-2xl sm:rounded-2xl w-full sm:w-96 max-h-[70vh] overflow-y-auto p-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-2">Kontakt paylaş</p>
            {pickerContacts.length === 0 ? <p className="text-muted text-sm py-6 text-center">Kontakt yoxdur</p> : (
              pickerContacts.map((c) => (
                <button key={c.id} onClick={() => sendContact(c)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-input-bg text-left">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{(c.name || "?").slice(0, 2)}</div>
                  <div className="min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-[11px] text-muted truncate">{c.phone}{c.user ? " · platformada ✓" : ""}</p></div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Video mesaj yazıcı */}
      {videoRecOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="relative bg-black aspect-video">
              <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {videoRecording && <span className="absolute top-2 left-2 text-white text-xs bg-red-500 px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2 h-2 bg-white rounded-full animate-pulse" />{fmtSecs(videoSeconds)}</span>}
            </div>
            <div className="p-3 flex justify-center gap-3">
              {!videoRecording ? (
                <>
                  <button onClick={closeVideoRec} className="px-4 py-2 rounded-xl bg-input-bg border border-input-border text-sm">Bağla</button>
                  <button onClick={startVideoRec} className="px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">● Başlat</button>
                </>
              ) : (
                <button onClick={stopVideoSend} className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold">■ Dayandır və göndər</button>
              )}
            </div>
            <p className="text-center text-[11px] text-muted pb-2">Maksimum 30 saniyə</p>
          </div>
        </div>
      )}

      {/* Səsli/görüntülü zəng modalı */}
      <CallModal outgoing={outgoingCall} onDone={() => setOutgoingCall(null)} />
    </div>
  );
}
