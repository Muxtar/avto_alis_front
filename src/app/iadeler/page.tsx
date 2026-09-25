"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLive } from "@/lib/live";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

/* ── İADƏLƏR ──
   Alıcı və satıcı üçün iadənin bütün yolu: sorğu → təsdiq → göndərmə →
   qəbul → pulun qaytarılması, hər mərhələnin son müddəti, tarixçə və
   (varsa) mübahisə — kim, nə vaxt, niyə qərar verdi. */

type Side = "buying" | "selling";

const STATUS: Record<string, { label: string; cls: string }> = {
  REQUESTED: { label: "Satıcının cavabı gözlənilir", cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  APPROVED: { label: "Təsdiqləndi — göndərin", cls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  REJECTED: { label: "Rədd edildi", cls: "bg-red-500/10 text-red-500 border-red-500/20" },
  RETURN_SHIPPED: { label: "Yoldadır", cls: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  RETURN_RECEIVED: { label: "Satıcı qəbul etdi", cls: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
  REFUNDED: { label: "Pul qaytarıldı", cls: "bg-green-500/10 text-green-600 border-green-500/20" },
  CANCELLED: { label: "Ləğv edildi", cls: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
  DISPUTED: { label: "Mübahisə — sistem baxır", cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
};
// Satıcı tərəfində bəzi statuslar başqa cür oxunur.
const SELLER_LABEL: Record<string, string> = {
  REQUESTED: "Cavabınız gözlənilir",
  APPROVED: "Təsdiqlədiniz — alıcı göndərməlidir",
};

const REASON: Record<string, string> = {
  DEFECTIVE: "Qüsurlu / işləmir",
  WRONG_ITEM: "Yanlış məhsul",
  NOT_AS_DESCRIBED: "Təsvirə uyğun deyil",
  CHANGED_MIND: "Bəyənmədim / fikrimi dəyişdim",
  OTHER: "Başqa",
};
const METHOD: Record<string, string> = { COURIER: "Kuryer", IN_PERSON: "Şəxsən təhvil", POST: "Poçt", YANGO: "Yango" };
const ACTOR: Record<string, string> = { BUYER: "Alıcı", SELLER: "Satıcı", SYSTEM: "Sistem", ADMIN: "Admin" };
const DISPUTE_STATUS: Record<string, { label: string; cls: string }> = {
  AWAITING_SELLER: { label: "Qarşı tərəfin cavabı gözlənilir", cls: "bg-amber-500/10 text-amber-600" },
  REVIEWING: { label: "Sistem baxır", cls: "bg-blue-500/10 text-blue-600" },
  EVIDENCE_REQUESTED: { label: "Əlavə sübut istənilir", cls: "bg-red-500/10 text-red-500" },
  RESOLVED: { label: "Qərar verildi", cls: "bg-green-500/10 text-green-600" },
  REJECTED: { label: "Rədd edildi", cls: "bg-gray-500/10 text-gray-500" },
  OPEN: { label: "Açıq", cls: "bg-blue-500/10 text-blue-600" },
};
const DECIDED_BY: Record<string, string> = { SYSTEM: "Sistem", AI: "Sistem (AI)", ADMIN: "Admin", SELLER: "Qarşı tərəfin razılığı" };
const DISPUTE_CATS: [string, string][] = [
  ["DEFECTIVE", "Qüsurlu / işləmir"],
  ["DAMAGED", "Zədəli gəldi"],
  ["NOT_AS_DESCRIBED", "Təsvirə uyğun deyil"],
  ["WRONG_ITEM", "Yanlış məhsul"],
  ["CHANGED_MIND", "Bəyənmədim"],
];

const STEPS = ["Sorğu", "Təsdiq", "Göndərildi", "Qəbul", "Pul qaytarıldı"];
const STEP_OF: Record<string, number> = { REQUESTED: 0, APPROVED: 1, RETURN_SHIPPED: 2, RETURN_RECEIVED: 3, REFUNDED: 4 };
const DISPUTE_DAYS = 7;

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const money = (n: any) => (typeof n === "number" ? n.toFixed(2) : parseFloat(n || 0).toFixed(2));

// «2 gün 5 saat qalıb» / «müddət bitib».
function countdown(target: string | number | null | undefined, now: number): { text: string; urgent: boolean; over: boolean } | null {
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return { text: "müddət bitib", urgent: true, over: true };
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const text = d > 0 ? `${d} gün${h ? ` ${h} saat` : ""} qalıb` : h > 0 ? `${h} saat${m ? ` ${m} dəq` : ""} qalıb` : `${Math.max(m, 1)} dəq qalıb`;
  return { text, urgent: ms < 24 * 3600 * 1000, over: false };
}

// Aktiv son müddət: kim hərəkət etməlidir və etməsə nə olur.
function activeDeadline(ret: any, side: Side, dispute: any): { at: string | number; who: string; then: string } | null {
  const mine = (s: Side) => side === s;
  switch (ret.status) {
    case "REQUESTED":
      return ret.sellerRespondBy ? {
        at: ret.sellerRespondBy,
        who: mine("selling") ? "Siz cavab verməlisiniz" : "Satıcı cavab verməlidir",
        then: "cavab olmasa iadə avtomatik təsdiqlənir",
      } : null;
    case "APPROVED":
      return ret.shipBy ? {
        at: ret.shipBy,
        who: mine("buying") ? "Məhsulu göndərməlisiniz" : "Alıcı məhsulu göndərməlidir",
        then: "göndərilməsə iadə avtomatik ləğv olunur",
      } : null;
    case "RETURN_SHIPPED":
      return ret.receiveBy ? {
        at: ret.receiveBy,
        who: mine("selling") ? "Qəbulu təsdiqləməlisiniz" : "Satıcı qəbulu təsdiqləməlidir",
        then: "təsdiq olmasa sistem mübahisə açır",
      } : null;
    case "RETURN_RECEIVED":
      return ret.refundBy ? {
        at: ret.refundBy,
        who: mine("selling") ? "Pulu qaytarmalısınız" : "Satıcı pulu qaytarmalıdır",
        then: "qaytarılmasa sistem özü qaytarır",
      } : null;
    case "REJECTED": {
      if (ret.disputeId) return null;
      const base = rejectedAt(ret);
      if (!base) return null;
      return {
        at: base + DISPUTE_DAYS * 24 * 3600 * 1000,
        who: mine("buying") ? "Razı deyilsinizsə etiraz edə bilərsiniz" : "Alıcı etiraz edə bilər",
        then: "müddət bitəndən sonra etiraz qəbul olunmur",
      };
    }
    case "DISPUTED":
      if (dispute?.respondBy && dispute.status === "AWAITING_SELLER") {
        return { at: dispute.respondBy, who: "Qarşı tərəf cavab verməlidir", then: "cavab olmasa sistem sübutlara görə qərar verir" };
      }
      return null;
  }
  return null;
}

function rejectedAt(ret: any): number | null {
  const ev = [...(ret.events || [])].reverse().find((e: any) => e.status === "REJECTED");
  const d = ev?.createdAt || ret.updatedAt;
  return d ? new Date(d).getTime() : null;
}

// Proqres çubuğunda neçənci addıma çatılıb (tarixçədən).
function reachedStep(ret: any): number {
  let max = STEP_OF[ret.status] ?? 0;
  for (const e of ret.events || []) {
    const s = STEP_OF[e.status];
    if (s !== undefined && s > max) max = s;
  }
  return max;
}

/* ── Foto seçici (önizləmə ilə) ── */
// Hər fayla bir önizləmə URL-i (təkrar yaradılmasın).
const previewCache = new WeakMap<File, string>();
const previewOf = (f: File) => {
  let u = previewCache.get(f);
  if (!u) { u = URL.createObjectURL(f); previewCache.set(f, u); }
  return u;
};

function PhotoPicker({ files, setFiles, max }: { files: File[]; setFiles: (f: File[]) => void; max: number }) {
  const urls = useMemo(() => files.map(previewOf), [files]);
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((u, i) => (
        <div key={u} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" className="w-16 h-16 rounded-lg object-cover border border-input-border" />
          <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] leading-none">✕</button>
        </div>
      ))}
      {files.length < max && (
        <label className="w-16 h-16 rounded-lg border-2 border-dashed border-input-border flex flex-col items-center justify-center text-muted cursor-pointer hover:border-orange-500">
          <span className="text-lg leading-none">+</span>
          <span className="text-[9px]">{files.length}/{max}</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
            const list = Array.from(e.target.files || []).filter((f) => /^image\//.test(f.type) && f.size < 8 * 1024 * 1024);
            setFiles([...files, ...list].slice(0, max));
            e.target.value = "";
          }} />
        </label>
      )}
    </div>
  );
}

function Thumbs({ images, label }: { images?: string[]; label?: string }) {
  if (!images?.length) return null;
  return (
    <div>
      {label && <p className="text-[11px] text-muted mb-1">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <a key={i} href={imgUrl(img)} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgUrl(img)} alt="" className="w-16 h-16 rounded-lg object-cover border border-input-border hover:opacity-80" />
          </a>
        ))}
      </div>
    </div>
  );
}

