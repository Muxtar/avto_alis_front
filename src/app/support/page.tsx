"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Cavab gözlənir", cls: "bg-amber-500/10 text-amber-600" },
  PENDING: { label: "Cavablandı", cls: "bg-green-500/10 text-green-600" },
  RESOLVED: { label: "Həll olundu", cls: "bg-green-500/10 text-green-600" },
  CLOSED: { label: "Bağlı", cls: "bg-gray-500/10 text-gray-500" },
};
const CATEGORIES = [
  { value: "ORDER", label: "Sifariş" }, { value: "PAYMENT", label: "Ödəniş" },
  { value: "ACCOUNT", label: "Hesab" }, { value: "LISTING", label: "Elan" }, { value: "OTHER", label: "Digər" },
];

export default function SupportPage() {
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const H = () => ({ Authorization: `Bearer ${token}` });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/support/tickets`, { headers: H() }).then((x) => x.json());
      if (r.success) setTickets(r.tickets || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const open = async (id: number) => {
    try {
      const r = await fetch(`${API}/support/tickets/${id}`, { headers: H() }).then((x) => x.json());
      if (r.success) { setSel(r.ticket); setReply(""); }
    } catch { toast("Xəta", "error"); }
  };

  const create = async () => {
    if (!subject.trim() || body.trim().length < 5) { toast("Mövzu və mesaj yazın", "error"); return; }
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("subject", subject.trim()); fd.append("category", category); fd.append("body", body.trim());
      const r = await fetch(`${API}/support/tickets`, { method: "POST", headers: H(), body: fd }).then((x) => x.json());
      if (r.success) { toast("Müraciət göndərildi", "success"); setCreating(false); setSubject(""); setBody(""); await load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  const sendReply = async () => {
    if (!sel || reply.trim().length < 1) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("body", reply.trim());
      const r = await fetch(`${API}/support/tickets/${sel.id}/reply`, { method: "POST", headers: H(), body: fd }).then((x) => x.json());
      if (r.success) { await open(sel.id); await load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  if (!isLoggedIn) return <div className="max-w-2xl mx-auto p-6 text-muted">Dəstəyə müraciət üçün daxil olun.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">Dəstək</h1>
        <button onClick={() => { setCreating(true); setSel(null); }} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold">+ Yeni müraciət</button>
      </div>
      <p className="text-sm text-muted mb-5">Sifariş, ödəniş, hesab və digər məsələlərlə bağlı bizə yazın.</p>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : sel ? (
        <div className="surface p-4">
          <button onClick={() => setSel(null)} className="text-xs text-muted mb-2">← Geri</button>
          <div className="flex items-start justify-between gap-2 mb-3">
            <h2 className="font-semibold">{sel.subject}</h2>
            <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS[sel.status]?.cls}`}>{STATUS[sel.status]?.label}</span>
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-3">
            {sel.messages?.map((m: any) => (
              <div key={m.id} className={`flex ${m.isAdmin ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.isAdmin ? "bg-input-bg" : "bg-orange-500 text-white"}`}>
                  <p className="text-[10px] opacity-70 mb-0.5">{m.isAdmin ? "Dəstək" : "Siz"}</p>
                  {m.body}
                  {m.images?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{m.images.map((im: string, i: number) => <img key={i} src={imgUrl(im)} alt="" className="w-14 h-14 rounded object-cover" />)}</div>}
                </div>
              </div>
            ))}
          </div>
          {sel.status !== "CLOSED" && (
            <div className="flex gap-2">
              <input value={reply} onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }} placeholder="Mesaj yazın..." className="flex-1 px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm" />
              <button onClick={sendReply} disabled={busy} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Göndər</button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.length === 0 ? <p className="text-muted text-sm py-8 text-center">Hələ müraciət yoxdur.</p> : tickets.map((t) => (
            <button key={t.id} onClick={() => open(t.id)} className="w-full text-left surface p-3.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate flex-1">{t.subject}</span>
                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS[t.status]?.cls}`}>{STATUS[t.status]?.label}</span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">{new Date(t.lastReplyAt).toLocaleDateString("az-AZ")}</p>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" onClick={() => setCreating(false)}>
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">Yeni müraciət</h3>
            <label className="block text-xs font-medium text-muted mb-1">Mövzu</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm mb-3" />
            <label className="block text-xs font-medium text-muted mb-1">Kateqoriya</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm mb-3">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label className="block text-xs font-medium text-muted mb-1">Mesaj</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm resize-none mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreating(false)} className="px-4 py-2 bg-input-bg border border-input-border rounded-lg text-sm">Ləğv</button>
              <button onClick={create} disabled={busy} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Göndər</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
