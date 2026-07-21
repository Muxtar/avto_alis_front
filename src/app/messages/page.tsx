"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { getSocket } from "@/lib/callSocket";
import ContactsPanel from "@/components/ContactsPanel";
import { useCall } from "@/lib/CallContext";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const CHAT_EMOJIS = ["😀","😁","😂","🤣","😊","😍","😘","😎","🤩","🥳","😉","🙂","😇","🤗","🤔","😴","😭","😡","😱","😳","🥰","😜","🤪","😏","🙄","😤","😢","😅","😬","🤯","🤒","🤕","👍","👎","👌","🙏","👏","🙌","💪","🤝","👋","✌️","🤟","🫶","❤️","🧡","💛","💚","💙","💜","🖤","🔥","✨","🎉","🎊","💯","⭐","🌟","💥","💐","🌹","☀️","🌙","⚡","☕","🍰","🍕","🎁","💰","✅","❌","❗","❓","💬","📍","🚗","⚽"];
const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const onlyDigits = (s?: string) => (s || "").replace(/\D/g, "");
// Mətndəki linkləri klikləyilə bilən et — paylaşılan məhsul/profil linkləri açılsın.
function linkify(text: string): React.ReactNode {
  if (!text) return text;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return text.split(/(https?:\/\/[^\s]+)/g).map((p, i) => {
    if (!/^https?:\/\//.test(p)) return <span key={i}>{p}</span>;
    const internal = origin && p.startsWith(origin);
    return <a key={i} href={p} onClick={(e) => e.stopPropagation()} {...(internal ? {} : { target: "_blank", rel: "noreferrer" })} className="underline break-all font-medium">{p}</a>;
  });
}

// Modalları birbaşa <body>-yə render et — mobil tam-ekran chat overlay-inin (fixed, z-70)
// altında qalmasınlar. Bu, stacking-context problemini birdəfəlik həll edir.
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

// Brauzerin dəstəklədiyi ilk yazma formatını seç (Safari/iOS webm dəstəkləmir → mp4).
// Yanlış formatda yazma səs/video göndərməni sındırır.
const AUDIO_MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg;codecs=opus", "audio/ogg"];
const VIDEO_MIME_CANDIDATES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
function extForMime(m: string): string {
  if (/mp4/i.test(m)) return /audio/i.test(m) ? "m4a" : "mp4";
  if (/mpeg/i.test(m)) return "mp3";
  if (/ogg/i.test(m)) return "ogg";
  if (/wav/i.test(m)) return "wav";
  return "webm";
}
function pickRecorderMime(candidates: string[]): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of candidates) {
    try { if (MediaRecorder.isTypeSupported(c)) return c; } catch { /* keç */ }
  }
  return ""; // brauzer default seçsin
}

