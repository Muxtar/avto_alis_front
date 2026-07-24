"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

interface Person { id: number; name: string | null; phone: string | null }
interface Item { title: string; quantity: number; price: number }
interface Txn {
  id: number;
  createdAt: string;
  total: number;
  paymentMethod: "CASH" | "CARD" | "WALLET";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  gatewayProvider: string | null;
  gatewayRef: string | null;
  referralAmount: number | null;
  buyer: Person | null;
  seller: Person | null;
  items: Item[];
}
interface Summary {
  cardPaidTotal: number; cardPaidCount: number;
  cashPaidTotal: number; cashPaidCount: number;
  refundedTotal: number; refundedCount: number;
  allPaidTotal: number; allPaidCount: number;
  referralPayable: number;
}

const azn = (n: number) => `${(n || 0).toFixed(2)} ₼`;
const dt = (s: string) => new Date(s).toLocaleString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const METHOD_LABEL: Record<string, string> = { CASH: "Nağd", CARD: "Kart", WALLET: "Balans" };
const STATUS_STYLE: Record<string, string> = {
  PAID: "text-emerald-600 bg-emerald-500/10",
  PENDING: "text-amber-600 bg-amber-500/10",
  FAILED: "text-red-500 bg-red-500/10",
  REFUNDED: "text-blue-500 bg-blue-500/10",
};
const STATUS_LABEL: Record<string, string> = { PAID: "Ödənildi", PENDING: "Gözləyir", FAILED: "Uğursuz", REFUNDED: "İadə edildi" };

export default function AdminFinancePage() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [method, setMethod] = useState("all");
  const [payStatus, setPayStatus] = useState("all");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "25", method, paymentStatus: payStatus });
    if (q) params.set("q", q);
    fetch(`${API}/admin/finance?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.message);
        setSummary(d.summary);
        setTxns(d.transactions || []);
        setTotalPages(d.totalPages || 1);
      })
      .catch((e) => toast(e?.message || "Yüklənmədi", "error"))
      .finally(() => setLoading(false));
  }, [page, method, payStatus, q, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const cards = summary ? [
    { label: "Bizə gələn (Kart)", value: azn(summary.cardPaidTotal), sub: `${summary.cardPaidCount} ödəniş · merchant hesabımıza`, accent: "border-emerald-500/30 bg-emerald-500/5", val: "text-emerald-600" },
    { label: "Nağd (satıcıya birbaşa)", value: azn(summary.cashPaidTotal), sub: `${summary.cashPaidCount} ödəniş · bizə gəlmir`, accent: "border-card-border", val: "text-foreground" },
    { label: "Ümumi dövriyyə", value: azn(summary.allPaidTotal), sub: `${summary.allPaidCount} ödənilmiş sifariş`, accent: "border-blue-500/30 bg-blue-500/5", val: "text-blue-600" },
    { label: "İadə edilmiş", value: azn(summary.refundedTotal), sub: `${summary.refundedCount} sifariş`, accent: "border-card-border", val: "text-red-500" },
  ] : [];

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Maliyyə</h1>
        <p className="text-muted text-sm mt-1">Kim kimdən aldı, nə qədər ödədi və merchant hesabımıza (kart) nə qədər pul gəldi.</p>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-2xl border p-4 ${c.accent}`}>
            <p className="text-[11px] text-muted font-medium">{c.label}</p>
            <p className={`text-lg sm:text-xl font-bold mt-1 ${c.val}`}>{c.value}</p>
            <p className="text-[10px] text-muted mt-1 leading-tight">{c.sub}</p>
          </div>
        ))}
      </div>

      {summary && summary.referralPayable > 0 && (
        <div className="mb-4 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          Referrerlərə ödəniləcək komissiya: <b>{azn(summary.referralPayable)}</b>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <form
          onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(qInput.trim()); }}
          className="flex-1 flex gap-2"
        >
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Alıcı / satıcı adı və ya nömrə…"
            className="flex-1 px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          />
          <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold whitespace-nowrap">Axtar</button>
        </form>
        <select value={method} onChange={(e) => { setPage(1); setMethod(e.target.value); }} className="px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm">
          <option value="all">Bütün ödəniş növləri</option>
          <option value="CARD">Kart</option>
          <option value="CASH">Nağd</option>
          <option value="WALLET">Balans</option>
        </select>
        <select value={payStatus} onChange={(e) => { setPage(1); setPayStatus(e.target.value); }} className="px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm">
          <option value="all">Bütün statuslar</option>
          <option value="PAID">Ödənildi</option>
          <option value="PENDING">Gözləyir</option>
          <option value="FAILED">Uğursuz</option>
          <option value="REFUNDED">İadə edildi</option>
        </select>
      </div>

      {/* İşlem tablosu */}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-card-border">
                <th className="px-4 py-3 font-semibold">Tarix</th>
                <th className="px-4 py-3 font-semibold">Sifariş</th>
                <th className="px-4 py-3 font-semibold">Alıcı</th>
                <th className="px-4 py-3 font-semibold">Satıcı</th>
                <th className="px-4 py-3 font-semibold">Məhsullar</th>
                <th className="px-4 py-3 font-semibold">Növ</th>
                <th className="px-4 py-3 font-semibold text-right">Məbləğ</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">
                  <span className="inline-block w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin align-middle mr-2" /> Yüklənir…
                </td></tr>
              ) : txns.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Nəticə yoxdur</td></tr>
              ) : txns.map((t) => (
                <tr key={t.id} className="hover:bg-input-bg/50">
                  <td className="px-4 py-3 whitespace-nowrap text-muted text-xs">{dt(t.createdAt)}</td>
                  <td className="px-4 py-3 font-mono text-xs">#{t.id}{t.gatewayRef ? <span className="block text-[10px] text-muted">{t.gatewayRef}</span> : null}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.buyer?.name || "—"}</div>
                    <div className="text-[11px] text-muted">{t.buyer?.phone || ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{t.seller?.name || "—"}</div>
                    <div className="text-[11px] text-muted">{t.seller?.phone || ""}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <div className="text-xs text-muted truncate" title={t.items.map((i) => `${i.title} ×${i.quantity}`).join(", ")}>
                      {t.items.map((i) => `${i.title} ×${i.quantity}`).join(", ") || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{METHOD_LABEL[t.paymentMethod] || t.paymentMethod}</span>
                    {t.paymentMethod === "CARD" && t.gatewayProvider && <span className="block text-[10px] text-muted uppercase">{t.gatewayProvider}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{azn(t.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${STATUS_STYLE[t.paymentStatus] || "text-muted bg-input-bg"}`}>
                      {STATUS_LABEL[t.paymentStatus] || t.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-card-border text-sm disabled:opacity-40">Əvvəlki</button>
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-card-border text-sm disabled:opacity-40">Sonrakı</button>
        </div>
      )}
    </div>
  );
}
