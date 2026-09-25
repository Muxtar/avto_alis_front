"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

// REFERAL ÖDƏNİŞLƏRİ — referrerlərə (link ilə satanlara) komissiya ödənişi.
// Çatdırılma + saxlama müddəti bitəndən sonra AVAILABLE olur; "Ödə" hamısını bir payout-la bağlayır.

interface Referrer { referrerId: number; name: string | null; phone: string | null; iban: string | null; payeeName: string | null; available: number; pending: number; paidOut: number }
interface Clawback { orderId: number; referrerId: number; amount: number }
interface SellerOwe { sellerId: number; name: string | null; phone: string | null; amount: number }
interface RefPayout { id: number; referrerId: number; referrerName: string | null; amount: number; iban: string | null; payeeName: string | null; method: string | null; reference: string | null; createdName: string; createdAt: string }

const az = (n: number) => (n || 0).toLocaleString("az-AZ", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function ReferralPayouts() {
  const { toast } = useToast();
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [clawbacks, setClawbacks] = useState<Clawback[]>([]);
  const [sellersOwe, setSellersOwe] = useState<SellerOwe[]>([]);
  const [history, setHistory] = useState<RefPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [payTo, setPayTo] = useState<Referrer | null>(null);
  const [method, setMethod] = useState("Bank köçürməsi");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const H = () => ({ Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}` });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        fetch(`${API}/admin/referral/payables`, { headers: H() }).then((r) => r.json()),
        fetch(`${API}/admin/referral/payouts`, { headers: H() }).then((r) => r.json()),
      ]);
      if (p.success) { setReferrers(p.referrers || []); setClawbacks(p.clawbacks || []); setSellersOwe(p.sellersOwe || []); }
      else toast(p.message || "Referal balansları yüklənmədi", "error");
      if (h.success) setHistory(h.payouts || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast("Kopyalandı", "success"); } catch { toast("Kopyalanmadı", "error"); }
  };

  const doPayout = async () => {
    if (!payTo) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/admin/referral/payouts`, {
        method: "POST", headers: { ...H(), "Content-Type": "application/json" },
        body: JSON.stringify({ referrerId: payTo.referrerId, method: method || undefined, reference: reference || undefined }),
      }).then((x) => x.json());
      if (r.success) { toast(`${az(r.payout?.amount ?? payTo.available)} AZN referal ödənişi qeydə alındı`, "success"); setPayTo(null); setReference(""); await load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  const nameOf = (id: number) => referrers.find((r) => r.referrerId === id)?.name || `#${id}`;

  return (
    <div className="mt-8 border-t border-card-border pt-6">
      <h2 className="text-lg sm:text-xl font-bold mb-1">Referal ödənişləri</h2>
      <p className="text-muted text-sm mb-4">Link ilə satanlara komissiya. Çatdırılma və qaytarma müddəti bitəndən sonra ödənilə bilər.</p>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {clawbacks.length > 0 && (
            <div className="mb-4 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <p className="font-semibold mb-1">⚠ Geri alınmalı referal ödənişləri ({clawbacks.length}) — artıq ödənilib, sonra sifariş qaytarılıb:</p>
              <ul className="space-y-0.5">
                {clawbacks.map((c, i) => (
                  <li key={`${c.orderId}-${i}`}>Sifariş #{c.orderId} · {nameOf(c.referrerId)} · <b>{az(c.amount)} ₼</b></li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-5">
            <div>
              <h3 className="font-semibold mb-2">Referrer balansları</h3>
              <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-card-border">
                {referrers.length === 0 ? <p className="text-muted text-sm p-4 text-center">Referal balansı yoxdur.</p> : referrers.map((r) => (
                  <div key={r.referrerId} className="p-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.name || `#${r.referrerId}`} <span className="text-[11px] text-muted font-normal">{r.phone || ""}</span></p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] mt-0.5">
                        <span className="text-green-600 font-semibold">Ödəniləcək: {az(r.available)} ₼</span>
                        <span className="text-muted">Gözləyən: {az(r.pending)} ₼</span>
                        <span className="text-muted">Ödənilmiş: {az(r.paidOut)} ₼</span>
                      </div>
                      {r.iban ? (
                        <div className="flex items-center gap-1.5 text-[11px] mt-1">
                          <span className="font-mono">{r.iban}</span>
                          <button onClick={() => copy(r.iban!)} className="px-1.5 py-0.5 rounded bg-input-bg border border-input-border hover:border-orange-500" title="IBAN-ı kopyala">📋</button>
                          {r.payeeName && (
                            <>
                              <span className="text-muted">· {r.payeeName}</span>
                              <button onClick={() => copy(r.payeeName!)} className="px-1.5 py-0.5 rounded bg-input-bg border border-input-border hover:border-orange-500" title="Adı kopyala">📋</button>
                            </>
                          )}
                        </div>
                      ) : <p className="text-[11px] text-amber-600 mt-1">IBAN qeyd edilməyib</p>}
                    </div>
                    <button onClick={() => { setPayTo(r); setReference(""); }} disabled={r.available <= 0}
                      className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-40">Ödə</button>
                  </div>
                ))}
              </div>

              <h3 className="font-semibold mb-2 mt-5">Satıcıların nağd referal borcu</h3>
              <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-card-border">
                {sellersOwe.length === 0 ? <p className="text-muted text-sm p-4 text-center">Borc yoxdur.</p> : sellersOwe.map((s) => (
                  <div key={s.sellerId} className="p-3 flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{s.name || `#${s.sellerId}`} <span className="text-[11px] text-muted">{s.phone || ""}</span></span>
                    <span className="font-bold text-amber-600 whitespace-nowrap">{az(s.amount)} ₼</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Referal ödəniş tarixçəsi</h3>
              <div className="bg-card border border-card-border rounded-xl overflow-hidden divide-y divide-card-border max-h-[60vh] overflow-y-auto">
                {history.length === 0 ? <p className="text-muted text-sm p-4 text-center">Ödəniş yoxdur.</p> : history.map((p) => (
                  <div key={p.id} className="p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{p.referrerName || `#${p.referrerId}`}</span>
                      <span className="font-bold text-green-600">{az(p.amount)} ₼</span>
                    </div>
                    <p className="text-[11px] text-muted">
                      {p.method || "—"}{p.reference ? ` · ${p.reference}` : ""}{p.iban ? ` · ${p.iban}` : ""}{p.payeeName ? ` (${p.payeeName})` : ""} · {p.createdName} · {new Date(p.createdAt).toLocaleDateString("az-AZ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {payTo && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" onClick={() => setPayTo(null)}>
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">Referal ödənişi — {payTo.name || `#${payTo.referrerId}`}</h3>
            <p className="text-sm text-muted mb-1">Ödəniləcək məbləğ: <b className="text-green-600">{az(payTo.available)} ₼</b></p>
            <p className="text-[11px] text-muted mb-3">{payTo.iban ? <>IBAN: <span className="font-mono">{payTo.iban}</span>{payTo.payeeName ? ` · ${payTo.payeeName}` : ""}</> : <span className="text-amber-600">IBAN qeyd edilməyib</span>}</p>
            <label className="block text-xs font-medium text-muted mb-1">Üsul</label>
            <input value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm mb-2" />
            <label className="block text-xs font-medium text-muted mb-1">Referans / qeyd (istəyə bağlı)</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Köçürmə nömrəsi və s." className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setPayTo(null)} className="px-4 py-2 bg-input-bg border border-input-border rounded-lg text-sm">Ləğv</button>
              <button onClick={doPayout} disabled={busy} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{busy ? "..." : "Ödənişi təsdiqlə"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
