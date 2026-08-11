"use client";
import { useEffect, useState, useCallback, Fragment } from "react";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import FinanceTree from "./FinanceTree";

interface Person { id: number; name: string | null; phone: string | null; email?: string | null }
interface Item { title: string; quantity: number; price: number }
interface Txn {
  id: number;
  createdAt: string;
  total: number;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
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
const PAY_STYLE: Record<string, string> = {
  PAID: "text-emerald-600 bg-emerald-500/10", PENDING: "text-amber-600 bg-amber-500/10",
  FAILED: "text-red-500 bg-red-500/10", REFUNDED: "text-blue-500 bg-blue-500/10",
};
const PAY_LABEL: Record<string, string> = { PAID: "Ödənildi", PENDING: "Gözləyir", FAILED: "Uğursuz", REFUNDED: "İadə edildi" };

// Çatdırılma / sifariş statusu — "urun karsi tarafa ulasmismi" cavabı.
const DLV: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Satıcı təsdiqi gözlənir", cls: "text-amber-600 bg-amber-500/10" },
  CONFIRMED: { label: "Satıcı qəbul etdi", cls: "text-blue-600 bg-blue-500/10" },
  SHIPPED: { label: "Yolda", cls: "text-indigo-600 bg-indigo-500/10" },
  DELIVERED: { label: "✓ Alıcıya çatdı", cls: "text-emerald-600 bg-emerald-500/10" },
  CANCELLED: { label: "Ləğv / iadə", cls: "text-red-500 bg-red-500/10" },
};

