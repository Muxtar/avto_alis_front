"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

type Session = {
  id: string;
  os: string | null;
  browser: string | null;
  deviceType: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

function deviceIcon(s: Session): string {
  const d = (s.deviceType || "").toLowerCase();
  if (d === "mobile") return "📱";
  if (d === "tablet") return "📲";
  return "💻";
}

function label(s: Session): string {
  return [s.os, s.browser].filter(Boolean).join(" · ") || "Naməlum cihaz";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "indi aktiv";
  if (m < 60) return `${m} dəq əvvəl`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat əvvəl`;
  const days = Math.floor(h / 24);
  return `${days} gün əvvəl`;
}

// Bağlı cihazlar — profilə daxil olan cihazlar (WhatsApp "linked devices" kimi).
export default function ConnectedDevices() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    fetch(`${API}/me/sessions`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setSessions(d.sessions); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const revoke = async (id: string) => {
    if (!confirm("Bu cihazın girişi bağlansın? O cihaz sistemdən çıxarılacaq.")) return;
    setBusy(id);
    try {
      const r = await fetch(`${API}/me/sessions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json());
      if (r.success) { setSessions((s) => s.filter((x) => x.id !== id)); toast("Cihaz çıxarıldı ✓", "success"); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  const revokeOthers = async () => {
    if (!confirm("Bu cihazdan başqa bütün cihazlar çıxarılsın?")) return;
    setBusy("others");
    try {
      const r = await fetch(`${API}/me/sessions/revoke-others`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json());
      if (r.success) { setSessions((s) => s.filter((x) => x.current)); toast("Digər cihazlar çıxarıldı ✓", "success"); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  const others = sessions.filter((s) => !s.current);

  return (
    <div className="bg-card border border-card-border rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="font-semibold flex items-center gap-2">🔗 Bağlı cihazlar</h2>
        {others.length > 0 && (
          <button onClick={revokeOthers} disabled={busy === "others"} className="text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-50">
            Digərlərini çıxart
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted mb-4">Profilinizə daxil olan cihazlar. Tanımadığınız cihazı çıxara bilərsiniz.</p>

      {loading ? (
        <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted">Aktiv cihaz yoxdur.</p>
      ) : (
        <div className="space-y-2.5">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-input-border bg-input-bg/50">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-xl shrink-0">{deviceIcon(s)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{label(s)}</p>
                  {s.current && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-green-500/10 text-green-500 border border-green-500/20">Bu cihaz</span>}
                </div>
                <p className="text-[11px] text-muted">
                  {s.deviceType || "Cihaz"}{s.ip ? ` · ${s.ip}` : ""} · {timeAgo(s.lastSeenAt)}
                </p>
              </div>
              {!s.current && (
                <button
                  onClick={() => revoke(s.id)}
                  disabled={busy === s.id}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 border border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-50"
                >
                  Çıxart
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
