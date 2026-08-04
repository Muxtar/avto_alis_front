"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Açıq", cls: "bg-red-500/10 text-red-500" },
  PENDING: { label: "Cavablandı", cls: "bg-amber-500/10 text-amber-600" },
  RESOLVED: { label: "Həll olundu", cls: "bg-green-500/10 text-green-600" },
  CLOSED: { label: "Bağlı", cls: "bg-gray-500/10 text-gray-500" },
};
const CAT: Record<string, string> = { ORDER: "Sifariş", PAYMENT: "Ödəniş", ACCOUNT: "Hesab", LISTING: "Elan", OTHER: "Digər" };

export default function AdminSupportPage() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);
  const H = () => ({ Authorization: `Bearer ${token()}` });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/support?status=${filter}`, { headers: H() }).then((x) => x.json());
      if (r.success) setTickets(r.tickets || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const open = async (id: number) => {
    setSel(null); setUser(null); setReply("");
    try {
      const r = await fetch(`${API}/admin/support/${id}`, { headers: H() }).then((x) => x.json());
      if (r.success) { setSel(r.ticket); setUser(r.user); }
    } catch { toast("Xəta", "error"); }
  };

  const sendReply = async () => {
    if (!sel || reply.trim().length < 1) return;
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("body", reply.trim());
      const r = await fetch(`${API}/admin/support/${sel.id}/reply`, { method: "POST", headers: H(), body: fd }).then((x) => x.json());
      if (r.success) { setReply(""); await open(sel.id); await load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  const setStatus = async (status: string) => {
    if (!sel) return;
    try {
      const r = await fetch(`${API}/admin/support/${sel.id}/status`, { method: "PATCH", headers: { ...H(), "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then((x) => x.json());
      if (r.success) { await open(sel.id); await load(); toast("Status yeniləndi", "success"); }
    } catch { toast("Xəta", "error"); }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-4">Dəstək müraciətləri</h1>
      <div className="flex gap-1 bg-input-bg border border-input-border rounded-xl p-1 mb-4 w-fit">
        {["OPEN", "PENDING", "RESOLVED", "CLOSED", ""].map((s) => (
          <button key={s || "all"} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? "bg-orange-500 text-white" : "text-muted"}`}>{s ? STATUS[s].label : "Hamısı"}</button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {loading ? <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
            : tickets.length === 0 ? <p className="text-muted text-sm py-8 text-center">Müraciət yoxdur.</p>
            : tickets.map((t) => (
              <button key={t.id} onClick={() => open(t.id)} className={`w-full text-left surface p-3.5 ${sel?.id === t.id ? "border-orange-500/50" : ""}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold truncate">{t.subject}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-input-bg text-muted">{CAT[t.category] || t.category}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS[t.status]?.cls}`}>{STATUS[t.status]?.label}</span>
                </div>
                <p className="text-xs text-muted mt-1">{t.user?.name || "—"} · {new Date(t.lastReplyAt).toLocaleDateString("az-AZ")}</p>
              </button>
            ))}
        </div>

        {sel && (
          <div className="surface p-4 lg:sticky lg:top-4 h-fit">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h2 className="font-semibold">{sel.subject}</h2>
              <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS[sel.status]?.cls}`}>{STATUS[sel.status]?.label}</span>
            </div>
            <p className="text-xs text-muted mb-3">{user?.name} · {user?.phone}{user?.email ? ` · ${user.email}` : ""}</p>

            <div className="space-y-2 max-h-[45vh] overflow-y-auto mb-3">
              {sel.messages?.map((m: any) => (
                <div key={m.id} className={`flex ${m.isAdmin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.isAdmin ? "bg-orange-500 text-white" : "bg-input-bg"}`}>
                    <p className="text-[10px] opacity-70 mb-0.5">{m.senderName}</p>
                    {m.body}
                    {m.images?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{m.images.map((im: string, i: number) => <img key={i} src={imgUrl(im)} alt="" className="w-14 h-14 rounded object-cover" />)}</div>}
                  </div>
                </div>
              ))}
            </div>

            {sel.status !== "CLOSED" && (
              <>
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Cavab yazın..." className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm resize-none mb-2" />
                <div className="flex gap-2">
                  <button onClick={sendReply} disabled={busy} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Göndər</button>
                  <button onClick={() => setStatus("RESOLVED")} className="px-3 py-2 bg-green-500/10 text-green-600 rounded-xl text-sm font-semibold">Həll et</button>
                  <button onClick={() => setStatus("CLOSED")} className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm">Bağla</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