export default function MessagesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, token, isLoggedIn, authLoading } = useAuth();
  const router = useRouter();
  const [directConvs, setDirectConvs] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null); // { type:'direct'|'group', id, name, phone?, partnerType?, memberCount? }
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sideTab, setSideTab] = useState<"chats" | "contacts">("chats");
  const { startCall, startGroupCall } = useCall();
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [pickerContacts, setPickerContacts] = useState<any[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [videoRecOpen, setVideoRecOpen] = useState(false);
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoSeconds, setVideoSeconds] = useState(0);
  // Qrup (Faza 3)
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSelected, setGroupSelected] = useState<number[]>([]);
  const [groupContacts, setGroupContacts] = useState<any[]>([]);
  const [contactDigits, setContactDigits] = useState<Set<string>>(new Set()); // öz kontaktlarımın nömrələri (rəqəmlər)
  const [infoOpen, setInfoOpen] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [addMemberMode, setAddMemberMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<any>(null);
  const userIdRef = useRef<number | undefined>(undefined);
  const typingSentRef = useRef(false);
  const typingClearRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<any>(null);
  const recordSecondsRef = useRef(0);
  const cancelledRef = useRef(false);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoTimerRef = useRef<any>(null);
  const videoSecondsRef = useRef(0);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);
  useEffect(() => () => {
    recordStreamRef.current?.getTracks().forEach((t) => t.stop());
    videoStreamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // Yalnız mesaj siyahısını aşağı sürüşdür — bütün səhifəni yox (əks halda ekran aşağı tullanır).
  const scrollToEnd = (smooth = true) => setTimeout(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, 60);

  // Chat açıqkən səhifə sürüşməsini kilidlə — mesaj sahəsi sabit qalsın, oynamasın.
  useEffect(() => {
    const b = document.body, h = document.documentElement;
    const pb = b.style.overflow, ph = h.style.overflow, pob = (b.style as any).overscrollBehavior;
    b.style.overflow = "hidden"; h.style.overflow = "hidden"; (b.style as any).overscrollBehavior = "none";
    return () => { b.style.overflow = pb; h.style.overflow = ph; (b.style as any).overscrollBehavior = pob; };
  }, []);

  // Görünən viewport-u CSS dəyişənlərinə köçür (--vvh/--vvt). Mobil aktiv chat bu
  // dəyərlərlə tam ekran overlay kimi yerləşir — bütün telefonlarda eyni davranış,
  // klaviatura/brauzer paneli fərqi olmadan (getBoundingClientRect ölçmə fəndi yoxdur).
  useEffect(() => {
    const vv = (typeof window !== "undefined" ? window.visualViewport : null) as VisualViewport | null;
    const root = document.documentElement;
    let raf = 0;
    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vh = vv ? vv.height : window.innerHeight;
        const offsetTop = vv ? vv.offsetTop : 0;
        root.style.setProperty("--vvh", `${Math.round(vh)}px`);
        root.style.setProperty("--vvt", `${Math.round(offsetTop)}px`);
        // Chat qutusunun hündürlüyü sabit rəqəmlə hesablanırdı (100dvh-180px) —
        // başlıq hündürlüyü dəyişəndə mesaj yazma sahəsi ekranın altında qalırdı.
        // İndi qutunun REAL yuxarı ofseti ölçülür, ona görə başlıq dəyişsə də
        // hesablama özü-özünü düzəldir.
        const box = boxRef.current;
        if (box) {
          const top = box.getBoundingClientRect().top;
          root.style.setProperty("--chat-top", `${Math.max(0, Math.round(top))}px`);
        }
      });
    };
    apply();
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      root.style.removeProperty("--vvh");
      root.style.removeProperty("--vvt");
      root.style.removeProperty("--chat-top");
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    fetchAll();
    // Öz kontaktlarımın nömrələrini yüklə — chat-də "kontakta əlavə et" düyməsini
    // yalnız kontaktda OLMAYAN şəxsdə göstərmək üçün.
    fetch(`${API}/me/contacts`, { headers }).then((r) => r.json())
      .then((d) => { const list = d.contacts || (Array.isArray(d) ? d : []); setContactDigits(new Set(list.map((c: any) => onlyDigits(c.phone)).filter(Boolean))); })
      .catch(() => {});
  }, [isLoggedIn, authLoading]);

  // ── Real-time socket ──
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const socket = getSocket(token);
    const me = () => userIdRef.current;
    const belongs = (m: any) => {
      const a = activeRef.current; if (!a) return false;
      if (a.type === "group") return m.conversationId === a.id;
      return !m.conversationId && ((m.senderId === a.id && m.receiverId === me()) || (m.senderId === me() && m.receiverId === a.id));
    };
    const upsert = (m: any) => setMessages((prev) => {
      const i = prev.findIndex((x) => x.id === m.id);
      if (i >= 0) { const cp = [...prev]; cp[i] = { ...cp[i], ...m }; return cp; }
      return [...prev, m];
    });
    const onMessage = (m: any) => { if (belongs(m)) { upsert(m); scrollToEnd(); } fetchAll(); };
    const onUpdated = (m: any) => { if (belongs(m)) upsert(m); };
    const onDeleted = (p: { id: number }) => setMessages((prev) => prev.map((x) => x.id === p.id ? { ...x, deletedAt: new Date().toISOString(), content: "", reactions: [], type: "TEXT" } : x));
    const onReaction = (p: { id: number; reactions: any[] }) => setMessages((prev) => prev.map((x) => x.id === p.id ? { ...x, reactions: p.reactions } : x));
    const onRead = (p: { by: number }) => { const a = activeRef.current; if (a?.type === "direct" && p.by === a.id) setMessages((prev) => prev.map((x) => x.senderId === me() ? { ...x, read: true } : x)); };
    const onDelivered = (p: { ids: number[] }) => setMessages((prev) => prev.map((x) => p.ids.includes(x.id) ? { ...x, deliveredAt: x.deliveredAt || new Date().toISOString() } : x));
    const onTyping = (p: { from: number }) => { const a = activeRef.current; if (a?.type === "direct" && p.from === a.id) { setPartnerTyping(true); clearTimeout(typingClearRef.current); typingClearRef.current = setTimeout(() => setPartnerTyping(false), 4000); } };
    const onStopTyping = (p: { from: number }) => { const a = activeRef.current; if (a?.type === "direct" && p.from === a.id) setPartnerTyping(false); };
    const onGroupChanged = () => fetchGroups();

    socket.on("chat:message", onMessage);
    socket.on("chat:updated", onUpdated);
    socket.on("chat:deleted", onDeleted);
    socket.on("chat:reaction", onReaction);
    socket.on("chat:read", onRead);
    socket.on("chat:delivered", onDelivered);
    socket.on("chat:typing", onTyping);
    socket.on("chat:stopTyping", onStopTyping);
    socket.on("chat:groupChanged", onGroupChanged);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:updated", onUpdated);
      socket.off("chat:deleted", onDeleted);
      socket.off("chat:reaction", onReaction);
      socket.off("chat:read", onRead);
      socket.off("chat:delivered", onDelivered);
      socket.off("chat:typing", onTyping);
      socket.off("chat:stopTyping", onStopTyping);
      socket.off("chat:groupChanged", onGroupChanged);
    };
  }, [isLoggedIn, token]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => fetchAll(), 15000);
    return () => clearInterval(interval);
  }, [isLoggedIn, token]);

  const fetchDirect = () => fetch(`${API}/messages/conversations`, { headers }).then((r) => r.json()).then((d) => setDirectConvs(d.conversations || [])).catch(() => {});
  const fetchGroups = () => fetch(`${API}/groups`, { headers }).then((r) => r.json()).then((d) => setGroups(d.groups || [])).catch(() => {});
  const fetchAll = () => { fetchDirect(); fetchGroups(); setLoading(false); };

  // Birləşmiş siyahı (1:1 + qruplar), son fəaliyyətə görə sıralı
  const chatList: any[] = [
    ...directConvs.map((c) => ({ type: "direct", id: c.partner.id, name: c.partner.name, partnerType: c.partner.type, phone: c.partner.phone, lastMessage: c.lastMessage, unreadCount: c.unreadCount, lastAt: c.lastMessage?.createdAt })),
    ...groups.map((g) => ({ type: "group", id: g.id, name: g.name, memberCount: g.memberCount, lastMessage: g.lastMessage, unreadCount: g.unreadCount, lastAt: g.lastAt })),
  ].sort((a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime());

  const threadUrl = (chat: any, before?: number) =>
    chat.type === "group"
      ? `${API}/groups/${chat.id}/messages?limit=50${before ? `&before=${before}` : ""}`
      : `${API}/messages/${chat.id}?limit=50${before ? `&before=${before}` : ""}`;

  const openChat = (chat: any) => {
    setActive(chat);
    setHasMore(false); setReplyTo(null); setEditingMsg(null); setSelectedMsg(null); setPartnerTyping(false); setAttachOpen(false); setSideTab("chats");
    fetch(threadUrl(chat), { headers })
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages || []);
        setHasMore(d.hasMore || false);
        if (chat.type === "direct" && d.partner) setActive((a: any) => a && a.id === chat.id ? { ...a, phone: d.partner.phone } : a);
        scrollToEnd(false);
        if (chat.type === "direct") setDirectConvs((prev) => prev.map((c) => c.partner.id === chat.id ? { ...c, unreadCount: 0 } : c));
        else setGroups((prev) => prev.map((g) => g.id === chat.id ? { ...g, unreadCount: 0 } : g));
      })
      .catch(() => { toast(t('error'), 'error'); });
  };

  const loadOlderMessages = () => {
    if (!active || !messages.length || loadingMore) return;
    const oldestId = messages[0]?.id;
    setLoadingMore(true);
    fetch(threadUrl(active, oldestId), { headers })
      .then((r) => r.json())
      .then((d) => {
        const older = d.messages || [];
        if (older.length > 0) setMessages((prev) => [...older, ...prev]);
        if (older.length < 50) setHasMore(false);
      })
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoadingMore(false));
  };

  // Göndərmə hədəfi (1:1 → receiverId, qrup → conversationId)
  const sendTarget = () => active?.type === "group" ? { conversationId: active.id } : { receiverId: active.id };

  const emitTyping = () => {
    const socket = token ? getSocket(token) : null;
    if (!socket || active?.type !== "direct") return;
    if (!typingSentRef.current) { socket.emit("chat:typing", { to: active.id }); typingSentRef.current = true; }
    clearTimeout(typingClearRef.current);
    typingClearRef.current = setTimeout(() => { socket.emit("chat:stopTyping", { to: active.id }); typingSentRef.current = false; }, 2500);
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !active) return;
    setEmojiOpen(false); setAttachOpen(false); // göndərəndən sonra popover-lar bağlansın
    setSending(true);
    try {
      if (editingMsg) {
        const res = await fetch(`${API}/messages/${editingMsg.id}`, { method: "PATCH", headers, body: JSON.stringify({ content: newMsg }) });
        const d = await res.json();
        if (res.ok && d.success) { setMessages((prev) => prev.map((x) => x.id === editingMsg.id ? d.message : x)); setEditingMsg(null); setNewMsg(""); }
        else toast(d.message || t('error'), 'error');
      } else {
        const res = await fetch(`${API}/messages`, { method: "POST", headers, body: JSON.stringify({ ...sendTarget(), content: newMsg, replyToId: replyTo?.id }) });
        const d = await res.json();
        if (res.ok && d.success) {
          setNewMsg(""); setReplyTo(null);
          setMessages((prev) => prev.some((x) => x.id === d.message.id) ? prev : [...prev, d.message]);
          scrollToEnd(); fetchAll();
        } else toast(d.message || t('error'), 'error');
      }
      if (active?.type === "direct") { const socket = token ? getSocket(token) : null; socket?.emit("chat:stopTyping", { to: active.id }); typingSentRef.current = false; }
    } catch { toast(t('error'), 'error'); } finally { setSending(false); }
  };

  const sendMedia = async (file: File, type: string, duration = 0) => {
    if (!active) { toast("Söhbət seçilməyib", "error"); return; }
    if (!file || !file.size) { toast("Fayl boşdur — göndərilmədi", "error"); return; }
    setAttachOpen(false); setUploadingMedia(true);
    try {
      const fd = new FormData();
      fd.append("media", file);
      if (active.type === "group") fd.append("conversationId", String(active.id)); else fd.append("receiverId", String(active.id));
      fd.append("type", type);
      if (duration) fd.append("duration", String(duration));
      if (replyTo) fd.append("replyToId", String(replyTo.id));
      const res = await fetch(`${API}/messages/media`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) { setMessages((prev) => prev.some((x) => x.id === d.message.id) ? prev : [...prev, d.message]); setReplyTo(null); scrollToEnd(); fetchAll(); }
      else toast(d.message || `Göndərilmədi (${res.status})`, 'error');
    } catch { toast("Şəbəkə xətası — media göndərilmədi", 'error'); } finally { setUploadingMedia(false); }
  };
  const onPickImage = (f: File | null) => { if (f) sendMedia(f, "IMAGE"); };
  const onPickFile = (f: File | null) => { if (f) sendMedia(f, "FILE"); };

  // Konum paylaş — cari GPS mövqeyini mesaj kimi göndər.
  const sendLocation = () => {
    setAttachOpen(false);
    if (!active) { toast("Söhbət seçilməyib", "error"); return; }
    if (typeof navigator === "undefined" || !navigator.geolocation) { toast("Cihaz konumu dəstəkləmir", "error"); return; }
    setSendingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const body: any = { ...sendTarget(), latitude: pos.coords.latitude, longitude: pos.coords.longitude, replyToId: replyTo?.id };
          const res = await fetch(`${API}/messages/location`, { method: "POST", headers, body: JSON.stringify(body) });
          const d = await res.json().catch(() => ({}));
          if (res.ok && d.success) { setMessages((prev) => prev.some((x) => x.id === d.message.id) ? prev : [...prev, d.message]); setReplyTo(null); scrollToEnd(); fetchAll(); }
          else toast(d.message || `Göndərilmədi (${res.status})`, "error");
        } catch { toast("Konum göndərilmədi", "error"); } finally { setSendingLocation(false); }
      },
      () => { setSendingLocation(false); toast("Konum icazəsi verilmədi", "error"); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Emoji seçimi — mesaj mətninə əlavə edir.
  const addEmoji = (e: string) => { setNewMsg((m) => m + e); inputRef.current?.focus(); };

  const openContactPicker = () => {
    setAttachOpen(false);
    fetch(`${API}/me/contacts`, { headers }).then((r) => r.json())
      .then((d) => { setPickerContacts(d.contacts || (Array.isArray(d) ? d : [])); setContactPickerOpen(true); })
      .catch(() => toast(t('error'), 'error'));
  };
  const sendContact = async (c: any) => {
    setContactPickerOpen(false);
    if (!active) return;
    try {
      const res = await fetch(`${API}/messages/contact`, { method: "POST", headers, body: JSON.stringify({ ...sendTarget(), contactName: c.name, contactPhone: c.phone, contactUserId: c.user?.id || null, replyToId: replyTo?.id }) });
      const d = await res.json();
      if (res.ok && d.success) { setMessages((prev) => [...prev, d.message]); setReplyTo(null); scrollToEnd(); fetchAll(); }
      else toast(d.message || t('error'), 'error');
    } catch { toast(t('error'), 'error'); }
  };

  // Səs mesajı
  const startVoice = async () => {
    try {
      if (typeof MediaRecorder === "undefined") { toast("Bu brauzer səs yazmağı dəstəkləmir", "error"); return; }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordStreamRef.current = stream; chunksRef.current = []; cancelledRef.current = false;
      const mime = pickRecorderMime(AUDIO_MIME_CANDIDATES);
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        recordStreamRef.current?.getTracks().forEach((t) => t.stop()); recordStreamRef.current = null;
        clearInterval(recordTimerRef.current);
        const secs = recordSecondsRef.current;
        setRecording(false); setRecordSeconds(0);
        if (cancelledRef.current) return;
        // Boş yazma — səssiz uğursuzluq əvəzinə istifadəçiyə bildir.
        if (!chunksRef.current.length) { toast("Səs yazıla bilmədi — yenidən cəhd edin", "error"); return; }
        const outMime = mr.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: outMime });
        if (!blob.size) { toast("Səs yazıla bilmədi — yenidən cəhd edin", "error"); return; }
        sendMedia(new File([blob], `voice-${Date.now()}.${extForMime(outMime)}`, { type: blob.type }), "AUDIO", secs);
      };
      // Timeslice (250ms) — Safari/iOS-da ondataavailable etibarlı işə düşsün deyə.
      mr.start(250);
      setRecording(true); setRecordSeconds(0); recordSecondsRef.current = 0;
      recordTimerRef.current = setInterval(() => { recordSecondsRef.current += 1; setRecordSeconds((s) => s + 1); }, 1000);
    } catch { toast("Mikrofon icazəsi verilmədi", "error"); }
  };
  const stopVoiceSend = () => {
    cancelledRef.current = false;
    const mr = recorderRef.current;
    if (!mr) return;
    // Dayanmadan əvvəl qalan datanı flush et (bəzi brauzerlərdə vacibdir).
    try { if (mr.state === "recording") mr.requestData(); } catch { /* keç */ }
    try { mr.stop(); } catch { /* keç */ }
  };
  const cancelVoice = () => { cancelledRef.current = true; recorderRef.current?.stop(); };

  // Video mesaj
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
    const mime = pickRecorderMime(VIDEO_MIME_CANDIDATES);
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    videoRecorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data.size) videoChunksRef.current.push(e.data); };
    mr.onstop = () => {
      const secs = videoSecondsRef.current;
      const outMime = mr.mimeType || mime || "video/webm";
      const blob = new Blob(videoChunksRef.current, { type: outMime });
      videoStreamRef.current?.getTracks().forEach((t) => t.stop()); videoStreamRef.current = null;
      clearInterval(videoTimerRef.current);
      setVideoRecOpen(false); setVideoRecording(false); setVideoSeconds(0);
      if (videoChunksRef.current.length) sendMedia(new File([blob], `video-${Date.now()}.${extForMime(outMime)}`, { type: blob.type }), "VIDEO", secs);
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
  // Yalnız məndə sil — mesaj yalnız bu istifadəçidən itir (qarşı tərəfdə qalır).
  const hideMessage = async (msg: any) => {
    setSelectedMsg(null);
    try {
      const res = await fetch(`${API}/messages/${msg.id}/hide`, { method: "POST", headers });
      if (res.ok) setMessages((prev) => prev.filter((x) => x.id !== msg.id));
      else toast(t('error'), 'error');
    } catch { toast(t('error'), 'error'); }
  };
  // Söhbəti sil (məndə) — şəxs/qrup siyahıdan çıxır, bütün mesajlar məndə gizlənir.
  const deleteThread = async (chat: any) => {
    if (!confirm(`"${chat.name}" ilə söhbət sizdə silinsin? (Qarşı tərəfdə qalacaq)`)) return;
    try {
      const url = chat.type === "group" ? `${API}/messages/group/${chat.id}` : `${API}/messages/thread/${chat.id}`;
      const res = await fetch(url, { method: "DELETE", headers });
      if (res.ok) {
        if (chat.type === "group") setGroups((prev) => prev.filter((g) => g.id !== chat.id));
        else setDirectConvs((prev) => prev.filter((c) => c.partner.id !== chat.id));
        if (active && active.type === chat.type && active.id === chat.id) { setActive(null); setMessages([]); }
        toast("Söhbət silindi", "success");
      } else toast(t('error'), 'error');
    } catch { toast(t('error'), 'error'); }
  };
  // Söhbətdəki şəxsi kontaktlarıma əlavə et (kontaktda deyilsə).
  const saveContact = async () => {
    if (!active || active.type !== "direct" || !active.phone) return;
    try {
      const res = await fetch(`${API}/me/contacts`, { method: "POST", headers, body: JSON.stringify({ name: active.name, phone: active.phone }) });
      const d = await res.json();
      if (res.ok && d.success) {
        setContactDigits((s) => new Set(s).add(onlyDigits(active.phone)));
        toast("Kontaktlara əlavə edildi ✓", "success");
      } else toast(d.message || t('error'), 'error');
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

  // ── Qrup əməliyyatları ──
  const openGroupModal = () => {
    setGroupName(""); setGroupSelected([]);
    fetch(`${API}/me/contacts`, { headers }).then((r) => r.json())
      .then((d) => { const list = d.contacts || (Array.isArray(d) ? d : []); setGroupContacts(list.filter((c: any) => c.user)); setGroupModalOpen(true); })
      .catch(() => toast(t('error'), 'error'));
  };
  const toggleGroupMember = (uid: number) => setGroupSelected((prev) => prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]);
  const createGroup = async () => {
    if (!groupName.trim()) { toast("Qrup adı yazın", "error"); return; }
    try {
      const res = await fetch(`${API}/groups`, { method: "POST", headers, body: JSON.stringify({ name: groupName.trim(), memberIds: groupSelected }) });
      const d = await res.json();
      if (res.ok && d.success) { setGroupModalOpen(false); fetchGroups(); openChat({ type: "group", id: d.group.id, name: d.group.name, memberCount: d.group.members.length }); }
      else toast(d.message || t('error'), 'error');
    } catch { toast(t('error'), 'error'); }
  };
  const openInfo = () => {
    if (active?.type !== "group") return;
    // Qrup məlumatı + kontaktları paralel yüklə (üzv əlavə etmək üçün kontakt siyahısı lazımdır).
    fetch(`${API}/groups/${active.id}`, { headers }).then((r) => r.json())
      .then((d) => { if (d.success) { setGroupInfo(d.group); setAddMemberMode(false); setInfoOpen(true); } })
      .catch(() => toast(t('error'), 'error'));
    fetch(`${API}/me/contacts`, { headers }).then((r) => r.json())
      .then((d) => { const list = d.contacts || (Array.isArray(d) ? d : []); setGroupContacts(list.filter((c: any) => c.user)); })
      .catch(() => {});
  };
  const amIAdmin = () => groupInfo?.members?.find((m: any) => m.userId === user?.id)?.role === "ADMIN";
  const removeMember = async (uid: number) => {
    if (!groupInfo) return;
    try {
      const res = await fetch(`${API}/groups/${groupInfo.id}/members/${uid}`, { method: "DELETE", headers });
      if (res.ok) { const d = await fetch(`${API}/groups/${groupInfo.id}`, { headers }).then((r) => r.json()); setGroupInfo(d.group); fetchGroups(); }
      else toast(t('error'), 'error');
    } catch { toast(t('error'), 'error'); }
  };
  const addMember = async (uid: number) => {
    if (!groupInfo) return;
    try {
      const res = await fetch(`${API}/groups/${groupInfo.id}/members`, { method: "POST", headers, body: JSON.stringify({ memberIds: [uid] }) });
      const d = await res.json();
      if (res.ok && d.success) { setGroupInfo(d.group); fetchGroups(); }
      else toast(d.message || t('error'), 'error');
    } catch { toast(t('error'), 'error'); }
  };
  const setMemberRole = async (uid: number, role: "ADMIN" | "MEMBER") => {
    if (!groupInfo) return;
    try {
      const res = await fetch(`${API}/groups/${groupInfo.id}/members/${uid}`, { method: "PATCH", headers, body: JSON.stringify({ role }) });
      const d = await res.json();
      if (res.ok && d.success) { setGroupInfo(d.group); fetchGroups(); }
      else toast(d.message || t('error'), 'error');
    } catch { toast(t('error'), 'error'); }
  };
  const leaveGroup = async () => {
    if (!groupInfo || !user) return;
    if (!confirm("Qrupdan çıxmaq istəyirsiniz?")) return;
    try {
      const res = await fetch(`${API}/groups/${groupInfo.id}/members/${user.id}`, { method: "DELETE", headers });
      if (res.ok) { setInfoOpen(false); setActive(null); setMessages([]); fetchGroups(); }
      else toast(t('error'), 'error');
    } catch { toast(t('error'), 'error'); }
  };
  const renameGroup = async () => {
    if (!groupInfo) return;
    const name = prompt("Yeni qrup adı:", groupInfo.name);
    if (!name?.trim()) return;
    try {
      const res = await fetch(`${API}/groups/${groupInfo.id}`, { method: "PATCH", headers, body: JSON.stringify({ name: name.trim() }) });
      const d = await res.json();
      if (res.ok && d.success) { setGroupInfo(d.group); setActive((a: any) => a ? { ...a, name: name.trim() } : a); fetchGroups(); }
      else toast(d.message || t('error'), 'error');
    } catch { toast(t('error'), 'error'); }
  };

  if (authLoading || !isLoggedIn) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const typeColor = (type: string) => type === "MECHANIC" ? "from-green-500 to-emerald-600" : type === "PARTS_SELLER" ? "from-purple-500 to-violet-600" : "from-blue-500 to-blue-600";
  const initials = (n: string) => (n || "?").split(" ").map((x) => x[0]).join("").slice(0, 2);

  const ticks = (msg: any) => {
    if (msg.read) return <span className="text-sky-300" title="Oxundu">✓✓</span>;
    if (msg.deliveredAt) return <span className="opacity-70" title="Çatdırıldı">✓✓</span>;
    return <span className="opacity-70" title="Göndərildi">✓</span>;
  };

  const previewText = (m: any) => {
    if (!m) return "";
    if (m.deletedAt) return "🚫 silinmiş mesaj";
    switch (m.type) {
      case "IMAGE": return "📷 Şəkil";
      case "VIDEO": return "🎥 Video mesaj";
      case "AUDIO": return "🎤 Səs mesajı";
      case "FILE": return `📄 ${m.mediaName || "Fayl"}`;
      case "CONTACT": return `👤 ${m.mediaName || "Kontakt"}`;
      case "LOCATION": return "📍 Konum";
      default: return m.content?.slice(0, 40) || "";
    }
  };

  const reactionChips = (msg: any) => {
    if (!msg.reactions?.length) return null;
    const counts: Record<string, number> = {}; let mine = "";
    for (const r of msg.reactions) { counts[r.emoji] = (counts[r.emoji] || 0) + 1; if (r.userId === user?.id) mine = r.emoji; }
    return (
      <div className="flex gap-1 mt-1 flex-wrap">
        {Object.entries(counts).map(([emoji, n]) => (
          <button key={emoji} onClick={() => reactToMessage(msg, emoji)} className={`text-[11px] px-1.5 py-0.5 rounded-full border ${mine === emoji ? "bg-orange-500/20 border-orange-500/40" : "bg-input-bg border-input-border"}`}>
            {emoji}{n > 1 ? ` ${n}` : ""}
          </button>
        ))}
      </div>
    );
  };

  const renderBody = (msg: any, deleted: boolean) => {
    if (deleted) return <p>🚫 Bu mesaj silindi</p>;
    const url = imgUrl(msg.mediaUrl);
    switch (msg.type) {
      case "IMAGE": return (<>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="şəkil" onClick={(e) => { e.stopPropagation(); window.open(url, "_blank"); }} className="rounded-xl max-h-64 max-w-full cursor-pointer" />
        {msg.content && <p className="mt-1">{msg.content}</p>}
      </>);
      case "VIDEO": return (<>
        <video src={url} controls playsInline onClick={(e) => e.stopPropagation()} className="rounded-xl max-h-64 max-w-full" />
        {msg.content && <p className="mt-1">{msg.content}</p>}
      </>);
      case "AUDIO": return (<>
        <audio src={url} controls onClick={(e) => e.stopPropagation()} className="max-w-[230px]" />
        {msg.content && <p className="mt-1">{msg.content}</p>}
      </>);
      case "FILE": return (
        <a href={url} target="_blank" rel="noreferrer" download={msg.mediaName} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 hover:underline">
          <span className="text-xl">📄</span>
          <span className="min-w-0"><span className="block truncate max-w-[180px]">{msg.mediaName || "Fayl"}</span>{msg.mediaSize ? <span className="text-[10px] opacity-70">{(msg.mediaSize / 1024).toFixed(0)} KB</span> : null}{msg.content ? <span className="block mt-0.5">{msg.content}</span> : null}</span>
        </a>
      );
      case "CONTACT": return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2"><span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">👤</span>
            <div className="min-w-0"><p className="font-semibold truncate">{msg.mediaName}</p><p className="text-[11px] opacity-80">{msg.contactPhone}</p></div></div>
          <div className="flex gap-2 mt-0.5">
            {msg.contactUserId ? <button onClick={(e) => { e.stopPropagation(); openChat({ type: "direct", id: msg.contactUserId, name: msg.mediaName }); }} className="text-[11px] underline">💬 Chat</button>
              : <a href={`tel:${msg.contactPhone}`} onClick={(e) => e.stopPropagation()} className="text-[11px] underline">📞 Zəng et</a>}
          </div>
        </div>
      );
      case "LOCATION": {
        const lat = msg.latitude, lng = msg.longitude;
        const mapsHref = `https://www.google.com/maps?q=${lat},${lng}`;
        return (
          <a href={mapsHref} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 w-[230px] max-w-full">
            <span className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">📍</span>
            <span className="min-w-0">
              <span className="block font-semibold">Paylaşılan konum</span>
              <span className="block text-[11px] opacity-80 underline">Xəritədə aç</span>
              {msg.content ? <span className="block text-[11px] opacity-80 truncate">{msg.content}</span>
                : <span className="block text-[10px] opacity-70">{Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</span>}
            </span>
          </a>
        );
      }
      default: return <p className="whitespace-pre-wrap break-words">{linkify(msg.content)}</p>;
    }
  };

  // Mətn + media (şəkil/video/səs/fayl) redaktə oluna bilər — media üçün başlıq (caption) dəyişir.
  const canEdit = (m: any) => m?.senderId === user?.id && !m.deletedAt && (!m.type || ["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE"].includes(m.type));

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">{t("messages")}</h1>

      <div ref={boxRef} className={`surface overflow-hidden flex chat-shell ${active ? "chat-active-mobile" : ""}`}>
        {/* Sol panel */}
        <div className={`${active ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-80 border-r border-card-border shrink-0`}>
          <div className="p-2 border-b border-card-border">
            <div className="grid grid-cols-2 gap-1 bg-input-bg/60 rounded-xl p-1">
              <button onClick={() => setSideTab("chats")} className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${sideTab === "chats" ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>💬 {t("messages")}</button>
              <button onClick={() => setSideTab("contacts")} className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${sideTab === "contacts" ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>👥 Kontaktlar</button>
            </div>
            {sideTab === "chats" && (
              <button onClick={openGroupModal} className="mt-2 w-full py-1.5 rounded-lg text-xs font-semibold bg-input-bg border border-input-border hover:bg-input-bg/70 flex items-center justify-center gap-1">➕ Yeni qrup</button>
            )}
          </div>

          {sideTab === "contacts" ? (
            <ContactsPanel onMessage={(u) => openChat({ type: "direct", id: u.id, name: u.name })} />
          ) : (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : chatList.length === 0 ? (
              <div className="text-center py-10 px-4"><p className="text-muted text-sm">{t("noMessages")}</p></div>
            ) : (
              chatList.map((chat) => (
                <div key={`${chat.type}-${chat.id}`} role="button" tabIndex={0} onClick={() => openChat(chat)}
                  className={`group w-full flex items-center gap-3 p-3 hover:bg-input-bg/50 transition-colors text-left border-b border-card-border/30 cursor-pointer ${active?.type === chat.type && active?.id === chat.id ? "bg-input-bg" : ""}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 ${chat.type === "group" ? "bg-gradient-to-br from-teal-500 to-cyan-600" : `bg-gradient-to-br ${typeColor(chat.partnerType)}`}`}>
                    {chat.type === "group" ? "👥" : initials(chat.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate flex items-center gap-1">
                        {chat.type !== "group" && chat.lastMessage?.consultationId && <span title="Rəy konsultasiyası">🗣️</span>}
                        {chat.name}
                      </span>
                      {chat.unreadCount > 0 && <span className="min-w-[20px] h-5 px-1 bg-orange-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">{chat.unreadCount}</span>}
                    </div>
                    <p className="text-muted text-xs truncate">
                      {chat.type === "group" && chat.lastMessage?.sender ? `${chat.lastMessage.sender.name?.split(" ")[0]}: ` : ""}{previewText(chat.lastMessage) || (chat.type === "group" ? `${chat.memberCount} üzv` : "")}
                    </p>
                  </div>
                  {/* Söhbəti sil (məndə) */}
                  <button onClick={(e) => { e.stopPropagation(); deleteThread(chat); }} title="Söhbəti sil" className="shrink-0 w-8 h-8 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>
          )}
        </div>

        {/* Chat sahəsi */}
        <div className={`${active ? 'flex' : 'hidden sm:flex'} flex-col flex-1 min-w-0 min-h-0`}>
          {active ? (
            <>
              <div className="flex items-center gap-3 p-3 border-b border-card-border">
                <button onClick={() => setActive(null)} className="sm:hidden p-1 text-muted hover:text-foreground">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 ${active.type === "group" ? "bg-gradient-to-br from-teal-500 to-cyan-600" : `bg-gradient-to-br ${typeColor(active.partnerType)}`}`}>
                  {active.type === "group" ? "👥" : initials(active.name)}
                </div>
                <div className="flex-1 min-w-0">
                  {active.type === "group" ? (
                    <button onClick={openInfo} className="text-left"><p className="font-medium text-sm">{active.name}</p><p className="text-muted text-xs">{active.memberCount} üzv · məlumat üçün toxun</p></button>
                  ) : (
                    <><Link href={`/seller/${active.id}`} className="font-medium text-sm hover:text-orange-500 transition-colors">{active.name}</Link>
                    <p className="text-muted text-xs h-4">{partnerTyping ? <span className="text-orange-500">yazır...</span> : active.phone}</p></>
                  )}
                </div>
                {active.type === "direct" && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {active.phone && onlyDigits(active.phone).length >= 7 && !contactDigits.has(onlyDigits(active.phone)) && (
                      <button onClick={saveContact} title="Kontaktlara əlavə et" className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center hover:bg-orange-500/20 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7.5v5m2.5-2.5h-5M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 19.5a7.5 7.5 0 0115 0v.75H4.5v-.75z" /></svg>
                      </button>
                    )}
                    <button onClick={() => startCall({ id: active.id, name: active.name }, "audio")} title="Səsli zəng" className="w-9 h-9 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500/20 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg></button>
                    <button onClick={() => startCall({ id: active.id, name: active.name }, "video")} title="Görüntülü zəng" className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500/20 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg></button>
                  </div>
                )}
                {active.type === "group" && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => startGroupCall(active.id, active.name, "audio")} title="Qrup səsli zəng" className="w-9 h-9 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500/20 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg></button>
                    <button onClick={() => startGroupCall(active.id, active.name, "video")} title="Qrup görüntülü zəng" className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500/20 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg></button>
                  </div>
                )}
              </div>

              <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3">
                {hasMore && (
                  <div className="text-center py-2"><button onClick={loadOlderMessages} disabled={loadingMore} className="text-xs text-orange-500 hover:text-orange-400 disabled:opacity-50">{loadingMore ? "..." : "Daha köhnə mesajları yüklə"}</button></div>
                )}
                {messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  const deleted = !!msg.deletedAt;
                  return (
                    <div key={msg.id} className={`group flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                      {/* Əməliyyat menyusu düyməsi — media mesajlarında da əlçatan olsun (sil/redaktə/cavab) */}
                      {isMine && !deleted && (
                        <button onClick={(e) => { e.stopPropagation(); setSelectedMsg(msg); }} title="Seçimlər" className="order-1 shrink-0 w-7 h-7 rounded-full text-muted hover:text-foreground hover:bg-input-bg flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">⋮</button>
                      )}
                      <div className={`max-w-[75%] ${isMine ? "order-2" : ""}`}>
                        {active.type === "group" && !isMine && !deleted && (
                          <p className="text-[10px] text-muted ml-1 mb-0.5">{msg.sender?.name?.split(" ")[0]}</p>
                        )}
                        <div onClick={() => !deleted && setSelectedMsg(selectedMsg?.id === msg.id ? null : msg)}
                          className={`px-3.5 py-2.5 rounded-2xl text-sm break-words cursor-pointer ${deleted ? "bg-input-bg/50 border border-input-border text-muted italic" : isMine ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-br-md" : "bg-input-bg border border-input-border text-foreground rounded-bl-md"}`}>
                          {msg.replyTo && !deleted && (
                            <div className={`text-[11px] mb-1 px-2 py-1 rounded-lg border-l-2 ${isMine ? "bg-white/15 border-white/50" : "bg-orange-500/10 border-orange-500/50"}`}>{previewText(msg.replyTo)}</div>
                          )}
                          {msg.listing && !deleted && (
                            <Link href={`/marketplace/${msg.listing.id}`} onClick={(e) => e.stopPropagation()} className={`block text-[10px] mb-1 ${isMine ? 'text-white/70' : 'text-orange-500'} hover:underline`}>{t("messageAbout")}: {msg.listing.title}</Link>
                          )}
                          {msg.consultationId && !deleted && (
                            <Link href={`/consultations/${msg.consultationId}`} onClick={(e) => e.stopPropagation()} className={`block text-[10px] mb-1 ${isMine ? 'text-white/70' : 'text-orange-500'} hover:underline`}>🗣️ Rəy konsultasiyası — aç</Link>
                          )}
                          {renderBody(msg, deleted)}
                          <p className={`text-[10px] mt-1 flex items-center gap-1 ${isMine ? 'text-white/50 justify-end' : 'text-muted'}`}>
                            {msg.editedAt && !deleted && <span title="Redaktə edilib">redaktə</span>}
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {isMine && !deleted && active.type === "direct" && ticks(msg)}
                          </p>
                        </div>
                        {reactionChips(msg)}
                      </div>
                      {!isMine && !deleted && (
                        <button onClick={(e) => { e.stopPropagation(); setSelectedMsg(msg); }} title="Seçimlər" className="shrink-0 w-7 h-7 rounded-full text-muted hover:text-foreground hover:bg-input-bg flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">⋮</button>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {(replyTo || editingMsg) && (
                <div className="px-3 pt-2 flex items-center gap-2 border-t border-card-border">
                  <div className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-lg bg-input-bg border-l-2 border-orange-500">
                    <span className="text-orange-500 font-semibold">{editingMsg ? "✏️ Redaktə edilir" : "↩︎ Cavab"}</span>
                    <span className="text-muted truncate block">{previewText(editingMsg || replyTo)}</span>
                  </div>
                  <button onClick={() => { setReplyTo(null); setEditingMsg(null); setNewMsg(""); }} className="text-muted hover:text-foreground text-lg px-1">✕</button>
                </div>
              )}

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
                  <div className="flex gap-2 items-center relative min-w-0">
                    <button onClick={() => { setAttachOpen((v) => !v); setEmojiOpen(false); }} title="Əlavə et" className="w-10 h-10 rounded-xl bg-input-bg border border-input-border flex items-center justify-center shrink-0 text-muted hover:text-orange-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" /></svg>
                    </button>
                    {attachOpen && (<>
                      {/* Xaricə klik — menyu bağlansın */}
                      <div className="fixed inset-0 z-[15]" onClick={() => setAttachOpen(false)} />
                      <div className="absolute bottom-12 left-0 bg-card border border-card-border rounded-xl p-1.5 space-y-0.5 z-20 shadow-lg">
                        <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-input-bg text-sm w-full whitespace-nowrap">🖼️ Şəkil</button>
                        <button onClick={openVideoRec} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-input-bg text-sm w-full whitespace-nowrap">🎥 Video mesaj</button>
                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-input-bg text-sm w-full whitespace-nowrap">📄 Sənəd / Fayl</button>
                        <button onClick={sendLocation} disabled={sendingLocation} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-input-bg text-sm w-full whitespace-nowrap disabled:opacity-50">📍 {sendingLocation ? "Konum alınır…" : "Konum"}</button>
                        <button onClick={openContactPicker} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-input-bg text-sm w-full whitespace-nowrap">👤 Kontakt</button>
                      </div>
                    </>)}
                    {/* Emoji seçici */}
                    <button onClick={() => { setEmojiOpen((v) => !v); setAttachOpen(false); }} title="Emoji" className="w-10 h-10 rounded-xl bg-input-bg border border-input-border flex items-center justify-center shrink-0 text-muted hover:text-orange-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.182 15.182a4.5 4.5 0 01-6.364 0M9 9.75h.008v.008H9V9.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm5.625 0h.008v.008H15V9.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    {emojiOpen && (<>
                      <div className="fixed inset-0 z-[15]" onClick={() => setEmojiOpen(false)} />
                      <div className="absolute bottom-12 right-2 bg-card border border-card-border rounded-xl p-2 z-20 shadow-lg grid grid-cols-8 gap-0.5 w-[280px] max-w-[calc(100vw-2rem)] max-h-52 overflow-y-auto">
                        {CHAT_EMOJIS.map((e) => (
                          <button key={e} onClick={() => addEmoji(e)} className="w-8 h-8 rounded-lg hover:bg-input-bg text-xl flex items-center justify-center">{e}</button>
                        ))}
                      </div>
                    </>)}
                    <input ref={inputRef} value={newMsg} onChange={(e) => { setNewMsg(e.target.value); emitTyping(); }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={t("messagePlaceholder")} className="flex-1 min-w-0 px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground" />
                    {newMsg.trim() || editingMsg ? (
                      <button onClick={handleSend} disabled={sending} className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center shrink-0 disabled:opacity-50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                      </button>
                    ) : (
                      <button onClick={startVoice} title="Səs mesajı" className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white flex items-center justify-center shrink-0" aria-label="Səs mesajı">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 15a3.5 3.5 0 003.5-3.5v-5a3.5 3.5 0 10-7 0v5A3.5 3.5 0 0012 15z" /><path fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M19 11.5a7 7 0 01-14 0M12 18.5V22M8.5 22h7" /></svg>
                      </button>
                    )}
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onPickImage(e.target.files?.[0] || null); e.target.value = ""; }} />
                    <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { onPickFile(e.target.files?.[0] || null); e.target.value = ""; }} />
                  </div>
                )}
                {uploadingMedia && <p className="text-[11px] text-muted mt-1">📤 Yüklənir…</p>}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted"><p className="text-sm">{t("noMessages")}</p></div>
          )}
        </div>
      </div>

      <Portal>
      {/* Mesaj əməliyyat menyusu */}
      {selectedMsg && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40" onClick={() => setSelectedMsg(null)}>
          <div className="bg-card border border-card-border rounded-t-2xl sm:rounded-2xl w-full sm:w-80 p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-around py-1">{QUICK_REACTIONS.map((emoji) => (<button key={emoji} onClick={() => reactToMessage(selectedMsg, emoji)} className="text-2xl hover:scale-125 transition-transform">{emoji}</button>))}</div>
            <div className="border-t border-card-border pt-2 space-y-1">
              <button onClick={() => startReply(selectedMsg)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-input-bg text-sm">↩︎ Cavabla</button>
              {canEdit(selectedMsg) && <button onClick={() => startEdit(selectedMsg)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-input-bg text-sm">✏️ Redaktə et</button>}
              <button onClick={() => hideMessage(selectedMsg)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500 text-sm">🗑 Məndə sil</button>
              {selectedMsg.senderId === user?.id && !selectedMsg.deletedAt && <button onClick={() => deleteMessage(selectedMsg)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500 text-sm">🗑 Hamı üçün sil</button>}
              <button onClick={() => setSelectedMsg(null)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-input-bg text-sm text-muted">✕ Bağla</button>
            </div>
          </div>
        </div>
      )}

      {/* Kontakt seçici */}
      {contactPickerOpen && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40" onClick={() => setContactPickerOpen(false)}>
          <div className="bg-card border border-card-border rounded-t-2xl sm:rounded-2xl w-full sm:w-96 max-h-[70vh] overflow-y-auto p-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-2">Kontakt paylaş</p>
            {pickerContacts.length === 0 ? <p className="text-muted text-sm py-6 text-center">Kontakt yoxdur</p> : pickerContacts.map((c) => (
              <button key={c.id} onClick={() => sendContact(c)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-input-bg text-left">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{initials(c.name)}</div>
                <div className="min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-[11px] text-muted truncate">{c.phone}{c.user ? " · platformada ✓" : ""}</p></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Yeni qrup */}
      {groupModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40" onClick={() => setGroupModalOpen(false)}>
          <div className="bg-card border border-card-border rounded-t-2xl sm:rounded-2xl w-full sm:w-96 max-h-[80vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold mb-3">➕ Yeni qrup</p>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Qrup adı" className="w-full px-3 py-2 mb-3 bg-input-bg border border-input-border rounded-xl text-sm" />
            <p className="text-xs text-muted mb-1">Üzvlər (qeydiyyatlı kontaktlar):</p>
            <div className="max-h-52 overflow-y-auto space-y-1 mb-3">
              {groupContacts.length === 0 ? <p className="text-muted text-xs py-3 text-center">Qeydiyyatlı kontakt yoxdur</p> : groupContacts.map((c) => (
                <button key={c.id} onClick={() => toggleGroupMember(c.user.id)} className={`w-full flex items-center gap-2 p-2 rounded-lg text-left ${groupSelected.includes(c.user.id) ? "bg-orange-500/15 border border-orange-500/40" : "hover:bg-input-bg"}`}>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold">{initials(c.name)}</div>
                  <span className="text-sm flex-1 truncate">{c.name}</span>
                  {groupSelected.includes(c.user.id) && <span className="text-orange-500">✓</span>}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setGroupModalOpen(false)} className="flex-1 py-2 rounded-xl bg-input-bg border border-input-border text-sm">Ləğv</button>
              <button onClick={createGroup} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold">Yarat ({groupSelected.length + 1})</button>
            </div>
          </div>
        </div>
      )}

      {/* Qrup məlumatı */}
      {infoOpen && groupInfo && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/40" onClick={() => setInfoOpen(false)}>
          <div className="bg-card border border-card-border rounded-t-2xl sm:rounded-2xl w-full sm:w-96 max-h-[80vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-lg shrink-0">👥</div>
              <div className="flex-1 min-w-0"><p className="font-semibold truncate">{groupInfo.name}</p><p className="text-xs text-muted">{groupInfo.members.length} üzv</p></div>
              {amIAdmin() && <button onClick={renameGroup} className="text-xs text-orange-500">✏️ Ad</button>}
            </div>
            {amIAdmin() && (
              <button onClick={() => setAddMemberMode((v) => !v)} className="w-full py-2 mb-2 rounded-xl bg-input-bg border border-input-border text-sm">➕ Üzv əlavə et</button>
            )}
            {addMemberMode && (() => {
              const addable = groupContacts.filter((c) => !groupInfo.members.some((m: any) => m.userId === c.user.id));
              return (
                <div className="max-h-40 overflow-y-auto space-y-1 mb-3 border border-card-border rounded-xl p-1">
                  {addable.length === 0 ? (
                    <p className="text-xs text-muted text-center py-3">Əlavə ediləcək qeydiyyatlı kontakt yoxdur.</p>
                  ) : addable.map((c) => (
                    <button key={c.id} onClick={() => addMember(c.user.id)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-input-bg text-left">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold">{initials(c.name)}</div>
                      <span className="text-sm flex-1 truncate">{c.name}</span><span className="text-orange-500 text-xs">əlavə et</span>
                    </button>
                  ))}
                </div>
              );
            })()}
            <p className="text-xs text-muted mb-1">Üzvlər</p>
            <div className="space-y-1 mb-3">
              {groupInfo.members.map((m: any) => (
                <div key={m.userId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-input-bg">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{initials(m.user?.name || "?")}</div>
                  <div className="flex-1 min-w-0"><p className="text-sm truncate">{m.user?.name || "İstifadəçi"} {m.userId === user?.id && "(siz)"}</p><p className="text-[10px] text-muted">{m.role === "ADMIN" ? "👑 Admin" : "Üzv"}</p></div>
                  {amIAdmin() && m.userId !== user?.id && (
                    <div className="flex items-center gap-2 shrink-0">
                      {m.role === "ADMIN"
                        ? <button onClick={() => setMemberRole(m.userId, "MEMBER")} className="text-amber-500 text-xs">Adminliyi al</button>
                        : <button onClick={() => setMemberRole(m.userId, "ADMIN")} className="text-orange-500 text-xs">Admin et</button>}
                      <button onClick={() => removeMember(m.userId)} className="text-red-500 text-xs">çıxar</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={leaveGroup} className="w-full py-2 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium">🚪 Qrupdan çıx</button>
          </div>
        </div>
      )}

      {/* Video mesaj yazıcı */}
      {videoRecOpen && (
        <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="relative bg-black aspect-video">
              <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {videoRecording && <span className="absolute top-2 left-2 text-white text-xs bg-red-500 px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-2 h-2 bg-white rounded-full animate-pulse" />{fmtSecs(videoSeconds)}</span>}
            </div>
            <div className="p-3 flex justify-center gap-3">
              {!videoRecording ? (<>
                <button onClick={closeVideoRec} className="px-4 py-2 rounded-xl bg-input-bg border border-input-border text-sm">Bağla</button>
                <button onClick={startVideoRec} className="px-5 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">● Başlat</button>
              </>) : (
                <button onClick={stopVideoSend} className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold">■ Dayandır və göndər</button>
              )}
            </div>
            <p className="text-center text-[11px] text-muted pb-2">Maksimum 30 saniyə</p>
          </div>
        </div>
      )}
      </Portal>
    </div>
  );
}
