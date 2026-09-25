"use client";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLive } from "@/lib/live";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

const CAT_LABEL: Record<string, string> = {
  TIME_WASTED: "Vaxtı boşa xərclədi", FRAUD: "Fırıldaq", RUDE: "Kobud davranış", FAKE_INFO: "Saxta məlumat", OTHER: "Başqa",
  DEFECTIVE: "Qüsurlu / işləmir", DAMAGED: "Zədəli gəldi", NOT_AS_DESCRIBED: "Təsvirə uyğun deyil", WRONG_ITEM: "Yanlış məhsul",
  CHANGED_MIND: "Bəyənmədim", RETURN_REJECTED: "İadə əsassız rədd edildi", RETURN_NOT_RECEIVED: "Satıcı qaytarılan məhsulu təsdiqləmir",
  RETURN_DAMAGED: "Qaytarılan məhsul zədəli/fərqlidir",
};
const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Açıq", cls: "bg-blue-500/10 text-blue-600" },
  AWAITING_SELLER: { label: "Qarşı tərəfin cavabı gözlənilir", cls: "bg-purple-500/10 text-purple-600" },
  REVIEWING: { label: "Baxılır", cls: "bg-amber-500/10 text-amber-600" },
  EVIDENCE_REQUESTED: { label: "Sübut istənilir", cls: "bg-red-500/10 text-red-500" },
  RESOLVED: { label: "Həll olundu", cls: "bg-green-500/10 text-green-600" },
  REJECTED: { label: "Rədd edildi", cls: "bg-gray-500/10 text-gray-500" },
};
const DECIDED_BY: Record<string, string> = { SYSTEM: "Sistem", AI: "Sistem (AI)", ADMIN: "Admin", SELLER: "Qarşı tərəfin razılığı ilə" };
const APPEAL_DAYS = 7;
const MAX_PHOTOS = 6;

type Tab = "mine" | "against";

