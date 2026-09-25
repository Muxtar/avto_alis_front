"use client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { useAdminLive } from "@/lib/live";

const CAT_LABEL: Record<string, string> = {
  TIME_WASTED: "Vaxtı boşa xərclədi", FRAUD: "Fırıldaq", RUDE: "Kobud davranış", FAKE_INFO: "Saxta məlumat", OTHER: "Başqa",
  DEFECTIVE: "Qüsurlu / işləmir", DAMAGED: "Zədəli gəldi", NOT_AS_DESCRIBED: "Təsvirə uyğun deyil", WRONG_ITEM: "Yanlış məhsul",
  CHANGED_MIND: "Bəyənmədim", RETURN_REJECTED: "İadə əsassız rədd edildi", RETURN_NOT_RECEIVED: "Satıcı qaytarılan məhsulu təsdiqləmir",
  RETURN_DAMAGED: "Qaytarılan məhsul zədəli/fərqlidir",
};
const STATUS_LABEL: Record<string, string> = { OPEN: "Açıq", AWAITING_SELLER: "Qarşı tərəfin cavabı gözlənilir", REVIEWING: "Baxılır", EVIDENCE_REQUESTED: "Sübut gözlənir", RESOLVED: "Həll olundu", REJECTED: "Rədd edildi" };
const DECIDED_BY: Record<string, string> = { SYSTEM: "Sistem", AI: "Sistem (AI)", ADMIN: "Admin", SELLER: "Qarşı tərəfin razılığı ilə" };
const DECISION_LABEL: Record<string, string> = { COMPLAINANT: "Şikayətçinin xeyrinə", RESPONDENT: "Qarşı tərəfin xeyrinə", ESCALATED: "Adminə ötürüldü" };
const RET_STATUS: Record<string, string> = {
  REQUESTED: "Tələb edildi", APPROVED: "Təsdiqləndi", REJECTED: "Rədd edildi", RETURN_SHIPPED: "Geri göndərildi", RETURN_RECEIVED: "Satıcı qəbul etdi",
  REFUNDED: "Pul qaytarıldı", CANCELLED: "Ləğv edildi", DISPUTED: "Mübahisə", DISPUTE_RESPONSE: "Mübahisəyə cavab", ESCALATED: "Adminə ötürüldü", APPEALED: "Müraciət edildi",
};
const ACTOR: Record<string, string> = { BUYER: "Alıcı", SELLER: "Satıcı", SYSTEM: "Sistem", ADMIN: "Admin" };
const RET_METHOD: Record<string, string> = { COURIER: "Kuryer", IN_PERSON: "Şəxsən", POST: "Poçt", YANGO: "Yango" };

function isDispute(c: any) { return !!c && !c.consultationId && !!(c.orderId || c.listingId); }
function leftText(until?: string | null) {
  if (!until) return null;
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return "müddət bitib";
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return `${h} saat ${m} dəq qalıb`;
}

function fmt(sec: number) { const m = Math.floor(sec / 60), s = sec % 60; return `${m}:${String(s).padStart(2, "0")}`; }

