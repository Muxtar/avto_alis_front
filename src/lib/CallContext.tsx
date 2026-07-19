"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import CallModal from "@/components/CallModal";
import GroupCallModal from "@/components/GroupCallModal";

// Qlobal zəng konteksti — zəng bütün saytda (səhifələr arası) davam edir və
// kiçildiləndə istifadəçi digər funksiyaları eyni anda işlədə bilir (WhatsApp kimi).
type Peer = { id: number; name: string; avatar?: string | null };
type CallCtx = {
  startCall: (partner: Peer, kind: "audio" | "video") => void;
  startGroupCall: (conversationId: number, name: string, kind: "audio" | "video") => void;
};

const Ctx = createContext<CallCtx>({ startCall: () => {}, startGroupCall: () => {} });
export const useCall = () => useContext(Ctx);

export function CallProvider({ children }: { children: ReactNode }) {
  const [outgoing, setOutgoing] = useState<{ partner: Peer; kind: "audio" | "video"; ts: number } | null>(null);
  const [groupOut, setGroupOut] = useState<{ conversationId: number; name: string; kind: "audio" | "video"; ts: number } | null>(null);
  const startCall = (partner: Peer, kind: "audio" | "video") => setOutgoing({ partner, kind, ts: Date.now() });
  const startGroupCall = (conversationId: number, name: string, kind: "audio" | "video") => setGroupOut({ conversationId, name, kind, ts: Date.now() });
  return (
    <Ctx.Provider value={{ startCall, startGroupCall }}>
      {children}
      <CallModal outgoing={outgoing} onDone={() => setOutgoing(null)} />
      <GroupCallModal outgoing={groupOut} onDone={() => setGroupOut(null)} />
    </Ctx.Provider>
  );
}