export default function AdminFinancePage() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [view, setView] = useState<"tree" | "list">("tree");
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [method, setMethod] = useState("all");
  const [payStatus, setPayStatus] = useState("all");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const H = () => ({ Authorization: `Bearer ${token}` });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "25", method, paymentStatus: payStatus });
    if (q) params.set("q", q);
    fetch(`${API}/admin/finance?${params.toString()}`, { headers: H() })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.message);
        setSummary(d.summary); setTxns(d.transactions || []); setTotalPages(d.totalPages || 1);
      })
      .catch((e) => toast(e?.message || "Yüklənmədi", "error"))
      .finally(() => setLoading(false));
  }, [page, method, payStatus, q, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: number) => {
    if (openId === id) { setOpenId(null); setDetail(null); return; }
    setOpenId(id); setDetail(null); setDetailLoading(true);
    try {
      const d = await fetch(`${API}/admin/finance/${id}`, { headers: H() }).then((x) => x.json());
      if (d.success) setDetail(d);
      else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setDetailLoading(false); }
  };

  const remove = async (id: number) => {
    if (!confirm(`Sifariş #${id} tamamilə silinsin? (geri qaytarıla bilməz)`)) return;
    setDeleting(true);
    try {
      const d = await fetch(`${API}/admin/finance/${id}`, { method: "DELETE", headers: H() }).then((x) => x.json());
      if (d.success) { toast("Silindi", "success"); setOpenId(null); setDetail(null); load(); }
      else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setDeleting(false); }
  };

  const exportCsv = async () => {
    try {
      const res = await fetch(`${API}/admin/export/orders.csv`, { headers: H() });
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "orders.csv"; a.click(); URL.revokeObjectURL(url);
    } catch { toast("Export alınmadı", "error"); }
  };

  const cards = summary ? [
    { label: "Bizə gələn (Kart)", value: azn(summary.cardPaidTotal), sub: `${summary.cardPaidCount} ödəniş · merchant hesabımıza`, accent: "border-emerald-500/30 bg-emerald-500/5", val: "text-emerald-600" },
    { label: "Nağd (satıcıya birbaşa)", value: azn(summary.cashPaidTotal), sub: `${summary.cashPaidCount} ödəniş · bizə gəlmir`, accent: "border-card-border", val: "text-foreground" },
    { label: "Ümumi dövriyyə", value: azn(summary.allPaidTotal), sub: `${summary.allPaidCount} ödənilmiş sifariş`, accent: "border-blue-500/30 bg-blue-500/5", val: "text-blue-600" },
    { label: "İadə edilmiş", value: azn(summary.refundedTotal), sub: `${summary.refundedCount} sifariş`, accent: "border-card-border", val: "text-red-500" },
  ] : [];

  return (
    <div className="max-w-6xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Maliyyə</h1>
          <p className="text-muted text-sm mt-1">Kim kimdən hansı məhsulu neçəyə aldı, çatdı-çatmadı.</p>
        </div>
        <button onClick={exportCsv} className="shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-input-bg border border-input-border hover:border-orange-500">⬇ CSV</button>
      </div>

      {/* Görünüş seçimi:
          • Qruplaşdırılmış — Satıcı → Biznes → Obyekt → Sifariş (anlaşıqlı)
          • Siyahı — köhnə düz cədvəl (axtarış/filtr üçün rahatdır) */}
      <div className="flex gap-1 bg-input-bg border border-input-border rounded-xl p-1 mb-4 w-fit">
        <button onClick={() => setView("tree")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === "tree" ? "bg-orange-500 text-white" : "text-muted"}`}>
          🗂 Qruplaşdırılmış
        </button>
        <button onClick={() => setView("list")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === "list" ? "bg-orange-500 text-white" : "text-muted"}`}>
          ☰ Siyahı
        </button>
      </div>

      {view === "tree" ? <FinanceTree /> : (
      <>

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

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(qInput.trim()); }} className="flex-1 flex gap-2">
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Alıcı / satıcı adı və ya nömrə…" className="flex-1 px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
          <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold whitespace-nowrap">Axtar</button>
        </form>
        <select value={method} onChange={(e) => { setPage(1); setMethod(e.target.value); }} className="px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm">
          <option value="all">Bütün ödəniş növləri</option><option value="CARD">Kart</option><option value="CASH">Nağd</option><option value="WALLET">Balans</option>
        </select>
        <select value={payStatus} onChange={(e) => { setPage(1); setPayStatus(e.target.value); }} className="px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm">
          <option value="all">Bütün statuslar</option><option value="PAID">Ödənildi</option><option value="PENDING">Gözləyir</option><option value="FAILED">Uğursuz</option><option value="REFUNDED">İadə edildi</option>
        </select>
      </div>

      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-card-border">
                <th className="px-3 py-3 font-semibold">Tarix</th>
                <th className="px-3 py-3 font-semibold">Sifariş</th>
                <th className="px-3 py-3 font-semibold">Alıcı</th>
                <th className="px-3 py-3 font-semibold">Satıcı</th>
                <th className="px-3 py-3 font-semibold">Məhsullar</th>
                <th className="px-3 py-3 font-semibold text-right">Məbləğ</th>
                <th className="px-3 py-3 font-semibold">Ödəniş</th>
                <th className="px-3 py-3 font-semibold">Çatdırılma</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted"><span className="inline-block w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin align-middle mr-2" /> Yüklənir…</td></tr>
              ) : txns.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">Nəticə yoxdur</td></tr>
              ) : txns.map((t) => (
                <Fragment key={t.id}>
                  <tr onClick={() => toggle(t.id)} className={`cursor-pointer hover:bg-input-bg/50 ${openId === t.id ? "bg-input-bg/40" : ""}`}>
                    <td className="px-3 py-3 whitespace-nowrap text-muted text-xs">{dt(t.createdAt)}</td>
                    <td className="px-3 py-3 font-mono text-xs">#{t.id}{t.gatewayRef ? <span className="block text-[10px] text-muted">{t.gatewayRef}</span> : null}</td>
                    <td className="px-3 py-3"><div className="font-medium">{t.buyer?.name || "—"}</div><div className="text-[11px] text-muted">{t.buyer?.phone || ""}</div></td>
                    <td className="px-3 py-3"><div className="font-medium">{t.seller?.name || "—"}</div><div className="text-[11px] text-muted">{t.seller?.phone || ""}</div></td>
                    <td className="px-3 py-3 max-w-[200px]"><div className="text-xs text-muted truncate" title={t.items.map((i) => `${i.title} ×${i.quantity}`).join(", ")}>{t.items.map((i) => `${i.title} ×${i.quantity}`).join(", ") || "—"}</div></td>
                    <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">{azn(t.total)}<span className="block text-[10px] text-muted font-normal">{METHOD_LABEL[t.paymentMethod]}</span></td>
                    <td className="px-3 py-3"><span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${PAY_STYLE[t.paymentStatus] || "text-muted bg-input-bg"}`}>{PAY_LABEL[t.paymentStatus] || t.paymentStatus}</span></td>
                    <td className="px-3 py-3"><span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${DLV[t.status]?.cls || "text-muted bg-input-bg"}`}>{DLV[t.status]?.label || t.status}</span></td>
                  </tr>
                  {openId === t.id && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 bg-input-bg/30">
                        {detailLoading || !detail ? (
                          <div className="text-center text-muted text-sm py-4"><span className="inline-block w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin align-middle mr-2" /> Yüklənir…</div>
                        ) : (
                          <DetailPanel d={detail} onDelete={() => remove(t.id)} deleting={deleting} />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-card-border text-sm disabled:opacity-40">Əvvəlki</button>
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-card-border text-sm disabled:opacity-40">Sonrakı</button>
        </div>
      )}
      </>
      )}
    </div>
  );
}

