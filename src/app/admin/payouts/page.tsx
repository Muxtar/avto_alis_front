"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

interface SellerRow {
  sellerId: number; name: string; phone: string;
  available: number; pending: number; paidOut: number; commissionDueCash: number;
}
interface Payout { id: number; sellerId: number; sellerName: string; amount: number; method: string | null; reference: string | null; createdName: string; createdAt: string; }

const az = (n: number) => (n || 0).toLocaleString("az-AZ", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const [commission, setCommission] = useState("");
  const [savedCommission, setSavedCommission] = useState<number | null>(null);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [history, setHistory] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [payTo, setPayTo] = useState<SellerRow | null>(null);
  const [method, setMethod] = useState("Bank köçürməsi");
  const [reference, setReference] = useState("");

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);
  const H = () => ({ Authorization: `Bearer ${token()}` });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s, h] = await Promise.all([
        fetch(`${API}/admin/payouts/commission`, { headers: H() }).then((r) => r.json()),
        fetch(`${API}/admin/payouts/sellers${q ? `?q=${encodeURIComponent(q)}` : ""}`, { headers: H() }).then((r) => r.json()),
        fetch(`${API}/admin/payouts`, { headers: H() }).then((r) => r.json()),
      ]);
      if (c.success) { setSavedCommission(c.percent); if (commission === "") setCommission(String(c.percent)); }
      if (s.success) setSellers(s.sellers || []);
      if (h.success) setHistory(h.payouts || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const saveCommission = async () => {
    const p = parseFloat(commission);
    if (!Number.isFinite(p) || p < 0 || p > 100) { toast("Faiz 0-100 aralığında olmalıdır", "error"); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/admin/payouts/commission`, { method: "PATCH", headers: { ...H(), "Content-Type": "application/json" }, body: JSON.stringify({ percent: p }) }).then((x) => x.json());
      if (r.success) { setSavedCommission(r.percent); toast("Komissiya yadda saxlanıldı", "success"); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  const doPayout = async () => {
    if (!payTo) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/admin/payouts`, { method: "POST", headers: { ...H(), "Content-Type": "application/json" }, body: JSON.stringify({ sellerId: payTo.sellerId, method, reference }) }).then((x) => x.json());
      if (r.success) { toast(`${az(r.payout.amount)} AZN ödəniş qeydə alındı`, "success"); setPayTo(null); setReference(""); await load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  const download = async (path: string, filename: string) => {
    try {
      const res = await fetch(`${API}${path}`, { headers: H() });
      if (!res.ok) { toast("Export alınmadı", "error"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch { toast("Export alınmadı", "error"); }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Satıcı ödənişləri</h1>
      <p className="text-muted text-sm mb-4">Platforma komissiyası, satıcı balansları və ödənişlər (payout).</p>

      {/* Komissiya + export */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Platforma komissiyası (%)</label>
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={100} step={0.1} value={commission} onChange={(e) => setCommission(e.target.value)} className="w-28 px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm" />
            <button onClick={saveCommission} disabled={busy} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Yadda saxla</button>
            {savedCommission !== null && <span className="text-xs text-muted">Cari: {savedCommission}%</span>}
          </div>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => download("/admin/export/payouts.csv", "payouts.csv")} className="px-3 py-2 text-xs font-medium rounded-lg bg-input-bg border border-input-border hover:border-orange-500">⬇ Payout CSV</button>
          <button onClick={() => download("/admin/export/orders.csv", "orders.csv")} className="px-3 py-2 text-xs font-medium rounded-lg bg-input-bg border border-input-border hover:border-orange-500">⬇ Sifariş CSV</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Satıcı balansları */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Satıcı balansları</h2>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Satıcı axtar" className="px-3 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm w-40" />
            </div>
            <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-card-border">
              {sellers.length === 0 ? <p className="text-muted text-sm p-4 text-center">Balans yoxdur.</p> : sellers.map((s) => (
                <div key={s.sellerId} className="p-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] mt-0.5">
                      <span className="text-green-600 font-semibold">Ödəniləcək: {az(s.available)} ₼</span>
                      <span className="text-muted">Gözləyən: {az(s.pending)} ₼</span>
                      <span className="text-muted">Ödənilmiş: {az(s.paidOut)} ₼</span>
                      {s.commissionDueCash > 0 && <span className="text-amber-600">Nağd komissiya borcu: {az(s.commissionDueCash)} ₼</span>}
                    </div>
                  </div>
                  <button onClick={() => { setPayTo(s); setReference(""); }} disabled={s.available <= 0}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-40">Ödə</button>
                </div>
              ))}
            </div>
          </div>

          {/* Payout tarixçəsi */}
          <div>
            <h2 className="font-semibold mb-2">Ödəniş tarixçəsi</h2>
            <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-card-border max-h-[60vh] overflow-y-auto">
              {history.length === 0 ? <p className="text-muted text-sm p-4 text-center">Ödəniş yoxdur.</p> : history.map((p) => (
                <div key={p.id} className="p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.sellerName}</span>
                    <span className="font-bold text-green-600">{az(p.amount)} ₼</span>
                  </div>
                  <p className="text-[11px] text-muted">{p.method || "—"}{p.reference ? ` · ${p.reference}` : ""} · {p.createdName} · {new Date(p.createdAt).toLocaleDateString("az-AZ")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payout modal */}
      {payTo && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" onClick={() => setPayTo(null)}>
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">Ödəniş — {payTo.name}</h3>
            <p className="text-sm text-muted mb-3">Ödəniləcək məbləğ: <b className="text-green-600">{az(payTo.available)} ₼</b></p>
            <label className="block text-xs font-medium text-muted mb-1">Üsul</label>
            <input value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm mb-2" />
            <label className="block text-xs font-medium text-muted mb-1">Referans / qeyd</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Köçürmə nömrəsi və s." className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPayTo(null)} className="px-4 py-2 bg-input-bg border border-input-border rounded-lg text-sm">Ləğv</button>
              <button onClick={doPayout} disabled={busy} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Ödənişi təsdiqlə</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
