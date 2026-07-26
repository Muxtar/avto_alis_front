"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { getCallSocket } from "@/lib/callSocket";

// Səsli/görüntülü zəng (WebRTC P2P + socket.io signaling).
// outgoing: parent "startCall" istəyini prop ilə ötürür; incoming: socket-dən gəlir.
type Peer = { id: number; name: string; avatar?: string | null };
type Phase = "outgoing" | "incoming" | "connecting" | "active";

export default function CallModal({
  outgoing,
  onDone,
}: {
  outgoing: { partner: Peer; kind: "audio" | "video"; ts: number } | null; // yeni zəng istəyi (ts — təkrar üçün)
  onDone?: () => void;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [kind, setKind] = useState<"audio" | "video">("audio");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [minimized, setMinimized] = useState(false); // kiçildilmiş rejim — digər səhifələr işlək qalır

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const iceServersRef = useRef<any[]>([{ urls: "stun:stun.l.google.com:19302" }]);
  const pendingCandidatesRef = useRef<any[]>([]);
  const phaseRef = useRef<Phase | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const kindRef = useRef<"audio" | "video">("audio");
  const ringTimeoutRef = useRef<any>(null);
  const facingRef = useRef<"user" | "environment">("user"); // ön / arxa kamera
  // Zəng qeydi üçün — yalnız zəng EDƏN tərəf bir dəfə yazır.
  const isCallerRef = useRef(false);        // bu instance zəng edəndir?
  const activeStartRef = useRef<number | null>(null); // qoşulma vaxtı (ANSWERED üçün)
  const loggedRef = useRef(false);          // bu zəng artıq yazılıb?
  const tokenRef = useRef<string | null>(null);
  phaseRef.current = phase; peerRef.current = peer; kindRef.current = kind; tokenRef.current = token;

  const socket = token ? getCallSocket(token) : null;

  // Tam təmizləmə — media + peer connection bağlanır.
  const cleanup = useCallback(() => {
    // Zəng qeydini yaz — yalnız zəng EDƏN tərəf, bir dəfə (chat-də mesaj kimi görünsün).
    if (isCallerRef.current && !loggedRef.current && peerRef.current) {
      loggedRef.current = true;
      const answered = activeStartRef.current != null;
      const duration = answered ? Math.max(1, Math.round((Date.now() - (activeStartRef.current as number)) / 1000)) : 0;
      const t = tokenRef.current;
      if (t) {
        fetch(`${API}/messages/call`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
          body: JSON.stringify({ to: peerRef.current.id, kind: kindRef.current, status: answered ? "ANSWERED" : "MISSED", duration }),
        }).catch(() => {});
      }
    }
    isCallerRef.current = false;
    activeStartRef.current = null;
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    try { pcRef.current?.close(); } catch { /* boş */ }
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    remoteStreamRef.current = null;
    facingRef.current = "user";
    setPhase(null); setPeer(null); setMuted(false); setCamOff(false); setSeconds(0); setMinimized(false);
    onDone?.();
    // eslint-disable-next-line
  }, []);

  // Peer connection qur — media al, trackları əlavə et; zəng edən offer yaradır.
  const setupPeer = useCallback(async (isCaller: boolean, toId: number, callKind: "audio" | "video") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callKind === "video" ? { facingMode: "user" } : false,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current && callKind === "video") localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (e) => {
        const remote = e.streams[0];
        remoteStreamRef.current = remote;
        if (callKind === "video") {
          // Video zəngdə səs <video> elementindən gəlir (audio elementə bağlama — əks-səda olmasın).
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
        } else if (remoteAudioRef.current) {
          // Səsli zəngdə səs YALNIZ bu <audio> elementindən gəlir — açıq şəkildə play()
          // çağır (autoPlay bəzən bloklanır), əks halda səsli zəng səssiz qalır.
          remoteAudioRef.current.srcObject = remote;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.play?.().catch(() => {});
        }
        if (activeStartRef.current == null) activeStartRef.current = Date.now(); // qoşuldu → ANSWERED
        setPhase("active");
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) socket?.emit("call:signal", { to: toId, data: { candidate: e.candidate } });
      };
      pc.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(pc.connectionState) && phaseRef.current === "active") {
          toast("Bağlantı kəsildi", "error");
          cleanup();
        }
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket?.emit("call:signal", { to: toId, data: { sdp: pc.localDescription } });
      }
    } catch (e: any) {
      toast(e?.name === "NotAllowedError" ? "Mikrofon/kamera icazəsi verilmədi" : "Media açıla bilmədi", "error");
      socket?.emit("call:end", { to: toId });
      cleanup();
    }
    // eslint-disable-next-line
  }, [socket]);

  // ── Socket hadisələri ──
  useEffect(() => {
    if (!socket) return;
    const onConfig = (d: any) => { if (d?.iceServers?.length) iceServersRef.current = d.iceServers; };
    const onIncoming = (d: any) => {
      if (phaseRef.current) { socket.emit("call:reject", { to: d.from?.id, busy: true }); return; } // artıq zəngdəyəm
      isCallerRef.current = false; loggedRef.current = false; activeStartRef.current = null;
      setPeer(d.from); setKind(d.kind === "video" ? "video" : "audio"); setPhase("incoming");
    };
    const onAccepted = () => {
      if (phaseRef.current !== "outgoing" || !peerRef.current) return;
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      setPhase("connecting");
      setupPeer(true, peerRef.current.id, kindRef.current);
    };
    const onSignal = async (d: any) => {
      const pc = pcRef.current;
      try {
        if (d?.data?.sdp) {
          if (d.data.sdp.type === "offer") {
            // Qəbul edən tərəf — offer gəldi, cavab yarat.
            if (!pc) return;
            await pc.setRemoteDescription(new RTCSessionDescription(d.data.sdp));
            for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(c).catch(() => {});
            pendingCandidatesRef.current = [];
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("call:signal", { to: d.from, data: { sdp: pc.localDescription } });
          } else if (d.data.sdp.type === "answer" && pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(d.data.sdp));
            for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(c).catch(() => {});
            pendingCandidatesRef.current = [];
          }
        } else if (d?.data?.candidate) {
          if (pc && pc.remoteDescription) await pc.addIceCandidate(d.data.candidate).catch(() => {});
          else pendingCandidatesRef.current.push(d.data.candidate); // SDP-dən əvvəl gələn candidate-lər gözlədilir
        }
      } catch { /* signal xətaları zəngi dayandırmasın */ }
    };
    const onRejected = (d: any) => { toast(d?.busy ? "İstifadəçi başqa zəngdədir" : "Zəng rədd edildi", "error"); cleanup(); };
    const onEnded = () => { if (phaseRef.current) { toast("Zəng bitdi", "success"); cleanup(); } };
    const onUnavailable = () => { toast("İstifadəçi hazırda onlayn deyil", "error"); cleanup(); };

    socket.on("config", onConfig);
    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:signal", onSignal);
    socket.on("call:rejected", onRejected);
    socket.on("call:ended", onEnded);
    socket.on("call:unavailable", onUnavailable);
    return () => {
      socket.off("config", onConfig);
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:signal", onSignal);
      socket.off("call:rejected", onRejected);
      socket.off("call:ended", onEnded);
      socket.off("call:unavailable", onUnavailable);
    };
    // eslint-disable-next-line
  }, [socket, setupPeer, cleanup]);

  // ── Çıxan zəng istəyi (parent-dən) ──
  useEffect(() => {
    if (!outgoing || !socket) return;
    if (phaseRef.current) return; // artıq zəngdəyəm
    isCallerRef.current = true; loggedRef.current = false; activeStartRef.current = null;
    setPeer(outgoing.partner); setKind(outgoing.kind); setPhase("outgoing");
    socket.emit("call:invite", { to: outgoing.partner.id, kind: outgoing.kind });
    // 45 saniyə cavab yoxdursa avtomatik dayandır.
    ringTimeoutRef.current = setTimeout(() => {
      socket.emit("call:end", { to: outgoing.partner.id });
      toast("Cavab verilmədi", "error");
      cleanup();
    }, 45000);
    // eslint-disable-next-line
  }, [outgoing?.ts]);

  // Aktiv zəng sayğacı.
  useEffect(() => {
    if (phase !== "active") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Kiçilt/böyüt keçidində video/audio elementlərini axınlara yenidən bağla.
  useEffect(() => {
    const remote = remoteStreamRef.current;
    if (kind === "video") {
      if (remoteVideoRef.current && remote) remoteVideoRef.current.srcObject = remote;
    } else if (remoteAudioRef.current && remote) {
      remoteAudioRef.current.srcObject = remote;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.play?.().catch(() => {});
    }
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
  }, [minimized, phase, kind]);

  // Komponent sökülərkən təmizlə.
  useEffect(() => () => { try { pcRef.current?.close(); } catch { /* boş */ } localStreamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const accept = () => {
    if (!peer) return;
    setPhase("connecting");
    socket?.emit("call:accept", { to: peer.id });
    setupPeer(false, peer.id, kind); // offer gözləyəcək
  };
  const reject = () => { if (peer) socket?.emit("call:reject", { to: peer.id }); cleanup(); };
  const endCall = () => { if (peer) socket?.emit("call:end", { to: peer.id }); cleanup(); };
  const toggleMute = () => {
    const on = !muted; setMuted(on);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !on));
  };
  const toggleCam = () => {
    const off = !camOff; setCamOff(off);
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !off));
  };
  // Ön ↔ arxa kamera dəyişimi (satıcının məhsulu arxa kamera ilə göstərməsi üçün).
  const switchCamera = async () => {
    const pc = pcRef.current; const cur = localStreamRef.current;
    if (!pc || !cur) return;
    const next = facingRef.current === "user" ? "environment" : "user";
    try {
      const ns = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: next } }, audio: false });
      const newTrack = ns.getVideoTracks()[0];
      if (!newTrack) return;
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newTrack);
      const oldTrack = cur.getVideoTracks()[0];
      if (oldTrack) { cur.removeTrack(oldTrack); oldTrack.stop(); }
      cur.addTrack(newTrack);
      newTrack.enabled = !camOff;
      if (localVideoRef.current) localVideoRef.current.srcObject = cur;
      facingRef.current = next;
    } catch { toast("Kamera dəyişdirilə bilmədi", "error"); }
  };
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (!phase) return null;

  const peerInitials = (peer?.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2);

  // Kiçildilmiş rejim — kiçik üzən pəncərə, altdakı səhifə tam işlək qalır.
  if (minimized) {
    return (
      <>
        <audio ref={remoteAudioRef} autoPlay />
        <div className="fixed bottom-24 right-3 z-[70] w-44 bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden">
          {kind === "video" && (phase === "active" || phase === "connecting") ? (
            <div className="relative bg-black aspect-[3/4]"><video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" /></div>
          ) : (
            <div className="p-3 text-center">
              <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center font-bold">{peerInitials}</div>
              <p className="text-xs font-semibold truncate mt-1">{peer?.name}</p>
            </div>
          )}
          <div className="flex items-center justify-between px-2 py-1.5 gap-1">
            <span className="text-[11px] text-muted">{phase === "active" ? `🟢 ${fmt(seconds)}` : "…"}</span>
            <div className="flex gap-1">
              <button onClick={() => setMinimized(false)} title="Böyüt" className="w-7 h-7 rounded-lg bg-input-bg border border-input-border flex items-center justify-center text-xs">⤢</button>
              <button onClick={endCall} title="Bitir" className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center text-xs">📵</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <audio ref={remoteAudioRef} autoPlay />
      <div className="relative bg-card border border-card-border rounded-2xl w-full max-w-lg overflow-hidden">
        {/* Kiçilt düyməsi — gələn zəngdən başqa */}
        {phase !== "incoming" && (
          <button onClick={() => setMinimized(true)} title="Kiçilt" className="absolute top-2 left-2 z-10 w-8 h-8 rounded-lg bg-black/40 text-white flex items-center justify-center text-sm">🗕</button>
        )}
        {/* Video sahəsi */}
        {kind === "video" && (phase === "active" || phase === "connecting") ? (
          <div className="relative bg-black aspect-video">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 w-28 h-20 object-cover rounded-xl border-2 border-white/40 bg-black" />
            {phase === "connecting" && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-sm">Qoşulur...</div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            {peer?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${imgUrl(peer.avatar)}`} alt={peer?.name} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                {(peer?.name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
            )}
            <p className="font-bold text-lg">{peer?.name}</p>
            <p className="text-sm text-muted mt-1">
              {phase === "outgoing" && `${kind === "video" ? "🎥 Görüntülü" : "📞 Səsli"} zəng edilir...`}
              {phase === "incoming" && `${kind === "video" ? "🎥 Görüntülü" : "📞 Səsli"} zəng gəlir...`}
              {phase === "connecting" && "Qoşulur..."}
              {phase === "active" && `🟢 ${fmt(seconds)}`}
            </p>
          </div>
        )}

        {/* Video aktiv sayğac */}
        {kind === "video" && phase === "active" && (
          <p className="text-center text-xs text-muted py-2">{peer?.name} · 🟢 {fmt(seconds)}</p>
        )}

        {/* İdarəetmə düymələri */}
        <div className="p-4 flex items-center justify-center gap-3 border-t border-card-border">
          {phase === "incoming" ? (
            <>
              <button onClick={accept} className="px-6 py-3 bg-green-500 text-white rounded-2xl font-semibold hover:bg-green-600">✅ Qəbul et</button>
              <button onClick={reject} className="px-6 py-3 bg-red-500 text-white rounded-2xl font-semibold hover:bg-red-600">✕ İmtina</button>
            </>
          ) : (
            <>
              {(phase === "active" || phase === "connecting") && (
                <button onClick={toggleMute} title={muted ? "Səsi aç" : "Səsi bağla"}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${muted ? "bg-red-500/20 text-red-500" : "bg-input-bg border border-input-border"}`}>
                  {muted ? "🔇" : "🎙️"}
                </button>
              )}
              {kind === "video" && (phase === "active" || phase === "connecting") && (
                <button onClick={toggleCam} title={camOff ? "Kameranı aç" : "Kameranı bağla"}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg ${camOff ? "bg-red-500/20 text-red-500" : "bg-input-bg border border-input-border"}`}>
                  {camOff ? "🚫" : "📷"}
                </button>
              )}
              {kind === "video" && (phase === "active" || phase === "connecting") && (
                <button onClick={switchCamera} title="Kameranı çevir (ön/arxa)"
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg bg-input-bg border border-input-border">
                  🔄
                </button>
              )}
              <button onClick={endCall} className="px-6 py-3 bg-red-500 text-white rounded-2xl font-semibold hover:bg-red-600">
                📵 {phase === "outgoing" ? "Ləğv et" : "Bitir"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