function DetailPanel({ d, onDelete, deleting }: { d: any; onDelete: () => void; deleting: boolean }) {
  const o = d.order; const l = d.ledger;
  const yLabel = o.yangoStatus ? o.yangoStatus : null;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Məhsullar */}
      <div>
        <p className="text-xs font-bold text-muted uppercase mb-2">Məhsullar</p>
        <div className="space-y-2">
          {o.items.map((it: any, i: number) => (
            <div key={i} className="flex items-center gap-2.5 bg-card rounded-lg p-2 border border-card-border">
              {it.listing?.images?.[0]
                ? <img src={imgUrl(it.listing.images[0])} alt="" className="w-11 h-11 rounded object-cover shrink-0" />
                : <div className="w-11 h-11 rounded bg-input-bg shrink-0" />}
              <div className="min-w-0 flex-1"><p className="text-sm font-medium line-clamp-1">{it.title}</p><p className="text-[11px] text-muted">{it.quantity} × {azn(it.price)}</p></div>
              <span className="text-sm font-semibold">{azn(it.price * it.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tərəflər + çatdırılma */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-xs font-bold text-muted uppercase mb-1">Alıcı</p><p className="text-sm font-medium">{o.buyer?.name}</p><p className="text-[11px] text-muted">{o.buyer?.phone}</p>{o.buyer?.email && <p className="text-[11px] text-muted">{o.buyer.email}</p>}</div>
          <div><p className="text-xs font-bold text-muted uppercase mb-1">Satıcı</p><p className="text-sm font-medium">{o.seller?.name}</p><p className="text-[11px] text-muted">{o.seller?.phone}</p></div>
        </div>
        <div>
          <p className="text-xs font-bold text-muted uppercase mb-1">Çatdırılma</p>
          <p className="text-sm">{DLV[o.status]?.label || o.status} · {o.deliveryType === "PICKUP" ? "Götürmə" : (o.deliveryMethod === "SELF" ? "Satıcı özü" : "Kuryer (Yango)")}</p>
          {o.address && <p className="text-[11px] text-muted">📍 {o.address}</p>}
          {yLabel && <p className="text-[11px] text-muted">🛵 Yango: {yLabel}</p>}
          {o.yangoError && <p className="text-[11px] text-red-500">⚠ Yango: {o.yangoError}</p>}
          {o.courier && <p className="text-[11px] text-muted">Kuryer: {o.courier.name} · {o.courier.phone}</p>}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <span className="text-muted">Ödəniş: <b className="text-foreground">{METHOD_LABEL[o.paymentMethod]} · {PAY_LABEL[o.paymentStatus] || o.paymentStatus}</b></span>
          {o.gatewayRef && <span className="text-muted">Ref: <b className="font-mono text-foreground">{o.gatewayRef}</b></span>}
          <span className="text-muted">Yaradıldı: <b className="text-foreground">{dt(o.createdAt)}</b></span>
          {o.paidAt && <span className="text-muted">Ödənildi: <b className="text-foreground">{dt(o.paidAt)}</b></span>}
          <span className="text-muted">Cəmi: <b className="text-foreground">{azn(o.total)}</b></span>
          {o.deliveryFee ? <span className="text-muted">Çatdırılma haqqı: <b className="text-foreground">{azn(o.deliveryFee)}</b></span> : null}
        </div>
        {l && (
          <div className="text-[11px] bg-card rounded-lg p-2 border border-card-border">
            <span className="text-muted">Satıcı hesablaşması: </span>
            <b>{azn(l.grossAmount)}</b> − komissiya <b>{azn(l.commission)}</b> ({l.commissionRate}%) = net <b className="text-emerald-600">{azn(l.netAmount)}</b> · <span className="uppercase">{l.status}</span>
          </div>
        )}
        {o.returnRequests?.length > 0 && (
          <div className="text-[11px] text-amber-600">İadə sorğusu: {o.returnRequests.map((r: any) => `${r.orderItem?.title || ""} (${r.status})`).join(", ")}</div>
        )}
        <div className="flex justify-end pt-1">
          <button onClick={onDelete} disabled={deleting} className="px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 disabled:opacity-50">🗑 Sifarişi sil</button>
        </div>
      </div>
    </div>
  );
}
