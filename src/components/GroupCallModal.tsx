"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { imgUrl } from "@/lib/api";
import { getCallSocket } from "@/lib/callSocket";

// Qrup səsli/görüntülü zəng — mesh WebRTC (hər iştirakçı digərləri ilə birbaşa).
// Kiçik qruplar üçün nəzərdə tutulub (server yalnız siqnal ötürür, media P2P gedir).
type PeerInfo = { id: number; name: string; avatar?: string | null };
type Phase = "incoming" | "active" | null;

const initials = (n?: string) => (n || "?").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();

// Bir iştirakçı üçün video/audio elementi.
function Tile({ name, avatar, stream, kind, muted, self }: { name: string; avatar?: string | null; stream: MediaStream | null; kind: "audio" | "video"; muted?: boolean; self?: boolean }) {
  const vRef = useRef<HTMLVideoElement | null>(null);
  const aRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (kind === "video" && vRef.current) vRef.current.srcObject = stream;
    if (kind === "audio" && aRef.current && !self) { aRef.current.srcObject = stream; aRef.current.play?.().catch(() => {}); }
  }, [stream, kind, self]);
  return (
    <div className="relative bg-black/60 rounded-xl overflow-hidden flex items-center justify-center aspect-square">
      {kind === "video" ? (
        <video ref={vRef} autoPlay playsInline muted={self || muted} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-1 text-white">
          {avatar ? <img src={imgUrl(avatar)} alt={name} className="w-14 h-14 rounded-full object-cover" /> : <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold">{initials(name)}</div>}
          {!self && <audio ref={aRef} autoPlay />}
        </div>
      )}
      <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">{self ? "Siz" : name}</span>
    </div>
  );
}

