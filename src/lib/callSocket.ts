import { io, Socket } from "socket.io-client";
import { API } from "@/lib/api";

// Zəng siqnalları üçün socket.io bağlantısı (singleton).
// Media P2P (WebRTC) gedir — bu socket yalnız dəvət/qəbul/SDP/ICE ötürür.
let socket: Socket | null = null;
let socketToken: string | null = null;

export function getCallSocket(token: string): Socket {
  if (socket && socketToken === token) return socket;
  // Token dəyişibsə köhnə bağlantını bağla.
  if (socket) { try { socket.disconnect(); } catch { /* boş */ } }
  const base = API.replace(/\/api\/?$/, "");
  socket = io(base, {
    auth: { token },
    transports: ["websocket", "polling"], // Railway hər ikisini dəstəkləyir
    reconnectionAttempts: 5,
  });
  socketToken = token;
  return socket;
}
