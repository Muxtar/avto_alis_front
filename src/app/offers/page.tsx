"use client";
// QİYMƏT TƏKLİFLƏRİ — alıcı məhsula öz qiymətini təklif edir, satıcı qəbul /
// rədd / əks-təklif edir. Qəbul olunan qiymətlə 48 saat ərzində alış mümkündür:
// «Bu qiymətlə al» məhsulu razılaşdırılmış qiymət və sabit sayla səbətə qoyur.
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useLive } from "@/lib/live";
import { useCart } from "@/lib/CartContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { formatPrice, formatPostedAt } from "@/lib/format";

type Role = "buying" | "selling";
type OfferStatus = "PENDING" | "COUNTERED" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "EXPIRED" | "USED";

interface Offer {
  id: number;
  listingId: number;
  buyerId: number;
  sellerId: number;
  quantity: number;
  listPrice: number;
  unitPrice: number;
  counterPrice: number | null;
  message: string | null;
  sellerNote: string | null;
  status: OfferStatus;
  statusLabel?: string;
  finalPrice: number | null;
  source: "OFFER" | "INQUIRY";
  expiresAt: string | null;
  acceptedUntil: string | null;
  orderId: number | null;
  createdAt: string;
  updatedAt: string;
  listing: { id: number; title: string; images: string[]; price: number; stock: number } | null;
  counterparty: { id: number; name: string; avatar: string | null } | null;
}

const STATUS: Record<OfferStatus, { label: string; pill: string; accent: string }> = {
  PENDING:   { label: "⏳ Cavab gözləyir", pill: "bg-amber-500/10 text-amber-600 border-amber-500/30",    accent: "bg-gradient-to-b from-amber-300 to-amber-500" },
  COUNTERED: { label: "↔ Əks-təklif",      pill: "bg-violet-500/10 text-violet-600 border-violet-500/30", accent: "bg-gradient-to-b from-violet-400 to-purple-600" },
  ACCEPTED:  { label: "✅ Qəbul edildi",    pill: "bg-green-500/10 text-green-600 border-green-500/30",    accent: "bg-gradient-to-b from-emerald-400 to-green-600" },
  USED:      { label: "🛒 Alındı",          pill: "bg-blue-500/10 text-blue-600 border-blue-500/30",       accent: "bg-gradient-to-b from-sky-400 to-blue-600" },
  REJECTED:  { label: "✕ Rədd edildi",     pill: "bg-red-500/10 text-red-600 border-red-500/30",          accent: "bg-gradient-to-b from-rose-400 to-red-600" },
  CANCELLED: { label: "Ləğv edildi",        pill: "bg-gray-500/10 text-gray-500 border-gray-500/30",       accent: "bg-gradient-to-b from-gray-300 to-gray-500" },
  EXPIRED:   { label: "⌛ Vaxtı bitdi",     pill: "bg-gray-500/10 text-gray-500 border-gray-500/30",       accent: "bg-gradient-to-b from-gray-300 to-gray-500" },
};

const ACTIVE: OfferStatus[] = ["PENDING", "COUNTERED", "ACCEPTED"];