function leftText(until: string | null | undefined, now: number) {
  if (!until) return null;
  const ms = new Date(until).getTime() - now;
  if (ms <= 0) return "müddət bitdi";
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h} saat ${m} dəq qalıb` : `${m} dəq qalıb`;
}

function Photos({ list, onOpen }: { list?: string[]; onOpen: (u: string) => void }) {
  if (!list?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {list.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={imgUrl(img)} alt="" onClick={() => onOpen(imgUrl(img))} className="w-16 h-16 rounded-lg object-cover border border-input-border cursor-pointer hover:border-orange-500" />
      ))}
    </div>
  );
}

function pickImages(files: FileList | null) {
  return Array.from(files || []).filter((f) => /^image\//.test(f.type) && f.size < 8 * 1024 * 1024);
}

export default function MyComplaintsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ComplaintsInner />
    </Suspense>
  );
}

function ComplaintsInner() {
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "against" ? "against" : "mine");
  const [mine, setMine] = useState<any[]>([]);
  const [against, setAgainst] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Cavab formu (Mənə qarşı → AWAITING_SELLER)
  const [contestOpen, setContestOpen] = useState<number | null>(null);
  const [contestText, setContestText] = useState("");
  const [contestFiles, setContestFiles] = useState<File[]>([]);
  const [acceptConfirm, setAcceptConfirm] = useState<any>(null);
  const contestFileRef = useRef<HTMLInputElement | null>(null);

  // Müraciət formu
  const [appealOpen, setAppealOpen] = useState<number | null>(null);
  const [appealText, setAppealText] = useState("");

  useEffect(() => {
    const q = searchParams.get("tab") === "against" ? "against" : "mine";
    setTab(q);
  }, [searchParams]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const h = { headers: { Authorization: `Bearer ${token}` } };
      const [a, b] = await Promise.all([
        fetch(`${API}/me/complaints`, h).then((x) => x.json()),
        fetch(`${API}/me/complaints/against`, h).then((x) => x.json()).catch(() => ({})),
      ]);
      setMine(a.complaints || []);
      setAgainst(b.complaints || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
  }, [token, toast]);
  useEffect(() => { load(); }, [load]);
  // Admin sübut istəyəndə / qərar veriləndə / qarşı tərəf cavab verəndə status dərhal dəyişsin.
  useLive(["complaint"], () => load(true));

  const switchTab = (t: Tab) => {
    setTab(t);
    setContestOpen(null); setAppealOpen(null);
    router.replace(t === "against" ? "/complaints?tab=against" : "/complaints", { scroll: false });
  };

  const addEvidence = async (id: number, files: FileList | null) => {
    const list = pickImages(files);
    if (!list.length) return;
    setBusy(id);
    try {
      const fd = new FormData();
      list.forEach((f) => fd.append("images", f));
      const r = await fetch(`${API}/complaints/${id}/evidence`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }).then((x) => x.json());
      if (r.success) { toast("Şəkillər əlavə olundu ✓", "success"); await load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  const respond = async (id: number, accept: boolean) => {
    if (!accept && contestText.trim().length < 10) { toast("Etirazınızı ən azı 10 simvolla izah edin", "error"); return; }
    setBusy(id);
    try {
      const fd = new FormData();
      fd.append("accept", accept ? "true" : "false");
      if (!accept) {
        fd.append("response", contestText.trim());
        contestFiles.slice(0, MAX_PHOTOS).forEach((f) => fd.append("images", f));
      }
      const r = await fetch(`${API}/complaints/${id}/respond`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }).then((x) => x.json());
      if (r.success) {
        toast(accept ? "İddia qəbul edildi ✓" : "Etirazınız göndərildi — sistem qərar verəcək", "success");
        setContestOpen(null); setContestText(""); setContestFiles([]); setAcceptConfirm(null);
        await load(true);
      } else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  const appeal = async (id: number) => {
    if (appealText.trim().length < 10) { toast("Müraciətinizi ən azı 10 simvolla izah edin", "error"); return; }
    setBusy(id);
    try {
      const r = await fetch(`${API}/complaints/${id}/appeal`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note: appealText.trim() }),
      }).then((x) => x.json());
      if (r.success) { toast("Müraciətiniz adminə göndərildi ✓", "success"); setAppealOpen(null); setAppealText(""); await load(true); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  if (!isLoggedIn) return <div className="max-w-2xl mx-auto p-6 text-muted">Şikayətlərinizi görmək üçün daxil olun.</div>;

  const items = tab === "mine" ? mine : against;
  const awaitingMe = against.filter((c) => c.status === "AWAITING_SELLER").length;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl font-bold mb-3">Şikayətlər</h1>

      <div className="text-xs text-muted bg-input-bg border border-input-border rounded-xl p-3 mb-4 space-y-1">
        <p className="font-semibold text-foreground">Mübahisə necə həll olunur?</p>
        <p>1. Sifariş/məhsul şikayəti göndərilən kimi qarşı tərəfə bildiriş gedir — onun cavab vermək üçün <b>48 saatı</b> var.</p>
        <p>2. Qarşı tərəf iddianı qəbul edə və ya izah + foto ilə etiraz edə bilər. Vaxtında cavab verməsə, qərar şikayətçinin xeyrinə olur.</p>
        <p>3. Etiraz olunarsa, sübutlara əsasən <b>sistem qərar verir</b> (lazım olsa admin baxır) və nəticə avtomatik tətbiq olunur.</p>
        <p>4. Qərarla razı deyilsinizsə, <b>{APPEAL_DAYS} gün ərzində bir dəfə</b> adminə müraciət edə bilərsiniz.</p>
      </div>

      <div className="flex gap-1 bg-input-bg border border-input-border rounded-xl p-1 mb-4 w-fit">
        {([["mine", "Şikayətlərim", mine.length], ["against", "Mənə qarşı", against.length]] as [Tab, string, number][]).map(([k, label, n]) => (
          <button key={k} onClick={() => switchTab(k)} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${tab === k ? "bg-orange-500 text-white" : "text-muted"}`}>
            {label}
            {n > 0 && <span className={`text-[10px] px-1.5 rounded-full ${tab === k ? "bg-white/25" : "bg-card"}`}>{n}</span>}
            {k === "against" && awaitingMe > 0 && <span className="w-2 h-2 rounded-full bg-red-500" title="Cavabınız gözlənilir" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-muted text-sm py-10 text-center">{tab === "mine" ? "Hələ şikayət göndərməmisiniz." : "Sizə qarşı şikayət yoxdur."}</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const isMine = tab === "mine";
            const st = STATUS[c.status] || STATUS.OPEN;
            const stLabel = !isMine && c.status === "AWAITING_SELLER" ? "Cavabınız gözlənilir" : st.label;
            const other = isMine ? c.target : c.complainant;
            const canAdd = isMine && ["EVIDENCE_REQUESTED", "OPEN", "REVIEWING", "AWAITING_SELLER"].includes(c.status);
            const decided = c.decision === "COMPLAINANT" || c.decision === "RESPONDENT";
            const myWin = decided && ((isMine && c.decision === "COMPLAINANT") || (!isMine && c.decision === "RESPONDENT"));
            const withinAppeal = !c.decidedAt || now - new Date(c.decidedAt).getTime() <= APPEAL_DAYS * 24 * 3600 * 1000;
            const canAppeal = decided && !myWin && !c.appealed && c.decisionBy !== "ADMIN" && c.decisionBy !== "SELLER" && withinAppeal;
            const left = c.status === "AWAITING_SELLER" ? leftText(c.respondBy, now) : null;
            const isAppealNote = typeof c.adminNote === "string" && c.adminNote.startsWith("MÜRACİƏT");
            return (
              <div key={c.id} className="surface p-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[11px] text-muted">#{c.id}</span>
                  <span className="text-sm font-semibold">{isMine ? "" : "Şikayətçi: "}{other?.name || "—"}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-red-500/10 text-red-500">{CAT_LABEL[c.category] || c.category}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded text-[11px] font-semibold ${st.cls}`}>{stLabel}</span>
                </div>
                <p className="text-[11px] text-muted mb-1.5">{new Date(c.createdAt).toLocaleString("az-AZ")}</p>
                <p className="text-sm text-muted mb-2 whitespace-pre-wrap">{c.description}</p>
                <Photos list={c.images} onOpen={setLightbox} />

                {(c.orderId || c.returnId) && (
                  <div className="flex flex-wrap gap-2 mb-2 text-xs">
                    {c.orderId && <Link href={`/orders/${c.orderId}`} className="px-2 py-1 rounded-lg bg-input-bg border border-input-border hover:border-orange-500">🧾 Sifariş #{c.orderId}</Link>}
                    {c.returnId && <Link href={`/iadeler?id=${c.returnId}`} className="px-2 py-1 rounded-lg bg-input-bg border border-input-border hover:border-orange-500">↩ İadə #{c.returnId}</Link>}
                  </div>
                )}

                {left && (
                  <p className={`text-xs rounded-lg px-2.5 py-1.5 mb-2 ${isMine ? "bg-purple-500/10 text-purple-600" : "bg-red-500/10 text-red-500 font-semibold"}`}>
                    ⏳ {isMine ? "Qarşı tərəfin cavab müddəti" : "Cavab vermək üçün"}: {left}
                    {isMine ? " — vaxtında cavab verilməsə, qərar sizin xeyrinizə olacaq." : " — cavab verməsəniz, qərar şikayətçinin xeyrinə olacaq."}
                  </p>
                )}

                {/* Qarşı tərəfin (cavabverənin) cavabı */}
                {(c.sellerResponse || c.sellerImages?.length > 0) && (
                  <div className="mb-2 p-2.5 rounded-xl bg-input-bg border border-input-border">
                    <p className="text-[11px] font-semibold text-muted mb-1">
                      {isMine ? "Qarşı tərəfin cavabı" : "Sizin cavabınız"}
                      {c.sellerAccepted ? " · iddia qəbul edildi" : c.sellerAccepted === false ? " · etiraz" : ""}
                      {c.sellerRespondedAt ? ` · ${new Date(c.sellerRespondedAt).toLocaleString("az-AZ")}` : ""}
                    </p>
                    {c.sellerResponse && <p className="text-sm mb-1.5 whitespace-pre-wrap">{c.sellerResponse}</p>}
                    <Photos list={c.sellerImages} onOpen={setLightbox} />
                  </div>
                )}

                {/* Qərar */}
                {c.decision === "ESCALATED" && (
                  <p className="text-xs bg-amber-500/10 text-amber-600 rounded-lg px-2.5 py-1.5 mb-2">
                    Sistem sübutlara əsasən birmənalı qərar verə bilmədi — iş adminə ötürülüb, tezliklə baxılacaq.
                  </p>
                )}
                {decided && (
                  <div className={`mb-2 p-2.5 rounded-xl border ${myWin ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                    <p className={`text-sm font-semibold ${myWin ? "text-green-600" : "text-red-500"}`}>
                      {myWin ? "✓ Qərar sizin xeyrinizədir" : "✕ Qərar sizin xeyrinizə deyil"}
                    </p>
                    <p className="text-[11px] text-muted mt-0.5">
                      Qərar verən: <b>{DECIDED_BY[c.decisionBy] || c.decisionBy || "—"}</b>
                      {c.decidedAt ? ` · ${new Date(c.decidedAt).toLocaleString("az-AZ")}` : ""}
                    </p>
                    {c.decisionReason && <p className="text-xs mt-1 whitespace-pre-wrap">{c.decisionReason}</p>}
                    {c.resolution && <p className="text-xs text-muted mt-1">Nəticə: {c.resolution}</p>}
                  </div>
                )}
                {c.appealed && (
                  <p className="text-xs bg-blue-500/10 text-blue-600 rounded-lg px-2.5 py-1.5 mb-2">
                    Qərardan adminə müraciət edilib{c.status === "REVIEWING" ? " — admin baxır." : "."}
                  </p>
                )}
                {c.adminNote && !isAppealNote && c.status !== "EVIDENCE_REQUESTED" && c.decisionBy === "ADMIN" && c.adminNote !== c.decisionReason && (
                  <p className="text-xs text-muted mb-2">Admin qeydi: {c.adminNote}</p>
                )}

                {isMine && c.status === "EVIDENCE_REQUESTED" && (
                  <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-2.5 py-1.5 mb-2">
                    Admin əlavə foto/sübut istəyir{c.adminNote ? `: ${c.adminNote}` : ""}. Zəhmət olmasa qüsurun aydın şəkillərini əlavə edin.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {canAdd && (
                    <>
                      <input ref={(el) => { fileRefs.current[c.id] = el; }} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addEvidence(c.id, e.target.files); e.target.value = ""; }} />
                      <button onClick={() => fileRefs.current[c.id]?.click()} disabled={busy === c.id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-input-bg border border-input-border hover:border-orange-500 disabled:opacity-50">
                        {busy === c.id ? "Yüklənir..." : "📷 Foto/sübut əlavə et"}
                      </button>
                    </>
                  )}
                  {!isMine && c.status === "AWAITING_SELLER" && contestOpen !== c.id && (
                    <>
                      <button onClick={() => setAcceptConfirm(c)} disabled={busy === c.id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-500 text-white disabled:opacity-50">
                        İddianı qəbul edirəm
                      </button>
                      <button onClick={() => { setContestOpen(c.id); setContestText(""); setContestFiles([]); }} disabled={busy === c.id}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-500 disabled:opacity-50">
                        Etiraz edirəm
                      </button>
                    </>
                  )}
                  {canAppeal && appealOpen !== c.id && (
                    <button onClick={() => { setAppealOpen(c.id); setAppealText(""); }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/10 text-blue-600">
                      ⚖ Qərardan adminə müraciət et
                    </button>
                  )}
                </div>

                {/* Etiraz formu */}
                {!isMine && c.status === "AWAITING_SELLER" && contestOpen === c.id && (
                  <div className="mt-2 p-3 rounded-xl bg-input-bg border border-input-border">
                    <p className="text-xs font-semibold mb-1.5">Etirazınızı izah edin</p>
                    <textarea value={contestText} onChange={(e) => setContestText(e.target.value)} rows={3} maxLength={2000}
                      placeholder="Məs.: məhsul göndərilməzdən əvvəl yoxlanılıb, qüsursuz idi. Qablaşdırma şəkilləri əlavə edirəm..."
                      className="w-full px-3 py-2 bg-card border border-input-border rounded-xl text-sm resize-none mb-1" />
                    <p className={`text-[11px] mb-2 ${contestText.trim().length < 10 ? "text-muted" : "text-green-600"}`}>{contestText.trim().length}/10 simvol minimum</p>
                    <input ref={contestFileRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => { const add = pickImages(e.target.files); setContestFiles((p) => [...p, ...add].slice(0, MAX_PHOTOS)); e.target.value = ""; }} />
                    <div className="flex flex-wrap gap-2 mb-2">
                      {contestFiles.map((f, i) => (
                        <div key={i} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 rounded-lg object-cover border border-input-border" />
                          <button onClick={() => setContestFiles((p) => p.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] leading-none">×</button>
                        </div>
                      ))}
                      {contestFiles.length < MAX_PHOTOS && (
                        <button onClick={() => contestFileRef.current?.click()} className="w-16 h-16 rounded-lg border border-dashed border-input-border text-muted text-xs hover:border-orange-500">
                          📷 +{MAX_PHOTOS - contestFiles.length}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => respond(c.id, false)} disabled={busy === c.id || contestText.trim().length < 10}
                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-xl bg-orange-500 text-white disabled:opacity-50">
                        {busy === c.id ? "Göndərilir..." : "Etirazı göndər"}
                      </button>
                      <button onClick={() => setContestOpen(null)} className="px-3 py-2 text-sm rounded-xl bg-card border border-input-border">Ləğv et</button>
                    </div>
                  </div>
                )}

                {/* Müraciət formu */}
                {canAppeal && appealOpen === c.id && (
                  <div className="mt-2 p-3 rounded-xl bg-input-bg border border-input-border">
                    <p className="text-xs font-semibold mb-1">Adminə müraciət (yalnız bir dəfə)</p>
                    <p className="text-[11px] text-muted mb-1.5">Qərarla niyə razı olmadığınızı izah edin. Admin işə yenidən baxacaq və onun qərarı yekun olacaq.</p>
                    <textarea value={appealText} onChange={(e) => setAppealText(e.target.value)} rows={3} maxLength={1000}
                      className="w-full px-3 py-2 bg-card border border-input-border rounded-xl text-sm resize-none mb-2" />
                    <div className="flex gap-2">
                      <button onClick={() => appeal(c.id)} disabled={busy === c.id || appealText.trim().length < 10}
                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-xl bg-blue-500 text-white disabled:opacity-50">
                        {busy === c.id ? "Göndərilir..." : "Müraciəti göndər"}
                      </button>
                      <button onClick={() => setAppealOpen(null)} className="px-3 py-2 text-sm rounded-xl bg-card border border-input-border">Ləğv et</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* İddianı qəbul — təsdiq pəncərəsi */}
      {acceptConfirm && (
        <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4" onClick={() => busy == null && setAcceptConfirm(null)}>
          <div className="surface p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">İddianı qəbul edirsiniz?</h3>
            <p className="text-sm text-muted mb-4">
              Qəbul etsəniz, qərar dərhal şikayətçinin xeyrinə veriləcək və nəticə avtomatik tətbiq olunacaq
              (məs. iadə təsdiqlənəcək və/və ya pul geri qaytarılacaq). Bu addımı geri almaq mümkün olmayacaq.
            </p>
            <div className="flex gap-2">
              <button onClick={() => respond(acceptConfirm.id, true)} disabled={busy === acceptConfirm.id}
                className="flex-1 px-3 py-2 text-sm font-semibold rounded-xl bg-green-500 text-white disabled:opacity-50">
                {busy === acceptConfirm.id ? "Göndərilir..." : "Bəli, qəbul edirəm"}
              </button>
              <button onClick={() => setAcceptConfirm(null)} className="px-3 py-2 text-sm rounded-xl bg-input-bg border border-input-border">Ləğv et</button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[3000] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
