"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Peşəkarın təsdiqi gözlənilir",
  ACCEPTED: "Qəbul edildi — ödəniş gözlənilir",
  REJECTED: "Rədd edildi",
  PENDING_VOEN: "VÖEN tələb olunur",
  PAID: "Ödənilib — başlanmağı gözləyir",
  ACTIVE: "Aktiv (sayğac işləyir)",
  PAUSED: "Dayandırılıb",
  ENDED: "Bitib",
};
const STATUS_CLS: Record<string, string> = {
  REQUESTED: "bg-amber-500/10 text-amber-500",
  ACCEPTED: "bg-blue-500/10 text-blue-500",
  REJECTED: "bg-red-500/10 text-red-500",
  PENDING_VOEN: "bg-red-500/10 text-red-500",
  PAID: "bg-blue-500/10 text-blue-500",
  ACTIVE: "bg-green-500/10 text-green-500",
  PAUSED: "bg-amber-500/10 text-amber-500",
  ENDED: "bg-input-bg text-muted",
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ConsultationsPage() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    try {
      const r = await fetch(`${API}/me/consultations`, { headers }).then((x) => x.json());
      setSessions(r.sessions || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    load();
    // eslint-disable-next-line
  }, [isLoggedIn, authLoading]);

  if (loading) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-1 flex items-center gap-2">🗣️ Rəy konsultasiyaları</h1>
      <p className="text-sm text-muted mb-6">Peşəkarlarla ödənişli konsultasiya seanslarınız (alıcı və peşəkar).</p>

      {sessions.length === 0 ? (
        <div className="surface p-8 text-center text-muted">Hələ konsultasiya yoxdur.</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const other = s.role === "professional" ? s.buyer : s.professional;
            return (
              <Link key={s.id} href={`/consultations/${s.id}`} className="surface p-4 flex items-center gap-3 hover:border-orange-500/40 transition-colors">
                <div className="w-11 h-11 rounded-full bg-orange-500/10 flex items-center justify-center text-lg shrink-0">{s.role === "professional" ? "👤" : "🗣️"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{other?.name || "—"}</p>
                    <span className="text-[11px] text-muted">{s.role === "professional" ? "(alıcı)" : "(peşəkar)"}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_CLS[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{s.title} · {s.price} AZN · Qalan: <b>{fmt(s.remainingSeconds)}</b></p>
                </div>
                <svg className="w-5 h-5 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
