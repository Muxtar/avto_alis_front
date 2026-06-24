"use client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

const CAT_LABEL: Record<string, string> = {
  TIME_WASTED: "Vaxtı boşa xərclədi", FRAUD: "Fırıldaq", RUDE: "Kobud davranış", FAKE_INFO: "Saxta məlumat", OTHER: "Başqa",
};
const STATUS_LABEL: Record<string, string> = { OPEN: "Açıq", REVIEWING: "Baxılır", RESOLVED: "Həll olundu", REJECTED: "Rədd edildi" };

function fmt(sec: number) { const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, "0")}`; }

export default function AdminComplaintsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("OPEN");
  const [sel, setSel] = useState<any>(null);
  const [evidence, setEvidence] = useState<any>(null);
  const [note, setNote] = useState("");
  const [refund, setRefund] = useState(false);
  const [suspend, setSuspend] = useState(false);
  const [busy, setBusy] = useState(false);

  const headers: any = { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/complaints?status=${filter}`, { headers }).then((x) => x.json());
      setItems(r.complaints || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (id: number) => {
    setSel(null); setEvidence(null); setNote(""); setRefund(false); setSuspend(false);
    try {
      const r = await fetch(`${API}/admin/complaints/${id}`, { headers }).then((x) => x.json());
      if (r.success) { setSel(r.complaint); setEvidence(r.evidence); }
    } catch { toast("Xəta", "error"); }
  };

  const resolve = async (status: "RESOLVED" | "REJECTED") => {
    if (!sel) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/admin/complaints/${sel.id}/resolve`, {
        method: "POST", headers,
        body: JSON.stringify({ status, adminNote: note, refund, suspend }),
      }).then((x) => x.json());
      if (r.success) { toast("Şikayət həll olundu ✓", "success"); setSel(null); setEvidence(null); await load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  return (
    <div className="p-3 sm:p-6">
      <h1 className="text-xl font-bold mb-4">Şikayətlər</h1>
      <div className="flex gap-1 bg-input-bg border border-input-border rounded-xl p-1 mb-4 w-fit">
        {["OPEN", "RESOLVED", "REJECTED", ""].map((s) => (
          <button key={s || "all"} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? "bg-orange-500 text-white" : "text-muted"}`}>
            {s ? STATUS_LABEL[s] : "Hamısı"}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Siyahı */}
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : items.length === 0 ? (
            <p className="text-muted text-sm py-8 text-center">Şikayət yoxdur.</p>
          ) : items.map((c) => (
            <button key={c.id} onClick={() => openDetail(c.id)} className={`w-full text-left surface p-3.5 ${sel?.id === c.id ? "border-orange-500/50" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{c.target?.name}</span>
                <span className="text-[11px] text-muted">← {c.complainant?.name}</span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-red-500/10 text-red-500">{CAT_LABEL[c.category] || c.category}</span>
                {c.consultationId && <span className="text-[11px] text-blue-500">seans #{c.consultationId}</span>}
                <span className="ml-auto text-[11px] text-muted">{STATUS_LABEL[c.status]}</span>
              </div>
              <p className="text-xs text-muted mt-1 line-clamp-2">{c.description}</p>
              {c.target?.complaintFlags > 0 && <p className="text-[11px] text-amber-500 mt-1">⚠ Bu şəxsə {c.target.complaintFlags} təsdiqlənmiş şikayət</p>}
            </button>
          ))}
        </div>

        {/* Detal + dəlil */}
        {sel && (
          <div className="surface p-4 lg:sticky lg:top-4 h-fit">
            <h2 className="font-semibold mb-1">{sel.target?.name} <span className="text-xs text-muted">({CAT_LABEL[sel.category]})</span></h2>
            <p className="text-xs text-muted mb-2">Şikayətçi: {sel.complainant?.name}{sel.target?.consultationSuspended && <span className="text-red-500"> · peşəkar dayandırılıb</span>}</p>
            <p className="text-sm bg-input-bg rounded-xl p-3 mb-3">{sel.description}</p>

            {/* DƏLİL siqnalları */}
            {evidence && (
              <div className="mb-3 p-3 bg-input-bg/50 border border-input-border rounded-xl">
                <p className="text-xs font-semibold text-muted mb-2">🔎 Dəlil (avtomatik)</p>
                {evidence.proNeverResponded && <p className="text-xs text-red-500 font-semibold mb-1">⚠ Peşəkar aktiv seansda HEÇ cavab verməyib!</p>}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <span>Aktiv vaxt: <b>{fmt(evidence.activeSeconds)}</b> / {fmt(evidence.durationSeconds)}</span>
                  <span>Peşəkar mesajı: <b className={evidence.proMessageCount === 0 ? "text-red-500" : ""}>{evidence.proMessageCount}</b></span>
                  <span>Alıcı mesajı: <b>{evidence.buyerMessageCount}</b></span>
                  <span>İlk cavab: <b>{evidence.firstProResponseGapSec != null ? fmt(evidence.firstProResponseGapSec) : "—"}</b></span>
                  <span>Qiymət: <b>{evidence.price} AZN</b></span>
                  <span>Ödəniş: <b>{evidence.paymentStatus}</b></span>
                </div>
                {evidence.messages?.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1 border-t border-input-border pt-2">
                    {evidence.messages.map((m: any) => (
                      <p key={m.id} className="text-[11px]"><b className={m.who === "professional" ? "text-orange-500" : "text-blue-500"}>{m.who === "professional" ? "Peşəkar" : "Alıcı"}:</b> {m.content}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {sel.status === "OPEN" ? (
              <>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Admin qeydi (istəyə bağlı)" className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm resize-none mb-2" />
                <div className="flex flex-col gap-1.5 mb-3 text-sm">
                  {evidence?.refundable && (
                    <label className="flex items-center gap-2"><input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} className="w-4 h-4 accent-orange-500" /> Alıcıya geri ödəniş et ({evidence.price} AZN)</label>
                  )}
                  <label className="flex items-center gap-2"><input type="checkbox" checked={suspend} onChange={(e) => setSuspend(e.target.checked)} className="w-4 h-4 accent-orange-500" /> Peşəkarın Rəy təkliflərini dayandır</label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resolve("RESOLVED")} disabled={busy} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Təsdiqlə (haqlı)</button>
                  <button onClick={() => resolve("REJECTED")} disabled={busy} className="flex-1 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm font-semibold disabled:opacity-50">Rədd et</button>
                </div>
              </>
            ) : (
              <div className="text-sm">
                <p className="font-medium">Nəticə: {STATUS_LABEL[sel.status]} {sel.resolution && `· ${sel.resolution}`}</p>
                {sel.adminNote && <p className="text-muted text-xs mt-1">{sel.adminNote}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