export default function GroupCallModal({
  outgoing,
  onDone,
}: {
  outgoing: { conversationId: number; name: string; kind: "audio" | "video"; ts: number } | null;
  onDone?: () => void;
}) {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>(null);
  const [kind, setKind] = useState<"audio" | "video">("audio");
  const [convId, setConvId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState("");
  const [incomingFrom, setIncomingFrom] = useState<PeerInfo | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [peers, setPeers] = useState<Record<number, PeerInfo & { stream: MediaStream | null }>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const pcsRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceRef = useRef<any[]>([{ urls: "stun:stun.l.google.com:19302" }]);
  const convRef = useRef<number | null>(null);
  const kindRef = useRef<"audio" | "video">("audio");
  const myId = user?.id ?? 0;
  convRef.current = convId; kindRef.current = kind;
  const socket = token ? getCallSocket(token) : null;

  const sig = (to: number, data: any) => socket?.emit("groupcall:signal", { conversationId: convRef.current, to, data });

  const cleanup = useCallback(() => {
    pcsRef.current.forEach((pc) => { try { pc.close(); } catch { /* boş */ } });
    pcsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null); setPeers({}); setPhase(null); setConvId(null); setIncomingFrom(null);
    setMuted(false); setCamOff(false); setMinimized(false);
    onDone?.();
    // eslint-disable-next-line
  }, []);

  const removePeer = (id: number) => {
    const pc = pcsRef.current.get(id); if (pc) { try { pc.close(); } catch { /* boş */ } pcsRef.current.delete(id); }
    setPeers((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  // Bir iştirakçı ilə peer connection qur (idempotent). initiator=true isə offer göndərir.
  const ensurePeer = useCallback((info: PeerInfo, initiator: boolean) => {
    if (pcsRef.current.has(info.id)) return pcsRef.current.get(info.id)!;
    const pc = new RTCPeerConnection({ iceServers: iceRef.current });
    pcsRef.current.set(info.id, pc);
    setPeers((p) => ({ ...p, [info.id]: { ...info, stream: p[info.id]?.stream || null } }));
    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    pc.onicecandidate = (e) => { if (e.candidate) sig(info.id, { candidate: e.candidate }); };
    pc.ontrack = (e) => setPeers((p) => ({ ...p, [info.id]: { ...(p[info.id] || info), stream: e.streams[0] } }));
    pc.onconnectionstatechange = () => { if (["failed", "closed", "disconnected"].includes(pc.connectionState)) removePeer(info.id); };
    if (initiator) {
      pc.createOffer().then((o) => pc.setLocalDescription(o)).then(() => sig(info.id, { sdp: pc.localDescription })).catch(() => {});
    }
    return pc;
    // eslint-disable-next-line
  }, []);

  // Lokal media al, sonra zəngə qoşul/başlat (media hazır olmadan siqnal gəlməsin).
  const enterCall = useCallback(async (cid: number, k: "audio" | "video", initiator: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: k === "video" ? { facingMode: "user" } : false });
      localStreamRef.current = stream; setLocalStream(stream);
      setPhase("active"); setConvId(cid); convRef.current = cid; setKind(k); kindRef.current = k;
      if (initiator) socket?.emit("groupcall:start", { conversationId: cid, kind: k });
      else socket?.emit("groupcall:join", { conversationId: cid });
    } catch {
      toast("Mikrofon/kamera icazəsi verilmədi", "error"); cleanup();
    }
    // eslint-disable-next-line
  }, [socket]);

  // ── Zəngi başlat (parent-dən) ──
  useEffect(() => {
    if (!outgoing || !socket) return;
    setGroupName(outgoing.name);
    enterCall(outgoing.conversationId, outgoing.kind, true);
    // eslint-disable-next-line
  }, [outgoing?.ts]);

  // ── Socket hadisələri ──
  useEffect(() => {
    if (!socket) return;
    const onConfig = (d: any) => { if (d?.iceServers?.length) iceRef.current = d.iceServers; };
    const onIncoming = (d: any) => {
      if (phase) return; // artıq zəngdəyəm
      setIncomingFrom(d.from); setKind(d.kind === "video" ? "video" : "audio"); setConvId(d.conversationId); convRef.current = d.conversationId; setGroupName(""); setPhase("incoming");
    };
    const onParticipants = (d: any) => {
      if (d.conversationId !== convRef.current) return;
      (d.participants || []).forEach((pi: PeerInfo) => ensurePeer(pi, myId < pi.id));
    };
    const onPeerJoined = (d: any) => {
      if (d.conversationId !== convRef.current || !d.peer) return;
      ensurePeer(d.peer, myId < d.peer.id);
    };
    const onSignal = async (d: any) => {
      if (d.conversationId !== convRef.current) return;
      const from = d.from as number;
      let pc = pcsRef.current.get(from);
      if (!pc) pc = ensurePeer({ id: from, name: "İştirakçı" }, false);
      try {
        if (d.data.sdp) {
          await pc.setRemoteDescription(d.data.sdp);
          if (d.data.sdp.type === "offer") { const a = await pc.createAnswer(); await pc.setLocalDescription(a); sig(from, { sdp: pc.localDescription }); }
        } else if (d.data.candidate) { await pc.addIceCandidate(d.data.candidate).catch(() => {}); }
      } catch { /* keç */ }
    };
    const onPeerLeft = (d: any) => { if (d.conversationId === convRef.current) removePeer(d.userId); };

    socket.on("config", onConfig);
    socket.on("groupcall:incoming", onIncoming);
    socket.on("groupcall:participants", onParticipants);
    socket.on("groupcall:peer-joined", onPeerJoined);
    socket.on("groupcall:signal", onSignal);
    socket.on("groupcall:peer-left", onPeerLeft);
    return () => {
      socket.off("config", onConfig); socket.off("groupcall:incoming", onIncoming); socket.off("groupcall:participants", onParticipants);
      socket.off("groupcall:peer-joined", onPeerJoined); socket.off("groupcall:signal", onSignal); socket.off("groupcall:peer-left", onPeerLeft);
    };
    // eslint-disable-next-line
  }, [socket, phase, myId]);

  const accept = () => { if (convId) enterCall(convId, kind, false); };
  const decline = () => cleanup();
  const leave = () => { if (convRef.current) socket?.emit("groupcall:leave", { conversationId: convRef.current }); cleanup(); };
  const toggleMute = () => { const on = !muted; setMuted(on); localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !on)); };
  const toggleCam = () => { const off = !camOff; setCamOff(off); localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !off)); };

  useEffect(() => () => { pcsRef.current.forEach((pc) => { try { pc.close(); } catch { /* boş */ } }); localStreamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  if (!phase) return null;

  const tiles = Object.values(peers);
  const cols = tiles.length + 1 <= 2 ? 1 : tiles.length + 1 <= 4 ? 2 : 3;

  if (phase === "incoming") {
    return (
      <div className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-4">
        <div className="bg-card border border-card-border rounded-2xl w-full max-w-sm p-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-3xl mb-3">👥</div>
          <p className="font-semibold">{incomingFrom?.name || "Kimsə"}</p>
          <p className="text-sm text-muted mb-5">{kind === "video" ? "🎥 Qrup görüntülü zəngi" : "📞 Qrup səsli zəngi"} — dəvət</p>
          <div className="flex justify-center gap-3">
            <button onClick={accept} className="px-6 py-3 bg-green-500 text-white rounded-2xl font-semibold hover:bg-green-600">✅ Qoşul</button>
            <button onClick={decline} className="px-6 py-3 bg-red-500 text-white rounded-2xl font-semibold hover:bg-red-600">✕ İmtina</button>
          </div>
        </div>
      </div>
    );
  }

  if (minimized) {
    return (
      <div className="fixed bottom-24 right-3 z-[80] bg-card border border-card-border rounded-2xl shadow-xl p-2 w-40">
        <p className="text-xs font-semibold truncate">👥 Qrup zəngi</p>
        <p className="text-[11px] text-muted">{tiles.length + 1} nəfər</p>
        {tiles.map((p) => p.stream && kind === "audio" ? <audio key={p.id} autoPlay ref={(el) => { if (el && el.srcObject !== p.stream) el.srcObject = p.stream; }} /> : null)}
        <div className="flex gap-1 mt-1">
          <button onClick={() => setMinimized(false)} className="flex-1 py-1 rounded-lg bg-input-bg border border-input-border text-xs">⤢</button>
          <button onClick={leave} className="flex-1 py-1 rounded-lg bg-red-500 text-white text-xs">📵</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex flex-col p-3 sm:p-4">
      <div className="flex items-center justify-between text-white mb-2">
        <div>
          <p className="font-semibold">👥 {groupName || "Qrup zəngi"}</p>
          <p className="text-xs text-white/70">{tiles.length + 1} nəfər</p>
        </div>
        <button onClick={() => setMinimized(true)} title="Kiçilt" className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">🗕</button>
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        <Tile name="Siz" stream={localStream} kind={kind} self muted={muted} avatar={(user as any)?.avatar} />
        {tiles.map((p) => <Tile key={p.id} name={p.name} avatar={p.avatar} stream={p.stream} kind={kind} />)}
      </div>

      <div className="flex items-center justify-center gap-3 pt-3">
        <button onClick={toggleMute} title={muted ? "Səsi aç" : "Səsi bağla"} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${muted ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"}`}>{muted ? "🔇" : "🎙️"}</button>
        {kind === "video" && (
          <button onClick={toggleCam} title={camOff ? "Kameranı aç" : "Kameranı bağla"} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${camOff ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"}`}>{camOff ? "🚫" : "📷"}</button>
        )}
        <button onClick={leave} className="px-6 py-3 bg-red-500 text-white rounded-2xl font-semibold hover:bg-red-600">📵 Ayrıl</button>
      </div>
    </div>
  );
}
