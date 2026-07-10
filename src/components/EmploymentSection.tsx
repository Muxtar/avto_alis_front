"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

// Profil: "İş yerim" — istifadəçi özünü bir VÖEN-in (şirkətin) işçisi kimi qeyd edir.
// Axın: şirkəti ad/VÖEN ilə axtar → sorğu göndər → sahib qəbul edəndə rəsmi işçi.
// Şirkət də dəvət göndərə bilər — burada qəbul/rədd olunur.
export default function EmploymentSection() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = useCallback(() => {
    fetch(`${API}/me/employment`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setMemberships(d.memberships || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [token]);

  useEffect(() => { if (token) load(); }, [token, load]);

  // Axtarış — yazdıqca (debounce).
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const id = setTimeout(() => {
      setSearching(true);
      fetch(`${API}/businesses/search?q=${encodeURIComponent(q.trim())}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => setResults(d.businesses || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [q]);

  const sendRequest = async (bizId: number) => {
    setBusy(true);
    try {
      const r = await fetch(`${API}/businesses/${bizId}/join-request`, { method: "POST", headers }).then((x) => x.json());
      if (r.success) { toast("Sorğu göndərildi — şirkət təsdiqləyəndə bildiriş alacaqsınız", "success"); setQ(""); setResults([]); load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta baş verdi", "error"); } finally { setBusy(false); }
  };

  const respond = async (id: number, action: "accept" | "reject" | "leave") => {
    setBusy(true);
    try {
      const r = await fetch(`${API}/me/employment/${id}`, { method: "PUT", headers, body: JSON.stringify({ action }) }).then((x) => x.json());
      if (r.success) {
        toast(action === "accept" ? "Dəvət qəbul edildi ✓" : action === "leave" ? "İşdən ayrıldınız" : "Rədd edildi", "success");
        load();
      } else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta baş verdi", "error"); } finally { setBusy(false); }
  };

  if (loading) return null;

  const active = memberships.filter((m) => m.status === "ACTIVE");
  const invites = memberships.filter((m) => m.status === "PENDING_USER");
  const myRequests = memberships.filter((m) => m.status === "PENDING_BUSINESS");

  const perms = (m: any) => {
    const p: string[] = [];
    if (m.canSell) p.push("🛒 satış");
    if (m.canBuy) p.push("📦 alış");
    return p.length ? p.join(" · ") : "səlahiyyət hələ verilməyib";
  };

  return (
    <div className="surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">🏢 İş yerim</h2>
      <p className="text-xs text-muted mb-4">
        Çalışdığınız şirkəti (VÖEN) qeyd edin. Şirkət sahibi sorğunuzu təsdiqləyəndə profilinizdə rəsmi işçi kimi görünəcəksiniz.
      </p>

      {/* Şirkətdən gələn dəvətlər */}
      {invites.map((m) => (
        <div key={m.id} className="mb-2 p-3 bg-amber-500/5 border border-amber-500/30 rounded-xl">
          <p className="text-sm"><b>«{m.business.name}»</b> sizi işçi kimi əlavə etmək istəyir{m.object ? ` (obyekt: ${m.object.name})` : ""}.</p>
          <div className="flex gap-2 mt-2">
            <button disabled={busy} onClick={() => respond(m.id, "accept")} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50">Qəbul et</button>
            <button disabled={busy} onClick={() => respond(m.id, "reject")} className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg text-xs font-semibold disabled:opacity-50">Rədd et</button>
          </div>
        </div>
      ))}

      {/* Aktiv işçilik */}
      {active.map((m) => (
        <div key={m.id} className="mb-2 p-3 bg-green-500/5 border border-green-500/20 rounded-xl flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold">✅ {m.business.name}</p>
            <p className="text-[11px] text-muted">VÖEN: {m.business.voen}{m.object ? ` · Obyekt: ${m.object.name}` : " · Bütün biznes"}</p>
            <p className="text-[11px] text-muted mt-0.5">Səlahiyyətlər: {perms(m)}</p>
          </div>
          <button disabled={busy} onClick={() => { if (confirm("Bu şirkətdən ayrılmaq istədiyinizə əminsiniz?")) respond(m.id, "leave"); }}
            className="text-red-500 text-xs shrink-0 hover:underline disabled:opacity-50">İşdən ayrıl</button>
        </div>
      ))}

      {/* Mənim göndərdiyim gözləyən sorğular */}
      {myRequests.map((m) => (
        <div key={m.id} className="mb-2 p-3 bg-input-bg/50 border border-input-border rounded-xl flex items-center justify-between gap-2">
          <p className="text-sm text-muted">⏳ <b className="text-foreground">{m.business.name}</b> — təsdiq gözləyir</p>
          <button disabled={busy} onClick={() => respond(m.id, "leave")} className="text-muted text-xs hover:text-red-500 shrink-0 disabled:opacity-50">Ləğv et</button>
        </div>
      ))}

      {/* Şirkət axtarışı */}
      <div className="mt-3">
        <label className="block text-xs font-medium text-muted mb-1">Şirkət axtar (ad və ya VÖEN)</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="məs. FRİD Aİ TRADE və ya 9900003611"
          className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
        />
        {searching && <p className="text-[11px] text-muted mt-1">Axtarılır...</p>}
        {results.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {results.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-input-bg/50 border border-input-border rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">🏢 {b.name}</p>
                  <p className="text-[11px] text-muted">VÖEN: {b.voen} · {b._count?.objects || 0} obyekt</p>
                </div>
                <button disabled={busy} onClick={() => sendRequest(b.id)}
                  className="px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-semibold shrink-0 hover:bg-orange-500/20 disabled:opacity-50">
                  Sorğu göndər
                </button>
              </div>
            ))}
          </div>
        )}
        {q.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="text-[11px] text-muted mt-1.5">Nəticə tapılmadı. Şirkət platformada təsdiqlənmiş biznes olmalıdır.</p>
        )}
      </div>
    </div>
  );
}
