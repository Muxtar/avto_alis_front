"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

/**
 * MALİYYƏ — SATICI ÜZRƏ GÖRÜNÜŞ.
 *
 *   Satıcı → Biznes → Obyekt → Sifariş
 *
 * Bu ekran YALNIZ GÖSTƏRİR — "kim kimə nə satdı, nə qədər".
 * Satıcıya ödəniş "Biznes hesablaşması" bölməsindən edilir (təkrar olmasın).
 */

const azn = (n: number) => n.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (s: string) => new Date(s).toLocaleDateString("az-AZ");

// Satıcıya ödəniş vəziyyəti — sadə, rəngli və bir baxışda anlaşılan.
const LEDGER: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: "Ödəniləcək", cls: "bg-amber-500/15 text-amber-600" },
  PAID_OUT: { label: "✓ Ödənildi", cls: "bg-green-500/15 text-green-600" },
  PENDING: { label: "Gözləyir", cls: "bg-slate-500/15 text-slate-500" },
  REVERSED: { label: "Ləğv", cls: "bg-red-500/15 text-red-500" },
};

export default function FinanceTree() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [payStatus, setPayStatus] = useState("PAID");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const H = () => ({ Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`, "Content-Type": "application/json" });

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
      {/* ── Filtrlər ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Satıcı və ya alıcı adı…"
          className="flex-1 min-w-[200px] px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm" />
        <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)}
          className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm">
          <option value="PAID">Ödənilmiş sifarişlər</option>
          <option value="PENDING">Gözləyən</option>
          <option value="REFUNDED">Qaytarılmış</option>
          <option value="all">Hamısı</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="Başlanğıc"
          className="px-2 py-2 bg-input-bg border border-input-border rounded-xl text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="Son"
          className="px-2 py-2 bg-input-bg border border-input-border rounded-xl text-sm" />
      </div>

      {data?.totals?.capped && (
        <p className="text-[11px] text-amber-600 mb-2">⚠ Çox nəticə var — son 2000 sifariş göstərilir. Tarix aralığı seçin.</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : sellers.length === 0 ? (
        <p className="text-muted text-sm py-10 text-center">Nəticə yoxdur.</p>
      ) : (
        <div className="space-y-2.5">
          {sellers.map((s: any) => {
            const sk = `s${s.id}`;
            const sOpen = open.has(sk);
            return (
              <div key={sk} className="surface overflow-hidden">
                {/* ── SATICI ── */}
                <div className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-input-bg/40 transition-colors" onClick={() => toggle(sk)}>
                  <span className="shrink-0 w-9 h-9 rounded-full bg-[var(--brand-soft)] text-[var(--brand-to)] flex items-center justify-center font-bold">
                    {(s.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{s.name || "—"}</p>
                    <p className="text-[11px] text-muted">{s.businesses.length} biznes · {s.orders} satış</p>
                  </div>
                  <Link href={`/seller/${s.id}`} target="_blank" onClick={(e) => e.stopPropagation()}
                    className="shrink-0 px-2.5 py-1 rounded-lg border border-card-border text-[11px] font-semibold hover:bg-input-bg">Profil ↗</Link>
                  <div className="shrink-0 text-right">
                    <p className="font-extrabold text-lg leading-none">{azn(s.amount)}<span className="text-[10px] text-muted font-bold ml-0.5">₼</span></p>
                  </div>
                  <span className="shrink-0 text-muted text-lg w-4 text-center">{sOpen ? "⌄" : "›"}</span>
                </div>

                {/* ── BİZNESLƏR ── */}
                {sOpen && (
                  <div className="border-t border-card-border bg-input-bg/20 p-2 space-y-2">
                    {s.businesses.map((b: any) => {
                      const bk = `${sk}-b${b.id ?? 0}`;
                      const bOpen = open.has(bk);
                      return (
                        <div key={bk} className="bg-card border border-card-border rounded-xl overflow-hidden">
                          <div className="flex items-center gap-2.5 p-3 cursor-pointer hover:bg-input-bg/40 transition-colors" onClick={() => toggle(bk)}>
                            <span className="shrink-0 text-lg">🏢</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold truncate">{b.name}</p>
                              <p className="text-[11px] text-muted truncate">
                                {b.voen ? `VÖEN ${b.voen}` : "VÖEN yoxdur"} · {b.objects.length} obyekt · {b.orders} satış
                              </p>
                            </div>
                            {b.id && (
                              <Link href={`/admin/businesses?id=${b.id}`} onClick={(e) => e.stopPropagation()}
                                className="shrink-0 px-2.5 py-1 rounded-lg border border-card-border text-[11px] font-semibold hover:bg-input-bg">Biznes ↗</Link>
                            )}
                            <p className="shrink-0 font-extrabold">{azn(b.amount)}<span className="text-[10px] text-muted ml-0.5">₼</span></p>
                            <span className="shrink-0 text-muted w-4 text-center">{bOpen ? "⌄" : "›"}</span>
                          </div>

                          {bOpen && (
                            <>
                              {/* Biznes kartı — sadə açar/dəyər */}
                              <div className="border-t border-card-border bg-input-bg/40 px-3 py-2.5 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
                                <span className="text-muted">Sahib: <b className="text-foreground">{b.ownerName || "—"}</b></span>
                                <span className="text-muted">Təsisçi: <b className="text-foreground">{b.founderName || "—"}</b></span>
                                <span className="text-muted">Yaradan: <b className="text-foreground">{b.createdBy?.name || "—"}</b></span>
                                <span className="text-muted">Status: <b className="text-foreground">{b.status || "—"}</b></span>
                              </div>

                              {/* ── OBYEKTLƏR ── */}
                              <div className="border-t border-card-border p-2 space-y-2">
                                {b.objects.map((ob: any) => {
                                  const ok = `${bk}-o${ob.id ?? 0}`;
                                  const oOpen = open.has(ok);
                                  const payableCount = ob.list.filter((o: any) => o.payable).length;
                                  return (
                                    <div key={ok} className="border border-card-border rounded-lg overflow-hidden">
                                      <div className="flex items-center gap-2.5 p-2.5 cursor-pointer hover:bg-input-bg/40 transition-colors" onClick={() => toggle(ok)}>
                                        <span className="shrink-0">📍</span>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-[13px] font-semibold truncate">{ob.name}</p>
                                          <p className="text-[11px] text-muted truncate">
                                            {[ob.city, ob.address].filter(Boolean).join(", ") || "ünvan yoxdur"} · {ob.orders} satış
                                          </p>
                                        </div>
                                        {payableCount > 0 && (
                                          <span className="shrink-0 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-600 text-[11px] font-bold">
                                            {payableCount} ödəniləcək
                                          </span>
                                        )}
                                        <p className="shrink-0 text-[13px] font-extrabold">{azn(ob.amount)}<span className="text-[10px] text-muted ml-0.5">₼</span></p>
                                        <span className="shrink-0 text-muted w-4 text-center">{oOpen ? "⌄" : "›"}</span>
                                      </div>

                                      {/* ── SİFARİŞLƏR ── */}
                                      {oOpen && (
                                        <div className="border-t border-card-border bg-input-bg/20 p-2 space-y-2">
                                          {ob.list.map((o: any) => {
                                            const lg = o.ledgerStatus ? LEDGER[o.ledgerStatus] : null;
                                            return (
                                              <div key={o.id} className="bg-card border border-card-border rounded-lg p-3">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                  <span className="text-[11px] font-bold">#{o.id}</span>
                                                  <span className="text-[11px] text-muted">{dt(o.createdAt)}</span>
                                                  {lg && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${lg.cls}`}>{lg.label}</span>}
                                                  <span className="ml-auto text-[11px] text-muted truncate">
                                                    Alıcı:{" "}
                                                    {o.buyer ? (
                                                      <Link href={`/seller/${o.buyer.id}`} target="_blank" onClick={(e) => e.stopPropagation()}
                                                        className="font-semibold text-[var(--brand-to)] hover:underline">{o.buyer.name}</Link>
                                                    ) : "—"}
                                                  </span>
                                                </div>
                                                <ul className="space-y-0.5">
                                                  {o.items.map((it: any) => (
                                                    <li key={it.id} className="flex items-baseline justify-between gap-2 text-[12px]">
                                                      <span className="truncate">{it.title}{it.quantity > 1 && <span className="text-muted"> × {it.quantity}</span>}</span>
                                                      <span className="shrink-0 font-semibold">{azn(it.price * it.quantity)} ₼</span>
                                                    </li>
                                                  ))}
                                                </ul>
                                                <div className="mt-1.5 pt-1.5 border-t border-card-border/60 flex items-center justify-between text-[11px]">
                                                  <span className="text-muted">
                                                    Alış {azn(o.total)} ₼
                                                    {o.commission != null && <> · komissiya {azn(o.commission)} ₼</>}
                                                  </span>
                                                  {o.net != null && (
                                                    <span className="font-extrabold text-green-600 text-sm">Satıcıya {azn(o.net)} ₼</span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
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
