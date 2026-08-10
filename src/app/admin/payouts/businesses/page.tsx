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

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);
  const H = () => ({ Authorization: `Bearer ${token()}`, "Content-Type": "application/json" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/payouts/businesses?q=${encodeURIComponent(q)}`, { headers: H() }).then((x) => x.json());
      if (r.success) { setRows(r.rows || []); setTotals(r.totals || null); }
      else toast(r.message || "Xəta", "error");
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
                  <p className="font-bold truncate">{r.name}</p>
                  <p className="text-[11px] text-muted">
                    {r.isBusiness ? `VÖEN: ${r.voen || "—"}` : "Şəxsi satıcı"} · {r.orders} sifariş
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
                      <p className="font-bold text-lg truncate">{detail.name}</p>
                      <p className="text-[11px] text-muted">
                        {detail.isBusiness ? `VÖEN: ${detail.voen || "—"}` : "Şəxsi satıcı"} · {detail.totals.count} sifariş
                      </p>
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
                        <div key={p.id} className="flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-input-bg/50">
                          <span className="text-muted">{new Date(p.createdAt).toLocaleString("az-AZ")} · {p.createdName}{p.reference ? ` · ${p.reference}` : ""}</span>
                          <span className="font-bold shrink-0">{azn(p.amount)} AZN</span>
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
