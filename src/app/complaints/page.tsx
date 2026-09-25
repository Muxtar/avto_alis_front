"use client";
import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLive } from "@/lib/live";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { COMPLAINT_CAT_LABEL, complaintStatusLabel, isComplaintClosed } from "@/lib/complaints";

const MAX_PHOTOS = 6;

type Tab = "mine" | "against";

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
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "against" ? "against" : "mine");
  const [mine, setMine] = useState<any[]>([]);
  const [against, setAgainst] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Satıcının cavab formu (Mənə qarşı)
  const [respondOpen, setRespondOpen] = useState<number | null>(null);
  const [respondText, setRespondText] = useState("");
  const [respondFiles, setRespondFiles] = useState<File[]>([]);
  const respondFileRef = useRef<HTMLInputElement | null>(null);

  // «Problem həll olundu» — bağlama təsdiqi
  const [withdrawFor, setWithdrawFor] = useState<any>(null);
  const [withdrawNote, setWithdrawNote] = useState("");

  useEffect(() => {
    const q = searchParams.get("tab") === "against" ? "against" : "mine";
    setTab(q);
  }, [searchParams]);

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
  // Satıcı cavab verəndə / alıcı bağlayanda / admin qərar verəndə status dərhal dəyişsin.
  useLive(["complaint"], () => load(true));

  const switchTab = (t: Tab) => {
    setTab(t);
    setRespondOpen(null);
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
      if (r.success) { toast("Şəkillər əlavə olundu ✓", "success"); await load(true); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  const respond = async (id: number) => {
    if (respondText.trim().length < 10) { toast("Cavabınızı ən azı 10 simvolla yazın", "error"); return; }
    setBusy(id);
    try {
      const fd = new FormData();
      fd.append("response", respondText.trim());
      respondFiles.slice(0, MAX_PHOTOS).forEach((f) => fd.append("images", f));
      const r = await fetch(`${API}/complaints/${id}/respond`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }).then((x) => x.json());
      if (r.success) {
        toast("Cavabınız göndərildi ✓", "success");
        setRespondOpen(null); setRespondText(""); setRespondFiles([]);
        await load(true);
      } else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  const withdraw = async () => {
    if (!withdrawFor) return;
    const id = withdrawFor.id;
    setBusy(id);
    try {
      const r = await fetch(`${API}/complaints/${id}/withdraw`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ note: withdrawNote.trim() || undefined }),
      }).then((x) => x.json());
      if (r.success) { toast("Şikayət bağlandı ✓", "success"); setWithdrawFor(null); setWithdrawNote(""); await load(true); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  // Giriş yoxlanışı bitənə qədər «daxil olun» göstərmə (səhifə açılanda qısa yanıb-sönürdü).
  if (authLoading) return <div className="min-h-[40vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--brand-from)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!isLoggedIn) return <div className="max-w-2xl mx-auto p-6 text-muted">Şikayətlərinizi görmək üçün daxil olun.</div>;

  const items = tab === "mine" ? mine : against;
  const awaitingMe = against.filter((c) => ["AWAITING_SELLER", "OPEN", "EVIDENCE_REQUESTED"].includes(c.status) && !c.sellerResponse).length;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl font-bold mb-3">Şikayətlər</h1>

      <div className="text-xs text-muted bg-input-bg border border-input-border rounded-xl p-3 mb-4 space-y-1">
        <p className="font-semibold text-foreground">Şikayət necə işləyir?</p>
        <p>• Şikayət — satıcının davranışı haqqında rəyinizdir. O, satıcının <b>etibarlılıq reytinqinə</b> təsir edir, amma <b>pul qaytarılmasına və ya məhsulun geri göndərilməsinə səbəb olmur</b>.</p>
        <p>• Satıcıya bildiriş gedir, o, yazılı cavab (və foto) verə bilər. Problem həll olunubsa, şikayəti «Problem həll olundu» ilə bağlayın — onda reytinqə təsir etmir.</p>
        <p>• Admin şikayəti «Əsaslı» (reytinqə tam təsir) və ya «Əsassız» (təsir etmir) sayıla bilər.</p>
        <p>• Pulun geri qaytarılması üçün sifarişdən «İadə sorğusu» göndərin — <Link href="/iadeler" className="text-orange-500 hover:underline">İadələr</Link>.</p>
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

      {tab === "against" && (
        <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-2.5 py-1.5 mb-3">
          Cavabsız şikayətlər etibarlılıq reytinqinizə təsir edir. Alıcıya izah yazın — problem həll olunarsa, o, şikayəti bağlaya bilər.
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-muted text-sm py-10 text-center">{tab === "mine" ? "Hələ şikayət göndərməmisiniz." : "Sizə qarşı şikayət yoxdur."}</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const isMine = tab === "mine";
            const closed = isComplaintClosed(c);
            const st = complaintStatusLabel(c, !isMine);
            const other = isMine ? c.target : c.complainant;
            const hasResponse = !!(c.sellerResponse || c.sellerImages?.length);
            const isListingReport = !c.orderId && !!c.listingId && !c.consultationId;
            const buyerNote = typeof c.adminNote === "string" && c.adminNote.startsWith("Alıcı:") ? c.adminNote : null;
            return (
              <div key={c.id} className="surface p-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[11px] text-muted">#{c.id}</span>
                  <span className="text-sm font-semibold">{isMine ? "" : "Şikayətçi: "}{other?.name || "—"}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-red-500/10 text-red-500">{COMPLAINT_CAT_LABEL[c.category] || c.category}</span>
                  {isListingReport && <span className="px-2 py-0.5 rounded text-[11px] bg-gray-500/10 text-gray-500">Elan haqqında bildiriş</span>}
                  <span className={`ml-auto px-2 py-0.5 rounded text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-[11px] text-muted mb-1.5">{new Date(c.createdAt).toLocaleString("az-AZ")}</p>

                {/* Şikayətin mətni */}
                <div className="mb-2">
                  <p className="text-[11px] font-semibold text-muted mb-0.5">{isMine ? "Sizin şikayətiniz" : "Alıcının şikayəti"}</p>
                  <p className="text-sm whitespace-pre-wrap">{c.description}</p>
                </div>
                <Photos list={c.images} onOpen={setLightbox} />

                {(c.orderId || c.returnId || c.listingId) && (
                  <div className="flex flex-wrap gap-2 mb-2 text-xs">
                    {c.orderId && <Link href={`/orders/${c.orderId}`} className="px-2 py-1 rounded-lg bg-input-bg border border-input-border hover:border-orange-500">🧾 Sifariş #{c.orderId}</Link>}
                    {c.returnId && <Link href={`/iadeler?id=${c.returnId}`} className="px-2 py-1 rounded-lg bg-input-bg border border-input-border hover:border-orange-500">↩ İadə #{c.returnId}</Link>}
                    {!c.orderId && c.listingId && <Link href={`/marketplace/${c.listingId}`} className="px-2 py-1 rounded-lg bg-input-bg border border-input-border hover:border-orange-500">📦 Elan #{c.listingId}</Link>}
                  </div>
                )}

                {/* Satıcının cavabı */}
                {hasResponse ? (
                  <div className="mb-2 p-2.5 rounded-xl bg-input-bg border border-input-border">
                    <p className="text-[11px] font-semibold text-muted mb-1">
                      {isMine ? "Satıcının cavabı" : "Sizin cavabınız"}
                      {c.sellerRespondedAt ? ` · ${new Date(c.sellerRespondedAt).toLocaleString("az-AZ")}` : ""}
                    </p>
                    {c.sellerResponse && <p className="text-sm mb-1.5 whitespace-pre-wrap">{c.sellerResponse}</p>}
                    <Photos list={c.sellerImages} onOpen={setLightbox} />
                  </div>
                ) : !closed && (
                  <p className={`text-xs rounded-lg px-2.5 py-1.5 mb-2 ${isMine ? "bg-purple-500/10 text-purple-600" : "bg-red-500/10 text-red-500 font-semibold"}`}>
                    {isMine ? "Satıcı hələ cavab verməyib." : "Hələ cavab verməmisiniz — cavabsız şikayət reytinqinizə təsir edir."}
                  </p>
                )}

                {/* Nəticə */}
                {closed && (
                  <div className="mb-2 text-xs rounded-lg px-2.5 py-1.5 bg-input-bg border border-input-border">
                    {c.resolution === "WITHDRAWN" ? (
                      <p>Alıcı problemin həll olunduğunu bildirdi — şikayət reytinqə təsir etmir.{buyerNote && <span className="block text-muted mt-0.5">{buyerNote}</span>}</p>
                    ) : c.resolution === "UPHELD" ? (
                      <p>Admin şikayəti əsaslı saydı — satıcının etibarlılıq reytinqinə təsir edir.</p>
                    ) : (c.status === "REJECTED" || c.resolution === "UNFOUNDED") ? (
                      <p>Admin şikayəti əsassız saydı — reytinqə təsir etmir.</p>
                    ) : (
                      <p>Şikayət bağlanıb{c.resolution ? ` · ${c.resolution}` : ""}.</p>
                    )}
                    {c.adminNote && !buyerNote && <p className="text-muted mt-0.5">Admin qeydi: {c.adminNote}</p>}
                    {c.resolvedAt && <p className="text-[11px] text-muted mt-0.5">{new Date(c.resolvedAt).toLocaleString("az-AZ")}</p>}
                  </div>
                )}

                {isMine && c.status === "EVIDENCE_REQUESTED" && (
                  <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-2.5 py-1.5 mb-2">
                    Admin əlavə foto/sübut istəyir{c.adminNote ? `: ${c.adminNote}` : ""}.
                  </p>
                )}

                {!closed && (
                  <div className="flex flex-wrap gap-2">
                    {isMine && (
                      <>
                        <button onClick={() => { setWithdrawFor(c); setWithdrawNote(""); }} disabled={busy === c.id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-500 text-white disabled:opacity-50">
                          ✓ Problem həll olundu — bağla
                        </button>
                        <input ref={(el) => { fileRefs.current[c.id] = el; }} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addEvidence(c.id, e.target.files); e.target.value = ""; }} />
                        <button onClick={() => fileRefs.current[c.id]?.click()} disabled={busy === c.id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-input-bg border border-input-border hover:border-orange-500 disabled:opacity-50">
                          {busy === c.id ? "Yüklənir..." : "📷 Foto/sübut əlavə et"}
                        </button>
                      </>
                    )}
                    {!isMine && respondOpen !== c.id && (
                      <button onClick={() => { setRespondOpen(c.id); setRespondText(c.sellerResponse || ""); setRespondFiles([]); }} disabled={busy === c.id}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 ${hasResponse ? "bg-input-bg border border-input-border hover:border-orange-500" : "bg-orange-500 text-white"}`}>
                        {hasResponse ? "✎ Cavabı yenilə" : "💬 Cavab yaz"}
                      </button>
                    )}
                  </div>
                )}

                {/* Satıcının cavab formu */}
                {!isMine && !closed && respondOpen === c.id && (
                  <div className="mt-2 p-3 rounded-xl bg-input-bg border border-input-border">
                    <p className="text-xs font-semibold mb-1.5">Alıcıya cavabınız</p>
                    <textarea value={respondText} onChange={(e) => setRespondText(e.target.value)} rows={3} maxLength={3000}
                      placeholder="Vəziyyəti izah edin, üzr istəyin və ya həll yolu təklif edin..."
                      className="w-full px-3 py-2 bg-card border border-input-border rounded-xl text-sm resize-none mb-1" />
                    <p className={`text-[11px] mb-2 ${respondText.trim().length < 10 ? "text-muted" : "text-green-600"}`}>{respondText.trim().length}/10 simvol minimum</p>
                    <input ref={respondFileRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => { const add = pickImages(e.target.files); setRespondFiles((p) => [...p, ...add].slice(0, MAX_PHOTOS)); e.target.value = ""; }} />
                    <div className="flex flex-wrap gap-2 mb-2">
                      {respondFiles.map((f, i) => (
                        <div key={i} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 rounded-lg object-cover border border-input-border" />
                          <button onClick={() => setRespondFiles((p) => p.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] leading-none">×</button>
                        </div>
                      ))}
                      {respondFiles.length < MAX_PHOTOS && (
                        <button onClick={() => respondFileRef.current?.click()} className="w-16 h-16 rounded-lg border border-dashed border-input-border text-muted text-xs hover:border-orange-500">
                          📷 +{MAX_PHOTOS - respondFiles.length}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => respond(c.id)} disabled={busy === c.id || respondText.trim().length < 10}
                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-xl bg-orange-500 text-white disabled:opacity-50">
                        {busy === c.id ? "Göndərilir..." : "Cavabı göndər"}
                      </button>
                      <button onClick={() => setRespondOpen(null)} className="px-3 py-2 text-sm rounded-xl bg-card border border-input-border">Ləğv et</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* «Problem həll olundu» — təsdiq */}
      {withdrawFor && (
        <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center p-4" onClick={() => busy == null && setWithdrawFor(null)}>
          <div className="surface p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">Şikayəti bağlayırsınız?</h3>
            <p className="text-sm text-muted mb-3">
              Problem həll olunubsa, şikayəti bağlayın. Bağlanmış şikayət satıcının reytinqinə təsir etmir və yenidən açıla bilməz.
            </p>
            <textarea value={withdrawNote} onChange={(e) => setWithdrawNote(e.target.value)} rows={2} maxLength={500}
              placeholder="Qeyd (istəyə bağlı) — məs. satıcı məhsulu dəyişdi"
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={withdraw} disabled={busy === withdrawFor.id}
                className="flex-1 px-3 py-2 text-sm font-semibold rounded-xl bg-green-500 text-white disabled:opacity-50">
                {busy === withdrawFor.id ? "Göndərilir..." : "Bəli, bağla"}
              </button>
              <button onClick={() => setWithdrawFor(null)} className="px-3 py-2 text-sm rounded-xl bg-input-bg border border-input-border">Ləğv et</button>
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
