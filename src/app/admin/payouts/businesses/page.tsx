"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

/**
 * BİZNES ÜZRƏ HESABLAŞMA.
 *
 * Müştəri kartla ödəyir → pul platformanın hesabına gəlir. Bu ekran hansı
 * biznesə nə qədər borclu olduğumuzu göstərir. İşçimiz BANKDAN biznesin
 * IBAN-ına köçürür, sonra burada həmin sətirləri "ödənildi" işarələyir.
 *
 * DİQQƏT: bu ekran pul köçürməsi ETMİR — yalnız uçotu bağlayır.
 * Yeni alışlar avtomatik olaraq yenidən "ödənilməmiş" siyahısına düşür.
 */

interface Row {
  key: string; businessId: number | null; sellerId: number;
  name: string; voen: string | null; isBusiness: boolean;
  // Sahibi biznesi silib — borcumuz qalır, yenə də ödəməliyik.
  deleted?: boolean; ownerName?: string | null; phone?: string | null;
  iban: string | null; bankTitle: string | null;
  unpaid: number; pending: number; commission: number; gross: number; orders: number;
}
interface Line {
  ledgerId: number; orderId: number; createdAt: string;
  buyer: { id: number; name: string } | null;
  items: { id: number; title: string; quantity: number; price: number }[];
  gross: number; commission: number; commissionRate: number; net: number;
  orderStatus: string | null; paymentMethod: string | null;
}

