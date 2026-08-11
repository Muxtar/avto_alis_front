"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

/**
 * MALİYYƏ — QRUPLAŞDIRILMIŞ GÖRÜNÜŞ.
 *
 * Düz siyahıda "kim kimə nə satdı" anlaşılmırdı. Burada üç səviyyə var:
 *
 *   Satıcı → Biznes → Obyekt → Sifariş (alıcı + məhsullar)
 *
 * Hər səviyyə açılıb-yığılır, hər səviyyədə satış sayı və məbləği görünür.
 * Satıcı, alıcı, biznes və obyekt adlarına klik etmək olur.
 */

const azn = (n: number) => n.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (s: string) => new Date(s).toLocaleDateString("az-AZ");

const PAY_LABEL: Record<string, string> = { CARD: "💳 Kart", CASH: "💵 Nağd", WALLET: "👛 Balans" };
const STATUS_CLS: Record<string, string> = {
  PAID: "bg-green-500/15 text-green-600",
  PENDING: "bg-amber-500/15 text-amber-600",
  FAILED: "bg-red-500/15 text-red-500",
  REFUNDED: "bg-slate-500/15 text-slate-500",
};

export default function FinanceTree() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [payStatus, setPayStatus] = useState("PAID");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Açıq düyünlər — açar: "s3", "s3-b7", "s3-b7-o12"
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const H = () => ({ Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}` });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ paymentStatus: payStatus });
      if (q.trim()) p.set("q", q.trim());
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const r = await fetch(`${API}/admin/finance-tree?${p}`, { headers: H() }).then((x) => x.json());
      if (r.success) setData(r); else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, payStatus, from, to]);
  useEffect(() => { load(); }, [load]);

  const sellers = data?.sellers || [];

  return (
    <div>
      {/* Filtrlər */}
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Satıcı və ya alıcı adı…"
          className="flex-1 min-w-[180px] px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm" />
        <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)}
          className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm">
          <option value="PAID">Ödənilmiş</option>
          <option value="PENDING">Gözləyən</option>
          <option value="REFUNDED">Qaytarılmış</option>
          <option value="all">Hamısı</option>
        </select>
        <label className="text-[11px] text-muted">Başlanğıc
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="block px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm" /></label>
        <label className="text-[11px] text-muted">Son
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="block px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm" /></label>
      </div>

      {/* Ümumi */}
      {data?.totals && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="surface p-3"><p className="text-[11px] text-muted">Satıcı</p><p className="text-lg font-extrabold">{data.totals.sellers}</p></div>
          <div className="surface p-3"><p className="text-[11px] text-muted">Sifariş</p><p className="text-lg font-extrabold">{data.totals.orders}</p></div>
          <div className="surface p-3"><p className="text-[11px] text-muted">Ümumi məbləğ</p><p className="text-lg font-extrabold text-green-600">{azn(data.totals.amount)} <span className="text-[11px] text-muted">AZN</span></p></div>
        </div>
      )}
      {data?.totals?.capped && (
        <p className="text-[11px] text-amber-600 mb-2">⚠ Çox nəticə var — yalnız son 2000 sifariş göstərilir. Tarix aralığı seçin.</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : sellers.length === 0 ? (
        <p className="text-muted text-sm py-10 text-center">Nəticə yoxdur.</p>
      ) : (
        <div className="space-y-2">
          {sellers.map((s: any) => {
            const sk = `s${s.id}`;
            const sOpen = open.has(sk);
            return (
              <div key={sk} className="surface overflow-hidden">
                {/* ── 1. SATICI ── */}
                <div className="flex items-center gap-2 p-3 hover:bg-input-bg/50 transition-colors">
                  <button onClick={() => toggle(sk)} className="shrink-0 w-6 h-6 rounded-lg bg-input-bg flex items-center justify-center text-xs">
                    {sOpen ? "−" : "+"}
                  </button>
                  <button onClick={() => toggle(sk)} className="min-w-0 flex-1 text-left">
                    <span className="font-bold block truncate">{s.name || "—"}</span>
                    <span className="text-[11px] text-muted">{s.phone || ""} · {s.businesses.length} biznes · {s.orders} satış</span>
                  </button>
                  <Link href={`/seller/${s.id}`} target="_blank"
                    className="shrink-0 px-2 py-1 rounded-lg border border-card-border text-[11px] font-semibold hover:bg-input-bg">
                    Profil ↗
                  </Link>
                  <span className="shrink-0 text-right">
                    <span className="block font-extrabold text-green-600 leading-none">{azn(s.amount)}</span>
                    <span className="text-[10px] text-muted">AZN</span>
                  </span>
                </div>

                {/* ── 2. BİZNESLƏR ── */}
                {sOpen && (
                  <div className="border-t border-card-border bg-input-bg/25 px-2 py-2 space-y-1.5">
                    {s.businesses.map((b: any) => {
                      const bk = `${sk}-b${b.id ?? 0}`;
                      const bOpen = open.has(bk);
                      return (
                        <div key={bk} className="bg-card border border-card-border rounded-xl overflow-hidden">
                          <div className="flex items-center gap-2 p-2.5">
                            <button onClick={() => toggle(bk)} className="shrink-0 w-5 h-5 rounded bg-input-bg flex items-center justify-center text-[11px]">
                              {bOpen ? "−" : "+"}
                            </button>
                            <button onClick={() => toggle(bk)} className="min-w-0 flex-1 text-left">
                              <span className="text-sm font-bold block truncate">🏢 {b.name}</span>
                              <span className="text-[11px] text-muted block truncate">
                                {b.voen ? `VÖEN ${b.voen}` : "VÖEN yoxdur"}
                                {b.createdBy ? ` · yaradan: ${b.createdBy.name}` : ""}
                                {b.createdAt ? ` · ${dt(b.createdAt)}` : ""}
                                {` · ${b.objects.length} obyekt · ${b.orders} satış`}
                              </span>
                            </button>
                            {b.id && (
                              <Link href={`/admin/businesses?id=${b.id}`}
                                className="shrink-0 px-2 py-1 rounded-lg border border-card-border text-[11px] font-semibold hover:bg-input-bg">
                                Biznes ↗
                              </Link>
                            )}
                            <span className="shrink-0 text-sm font-extrabold text-green-600">{azn(b.amount)} ₼</span>
                          </div>

                          {/* Biznesin başlıq məlumatı — açılanda ən üstdə */}
                          {bOpen && (
                            <div className="border-t border-card-border bg-input-bg/40 px-3 py-2 text-[11px] text-muted grid sm:grid-cols-2 gap-x-4 gap-y-0.5">
                              <span>Sahib: <b className="text-foreground">{b.ownerName || "—"}</b></span>
                              <span>Təsisçi: <b className="text-foreground">{b.founderName || "—"}</b></span>
                              <span>Status: <b className="text-foreground">{b.status || "—"}</b>{b.isActive === false ? " (deaktiv)" : ""}</span>
                              <span>Telefon: <b className="text-foreground">{b.phone || "—"}</b></span>
                              <span className="sm:col-span-2 pt-1 font-semibold text-foreground">
                                Bu biznesin ümumi satışı: <span className="text-green-600">{azn(b.amount)} AZN</span> ({b.orders} sifariş)
                              </span>
                            </div>
                          )}

                          {/* ── 3. OBYEKTLƏR ── */}
                          {bOpen && (
                            <div className="border-t border-card-border p-2 space-y-1.5">
                              {b.objects.map((ob: any) => {
                                const ok = `${bk}-o${ob.id ?? 0}`;
                                const oOpen = open.has(ok);
                                return (
                                  <div key={ok} className="border border-card-border rounded-lg overflow-hidden">
                                    <button onClick={() => toggle(ok)} className="w-full flex items-center gap-2 p-2 text-left hover:bg-input-bg/50 transition-colors">
                                      <span className="shrink-0 w-5 h-5 rounded bg-input-bg flex items-center justify-center text-[11px]">{oOpen ? "−" : "+"}</span>
                                      <span className="min-w-0 flex-1">
                                        <span className="text-[13px] font-semibold block truncate">📍 {ob.name}</span>
                                        <span className="text-[11px] text-muted block truncate">
                                          {[ob.city, ob.address].filter(Boolean).join(", ") || "ünvan yoxdur"} · {ob.orders} satış
                                        </span>
                                      </span>
                                      <span className="shrink-0 text-[13px] font-extrabold text-green-600">{azn(ob.amount)} ₼</span>
                                    </button>

                                    {/* ── 4. SİFARİŞLƏR ── */}
                                    {oOpen && (
                                      <div className="border-t border-card-border bg-input-bg/25 p-2 space-y-1.5">
                                        {ob.list.map((o: any) => (
                                          <div key={o.id} className="bg-card border border-card-border rounded-lg p-2.5">
                                            <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                              <span className="text-[11px] font-bold">
                                                #{o.id} · {dt(o.createdAt)}
                                                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_CLS[o.paymentStatus] || "bg-input-bg"}`}>
                                                  {o.paymentStatus}
                                                </span>
                                                <span className="ml-1.5 text-[10px] text-muted">{PAY_LABEL[o.paymentMethod] || o.paymentMethod}</span>
                                              </span>
                                              <span className="text-[11px] text-muted">
                                                Alıcı:{" "}
                                                {o.buyer ? (
                                                  <Link href={`/seller/${o.buyer.id}`} target="_blank" className="font-semibold text-[var(--brand-to)] hover:underline">
                                                    {o.buyer.name}
                                                  </Link>
                                                ) : "—"}
                                              </span>
                                            </div>
                                            {/* Hansı obyektdən hansı məhsul alınıb */}
                                            <ul className="space-y-0.5">
                                              {o.items.map((it: any) => (
                                                <li key={it.id} className="flex items-baseline justify-between gap-2 text-[12px]">
                                                  <span className="truncate">{it.title}{it.quantity > 1 && <span className="text-muted"> × {it.quantity}</span>}</span>
                                                  <span className="shrink-0 font-semibold">{azn(it.price * it.quantity)} ₼</span>
                                                </li>
                                              ))}
                                            </ul>
                                            <div className="mt-1 pt-1 border-t border-card-border/60 flex justify-between text-[11px]">
                                              <span className="text-muted">Sifariş cəmi</span>
                                              <span className="font-extrabold">{azn(o.total)} ₼</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