/** «1 gün 5 saat» / «3 saat 12 dəq» / «8 dəq». */
function leftText(ms: number): string {
  const min = Math.max(1, Math.floor(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} gün${h > 0 ? ` ${h} saat` : ""}`;
  if (h > 0) return `${h} saat${m > 0 ? ` ${m} dəq` : ""}`;
  return `${m} dəq`;
}

/** Bu təklifdə hazırda MƏNDƏN addım gözlənilirmi? */
function needsMine(o: Offer, role: Role, now: number): boolean {
  if (role === "selling") return o.status === "PENDING";
  if (o.status === "COUNTERED") return true;
  return o.status === "ACCEPTED" && !!o.acceptedUntil && new Date(o.acceptedUntil).getTime() > now;
}

export default function OffersPage() {
  const { toast } = useToast();
  const { token, isLoggedIn, authLoading } = useAuth();
  const { refreshCart } = useCart();
  const router = useRouter();

  const [tab, setTab] = useState<Role>("buying");
  const [buying, setBuying] = useState<{ offers: Offer[]; needsAction: number }>({ offers: [], needsAction: 0 });
  const [selling, setSelling] = useState<{ offers: Offer[]; needsAction: number }>({ offers: [], needsAction: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "CLOSED">("ALL");
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  // Geri sayım üçün «indi» — render zamanı Date.now() çağırmırıq.
  const [now, setNow] = useState(() => Date.now());
  // Satıcının əks-təklif / rədd formu (bir anda bir kart).
  const [formFor, setFormFor] = useState<{ id: number; kind: "counter" | "reject" } | null>(null);
  const [counterPrice, setCounterPrice] = useState("");
  const [note, setNote] = useState("");
  const scrolledRef = useRef(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // `silent` — anlıq yeniləmədə spinner göstərmə.
  const fetchAll = (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    Promise.all([
      fetch(`${API}/me/offers?role=buyer`, { headers }).then((r) => r.json()),
      fetch(`${API}/me/offers?role=seller`, { headers }).then((r) => r.json()),
    ]).then(([b, s]) => {
      setBuying({ offers: b.offers || [], needsAction: b.needsAction || 0 });
      setSelling({ offers: s.offers || [], needsAction: s.needsAction || 0 });
    }).catch(() => { if (!silent) toast("Xəta baş verdi", "error"); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, authLoading, token]);

  // Bildirişdən gələndə: ?tab=selling və ?id=<təklif>.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("tab") === "selling") setTab("selling");
    const id = parseInt(sp.get("id") || "");
    if (id) setHighlightId(id);
  }, []);

  // Seçilmiş təklif başqa bölmədədirsə ora keç və ona sürüşdür.
  useEffect(() => {
    if (!highlightId || loading || scrolledRef.current) return;
    const inBuy = buying.offers.some((o) => o.id === highlightId);
    const inSell = selling.offers.some((o) => o.id === highlightId);
    if (!inBuy && !inSell) return;
    scrolledRef.current = true;
    if (inSell && !inBuy) setTab("selling");
    else if (inBuy && !inSell) setTab("buying");
    setFilter("ALL");
    setTimeout(() => document.getElementById(`offer-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    const tm = setTimeout(() => setHighlightId(null), 6000);
    return () => clearTimeout(tm);
  }, [highlightId, loading, buying.offers, selling.offers]);

  // Geri sayım — dəqiqədə bir kifayətdir (mətn saat/dəqiqə dəqiqliyindədir).
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);

  // ANLIQ: qarşı tərəf cavab verəndə (bildiriş gəlir) və ya sifariş yarananda.
  useLive(["order", "notification"], () => fetchAll(true));

  const done = (r: any, okMsg: string) => {
    if (!r || r.success === false) { toast(r?.message || "Xəta baş verdi", "error"); return false; }
    toast(okMsg, "success");
    fetchAll(true);
    return true;
  };

  const buyerAction = async (o: Offer, action: "accept_counter" | "reject_counter" | "cancel") => {
    if (action === "cancel" && !confirm("Təklifi ləğv etmək istəyirsiniz?")) return;
    if (action === "reject_counter" && !confirm("Satıcının əks-təklifini rədd etmək istəyirsiniz?")) return;
    setBusyId(o.id);
    const r = await fetch(`${API}/offers/${o.id}/buyer`, { method: "PUT", headers, body: JSON.stringify({ action }) })
      .then((x) => x.json()).catch(() => null);
    setBusyId(null);
    done(r, action === "accept_counter"
      ? "Qiymət razılaşdırıldı — 48 saat ərzində bu qiymətlə ala bilərsiniz"
      : action === "reject_counter" ? "Əks-təklif rədd edildi" : "Təklif ləğv edildi");
  };

  const buyAtPrice = async (o: Offer) => {
    setBusyId(o.id);
    const r = await fetch(`${API}/offers/${o.id}/add-to-cart`, { method: "POST", headers })
      .then((x) => x.json()).catch(() => null);
    if (!r || r.success === false) { setBusyId(null); toast(r?.message || "Xəta baş verdi", "error"); return; }
    await refreshCart();
    setBusyId(null);
    toast("Razılaşdırılmış qiymətlə səbətə əlavə olundu ✓", "success");
    router.push(r.redirect || "/cart");
  };

  const respond = async (o: Offer, action: "accept" | "reject" | "counter") => {
    const body: any = { action };
    if (action === "counter") {
      const p = parseFloat(counterPrice.replace(",", "."));
      if (!Number.isFinite(p) || p <= o.unitPrice || p >= o.listPrice) {
        toast(`Əks-təklif ${formatPrice(o.unitPrice)} ₼-dan yuxarı, ${formatPrice(o.listPrice)} ₼-dan aşağı olmalıdır`, "error");
        return;
      }
      body.counterPrice = p;
    }
    if ((action === "counter" || action === "reject") && note.trim()) body.note = note.trim();
    if (action === "accept" && !confirm(`${o.quantity} ədəd × ${formatPrice(o.unitPrice)} ₼ qiymətini qəbul edirsiniz? Alıcı 48 saat ərzində bu qiymətlə ala biləcək.`)) return;
    setBusyId(o.id);
    const r = await fetch(`${API}/offers/${o.id}/respond`, { method: "PUT", headers, body: JSON.stringify(body) })
      .then((x) => x.json()).catch(() => null);
    setBusyId(null);
    if (done(r, action === "accept" ? "Təklif qəbul edildi ✓" : action === "counter" ? "Əks-təklif göndərildi ✓" : "Təklif rədd edildi")) {
      setFormFor(null); setCounterPrice(""); setNote("");
    }
  };

  const openForm = (id: number, kind: "counter" | "reject") => {
    if (formFor?.id === id && formFor.kind === kind) { setFormFor(null); return; }
    setFormFor({ id, kind }); setCounterPrice(""); setNote("");
  };

  if (authLoading || loading) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const all = tab === "buying" ? buying.offers : selling.offers;
  const activeCount = all.filter((o) => ACTIVE.includes(o.status)).length;
  const actionCount = all.filter((o) => needsMine(o, tab, now)).length;
  const offers = all.filter((o) => filter === "ALL" ? true : filter === "ACTIVE" ? ACTIVE.includes(o.status) : !ACTIVE.includes(o.status));
  const chip = (on: boolean) => `shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${on ? "text-white border-transparent shadow-sm bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]" : "border-card-border text-muted hover:text-[var(--brand-from)] hover:bg-[var(--brand-soft)]"}`;
  const inputCls = "w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-to)]/40 text-sm";

  return (
    <div className="max-w-4xl mx-auto px-0 sm:px-6 py-0 sm:py-5">
      <div className="surface overflow-hidden sm:rounded-2xl rounded-none">
        <div className="p-3 sm:p-4 border-b border-card-border">
          <div className="flex items-center gap-2 px-1">
            <p className="font-bold text-base flex-1 truncate">💬 Qiymət təklifləri</p>
            <span className="text-[11px] text-muted">{all.length} təklif</span>
          </div>

          <div className="seg-tabs mt-2.5" role="tablist" aria-label="Təklif bölmələri">
            {([
              { k: "buying" as const, label: "Göndərdiyim təkliflər", icon: "🛍", n: buying.offers.length, act: buying.needsAction },
              { k: "selling" as const, label: "Gələn təkliflər", icon: "🏪", n: selling.offers.length, act: selling.needsAction },
            ]).map((tb) => (
              <button key={tb.k} onClick={() => { setTab(tb.k); setFilter("ALL"); setFormFor(null); }}
                role="tab" aria-selected={tab === tb.k}
                className={`seg-tab ${tab === tb.k ? "is-active" : ""}`} style={{ whiteSpace: "normal", lineHeight: 1.2 }}>
                <span aria-hidden>{tb.icon}</span>{tb.label}
                <span className="opacity-70 font-medium">{tb.n}</span>
                {tb.act > 0 && <span className="seg-badge">{tb.act > 99 ? "99+" : tb.act}</span>}
              </button>
            ))}
          </div>

          {all.length > 0 && (
            <div className="flex gap-1.5 mt-2.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-0.5 items-center">
              <button onClick={() => setFilter("ALL")} className={chip(filter === "ALL")}>Hamısı · {all.length}</button>
              {activeCount > 0 && <button onClick={() => setFilter("ACTIVE")} className={chip(filter === "ACTIVE")}>Aktiv · {activeCount}</button>}
              {all.length - activeCount > 0 && <button onClick={() => setFilter("CLOSED")} className={chip(filter === "CLOSED")}>Bağlanmış · {all.length - activeCount}</button>}
              {actionCount > 0 && <span className="shrink-0 ml-auto text-[11px] font-semibold text-orange-600">⚡ {actionCount} təklif addımınızı gözləyir</span>}
            </div>
          )}
        </div>

        <div className="orders-scroll overflow-y-auto max-h-[calc(100dvh-220px)] sm:max-h-[calc(100dvh-240px)] p-2.5 sm:p-3 bg-input-bg/40">
          {offers.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center text-3xl">💬</div>
              <p className="text-sm">
                {filter !== "ALL" ? "Bu bölmədə təklif yoxdur"
                  : tab === "buying" ? "Hələ qiymət təklifi göndərməmisiniz"
                  : "Məhsullarınıza hələ qiymət təklifi gəlməyib"}
              </p>
              {tab === "buying" && filter === "ALL" && (
                <p className="text-xs mt-1.5 max-w-sm mx-auto">
                  Məhsul səhifəsində «💬 Qiymət təklif et» düyməsini və ya «Daha ucuza axtar» bölməsini istifadə edin.
                  Satıcı qəbul etsə 48 saat ərzində həmin qiymətlə ala bilərsiniz.
                </p>
              )}
              {tab === "buying" && filter === "ALL" && (
                <Link href="/elanlar" className="inline-block mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]">Məhsullara bax →</Link>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {offers.map((o) => {
                const st = STATUS[o.status] || STATUS.CANCELLED;
                const img = o.listing?.images?.[0];
                const title = o.listing?.title || `Elan #${o.listingId}`;
                const effPrice = o.finalPrice ?? (o.status === "COUNTERED" && o.counterPrice != null ? o.counterPrice : o.unitPrice);
                const pct = o.listPrice > 0 ? Math.round((1 - o.unitPrice / o.listPrice) * 100) : 0;
                const effPct = o.listPrice > 0 ? Math.round((1 - effPrice / o.listPrice) * 100) : 0;
                const mine = needsMine(o, tab, now);
                const hl = highlightId === o.id;
                const busy = busyId === o.id;
                // Geri sayım: gözləyən/əks-təklifdə cavab müddəti, qəbulda alış pəncərəsi.
                const deadline = o.status === "ACCEPTED" ? o.acceptedUntil : (o.status === "PENDING" || o.status === "COUNTERED") ? o.expiresAt : null;
                const left = deadline ? new Date(deadline).getTime() - now : null;
                const windowOpen = o.status === "ACCEPTED" && left != null && left > 0;
                let timeText = "";
                if (left != null) {
                  if (left <= 0) timeText = "Müddət bitdi";
                  else if (o.status === "ACCEPTED") timeText = `Alış üçün ${leftText(left)} qalıb`;
                  else if (o.status === "PENDING") timeText = tab === "selling" ? `Cavab üçün ${leftText(left)} qalıb` : `Satıcının cavabı gözlənilir · ${leftText(left)} qalıb`;
                  else timeText = tab === "buying" ? `Cavab üçün ${leftText(left)} qalıb` : `Alıcının cavabı gözlənilir · ${leftText(left)} qalıb`;
                }
                const isForm = formFor?.id === o.id;
                return (
                  <div key={o.id} id={`offer-${o.id}`}
                    className={`relative rounded-2xl bg-card border border-card-border overflow-hidden transition-all duration-300 ${hl ? "shadow-lg ring-2 ring-[var(--brand-from)]/60" : "shadow-sm hover:shadow-md"}`}>
                    <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${st.accent}`} aria-hidden />
                    <div className="pl-4 pr-3 sm:pl-5 sm:pr-4 py-3 flex items-start gap-3">
                      <Link href={`/marketplace/${o.listingId}`} className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-input-bg overflow-hidden shrink-0 flex items-center justify-center ring-1 ring-card-border">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl(img)} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : <span className="text-xl">📦</span>}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/marketplace/${o.listingId}`} className="font-semibold text-sm truncate block hover:text-[var(--brand-to)] transition-colors">{title}</Link>
                        <p className="text-[11px] text-muted truncate">
                          #{o.id} · {formatPostedAt(o.createdAt)}
                          {o.counterparty?.name ? ` · ${tab === "buying" ? "Satıcı" : "Alıcı"}: ${o.counterparty.name}` : ""}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {o.source === "INQUIRY" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand-soft)] text-[var(--brand-to)]">🔻 Daha ucuza axtar</span>
                          )}
                          {mine && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white animate-pulse">⚡ Sizdən addım gözlənilir</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.pill}`}>{o.statusLabel && o.status !== "PENDING" && o.status !== "COUNTERED" ? o.statusLabel : st.label}</span>
                        <span className="font-extrabold text-sm sm:text-base bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] bg-clip-text text-transparent">
                          {formatPrice(Math.round(effPrice * o.quantity * 100) / 100)} ₼
                        </span>
                      </div>
                    </div>

                    {/* Qiymətlər */}
                    <div className="pl-4 pr-3 sm:pl-5 sm:pr-4 pb-3 space-y-2">
                      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm rounded-xl bg-input-bg/60 px-3 py-2">
                        <span>
                          <b>{o.quantity} ədəd</b> × <b>{formatPrice(o.unitPrice)} ₼</b>
                          {o.source === "INQUIRY" ? <span className="text-muted text-xs"> (satıcının təklifi)</span> : <span className="text-muted text-xs"> (alıcının təklifi)</span>}
                        </span>
                        <span className="text-xs text-muted"><s>{formatPrice(o.listPrice)} ₼</s></span>
                        {pct > 0 && <span className="text-xs font-bold text-green-600">−{pct}%</span>}
                        {o.counterPrice != null && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-violet-500/10 text-violet-600">
                            ↔ Əks-təklif: {formatPrice(o.counterPrice)} ₼
                          </span>
                        )}
                        {o.finalPrice != null && o.finalPrice !== o.unitPrice && (
                          <span className="text-xs font-semibold text-green-600">🤝 Razılaşma: {formatPrice(o.finalPrice)} ₼{effPct > 0 ? ` (−${effPct}%)` : ""}</span>
                        )}
                      </div>
                      {o.message && (
                        <p className="text-xs rounded-xl px-3 py-2 bg-[var(--brand-soft)]"><span className="text-muted">💬 {tab === "buying" ? "Sizin mesajınız" : "Alıcı"}:</span> {o.message}</p>
                      )}
                      {o.sellerNote && (
                        <p className="text-xs rounded-xl px-3 py-2 bg-input-bg border border-card-border"><span className="text-muted">🏪 {tab === "selling" ? "Sizin qeydiniz" : "Satıcı"}:</span> {o.sellerNote}</p>
                      )}
                      {timeText && (
                        <p className={`text-xs font-semibold ${left != null && left <= 0 ? "text-red-500" : o.status === "ACCEPTED" ? "text-green-600" : "text-amber-600"}`}>⏰ {timeText}</p>
                      )}

                      {/* ── ALICI əməliyyatları ── */}
                      {tab === "buying" && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {o.status === "PENDING" && (
                            <button disabled={busy} onClick={() => buyerAction(o, "cancel")} className="ui-btn ui-btn-danger px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50">Ləğv et</button>
                          )}
                          {o.status === "COUNTERED" && o.counterPrice != null && (
                            <>
                              <button disabled={busy} onClick={() => buyerAction(o, "accept_counter")}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] hover:brightness-110 disabled:opacity-50">
                                ✓ Qəbul et ({formatPrice(o.counterPrice)} ₼)
                              </button>
                              <button disabled={busy} onClick={() => buyerAction(o, "reject_counter")} className="px-4 py-2 rounded-xl text-sm font-semibold bg-input-bg border border-input-border hover:border-red-500/50 hover:text-red-500 disabled:opacity-50">Rədd et</button>
                            </>
                          )}
                          {o.status === "ACCEPTED" && (
                            <>
                              {windowOpen ? (
                                <button disabled={busy} onClick={() => buyAtPrice(o)}
                                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-bold cta-gradient shadow-lg shadow-[var(--cta-from)]/25 disabled:opacity-50">
                                  {busy ? "..." : `🛒 Bu qiymətlə al — ${formatPrice(Math.round(effPrice * o.quantity * 100) / 100)} ₼`}
                                </button>
                              ) : (
                                <span className="text-xs text-red-500 font-semibold self-center">Razılaşdırılmış qiymətin müddəti bitib</span>
                              )}
                              <button disabled={busy} onClick={() => buyerAction(o, "cancel")} className="px-4 py-2 rounded-xl text-sm bg-input-bg border border-input-border hover:text-red-500 disabled:opacity-50">Ləğv et</button>
                            </>
                          )}
                          {o.status === "USED" && o.orderId && (
                            <Link href={`/orders?id=${o.orderId}`} className="text-xs font-semibold text-blue-600 hover:underline">📦 Sifariş #{o.orderId} →</Link>
                          )}
                        </div>
                      )}

                      {/* ── SATICI əməliyyatları ── */}
                      {tab === "selling" && o.status === "PENDING" && (
                        <div className="pt-1 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <button disabled={busy} onClick={() => respond(o, "accept")}
                              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 disabled:opacity-50">✓ Qəbul et</button>
                            <button disabled={busy} onClick={() => openForm(o.id, "counter")}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${isForm && formFor?.kind === "counter" ? "bg-violet-500 text-white border-violet-500" : "bg-violet-500/10 text-violet-600 border-violet-500/30 hover:bg-violet-500/20"}`}>↔ Əks-təklif</button>
                            <button disabled={busy} onClick={() => openForm(o.id, "reject")}
                              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50 ${isForm && formFor?.kind === "reject" ? "bg-red-500 text-white border-red-500" : "bg-input-bg border-input-border hover:text-red-500 hover:border-red-500/50"}`}>✕ Rədd et</button>
                          </div>
                          {isForm && formFor?.kind === "counter" && (() => {
                            const p = parseFloat(counterPrice.replace(",", "."));
                            const ok = Number.isFinite(p) && p > o.unitPrice && p < o.listPrice;
                            return (
                              <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3 space-y-2">
                                <label className="block text-xs font-medium text-muted">
                                  Sizin qiymətiniz (1 ədəd) — {formatPrice(o.unitPrice)} ₼ ilə {formatPrice(o.listPrice)} ₼ arasında
                                </label>
                                <input type="text" inputMode="decimal" autoFocus value={counterPrice}
                                  onChange={(e) => setCounterPrice(e.target.value.replace(/[^\d.,]/g, ""))}
                                  placeholder={formatPrice(Math.round((o.unitPrice + o.listPrice) / 2))} className={inputCls} />
                                {counterPrice && (
                                  <p className={`text-xs font-semibold ${ok ? "text-violet-600" : "text-red-500"}`}>
                                    {ok ? `−${Math.round((1 - p / o.listPrice) * 100)}% · cəmi ${formatPrice(Math.round(p * o.quantity * 100) / 100)} ₼` : "Qiymət alıcının təklifindən yuxarı, sizin qiymətinizdən aşağı olmalıdır"}
                                  </p>
                                )}
                                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} placeholder="Qeyd (istəyə bağlı)" className={`${inputCls} resize-none`} />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => setFormFor(null)} className="px-3 py-1.5 rounded-lg text-xs bg-input-bg border border-input-border">Bağla</button>
                                  <button disabled={busy || !ok} onClick={() => respond(o, "counter")} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-violet-600 hover:brightness-110 disabled:opacity-50">Əks-təklif göndər</button>
                                </div>
                              </div>
                            );
                          })()}
                          {isForm && formFor?.kind === "reject" && (
                            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 space-y-2">
                              <textarea rows={2} autoFocus value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} placeholder="Səbəb (istəyə bağlı) — məs. bu qiymətə verə bilmirik" className={`${inputCls} resize-none`} />
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setFormFor(null)} className="px-3 py-1.5 rounded-lg text-xs bg-input-bg border border-input-border">Bağla</button>
                                <button disabled={busy} onClick={() => respond(o, "reject")} className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500 hover:brightness-110 disabled:opacity-50">Rədd et</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {tab === "selling" && o.status === "USED" && o.orderId && (
                        <Link href={`/orders?tab=selling&id=${o.orderId}`} className="inline-block text-xs font-semibold text-blue-600 hover:underline">📦 Sifariş #{o.orderId} →</Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