function StepBar({ ret }: { ret: any }) {
  const reached = reachedStep(ret);
  const bad = ret.status === "REJECTED" || ret.status === "CANCELLED";
  const disputed = ret.status === "DISPUTED";
  return (
    <div className="flex items-start">
      {STEPS.map((label, i) => {
        const done = i <= reached;
        const current = i === reached;
        const color = done
          ? current && bad ? "bg-red-500 text-white" : current && disputed ? "bg-orange-500 text-white" : "bg-green-500 text-white"
          : "bg-input-bg text-muted border border-input-border";
        return (
          <div key={label} className="flex-1 flex flex-col items-center relative min-w-0">
            {i > 0 && <div className={`absolute top-3 right-1/2 w-full h-0.5 ${i <= reached ? "bg-green-500" : "bg-input-border"}`} />}
            <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${color}`}>
              {done ? (current && bad ? "✕" : current && disputed ? "!" : "✓") : i + 1}
            </div>
            <span className={`mt-1 text-[10px] sm:text-[11px] text-center leading-tight ${done ? "text-foreground" : "text-muted"}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

type FormKind = null | "ship" | "approve" | "reject" | "dispute" | "problem" | "appeal" | "respond";

function ReturnCard({ ret, side, expanded, onToggle, detail, reload, now }: {
  ret: any; side: Side; expanded: boolean; onToggle: () => void; detail: any; reload: () => Promise<void>; now: number;
}) {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<FormKind>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [method, setMethod] = useState("COURIER");
  const [tracking, setTracking] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const dispute = detail?.dispute || null;
  const st = STATUS[ret.status] || { label: ret.status, cls: "bg-gray-500/10 text-gray-500 border-gray-500/20" };
  const label = side === "selling" && SELLER_LABEL[ret.status] ? SELLER_LABEL[ret.status] : st.label;
  const dl = activeDeadline(ret, side, dispute);
  const cd = dl ? countdown(dl.at, now) : null;
  const other = side === "buying" ? ret.seller : ret.buyer;
  const items: any[] = ret.orderItem ? [ret.orderItem] : ret.order?.items || [];
  const amountShown = ret.refundAmount ?? ret.order?.total;
  const rejAt = rejectedAt(ret);
  const canDispute = side === "buying" && ret.status === "REJECTED" && !ret.disputeId
    && (!rejAt || now - rejAt < DISPUTE_DAYS * 24 * 3600 * 1000);

  const open = (k: FormKind) => {
    setForm(form === k ? null : k);
    setText(""); setFiles([]); setTracking(""); setCategory("");
    setAmount(k === "approve" && ret.refundAmount != null ? money(ret.refundAmount) : "");
  };

  // Ümumi sorğu: JSON və ya multipart; server xətası toast ilə göstərilir.
  const call = async (path: string, method: string, body?: any, multipart?: boolean): Promise<boolean> => {
    setBusy(true);
    try {
      const headers: any = { Authorization: `Bearer ${token}` };
      if (body && !multipart) headers["Content-Type"] = "application/json";
      const res = await fetch(`${API}${path}`, { method, headers, body: body ? (multipart ? body : JSON.stringify(body)) : undefined });
      const r = await res.json().catch(() => null);
      if (!res.ok || !r || r.success === false) {
        toast(r?.message || "Xəta baş verdi", r?.retrying ? "info" : "error");
        return false;
      }
      return true;
    } catch {
      toast("Şəbəkə xətası", "error");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const done = async (ok: boolean, msg: string) => {
    if (!ok) return;
    toast(msg, "success");
    setForm(null); setText(""); setFiles([]);
    await reload();
  };
  const fd = (fields: Record<string, string>, imgs: File[] = []) => {
    const f = new FormData();
    Object.entries(fields).forEach(([k, v]) => { if (v !== "") f.append(k, v); });
    imgs.forEach((x) => f.append("images", x));
    return f;
  };

  const doCancel = async () => {
    if (!confirm("İadə sorğusunu ləğv etmək istəyirsiniz?")) return;
    done(await call(`/returns/${ret.id}/cancel`, "PUT"), "İadə ləğv edildi");
  };
  const doShip = async () => done(await call(`/returns/${ret.id}/ship`, "PUT", { returnMethod: method, trackingCode: tracking.trim() || undefined }), "Göndərildi kimi qeyd olundu ✓");
  const doApprove = async () => {
    const body: any = {};
    if (amount.trim()) body.refundAmount = amount.trim();
    if (text.trim()) body.sellerNote = text.trim();
    done(await call(`/returns/${ret.id}/approve`, "PUT", body), "İadə təsdiqləndi ✓");
  };
  const doReject = async () => done(await call(`/returns/${ret.id}/reject`, "PUT", fd({ sellerNote: text.trim() }, files), true), "İadə rədd edildi");
  const doReceive = async () => {
    if (!confirm("Məhsulu qaytarılmış və qaydasında qəbul etdiniz?")) return;
    done(await call(`/returns/${ret.id}/receive`, "PUT"), "Qəbul təsdiqləndi ✓");
  };
  const doRefund = async () => {
    if (!confirm(`${money(ret.refundAmount)} AZN alıcıya qaytarılsın?`)) return;
    done(await call(`/returns/${ret.id}/refund`, "PUT"), "Pul qaytarıldı ✓");
  };
  const doDispute = async () => done(await call(`/returns/${ret.id}/dispute`, "POST", fd({ description: text.trim(), category }, files), true), "Etirazınız qəbul edildi — sistem baxacaq");
  const doProblem = async () => done(await call(`/returns/${ret.id}/receive-problem`, "POST", fd({ description: text.trim() }, files), true), "Problem bildirildi — mübahisə açıldı");
  const doAppeal = async () => dispute && done(await call(`/complaints/${dispute.id}/appeal`, "POST", { note: text.trim() }), "Müraciətiniz adminə göndərildi");
  const doRespond = async (accept: boolean) => {
    if (!dispute) return;
    if (accept && !confirm("İddianı qəbul edirsiniz? Qərar qarşı tərəfin xeyrinə veriləcək.")) return;
    done(await call(`/complaints/${dispute.id}/respond`, "POST", fd({ accept: String(accept), response: text.trim() }, accept ? [] : files), true),
      accept ? "İddia qəbul edildi" : "Cavabınız göndərildi");
  };

  const uid = user?.id;
  const canAppeal = !!dispute && (dispute.decision === "COMPLAINANT" || dispute.decision === "RESPONDENT")
    && dispute.decisionBy !== "ADMIN" && !dispute.appealed
    && ((dispute.decision === "COMPLAINANT" && uid === dispute.targetUserId) || (dispute.decision === "RESPONDENT" && uid === dispute.complainantId));
  const canRespond = !!dispute && dispute.status === "AWAITING_SELLER" && uid === dispute.targetUserId && !dispute.sellerResponse;
  const partyName = (id: number) => (id === ret.buyerId ? "Alıcı" : id === ret.sellerId ? "Satıcı" : "Tərəf");

  const btn = "px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors";
  const inputCls = "w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm";
  const brand = `${btn} text-white bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]`;
  const ghost = `${btn} bg-input-bg border border-input-border`;
  const minLen = (n: number) => text.trim().length >= n;

  return (
    <div id={`ret-${ret.id}`} className={`surface overflow-hidden scroll-mt-24 ${expanded ? "ring-2 ring-orange-500/40" : ""}`}>
      {/* Başlıq */}
      <button onClick={onToggle} className="w-full text-left p-4 space-y-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs text-muted">İadə #{ret.id} · {fmtDate(ret.createdAt)}</p>
            <p className="text-sm font-semibold truncate">{items.map((it) => it.title).join(", ") || `Sifariş #${ret.orderId}`}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${st.cls}`}>{label}</span>
        </div>
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-muted">
          <span>Sifariş #{ret.orderId}</span>
          {ret.quantity ? <span>{ret.quantity} əd.</span> : null}
          <span className="font-bold text-orange-500">{money(amountShown)} AZN</span>
          {other?.name && <span>{side === "buying" ? "Satıcı" : "Alıcı"}: {other.name}</span>}
        </div>
        {cd && dl && (
          <div className={`text-xs rounded-lg px-2.5 py-1.5 ${cd.urgent ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
            ⏱ <b>{dl.who}</b> — {cd.text}
            <span className="opacity-80"> ({dl.then})</span>
          </div>
        )}
        <StepBar ret={ret} />
        <p className="text-[11px] text-muted text-right">{expanded ? "Bağla ▲" : "Ətraflı ▼"}</p>
      </button>

      {expanded && (
        <div className="border-t border-card-border p-4 space-y-4">
          <div className="flex gap-3 flex-wrap text-xs">
            <Link href={`/orders/${ret.orderId}`} className="text-orange-500 font-semibold hover:underline">Sifariş #{ret.orderId} →</Link>
            <Link href="/returns" className="text-muted hover:text-foreground hover:underline">Qaytarma şərtləri</Link>
          </div>

          {/* Səbəb */}
          <div className="space-y-1">
            <p className="text-xs text-muted">Səbəb</p>
            <p className="text-sm"><span className="font-semibold">{REASON[ret.reason] || ret.reason}</span>{ret.reasonText ? ` — ${ret.reasonText}` : ""}</p>
            {items.length > 0 && (
              <ul className="text-xs text-muted">
                {items.map((it) => <li key={it.id}>• {it.title} — {money(it.price)} AZN × {it.quantity}</li>)}
              </ul>
            )}
          </div>
          <Thumbs images={ret.images} label="Alıcının fotoları" />

          {ret.status === "REJECTED" && ret.sellerNote && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-xs font-semibold text-red-500 mb-1">Satıcının rədd səbəbi</p>
              <p className="text-sm">{ret.sellerNote}</p>
            </div>
          )}
          {ret.status !== "REJECTED" && ret.sellerNote && (
            <p className="text-xs"><span className="text-muted">Satıcının qeydi:</span> {ret.sellerNote}</p>
          )}
          <Thumbs images={ret.sellerImages} label="Satıcının fotoları" />
          {ret.adminNote && <p className="text-xs"><span className="text-muted">Admin qeydi:</span> {ret.adminNote}</p>}

          {ret.returnMethod && (
            <p className="text-xs">
              <span className="text-muted">Göndərmə üsulu:</span> <b>{METHOD[ret.returnMethod] || ret.returnMethod}</b>
              {ret.trackingCode && <> · <span className="text-muted">İzləmə kodu:</span> <span className="font-mono">{ret.trackingCode}</span></>}
              {ret.shippedAt && <span className="text-muted"> · {fmtDate(ret.shippedAt)}</span>}
            </p>
          )}
          {ret.status === "REFUNDED" && (
            ret.cashRefund ? (
              <p className="text-xs rounded-lg px-2.5 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {money(ret.refundAmount)} AZN — sifariş nağd ödənildiyi üçün pulu {side === "buying" ? "satıcı sizə nağd qaytarır" : "alıcıya NAĞD qaytarmalısınız"}.
              </p>
            ) : (
              <p className="text-xs rounded-lg px-2.5 py-1.5 bg-green-500/10 text-green-600">
                {money(ret.refundAmount)} AZN kartınıza qaytarıldı{ret.refundedAt ? ` · ${fmtDate(ret.refundedAt)}` : ""}. Bank tərəfindən görünməsi 1–5 iş günü çəkə bilər.
              </p>
            )
          )}

          {/* Mübahisə */}
          {ret.disputeId && (
            !detail ? (
              <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : dispute && (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-sm font-semibold">⚖️ Mübahisə #{dispute.id}</p>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${(DISPUTE_STATUS[dispute.status] || DISPUTE_STATUS.OPEN).cls}`}>
                    {(DISPUTE_STATUS[dispute.status] || { label: dispute.status }).label}
                  </span>
                </div>
                {dispute.status === "AWAITING_SELLER" && dispute.respondBy && (() => {
                  const c = countdown(dispute.respondBy, now);
                  return c && <p className="text-xs text-amber-700 dark:text-amber-400">⏱ {partyName(dispute.targetUserId)} cavab verməlidir — {c.text}. Cavab olmasa sistem sübutlara (fotolara) görə qərar verəcək.</p>;
                })()}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">{partyName(dispute.complainantId)}nın iddiası{uid === dispute.complainantId ? " (siz)" : ""}</p>
                  <p className="text-sm whitespace-pre-wrap">{dispute.description}</p>
                  <Thumbs images={dispute.images} />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold">{partyName(dispute.targetUserId)}nın cavabı{uid === dispute.targetUserId ? " (siz)" : ""}</p>
                  {dispute.sellerResponse ? (
                    <>
                      <p className="text-sm whitespace-pre-wrap">{dispute.sellerResponse}</p>
                      <Thumbs images={dispute.sellerImages} />
                    </>
                  ) : <p className="text-xs text-muted italic">Hələ cavab yoxdur</p>}
                </div>
                {dispute.decision && (
                  <div className="rounded-lg bg-input-bg/60 border border-card-border p-2.5 space-y-1">
                    <p className="text-sm font-semibold">
                      {dispute.decision === "ESCALATED"
                        ? "Adminə ötürüldü — admin baxacaq"
                        : `Qərar: ${partyName(dispute.decision === "COMPLAINANT" ? dispute.complainantId : dispute.targetUserId)}nın xeyrinə`}
                    </p>
                    <p className="text-xs text-muted">
                      Qərar verən: {DECIDED_BY[dispute.decisionBy] || dispute.decisionBy || "—"}
                      {dispute.decidedAt ? ` · ${fmtDate(dispute.decidedAt)}` : ""}
                    </p>
                    {dispute.decisionReason && <p className="text-xs whitespace-pre-wrap">{dispute.decisionReason}</p>}
                    {dispute.appealed && <p className="text-xs text-blue-600">Adminə müraciət edilib — baxılır.</p>}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {canRespond && <button onClick={() => open("respond")} className={brand}>Cavab ver</button>}
                  {canAppeal && <button onClick={() => open("appeal")} className={ghost}>Adminə müraciət et</button>}
                </div>
                {form === "respond" && canRespond && (
                  <div className="space-y-2">
                    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={inputCls + " resize-none"}
                      placeholder="Mövqeyinizi izah edin (ən azı 10 simvol)..." />
                    <PhotoPicker files={files} setFiles={setFiles} max={6} />
                    <div className="flex gap-2 flex-wrap">
                      <button disabled={busy || !minLen(10)} onClick={() => doRespond(false)} className={brand}>{busy ? "..." : "Etiraz et"}</button>
                      <button disabled={busy} onClick={() => doRespond(true)} className={`${btn} bg-green-500/10 text-green-600`}>İddianı qəbul edirəm</button>
                      <button onClick={() => setForm(null)} className={ghost}>Bağla</button>
                    </div>
                  </div>
                )}
                {form === "appeal" && canAppeal && (
                  <div className="space-y-2">
                    <p className="text-[11px] text-muted">Qərarla razı deyilsinizsə bir dəfə adminə müraciət edə bilərsiniz. Admin qərarı yekundur.</p>
                    <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={inputCls + " resize-none"}
                      placeholder="Niyə razı deyilsiniz? (ən azı 10 simvol)" />
                    <div className="flex gap-2">
                      <button disabled={busy || !minLen(10)} onClick={doAppeal} className={brand}>{busy ? "..." : "Göndər"}</button>
                      <button onClick={() => setForm(null)} className={ghost}>Bağla</button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* ── Əməliyyatlar ── */}
          <div className="flex gap-2 flex-wrap">
            {side === "buying" && (ret.status === "REQUESTED" || ret.status === "APPROVED") && (
              <button disabled={busy} onClick={doCancel} className={`${btn} bg-gray-500/10 text-gray-500 hover:bg-gray-500/20`}>İadəni ləğv et</button>
            )}
            {side === "buying" && ret.status === "APPROVED" && (
              <button onClick={() => open("ship")} className={brand}>Göndərdim</button>
            )}
            {canDispute && <button onClick={() => open("dispute")} className={brand}>Etiraz et (mübahisə aç)</button>}

            {side === "selling" && ret.status === "REQUESTED" && (
              <>
                <button onClick={() => open("approve")} className={`${btn} bg-green-500/10 text-green-600 hover:bg-green-500/20`}>Təsdiqlə</button>
                <button onClick={() => open("reject")} className={`${btn} bg-red-500/10 text-red-500 hover:bg-red-500/20`}>Rədd et</button>
              </>
            )}
            {side === "selling" && ret.status === "RETURN_SHIPPED" && (
              <button disabled={busy} onClick={doReceive} className={brand}>Qəbul etdim</button>
            )}
            {side === "selling" && ret.status === "RETURN_RECEIVED" && (
              <button disabled={busy} onClick={doRefund} className={brand}>{busy ? "..." : `Pulu qaytar (${money(ret.refundAmount)} AZN)`}</button>
            )}
            {side === "selling" && (ret.status === "RETURN_SHIPPED" || ret.status === "RETURN_RECEIVED") && !ret.disputeId && (
              <button onClick={() => open("problem")} className={`${btn} bg-red-500/10 text-red-500 hover:bg-red-500/20`}>Problem var</button>
            )}
          </div>

          {form === "ship" && (
            <div className="rounded-xl bg-input-bg/50 p-3 space-y-2">
              <p className="text-sm font-semibold">Məhsulu necə göndərdiniz?</p>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                {Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} className={inputCls} placeholder="İzləmə kodu (varsa)" maxLength={80} />
              <p className="text-[11px] text-muted">Satıcı 10 gün ərzində qəbulu təsdiqləməlidir, əks halda sistem mübahisə açır.</p>
              <div className="flex gap-2">
                <button disabled={busy} onClick={doShip} className={brand}>{busy ? "..." : "Təsdiqlə"}</button>
                <button onClick={() => setForm(null)} className={ghost}>Bağla</button>
              </div>
            </div>
          )}
          {form === "approve" && (
            <div className="rounded-xl bg-input-bg/50 p-3 space-y-2">
              <p className="text-sm font-semibold">İadəni təsdiqlə</p>
              <label className="text-[11px] text-muted">Qaytarılacaq məbləğ (AZN)</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className={inputCls + " resize-none"} placeholder="Alıcıya qeyd (istəyə görə)" />
              <p className="text-[11px] text-muted">Təsdiqdən sonra alıcı 7 gün ərzində məhsulu göndərməlidir.</p>
              <div className="flex gap-2">
                <button disabled={busy} onClick={doApprove} className={brand}>{busy ? "..." : "Təsdiqlə"}</button>
                <button onClick={() => setForm(null)} className={ghost}>Bağla</button>
              </div>
            </div>
          )}
          {form === "reject" && (
            <div className="rounded-xl bg-input-bg/50 p-3 space-y-2">
              <p className="text-sm font-semibold">Rədd səbəbi <span className="text-red-500">*</span></p>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={inputCls + " resize-none"}
                placeholder="Niyə rədd edirsiniz? (ən azı 10 simvol) — alıcı və sistem bunu görəcək" />
              <p className="text-[11px] text-muted">Sübut fotoları (istəyə görə, maks. 4). Alıcı 7 gün ərzində etiraz edə bilər — sistem hər iki tərəfin sübutlarına baxır.</p>
              <PhotoPicker files={files} setFiles={setFiles} max={4} />
              <div className="flex gap-2">
                <button disabled={busy || !minLen(10)} onClick={doReject} className={`${btn} bg-red-500 text-white`}>{busy ? "..." : "Rədd et"}</button>
                <button onClick={() => setForm(null)} className={ghost}>Bağla</button>
              </div>
            </div>
          )}
          {form === "dispute" && (
            <div className="rounded-xl bg-input-bg/50 p-3 space-y-2">
              <p className="text-sm font-semibold">Rədd qərarına etiraz</p>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                <option value="">Kateqoriya seçin (istəyə görə)</option>
                {DISPUTE_CATS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={inputCls + " resize-none"}
                placeholder="Niyə razı deyilsiniz? (ən azı 10 simvol)" />
              <p className="text-[11px] text-muted">Aydın fotolar əlavə edin (maks. 6). Satıcının cavab vermək üçün 48 saatı var, sonra sistem sübutlara görə qərar verir; əmin olmadıqda admin baxır.</p>
              <PhotoPicker files={files} setFiles={setFiles} max={6} />
              <div className="flex gap-2">
                <button disabled={busy || !minLen(10)} onClick={doDispute} className={brand}>{busy ? "..." : "Göndər"}</button>
                <button onClick={() => setForm(null)} className={ghost}>Bağla</button>
              </div>
            </div>
          )}
          {form === "problem" && (
            <div className="rounded-xl bg-input-bg/50 p-3 space-y-2">
              <p className="text-sm font-semibold">Qaytarılan məhsulda problem</p>
              <p className="text-[11px] text-muted">Məhsul zədəli, fərqli və ya əskik gəlibsə yazın və ən azı 1 foto əlavə edin. Mübahisə açılacaq, alıcının cavab üçün 48 saatı olacaq.</p>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={inputCls + " resize-none"}
                placeholder="Problemi ətraflı yazın (ən azı 10 simvol)" />
              <PhotoPicker files={files} setFiles={setFiles} max={6} />
              <div className="flex gap-2">
                <button disabled={busy || !minLen(10) || files.length === 0} onClick={doProblem} className={`${btn} bg-red-500 text-white`}>{busy ? "..." : "Göndər"}</button>
                <button onClick={() => setForm(null)} className={ghost}>Bağla</button>
              </div>
            </div>
          )}

          {/* Tarixçə */}
          <div>
            <button onClick={() => setShowTimeline((v) => !v)} className="text-xs font-semibold text-muted hover:text-foreground">
              {showTimeline ? "▲" : "▼"} Tarixçə ({ret.events?.length || 0})
            </button>
            {showTimeline && (
              <ol className="mt-2 border-l-2 border-card-border ml-1.5 space-y-3">
                {(ret.events || []).map((e: any) => (
                  <li key={e.id} className="pl-3 relative">
                    <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-orange-500" />
                    <p className="text-xs">
                      <b>{ACTOR[e.actor] || e.actor}</b>
                      {e.status && <span className="text-muted"> · {STATUS[e.status]?.label || e.status}</span>}
                    </p>
                    <p className="text-[11px] text-muted">{fmtDate(e.createdAt)}</p>
                    {e.note && <p className="text-xs mt-0.5 whitespace-pre-wrap">{e.note}</p>}
                  </li>
                ))}
                {!ret.events?.length && <li className="pl-3 text-xs text-muted">Qeyd yoxdur</li>}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IadelerInner() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Side>(params.get("tab") === "selling" ? "selling" : "buying");
  const [lists, setLists] = useState<Record<Side, any[]>>({ buying: [], selling: [] });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, any>>({});
  const [now, setNow] = useState(() => Date.now());
  const focused = useRef(false);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) router.push("/");
  }, [authLoading, isLoggedIn, router]);

  const loadDetail = useCallback(async (id: number) => {
    if (!token) return;
    const r = await fetch(`${API}/returns/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json()).catch(() => null);
    if (r?.success) setDetails((p) => ({ ...p, [id]: r }));
  }, [token]);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const h = { headers: { Authorization: `Bearer ${token}` } };
      const [b, s] = await Promise.all([
        fetch(`${API}/returns/buying`, h).then((x) => x.json()),
        fetch(`${API}/returns/selling`, h).then((x) => x.json()),
      ]);
      setLists({ buying: b.returns || [], selling: s.returns || [] });
    } catch {
      if (!silent) toast("Xəta baş verdi", "error");
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { load(); }, [load]);

  // Açıq kartda mübahisə varsa detalı da təzələ.
  const refresh = useCallback(async () => {
    await load(true);
    if (expanded != null) await loadDetail(expanded);
  }, [load, loadDetail, expanded]);
  useLive(["return"], () => { refresh(); });

  // ?id=… → uyğun tabı aç, kartı genişləndir və ona sürüşdür (bir dəfə).
  useEffect(() => {
    if (focused.current || loading) return;
    const id = parseInt(params.get("id") || "");
    if (!id) return;
    focused.current = true;
    const side: Side | null = lists[tab].some((r) => r.id === id) ? tab
      : lists.buying.some((r) => r.id === id) ? "buying"
      : lists.selling.some((r) => r.id === id) ? "selling" : null;
    if (!side) return;
    setTab(side);
    setExpanded(id);
    setTimeout(() => document.getElementById(`ret-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }, [loading, lists, params, tab]);

  // Genişlənəndə mübahisə detalı lazımdırsa yüklə.
  const current = lists[tab];
  const expandedRet = useMemo(() => current.find((r) => r.id === expanded), [current, expanded]);
  useEffect(() => {
    if (expandedRet?.disputeId && !details[expandedRet.id]) loadDetail(expandedRet.id);
  }, [expandedRet, details, loadDetail]);

  const switchTab = (t: Side) => {
    setTab(t);
    setExpanded(null);
    const u = new URL(window.location.href);
    if (t === "selling") u.searchParams.set("tab", "selling"); else u.searchParams.delete("tab");
    u.searchParams.delete("id");
    window.history.replaceState({}, "", u.pathname + u.search);
  };

  const needAction = (side: Side) => lists[side].filter((r) =>
    side === "buying" ? r.status === "APPROVED" : ["REQUESTED", "RETURN_SHIPPED", "RETURN_RECEIVED"].includes(r.status)).length;

  if (authLoading || (!isLoggedIn && !token)) {
    return <div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 sm:py-8">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold">İadələr</h1>
        <Link href="/returns" className="text-xs text-muted hover:text-orange-500 mt-1.5 whitespace-nowrap">Qaytarma şərtləri →</Link>
      </div>
      <p className="text-sm text-muted mb-4">Qaytarma sorğularının vəziyyəti, son müddətlər və tarixçə.</p>

      <div className="flex gap-1 p-1 bg-input-bg rounded-xl mb-4">
        {(["buying", "selling"] as Side[]).map((s) => {
          const n = needAction(s);
          return (
            <button key={s} onClick={() => switchTab(s)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${tab === s ? "bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] text-white shadow" : "text-muted hover:text-foreground"}`}>
              {s === "buying" ? "Aldıqlarım" : "Satdıqlarım"}
              <span className="text-[11px] opacity-80">({lists[s].length})</span>
              {n > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{n}</span>}
            </button>
          );
        })}
      </div>

      <details className="surface p-3 mb-4 text-xs text-muted">
        <summary className="cursor-pointer font-semibold text-foreground">Müddətlər necə işləyir?</summary>
        <ul className="mt-2 space-y-1 list-disc pl-4">
          <li>Satıcı sorğuya <b>72 saat</b> ərzində cavab verməlidir, əks halda iadə avtomatik təsdiqlənir.</li>
          <li>Təsdiqdən sonra alıcı məhsulu <b>7 gün</b> ərzində göndərməlidir, əks halda iadə ləğv olunur.</li>
          <li>Satıcı məhsulu aldığını <b>10 gün</b> ərzində təsdiqləməlidir, əks halda sistem mübahisə açır.</li>
          <li>Qəbuldan sonra satıcı pulu <b>48 saat</b> ərzində qaytarmalıdır, əks halda sistem özü qaytarır.</li>
          <li>Rədd edilmiş iadəyə alıcı <b>7 gün</b> ərzində etiraz edə bilər.</li>
          <li>Mübahisədə qarşı tərəfin cavab üçün <b>48 saatı</b> var; sonra sistem sübutlara (fotolara) baxıb qərar verir, əmin olmadıqda admin baxır.</li>
        </ul>
      </details>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : current.length === 0 ? (
        <div className="surface p-8 text-center">
          <p className="text-muted text-sm mb-3">{tab === "buying" ? "Hələ iadə sorğusu göndərməmisiniz." : "Sizə iadə sorğusu gəlməyib."}</p>
          <Link href={tab === "buying" ? "/orders" : "/orders?tab=selling"} className="text-sm font-semibold text-orange-500 hover:underline">Sifarişlərə keç →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {current.map((ret) => (
            <ReturnCard key={ret.id} ret={ret} side={tab} now={now}
              expanded={expanded === ret.id}
              onToggle={() => setExpanded(expanded === ret.id ? null : ret.id)}
              detail={details[ret.id]}
              reload={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function IadelerPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <IadelerInner />
    </Suspense>
  );
}