export default function AdminComplaintsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("OPEN");
  const [sel, setSel] = useState<any>(null);
  const [evidence, setEvidence] = useState<any>(null);
  const [listing, setListing] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [note, setNote] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [refund, setRefund] = useState(false);
  const [suspend, setSuspend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ret, setRet] = useState<any>(null);
  const [refundPct, setRefundPct] = useState("100");

  const headers: any = { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`, "Content-Type": "application/json" };

  // ANLIQ: yeni iş gələn kimi siyahı özü yenilənir.
  useAdminLive(["complaint"], () => { load(); });

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
    setSel(null); setEvidence(null); setListing(null); setOrder(null); setRet(null); setNote(""); setRefund(false); setSuspend(false); setRefundPct("100");
    try {
      const r = await fetch(`${API}/admin/complaints/${id}`, { headers }).then((x) => x.json());
      if (r.success) { setSel(r.complaint); setEvidence(r.evidence); setListing(r.listing); setOrder(r.order); setRet(r.returnRequest || null); }
      else toast(r.message || "Tapılmadı", "error");
    } catch { toast("Xəta", "error"); }
  };

  // ?id=123 — başqa səhifədən (məs. İadələr) birbaşa konkret şikayəti aç.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("id"));
    if (id) { setFilter(""); openDetail(id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MÜBAHİSƏ qərarı: şikayətçinin / qarşı tərəfin xeyrinə və ya sistem qərarını yenidən işlət.
  const decide = async (decision: "COMPLAINANT" | "RESPONDENT" | "RERUN") => {
    if (!sel) return;
    if (decision !== "RERUN" && note.trim().length < 5) { toast("Qərarın səbəbini yazın (min 5 simvol) — hər iki tərəf görəcək", "error"); return; }
    const pct = Number(refundPct);
    if (decision === "COMPLAINANT" && (refundPct === "" || isNaN(pct) || pct < 0 || pct > 100)) { toast("Geri ödəmə faizi 0–100 arası olmalıdır", "error"); return; }
    setBusy(true);
    try {
      const body: any = { decision };
      if (decision !== "RERUN") body.adminNote = note.trim();
      if (decision === "COMPLAINANT") body.refundPercent = pct;
      const r = await fetch(`${API}/admin/complaints/${sel.id}/resolve`, { method: "POST", headers, body: JSON.stringify(body) }).then((x) => x.json());
      if (r.success) {
        toast(decision === "RERUN" ? "Sistem qərarı yenidən işlədildi ✓" : "Qərar tətbiq olundu ✓", "success");
        await load();
        await openDetail(sel.id);
      } else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  const requestEvidence = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/admin/complaints/${sel.id}/request-evidence`, {
        method: "POST", headers, body: JSON.stringify({ note }),
      }).then((x) => x.json());
      if (r.success) { toast("Şikayətçidən əlavə foto/sübut istənildi", "success"); setSel(null); await load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
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
      <div className="flex gap-1 flex-wrap bg-input-bg border border-input-border rounded-xl p-1 mb-4 w-fit">
        {["OPEN", "AWAITING_SELLER", "REVIEWING", "EVIDENCE_REQUESTED", "RESOLVED", "REJECTED", ""].map((s) => (
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
                {c.orderId && <span className="text-[11px] text-blue-500">sifariş #{c.orderId}</span>}
                {c.returnId && <span className="text-[11px] text-purple-500">iadə #{c.returnId}</span>}
                {c.appealed && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600">MÜRACİƏT</span>}
                {c.decision === "ESCALATED" && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600">AI → admin</span>}
                <span className="ml-auto text-[11px] text-muted">{STATUS_LABEL[c.status] || c.status}</span>
              </div>
              {c.status === "AWAITING_SELLER" && c.respondBy && <p className="text-[11px] text-purple-500 mt-1">⏳ Cavab müddəti: {leftText(c.respondBy)}</p>}
              <p className="text-xs text-muted mt-1 line-clamp-2">{c.description}</p>
              {c.target?.complaintFlags > 0 && <p className="text-[11px] text-amber-500 mt-1">⚠ Bu şəxsə {c.target.complaintFlags} təsdiqlənmiş şikayət</p>}
            </button>
          ))}
        </div>

        {/* Detal + dəlil */}
        {sel && (
          <div className="surface p-4 lg:sticky lg:top-4 h-fit">
            <h2 className="font-semibold mb-1"><span className="text-xs text-muted">#{sel.id}</span> {sel.target?.name} <span className="text-xs text-muted">({CAT_LABEL[sel.category] || sel.category})</span></h2>
            <p className="text-xs text-muted mb-2">Şikayətçi: {sel.complainant?.name}{sel.target?.consultationSuspended && <span className="text-red-500"> · peşəkar dayandırılıb</span>}</p>
            <p className="text-sm bg-input-bg rounded-xl p-3 mb-3">{sel.description}</p>

            {/* Şikayət olunan MƏHSUL / SİFARİŞ (eBay üslubu) */}
            {listing && (
              <a href={`/marketplace/${listing.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2.5 mb-3 rounded-xl bg-input-bg border border-input-border hover:border-orange-500/50">
                {listing.images?.[0]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={imgUrl(listing.images[0])} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  : <div className="w-12 h-12 rounded-lg bg-card shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{listing.title}</p>
                  <p className="text-xs text-muted">{listing.price} AZN{listing.condition ? ` · ${listing.condition}` : ""} · Satıcı: {listing.user?.name}</p>
                </div>
              </a>
            )}
            {order && (
              <div className="p-2.5 mb-3 rounded-xl bg-input-bg border border-input-border text-xs">
                <p className="font-medium mb-1">Sifariş #{order.id} · {order.status} · {order.total} AZN · {order.paymentStatus}</p>
                {order.items?.map((it: any, i: number) => (
                  <p key={i} className="text-muted">• {it.title} × {it.quantity} — {it.price} AZN</p>
                ))}
              </div>
            )}

            {/* SÜBUT ŞƏKİLLƏRİ — istifadəçinin yüklədiyi (qüsurlu məhsul və s.) */}
            {sel.images?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted mb-1.5">📷 Sübut şəkilləri ({sel.images.length})</p>
                <div className="flex flex-wrap gap-2">
                  {sel.images.map((img: string, i: number) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={imgUrl(img)} alt="" onClick={() => setLightbox(imgUrl(img))} className="w-20 h-20 rounded-lg object-cover cursor-pointer border border-input-border hover:border-orange-500" />
                  ))}
                </div>
              </div>
            )}

            {/* MÜBAHİSƏ — qarşı tərəfin cavabı, sistem/AI qərarı, müraciət */}
            {sel.status === "AWAITING_SELLER" && (
              <p className="text-xs text-purple-600 bg-purple-500/10 rounded-lg px-2.5 py-1.5 mb-3">
                ⏳ Qarşı tərəfin cavabı gözlənilir{sel.respondBy ? ` — ${leftText(sel.respondBy)} (${new Date(sel.respondBy).toLocaleString("az-AZ")})` : ""}. Cavab verilməsə, qərar avtomatik şikayətçinin xeyrinə olacaq.
              </p>
            )}
            {(sel.sellerResponse || sel.sellerImages?.length > 0 || sel.sellerRespondedAt) && (
              <div className="mb-3 p-3 rounded-xl bg-input-bg/50 border border-input-border">
                <p className="text-xs font-semibold text-muted mb-1">
                  💬 Qarşı tərəfin cavabı
                  {sel.sellerAccepted ? " · iddianı qəbul etdi" : sel.sellerAccepted === false ? " · etiraz etdi" : ""}
                  {sel.sellerRespondedAt ? ` · ${new Date(sel.sellerRespondedAt).toLocaleString("az-AZ")}` : ""}
                </p>
                {sel.sellerResponse && <p className="text-sm mb-2 whitespace-pre-wrap">{sel.sellerResponse}</p>}
                {sel.sellerImages?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {sel.sellerImages.map((img: string, i: number) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={imgUrl(img)} alt="" onClick={() => setLightbox(imgUrl(img))} className="w-20 h-20 rounded-lg object-cover cursor-pointer border border-input-border hover:border-orange-500" />
                    ))}
                  </div>
                )}
              </div>
            )}
            {(sel.decision || sel.aiRecommendation) && (
              <div className={`mb-3 p-3 rounded-xl border ${sel.decision === "ESCALATED" ? "bg-amber-500/10 border-amber-500/30" : "bg-input-bg/50 border-input-border"}`}>
                <p className="text-xs font-semibold mb-1">
                  ⚖ Qərar: {DECISION_LABEL[sel.decision] || "—"}
                  {sel.decisionBy && <span className="text-muted font-normal"> · {DECIDED_BY[sel.decisionBy] || sel.decisionBy}</span>}
                  {sel.decidedAt && <span className="text-muted font-normal"> · {new Date(sel.decidedAt).toLocaleString("az-AZ")}</span>}
                </p>
                {sel.decisionReason && <p className="text-xs whitespace-pre-wrap mb-1">{sel.decisionReason}</p>}
                {sel.aiRecommendation && (
                  <div className="mt-1.5 pt-1.5 border-t border-input-border">
                    <p className="text-[11px] font-semibold text-muted">
                      🤖 AI tövsiyəsi{sel.aiConfidence != null && <> · əminlik <b className={sel.aiConfidence >= 0.8 ? "text-green-600" : sel.aiConfidence >= 0.5 ? "text-amber-600" : "text-red-500"}>{Math.round(sel.aiConfidence * 100)}%</b></>}
                    </p>
                    <p className="text-xs whitespace-pre-wrap">{sel.aiRecommendation}</p>
                  </div>
                )}
              </div>
            )}
            {sel.appealed && (
              <div className="mb-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs font-semibold text-blue-600 mb-0.5">📨 Qərardan müraciət edilib</p>
                {typeof sel.adminNote === "string" && sel.adminNote.startsWith("MÜRACİƏT") && <p className="text-xs whitespace-pre-wrap">{sel.adminNote}</p>}
              </div>
            )}

            {/* Əlaqəli İADƏ — status, şəkillər, tarixçə */}
            {ret && (
              <div className="mb-3 p-3 rounded-xl bg-input-bg/50 border border-input-border text-xs">
                <p className="font-semibold mb-1">↩ İadə #{ret.id} · {RET_STATUS[ret.status] || ret.status}{ret.refundAmount != null ? ` · ${Number(ret.refundAmount).toFixed(2)} AZN` : ""}</p>
                <p className="text-muted">Səbəb: {CAT_LABEL[ret.reason] || ret.reason}{ret.reasonText ? ` — ${ret.reasonText}` : ""}</p>
                {(ret.returnMethod || ret.trackingCode) && <p className="text-muted">Göndərmə: {RET_METHOD[ret.returnMethod] || ret.returnMethod || "—"}{ret.trackingCode ? ` · izləmə: ${ret.trackingCode}` : ""}</p>}
                {ret.sellerNote && <p className="text-muted">Satıcının qeydi: {ret.sellerNote}</p>}
                {ret.images?.length > 0 && (
                  <>
                    <p className="font-semibold text-muted mt-2 mb-1">Alıcının şəkilləri</p>
                    <div className="flex flex-wrap gap-2">
                      {ret.images.map((img: string, i: number) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={imgUrl(img)} alt="" onClick={() => setLightbox(imgUrl(img))} className="w-16 h-16 rounded-lg object-cover cursor-pointer border border-input-border hover:border-orange-500" />
                      ))}
                    </div>
                  </>
                )}
                {ret.sellerImages?.length > 0 && (
                  <>
                    <p className="font-semibold text-muted mt-2 mb-1">Satıcının şəkilləri</p>
                    <div className="flex flex-wrap gap-2">
                      {ret.sellerImages.map((img: string, i: number) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={imgUrl(img)} alt="" onClick={() => setLightbox(imgUrl(img))} className="w-16 h-16 rounded-lg object-cover cursor-pointer border border-input-border hover:border-orange-500" />
                      ))}
                    </div>
                  </>
                )}
                {ret.events?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-input-border">
                    <p className="font-semibold text-muted mb-1">Tarixçə</p>
                    <ol className="space-y-1 border-l border-input-border ml-1 pl-3">
                      {ret.events.map((ev: any, i: number) => (
                        <li key={ev.id ?? i} className="relative">
                          <span className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-orange-500" />
                          <span className="text-muted">{new Date(ev.createdAt).toLocaleString("az-AZ")}</span> · <b>{ACTOR[ev.actor] || ev.actor}</b>: {RET_STATUS[ev.status] || ev.status}
                          {ev.note && <span className="block text-muted whitespace-pre-wrap">{ev.note}</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

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

            {sel.status !== "RESOLVED" && sel.status !== "REJECTED" && isDispute(sel) ? (
              <>
                {sel.status === "EVIDENCE_REQUESTED" && <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-2.5 py-1.5 mb-2">Şikayətçidən əlavə sübut istənilib — cavab gözlənir.</p>}
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                  placeholder="Qərarın səbəbi (məcburi, min 5 simvol) — hər iki tərəf görəcək. Sübut istəyəndə şikayətçiyə mesaj kimi gedir."
                  className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm resize-none mb-2" />
                <label className="flex items-center gap-2 text-sm mb-3">
                  Geri ödəmə (şikayətçinin xeyrinə olduqda):
                  <input type="number" min={0} max={100} value={refundPct} onChange={(e) => setRefundPct(e.target.value)}
                    className="w-20 px-2 py-1 bg-input-bg border border-input-border rounded-lg text-sm" /> %
                </label>
                <button onClick={requestEvidence} disabled={busy} className="w-full mb-2 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-xl text-sm font-semibold disabled:opacity-50">📷 Şikayətçidən əlavə foto/sübut istə</button>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => decide("COMPLAINANT")} disabled={busy || note.trim().length < 5} className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Şikayətçinin xeyrinə</button>
                  <button onClick={() => decide("RESPONDENT")} disabled={busy || note.trim().length < 5} className="flex-1 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm font-semibold disabled:opacity-50">Qarşı tərəfin xeyrinə</button>
                </div>
                <button onClick={() => decide("RERUN")} disabled={busy} className="w-full px-4 py-2 bg-input-bg border border-input-border rounded-xl text-sm font-medium disabled:opacity-50">🔁 Sistem qərarını yenidən işlət</button>
              </>
            ) : sel.status !== "RESOLVED" && sel.status !== "REJECTED" ? (
              <>
                {sel.status === "EVIDENCE_REQUESTED" && <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-2.5 py-1.5 mb-2">Şikayətçidən əlavə sübut istənilib — cavab gözlənir.</p>}
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Admin qeydi / şikayətçiyə mesaj (sübut istəyəndə göndərilir)" className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm resize-none mb-2" />
                <div className="flex flex-col gap-1.5 mb-3 text-sm">
                  {evidence?.refundable && (
                    <label className="flex items-center gap-2"><input type="checkbox" checked={refund} onChange={(e) => setRefund(e.target.checked)} className="w-4 h-4 accent-orange-500" /> Alıcıya geri ödəniş et ({evidence.price} AZN)</label>
                  )}
                  <label className="flex items-center gap-2"><input type="checkbox" checked={suspend} onChange={(e) => setSuspend(e.target.checked)} className="w-4 h-4 accent-orange-500" /> Peşəkarın Rəy təkliflərini dayandır</label>
                </div>
                {/* eBay üslubu: qərardan əvvəl əlavə foto/sübut istə */}
                <button onClick={requestEvidence} disabled={busy} className="w-full mb-2 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-xl text-sm font-semibold disabled:opacity-50">📷 Şikayətçidən əlavə foto/sübut istə</button>
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

      {/* Şəkil böyüdücü */}
      {lightbox && (
        <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