const azn = (n: number) => n.toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminBusinessPayoutsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<{ unpaid: number; pending: number; commission: number } | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // Açılmış biznes detalı
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [reference, setReference] = useState("");
  const [paying, setPaying] = useState(false);
  // Alıcı müdafiəsi pəncərəsi (gün) — bu müddət bitənə qədər pul ödənilə bilməz.
  const [holdDays, setHoldDays] = useState("");
  const [savedHold, setSavedHold] = useState<number | null>(null);
  // Ödənişdən SONRA ləğv/qaytarma olan sifarişlər — pul satıcıdan geri alınmalıdır.
  const [claw, setClaw] = useState<{ total: number; rows: any[] } | null>(null);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);
  const H = () => ({ Authorization: `Bearer ${token()}`, "Content-Type": "application/json" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, h, c] = await Promise.all([
        fetch(`${API}/admin/payouts/businesses?q=${encodeURIComponent(q)}`, { headers: H() }).then((x) => x.json()),
        fetch(`${API}/admin/payouts/hold-days`, { headers: H() }).then((x) => x.json()).catch(() => null),
        fetch(`${API}/admin/payouts/clawbacks`, { headers: H() }).then((x) => x.json()).catch(() => null),
      ]);
      if (r.success) { setRows(r.rows || []); setTotals(r.totals || null); }
      else toast(r.message || "Xəta", "error");
      if (h?.success) { setSavedHold(h.days); setHoldDays((v) => (v === "" ? String(h.days) : v)); }
      if (c?.success) setClaw({ total: c.total, rows: c.rows || [] });
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (key: string) => {
    setOpenKey(key); setDetail(null); setPicked(new Set()); setReference(""); setDetailLoading(true);
    try {
      const r = await fetch(`${API}/admin/payouts/businesses/${key}`, { headers: H() }).then((x) => x.json());
      if (r.success) {
        setDetail(r);
        // Default: hamısı seçili — adətən hamısı birlikdə köçürülür.
        setPicked(new Set((r.lines || []).map((l: Line) => l.ledgerId)));
      } else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setDetailLoading(false); }
  };

  const lines: Line[] = detail?.lines || [];
  const pickedTotal = useMemo(
    () => lines.filter((l) => picked.has(l.ledgerId)).reduce((s, l) => s + l.net, 0),
    [lines, picked],
  );

  const toggle = (id: number) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allPicked = lines.length > 0 && picked.size === lines.length;

  const saveHold = async () => {
    const d = parseInt(holdDays);
    if (!Number.isFinite(d) || d < 0 || d > 90) { toast("0–90 gün arası yazın", "error"); return; }
    try {
      const r = await fetch(`${API}/admin/payouts/hold-days`, { method: "PATCH", headers: H(), body: JSON.stringify({ days: d }) }).then((x) => x.json());
      if (r.success) { setSavedHold(r.days); toast(`Saxlama müddəti ${r.days} gün oldu`, "success"); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); }
  };

  const reversePayout = async (id: number, amount: number) => {
    const reason = prompt(`${azn(amount)} AZN-lik ödənişi geri alırsınız. Səbəb yazın:`);
    if (!reason?.trim()) return;
    try {
      const r = await fetch(`${API}/admin/payouts/${id}/reverse`, { method: "POST", headers: H(), body: JSON.stringify({ reason }) }).then((x) => x.json());
      if (r.success) { toast(`Geri alındı — ${r.restored} sətir yenidən ödəniləcək`, "success"); setOpenKey(null); load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); }
  };

  const resolveClaw = async (id: number) => {
    const note = prompt("Necə həll olundu? (məs. növbəti ödənişdən tutuldu)");
    if (note === null) return;
    try {
      const r = await fetch(`${API}/admin/payouts/clawbacks/${id}/resolve`, { method: "POST", headers: H(), body: JSON.stringify({ note }) }).then((x) => x.json());
      if (r.success) { toast("İşarə götürüldü", "success"); load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); }
  };

  const markPaid = async () => {
    if (picked.size === 0) { toast("Ən azı bir sifariş seçin", "error"); return; }
    if (!confirm(`${picked.size} sifariş · ${azn(pickedTotal)} AZN — bankdan köçürmə edildiyini təsdiqləyirsiniz?`)) return;
    setPaying(true);
    try {
      const r = await fetch(`${API}/admin/payouts/businesses/${openKey}/pay`, {
        method: "POST", headers: H(),
        body: JSON.stringify({ ledgerIds: [...picked], method: "BANK", reference: reference.trim() }),
      }).then((x) => x.json());
      if (r.success) {
        toast(`${azn(r.amount)} AZN ödənildi olaraq işarələndi (${r.paidCount} sifariş)`, "success");
        setOpenKey(null); setDetail(null); load();
      } else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setPaying(false); }
  };

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Biznes hesablaşması</h1>
      <p className="text-muted text-sm mb-4">
        Kartla ödənişlərdə pul <b>bizim hesaba</b> gəlir. Burada hansı biznesə nə qədər borclu olduğumuz görünür.
        Bankdan köçürmə edildikdən sonra sifarişləri seçib <b>“Ödənildi”</b> işarələyin —
        bu ekran pul köçürmür, yalnız uçotu bağlayır.
      </p>

      {/* Ümumi göstəricilər */}
      {totals && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="surface p-3">
            <p className="text-[11px] text-muted">Ödəniləcək (hazır)</p>
            <p className="text-lg font-extrabold text-green-600">{azn(totals.unpaid)} <span className="text-[11px] text-muted">AZN</span></p>
          </div>
          <div className="surface p-3">
            <p className="text-[11px] text-muted">Gözləyir (çatdırılmayıb)</p>
            <p className="text-lg font-extrabold text-amber-600">{azn(totals.pending)} <span className="text-[11px] text-muted">AZN</span></p>
          </div>
          <div className="surface p-3">
            <p className="text-[11px] text-muted">Bizim komissiya</p>
            <p className="text-lg font-extrabold">{azn(totals.commission)} <span className="text-[11px] text-muted">AZN</span></p>
          </div>
        </div>
      )}

      {/* Alıcı müdafiəsi pəncərəsi — çatdırılandan sonra pul bu qədər gün bizdə qalır */}
      <div className="surface p-3 mb-3 flex items-center gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">🛡 Alıcı müdafiəsi pəncərəsi</p>
          <p className="text-[11px] text-muted">
            Sifariş çatdırıldıqdan sonra pul bu qədər gün <b>bizdə qalır</b>. Bu müddət bitməmiş
            satıcıya ödəniş edilə bilməz — qaytarma tələbi çıxsa pul hələ bizdədir. 0 = saxlama yoxdur.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input type="number" min={0} max={90} value={holdDays} onChange={(e) => setHoldDays(e.target.value)}
            className="w-20 px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm text-center" />
          <span className="text-xs text-muted">gün</span>
          <button onClick={saveHold} disabled={savedHold !== null && String(savedHold) === holdDays}
            className="px-3 py-1.5 rounded-lg text-white text-xs font-bold disabled:opacity-40" style={{ background: "var(--brand-to)" }}>
            Yadda saxla
          </button>
        </div>
      </div>

      {/* Ödənişdən SONRA ləğv/qaytarma olanlar — pul satıcıdan geri alınmalıdır */}
      {claw && claw.rows.length > 0 && (
        <div className="mb-3 border-2 border-red-500/40 bg-red-500/5 rounded-xl p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-bold text-red-600">⚠ Geri alınmalı pullar</p>
            <span className="text-sm font-extrabold text-red-600">{azn(claw.total)} AZN</span>
          </div>
          <p className="text-[11px] text-muted mb-2">
            Bu sifarişlər <b>satıcıya ödəniş edildikdən sonra</b> ləğv/qaytarma oldu. Pul satıcının bankındadır —
            sistem avtomatik geri ala bilmir. Satıcı ilə həll edin (məs. növbəti ödənişdən tutun), sonra “Həll olundu” basın.
          </p>
          <div className="space-y-1">
            {claw.rows.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-2 bg-card rounded-lg px-2.5 py-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {c.businessName || c.sellerName} <span className="font-normal text-muted">· sifariş #{c.orderId}</span>
                  </p>
                  <p className="text-[11px] text-muted truncate">{c.clawbackReason}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-extrabold text-red-600">{azn(c.netAmount)} ₼</span>
                  <button onClick={() => resolveClaw(c.id)}
                    className="px-2 py-1 rounded-lg border border-card-border text-[11px] font-semibold hover:bg-input-bg">
                    Həll olundu
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Biznes adı və ya IBAN üzrə axtar…"
        className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm mb-4" />

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-muted text-sm py-10 text-center">Ödəniləcək hesablaşma yoxdur.</p>
      ) : (
        /* ── BİZNES KARTLARI — üzərinə klik edib detala keçilir ── */
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((r) => (
            <button key={r.key} onClick={() => openDetail(r.key)}
              className="surface p-4 text-left hover:border-orange-500/60 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="font-bold truncate">
                    {r.name}
                    {r.deleted && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[10px] font-bold align-middle">🗑 silinib</span>}
                  </p>
                  <p className="text-[11px] text-muted">
                    {r.isBusiness ? `VÖEN: ${r.voen || "—"}` : "Şəxsi satıcı"} · {r.orders} sifariş
                    {r.phone ? ` · ${r.phone}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-right">
                  <span className="block text-lg font-extrabold text-green-600 leading-none">{azn(r.unpaid)}</span>
                  <span className="text-[10px] text-muted font-semibold">AZN ödəniləcək</span>
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                {r.iban ? (
                  <span className="px-2 py-0.5 rounded bg-input-bg border border-input-border font-mono">{r.iban}</span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 font-semibold">⚠ Bank hesabı yoxdur</span>
                )}
                {r.pending > 0 && <span className="text-amber-600">Gözləyir: {azn(r.pending)} AZN</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── DETAL: bütün alınmış məhsullar alt-alta, seçimli ── */}
      {openKey && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
          onClick={() => !paying && setOpenKey(null)}>
          <div className="bg-card text-foreground w-full max-w-3xl rounded-none sm:rounded-2xl border border-card-border my-0 sm:my-6"
            onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : !detail ? null : (
              <>
                {/* Başlıq + bank hesabı */}
                <div className="p-4 border-b border-card-border sticky top-0 bg-card z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-lg truncate">
                        {detail.name}
                        {detail.deleted && <span className="ml-2 px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[11px] font-bold align-middle">🗑 silinib</span>}
                      </p>
                      <p className="text-[11px] text-muted">
                        {detail.isBusiness ? `VÖEN: ${detail.voen || "—"}` : "Şəxsi satıcı"} · {detail.totals.count} sifariş
                        {detail.phone ? ` · ${detail.phone}` : ""}
                      </p>
                      {detail.deleted && (
                        <p className="text-[11px] mt-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-500">
                          Sahibi bu biznesi silib{detail.deletedAt ? ` (${new Date(detail.deletedAt).toLocaleDateString("az-AZ")})` : ""}, amma qazancı hələ ödənilməyib — aşağıdakı məbləği bank hesabına köçürün.
                        </p>
                      )}
                      {detail.iban ? (
                        <p className="text-[11px] mt-1">
                          Köçürmə hesabı: <span className="font-mono font-semibold">{detail.iban}</span>
                          {detail.bankTitle ? ` · ${detail.bankTitle}` : ""}
                          <button onClick={() => { navigator.clipboard?.writeText(detail.iban); toast("IBAN kopyalandı", "success"); }}
                            className="ml-2 text-[var(--brand-to)] font-semibold">kopyala</button>
                        </p>
                      ) : (
                        <p className="text-[11px] mt-1 text-red-500 font-semibold">⚠ Bu biznesin aktiv bank hesabı yoxdur — köçürmə edilə bilməz.</p>
                      )}
                    </div>
                    <button onClick={() => setOpenKey(null)} className="shrink-0 p-1 text-muted hover:text-foreground">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  {/* Seçilmiş cəm — ən üstdə */}
                  <div className="mt-3 flex items-center justify-between gap-3 bg-input-bg/60 rounded-xl px-3 py-2">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input type="checkbox" checked={allPicked}
                        onChange={() => setPicked(allPicked ? new Set() : new Set(lines.map((l) => l.ledgerId)))} />
                      Hamısını seç ({picked.size}/{lines.length})
                    </label>
                    <span className="text-right">
                      <span className="block text-xl font-extrabold text-green-600 leading-none">{azn(pickedTotal)}</span>
                      <span className="text-[10px] text-muted font-semibold">AZN seçilmiş</span>
                    </span>
                  </div>
                </div>

                {/* Sifarişlər — hər birinin içində məhsullar */}
                <div className="p-4 space-y-2 max-h-[55vh] overflow-y-auto">
                  {lines.length === 0 ? (
                    <p className="text-muted text-sm py-8 text-center">Ödəniləcək sifariş yoxdur.</p>
                  ) : lines.map((l) => {
                    const on = picked.has(l.ledgerId);
                    return (
                      <div key={l.ledgerId}
                        onClick={() => toggle(l.ledgerId)}
                        className={`rounded-xl border p-3 cursor-pointer transition-colors ${on ? "border-green-500 bg-green-500/5" : "border-card-border hover:bg-input-bg/50"}`}>
                        <div className="flex items-start gap-2.5">
                          <input type="checkbox" checked={on} onChange={() => toggle(l.ledgerId)} onClick={(e) => e.stopPropagation()} className="mt-1 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-xs font-bold">
                                Sifariş #{l.orderId}
                                <span className="ml-2 font-normal text-muted">{new Date(l.createdAt).toLocaleDateString("az-AZ")}</span>
                              </p>
                              <p className="text-[11px] text-muted">Alıcı: <b className="text-foreground">{l.buyer?.name || "—"}</b></p>
                            </div>
                            {/* Alınmış məhsullar alt-alta, qarşılarında qiymət */}
                            <ul className="mt-1.5 space-y-0.5">
                              {l.items.map((it) => (
                                <li key={it.id} className="flex items-baseline justify-between gap-2 text-[12px]">
                                  <span className="truncate">{it.title} {it.quantity > 1 && <span className="text-muted">× {it.quantity}</span>}</span>
                                  <span className="shrink-0 font-semibold">{azn(it.price * it.quantity)} AZN</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-1.5 pt-1.5 border-t border-card-border/60 flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-muted">
                                Cəmi {azn(l.gross)} − komissiya {azn(l.commission)} ({l.commissionRate}%)
                              </span>
                              <span className="font-extrabold text-green-600 text-sm">{azn(l.net)} AZN</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ödənildi işarələ */}
                <div className="p-4 border-t border-card-border sticky bottom-0 bg-card">
                  <input value={reference} onChange={(e) => setReference(e.target.value)}
                    placeholder="Bank köçürmə referansı / qeyd (istəyə bağlı)"
                    className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm mb-2" />
                  <button onClick={markPaid} disabled={paying || picked.size === 0}
                    className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-50"
                    style={{ background: picked.size ? "#16a34a" : "var(--muted)" }}>
                    {paying ? "İşlənir…" : `✓ Ödənildi — ${azn(pickedTotal)} AZN (${picked.size} sifariş)`}
                  </button>
                  <p className="text-[11px] text-muted text-center mt-2">
                    Pul köçürməsi bankda edilir. Bu düymə yalnız uçotu bağlayır və satıcıya bildiriş göndərir.
                  </p>
                </div>

                {/* Əvvəlki ödənişlər */}
                {detail.payouts?.length > 0 && (
                  <div className="px-4 pb-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-1.5">Əvvəlki ödənişlər</p>
                    <div className="space-y-1">
                      {detail.payouts.map((p: any) => (
                        <div key={p.id} className={`flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-lg ${p.reversedAt ? "bg-red-500/10" : "bg-input-bg/50"}`}>
                          <span className="text-muted min-w-0 truncate">
                            {new Date(p.createdAt).toLocaleString("az-AZ")} · {p.createdName}{p.reference ? ` · ${p.reference}` : ""}
                            {p.reversedAt && <b className="text-red-600"> · GERİ ALINDI ({p.reversedReason})</b>}
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={`font-bold ${p.reversedAt ? "line-through text-muted" : ""}`}>{azn(p.amount)} AZN</span>
                            {!p.reversedAt && (
                              <button onClick={() => reversePayout(p.id, p.amount)}
                                className="px-2 py-0.5 rounded border border-red-500/40 text-red-600 font-semibold hover:bg-red-500/10">
                                geri al
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
