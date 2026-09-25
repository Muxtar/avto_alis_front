"use client";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useLive } from "@/lib/live";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import ProfessionPicker from "@/components/ProfessionPicker";

// REFERAL SATIŞ — satıcı tərəfi: "məhsullarımı kim komissiya ilə sata bilər".
// Proqram şəxsi elanlar (objectId=null) və ya hər mağaza (obyekt) üçün ayrıca qurulur.

type Audience = "ALL" | "PROFESSION" | "INVITED";
type Scope = "ALL" | "SELECTED";
type Mode = "DEFAULT" | "ON" | "OFF";
interface Rule { profession: string; commissionPercent: string; requiredDoc: string }
interface ProgramRow { objectId: number | null; name: string; city?: string | null; listingCount: number; programId: number | null; enabled: boolean; audience: Audience | null; defaultPercent: number | null }

const inputCls = "w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50";
const btnPrimary = "px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50";
const btnGhost = "px-3 py-1.5 rounded-lg bg-input-bg border border-input-border text-xs font-medium hover:border-orange-500/50 hover:text-orange-500 transition-colors disabled:opacity-50";

const AUDIENCES: { v: Audience; label: string; hint: string }[] = [
  { v: "ALL", label: "Hamı", hint: "Qeydiyyatdan keçmiş istənilən istifadəçi link yaradıb sata bilər." },
  { v: "PROFESSION", label: "İxtisasa görə", hint: "Yalnız seçdiyiniz ixtisaslar (lazım olsa diplom/CV ilə) — hər ixtisasa ayrıca faiz." },
  { v: "INVITED", label: "Yalnız dəvət etdiklərim", hint: "Yalnız sizin dəvət etdiyiniz və ya müraciətini təsdiqlədiyiniz şəxslər." },
];
const DOCS: Record<string, string> = { NONE: "Sənəd yox", DIPLOMA: "Diplom", CV: "CV", ANY: "Diplom və ya CV" };
const PARTNER: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Aktiv", cls: "text-emerald-600 bg-emerald-500/10" },
  INVITED: { label: "Dəvət göndərilib", cls: "text-blue-600 bg-blue-500/10" },
  REQUESTED: { label: "Müraciət edib", cls: "text-amber-600 bg-amber-500/10" },
  REJECTED: { label: "Rədd edilib", cls: "text-red-500 bg-red-500/10" },
  REVOKED: { label: "Bloklanıb", cls: "text-red-500 bg-red-500/10" },
};

const azn = (n: number | null | undefined) => `${formatPrice(n || 0)} ₼`;
const dstr = (s?: string | null) => (s ? new Date(s).toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
const pctStr = (n: number | null | undefined) => (n == null ? "" : String(n));

function Switch({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? "bg-orange-500" : "bg-input-border"}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export default function ReferralManagePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ManageInner />
    </Suspense>
  );
}

function Spinner() {
  return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
}

function ManageInner() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const urlObj = sp.get("objectId");

  const [programs, setPrograms] = useState<ProgramRow[] | null>(null);
  // Seçilmiş proqram: URL-dəki objectId, yoxsa siyahıdakı ilk proqram ("p" = şəxsi elanlar).
  const selKey: string | null = urlObj && /^\d+$/.test(urlObj) ? urlObj
    : programs === null ? null
    : programs.length ? (programs[0].objectId == null ? "p" : String(programs[0].objectId)) : null;
  const [progError, setProgError] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);

  // Tənzimləmələr forması
  const [enabled, setEnabled] = useState(false);
  const [audience, setAudience] = useState<Audience>("ALL");
  const [scope, setScope] = useState<Scope>("ALL");
  const [defaultPercent, setDefaultPercent] = useState("");
  const [linkDays, setLinkDays] = useState("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Məhsul dəyişiklikləri: listingId → {mode, percent}
  const [edits, setEdits] = useState<Record<number, { mode: Mode; percent: string }>>({});
  const [savingListings, setSavingListings] = useState(false);

  // Partnyorlar
  const [invPhone, setInvPhone] = useState("");
  const [invPercent, setInvPercent] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [partnerPct, setPartnerPct] = useState<Record<number, string>>({});

  const objQs = selKey === "p" ? "" : `?objectId=${selKey}`;
  const H = useCallback(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const loadPrograms = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API}/me/referral/programs`, { headers: H() }).then((x) => x.json());
      if (r?.success === false) throw new Error();
      setPrograms(r.programs || []); setProgError(false);
    } catch { setProgError(true); setPrograms((p) => p || []); }
  }, [token, H]);

  const applyData = useCallback((d: any, resetForm: boolean) => {
    setData(d);
    setNow(Date.now());
    const p = d?.program || {};
    if (resetForm) {
      setEnabled(!!p.enabled);
      setAudience((p.audience as Audience) || "ALL");
      setScope((p.productScope as Scope) || "ALL");
      setDefaultPercent(pctStr(p.defaultPercent));
      setLinkDays(pctStr(p.linkDays));
      setRules((p.rules || []).map((x: any) => ({ profession: x.profession || "", commissionPercent: pctStr(x.commissionPercent), requiredDoc: x.requiredDoc || "NONE" })));
      setEdits({});
      setPartnerPct({});
    }
  }, []);

  const loadProgram = useCallback(async (silent = false, resetForm = true) => {
    if (!token || selKey === null) return;
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`${API}/me/referral/program${objQs}`, { headers: H() }).then((x) => x.json());
      if (r?.success === false) throw new Error(r.message);
      applyData(r, resetForm);
    } catch (e: any) { if (!silent) toast(e?.message || "Proqram yüklənmədi", "error"); } finally { setLoading(false); }
  }, [token, selKey, objQs, H, applyData, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    loadPrograms();
  }, [authLoading, isLoggedIn, router, loadPrograms]);

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    loadProgram();
  }, [authLoading, isLoggedIn, loadProgram]);

  // Yeni müraciət / sifariş bildirişi gələndə siyahılar yenilənsin (forma toxunulmur).
  useLive(["notification"], () => { loadProgram(true, false); loadPrograms(); });

  const select = (key: string) => {
    router.replace(key === "p" ? "/referral/manage" : `/referral/manage?objectId=${key}`);
  };

  // ---------- Tənzimləmələr ----------
  const saveSettings = async () => {
    const dp = defaultPercent === "" ? null : parseFloat(defaultPercent);
    if (dp != null && (!Number.isFinite(dp) || dp < 0 || dp > 90)) { toast("Standart faiz 0–90 arasında olmalıdır", "error"); return; }
    const ld = linkDays === "" ? null : parseInt(linkDays, 10);
    if (ld != null && (!Number.isFinite(ld) || ld < 1 || ld > 365)) { toast("Link müddəti 1–365 gün olmalıdır", "error"); return; }
    const cleanRules = rules.filter((r) => r.profession.trim());
    for (const r of cleanRules) {
      const p = parseFloat(r.commissionPercent);
      if (!Number.isFinite(p) || p < 0 || p > 90) { toast(`"${r.profession}" üçün faiz 0–90 olmalıdır`, "error"); return; }
    }
    if (audience === "PROFESSION" && cleanRules.length === 0) { toast("Ən azı bir ixtisas əlavə edin", "error"); return; }
    setSavingSettings(true);
    try {
      const body: any = {
        enabled, audience, productScope: scope,
        rules: cleanRules.map((r) => ({ profession: r.profession.trim(), commissionPercent: parseFloat(r.commissionPercent), requiredDoc: r.requiredDoc })),
      };
      if (dp != null) body.defaultPercent = dp;
      if (ld != null) body.linkDays = ld;
      const r = await fetch(`${API}/me/referral/program${objQs}`, { method: "PUT", headers: H(), body: JSON.stringify(body) }).then((x) => x.json());
      if (r.success === false) { toast(r.message || "Xəta", "error"); return; }
      toast("Proqram yadda saxlandı ✓", "success");
      await Promise.all([loadProgram(true, true), loadPrograms()]);
    } catch { toast("Xəta", "error"); } finally { setSavingSettings(false); }
  };

  // ---------- Məhsullar ----------
  const listings: any[] = useMemo(() => data?.listings || [], [data]);
  const rowState = (l: any) => edits[l.id] || { mode: (l.referralMode as Mode) || "DEFAULT", percent: pctStr(l.referralPercent) };
  const isIncluded = (mode: Mode) => (scope === "ALL" ? mode !== "OFF" : mode === "ON");
  const setRow = (l: any, patch: Partial<{ mode: Mode; percent: string }>) =>
    setEdits((e) => ({ ...e, [l.id]: { ...rowState(l), ...patch } }));
  // Açarı cari əhatə rejiminə uyğun rejimə çeviririk:
  //  ALL: açıq → DEFAULT, bağlı → OFF;  SELECTED: açıq → ON, bağlı → DEFAULT.
  const modeFor = (on: boolean): Mode => (scope === "ALL" ? (on ? "DEFAULT" : "OFF") : (on ? "ON" : "DEFAULT"));
  const setAll = (on: boolean) => {
    const next: Record<number, { mode: Mode; percent: string }> = { ...edits };
    for (const l of listings) next[l.id] = { ...rowState(l), mode: modeFor(on) };
    setEdits(next);
  };
  const changedRows = listings.filter((l) => {
    const e = edits[l.id];
    if (!e) return false;
    return e.mode !== ((l.referralMode as Mode) || "DEFAULT") || e.percent.trim() !== pctStr(l.referralPercent);
  });
  const saveListings = async () => {
    const items: any[] = [];
    for (const l of changedRows) {
      const e = edits[l.id];
      const p = e.percent.trim() === "" ? null : parseFloat(e.percent);
      if (p != null && (!Number.isFinite(p) || p < 0 || p > 90)) { toast(`"${l.title}" üçün faiz 0–90 olmalıdır`, "error"); return; }
      items.push({ listingId: l.id, mode: e.mode, percent: p });
    }
    if (!items.length) return;
    setSavingListings(true);
    try {
      const r = await fetch(`${API}/me/referral/listings${objQs}`, { method: "PUT", headers: H(), body: JSON.stringify({ items }) }).then((x) => x.json());
      if (r.success === false) { toast(r.message || "Xəta", "error"); return; }
      toast(`${items.length} məhsul yeniləndi ✓`, "success");
      setEdits({});
      await loadProgram(true, false);
    } catch { toast("Xəta", "error"); } finally { setSavingListings(false); }
  };

  // ---------- Partnyorlar ----------
  const invite = async () => {
    const phone = invPhone.trim();
    if (!phone) { toast("Telefon nömrəsini yazın", "error"); return; }
    const p = invPercent.trim() === "" ? undefined : parseFloat(invPercent);
    if (p !== undefined && (!Number.isFinite(p) || p < 0 || p > 90)) { toast("Faiz 0–90 olmalıdır", "error"); return; }
    setBusyId("invite");
    try {
      const body: any = { phone };
      if (p !== undefined) body.percent = p;
      const r = await fetch(`${API}/me/referral/partners${objQs}`, { method: "POST", headers: H(), body: JSON.stringify(body) }).then((x) => x.json());
      if (r.success === false) { toast(r.message || "Xəta", "error"); return; }
      toast("Dəvət göndərildi ✓", "success");
      setInvPhone(""); setInvPercent("");
      await loadProgram(true, false);
    } catch { toast("Xəta", "error"); } finally { setBusyId(null); }
  };

  const partnerAction = async (partnerId: number, body: any, okMsg: string) => {
    setBusyId(`p${partnerId}`);
    try {
      const r = await fetch(`${API}/me/referral/partners/${partnerId}`, { method: "PUT", headers: H(), body: JSON.stringify(body) }).then((x) => x.json());
      if (r.success === false) { toast(r.message || "Xəta", "error"); return; }
      toast(okMsg, "success");
      await loadProgram(true, false);
    } catch { toast("Xəta", "error"); } finally { setBusyId(null); }
  };

  const savePartnerPct = (s: any) => {
    const raw = partnerPct[s.partner.id];
    if (raw === undefined) return;
    const cur = pctStr(s.partner.percent);
    if (raw.trim() === cur) return;
    const p = raw.trim() === "" ? null : parseFloat(raw);
    if (p != null && (!Number.isFinite(p) || p < 0 || p > 90)) { toast("Faiz 0–90 olmalıdır", "error"); return; }
    partnerAction(s.partner.id, { percent: p }, "Faiz yeniləndi ✓").then(() =>
      setPartnerPct((m) => { const n = { ...m }; delete n[s.partner.id]; return n; }));
  };

  // ---------- Linklər ----------
  const toggleLink = async (id: number, active: boolean) => {
    setBusyId(`l${id}`);
    try {
      const r = await fetch(`${API}/me/referral/program-links/${id}`, { method: "PUT", headers: H(), body: JSON.stringify({ active }) }).then((x) => x.json());
      if (r.success === false) { toast(r.message || "Xəta", "error"); return; }
      toast(active ? "Link aktivləşdirildi" : "Link dayandırıldı", "success");
      await loadProgram(true, false);
    } catch { toast("Xəta", "error"); } finally { setBusyId(null); }
  };

  if (authLoading || programs === null) return <Spinner />;

  const hasAnything = programs.some((p) => p.listingCount > 0 || p.objectId != null);
  if (!hasAnything) {
    return (
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">🤝 Referal satış — proqramım</h1>
        <div className="surface p-8 text-center mt-4">
          <p className="text-sm text-muted mb-3">{progError ? "Məlumat yüklənmədi." : "Referal proqramı qurmaq üçün əvvəlcə elan yerləşdirin və ya mağaza (obyekt) yaradın."}</p>
          {progError
            ? <button onClick={() => loadPrograms()} className={btnPrimary}>Yenidən cəhd et</button>
            : <div className="flex gap-2 justify-center"><Link href="/account" className={btnPrimary}>Elanlarım</Link><Link href="/business" className="px-4 py-2 rounded-xl bg-input-bg border border-input-border text-sm font-semibold">Biznes</Link></div>}
        </div>
      </div>
    );
  }

  const sellers: any[] = data?.sellers || [];
  const requested = sellers.filter((s) => s.partner?.status === "REQUESTED");
  const invited = sellers.filter((s) => s.partner?.status === "INVITED");
  const links: any[] = data?.links || [];
  const totals = data?.totals || { orders: 0, commission: 0 };
  const includedCount = listings.filter((l) => isIncluded(rowState(l).mode)).length;

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">🤝 Referal satış — proqramım</h1>
      <p className="text-sm text-muted mb-4">Məhsullarınızı başqaları öz linki ilə satsın, siz yalnız çatdırılmış satışdan komissiya ödəyin.</p>

      {/* Proqram seçimi */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
        {programs.map((p) => {
          const key = p.objectId == null ? "p" : String(p.objectId);
          const active = key === selKey;
          return (
            <button key={key} onClick={() => select(key)}
              className={`shrink-0 px-3 py-2 rounded-xl border text-left transition-colors ${active ? "bg-orange-500 border-orange-500 text-white" : "bg-input-bg border-input-border hover:border-orange-500/50"}`}>
              <span className="block text-xs font-semibold">{p.objectId == null ? "👤" : "🏪"} {p.name}</span>
              <span className={`block text-[10px] ${active ? "text-white/80" : "text-muted"}`}>
                {p.listingCount} məhsul · {p.enabled ? `aktiv${p.defaultPercent != null ? ` · ${p.defaultPercent}%` : ""}` : "söndürülüb"}
              </span>
            </button>
          );
        })}
      </div>

      {loading || !data ? <Spinner /> : (
        <div className="space-y-5">
          {/* Yekun */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="surface p-3"><p className="text-[11px] text-muted">Referal sifarişlər</p><p className="text-lg font-bold">{totals.orders || 0}</p></div>
            <div className="surface p-3"><p className="text-[11px] text-muted">Ödənilən komissiya</p><p className="text-lg font-bold text-orange-500">{azn(totals.commission)}</p></div>
            <div className="surface p-3"><p className="text-[11px] text-muted">Proqramdakı məhsullar</p><p className="text-lg font-bold">{includedCount} / {listings.length}</p></div>
            <div className="surface p-3"><p className="text-[11px] text-muted">Aktiv linklər</p><p className="text-lg font-bold">{links.filter((l) => l.active && !(l.expiresAt && new Date(l.expiresAt).getTime() < now)).length}</p></div>
          </div>

          {/* a) Tənzimləmələr */}
          <section className="surface p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold">⚙️ Tənzimləmələr</h2>
                <p className="text-[11px] text-muted">Faiz prioriteti: şəxsə xüsusi faiz → məhsul faizi → ixtisas qaydası → standart faiz.</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium shrink-0">
                <Switch on={enabled} onChange={setEnabled} /> {enabled ? "Aktiv" : "Söndürülüb"}
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-semibold text-muted mb-2">Kim sata bilər?</p>
                <div className="space-y-1.5">
                  {AUDIENCES.map((a) => (
                    <label key={a.v} className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer ${audience === a.v ? "border-orange-500 bg-orange-500/5" : "border-card-border"}`}>
                      <input type="radio" name="aud" checked={audience === a.v} onChange={() => setAudience(a.v)} className="mt-0.5 accent-orange-500" />
                      <span><span className="block text-sm font-medium">{a.label}</span><span className="block text-[11px] text-muted">{a.hint}</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted mb-2">Hansı məhsullar?</p>
                  <div className="space-y-1.5">
                    {([["ALL", "Bütün məhsullarım", "Söndürdükləriniz istisna olmaqla hamısı."], ["SELECTED", "Yalnız seçdiklərim", "Yalnız aşağıda açdığınız məhsullar."]] as const).map(([v, l, h]) => (
                      <label key={v} className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer ${scope === v ? "border-orange-500 bg-orange-500/5" : "border-card-border"}`}>
                        <input type="radio" name="scope" checked={scope === v} onChange={() => setScope(v)} className="mt-0.5 accent-orange-500" />
                        <span><span className="block text-sm font-medium">{l}</span><span className="block text-[11px] text-muted">{h}</span></span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-muted">Standart faiz (%)
                    <input type="number" min={0} max={90} step={0.5} value={defaultPercent} onChange={(e) => setDefaultPercent(e.target.value)} className={`${inputCls} mt-1`} />
                  </label>
                  <label className="text-xs text-muted">Link müddəti (gün)
                    <input type="number" min={1} max={365} value={linkDays} onChange={(e) => setLinkDays(e.target.value)} className={`${inputCls} mt-1`} />
                  </label>
                </div>
              </div>
            </div>

            {audience === "PROFESSION" && (
              <div className="mt-5 border-t border-card-border pt-4">
                <p className="text-xs font-semibold text-muted mb-2">İxtisas qaydaları ({rules.length}/10)</p>
                <div className="space-y-2">
                  {rules.map((r, i) => (
                    <div key={i} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_90px_150px_auto] gap-2 items-center">
                      <div className="col-span-2 sm:col-span-1">
                        <ProfessionPicker value={r.profession} onChange={(v) => setRules(rules.map((x, j) => (j === i ? { ...x, profession: v } : x)))} className={inputCls} />
                      </div>
                      <input type="number" min={0} max={90} placeholder="%" value={r.commissionPercent} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, commissionPercent: e.target.value } : x)))} className={inputCls} />
                      <select value={r.requiredDoc} onChange={(e) => setRules(rules.map((x, j) => (j === i ? { ...x, requiredDoc: e.target.value } : x)))} className={inputCls}>
                        {Object.entries(DOCS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <button onClick={() => setRules(rules.filter((_, j) => j !== i))} className="text-red-500 text-sm px-2" title="Sil">✕</button>
                    </div>
                  ))}
                </div>
                {rules.length < 10 && (
                  <button onClick={() => setRules([...rules, { profession: "", commissionPercent: "", requiredDoc: "NONE" }])} className="mt-2 text-xs text-orange-500 font-medium">+ İxtisas əlavə et</button>
                )}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button onClick={saveSettings} disabled={savingSettings} className={btnPrimary}>{savingSettings ? "..." : "Yadda saxla"}</button>
            </div>
          </section>

          {/* b) Məhsullar */}
          <section className="surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="font-semibold">📦 Məhsullar</h2>
                <p className="text-[11px] text-muted">Faiz boş qalsa standart / ixtisas faizi tətbiq olunur.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAll(true)} className={btnGhost} disabled={!listings.length}>Hamısını seç</button>
                <button onClick={() => setAll(false)} className={btnGhost} disabled={!listings.length}>Hamısını sil</button>
              </div>
            </div>
            {listings.length === 0 ? <p className="text-sm text-muted text-center py-6">Bu proqramda məhsul yoxdur.</p> : (
              <div className="divide-y divide-card-border">
                {listings.map((l) => {
                  const st = rowState(l);
                  const on = isIncluded(st.mode);
                  const dirty = !!edits[l.id] && changedRows.includes(l);
                  return (
                    <div key={l.id} className={`flex items-center gap-3 py-2.5 ${on ? "" : "opacity-60"}`}>
                      {l.image ? <img src={imgUrl(l.image)} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-input-bg shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <Link href={`/marketplace/${l.id}`} className="text-sm font-medium line-clamp-1 hover:text-orange-500">{l.title}</Link>
                        <p className="text-[11px] text-muted">{azn(l.price)}{l.stock != null ? ` · stok ${l.stock}` : ""}{l.status === "PENDING" ? " · yoxlamada" : ""}{dirty ? " · dəyişib" : ""}</p>
                      </div>
                      <input type="number" min={0} max={90} placeholder="% std" value={st.percent} onChange={(e) => setRow(l, { percent: e.target.value })}
                        className="w-20 px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                      <Switch on={on} onChange={(v) => setRow(l, { mode: modeFor(v) })} />
                    </div>
                  );
                })}
              </div>
            )}
            {changedRows.length > 0 && (
              <div className="mt-3 flex items-center justify-end gap-3">
                <button onClick={() => setEdits({})} className="text-xs text-muted hover:text-foreground">Ləğv et</button>
                <button onClick={saveListings} disabled={savingListings} className={btnPrimary}>{savingListings ? "..." : `Dəyişiklikləri saxla (${changedRows.length})`}</button>
              </div>
            )}
          </section>

          {/* c) Satıcılar / partnyorlar */}
          <section className="surface p-4 sm:p-5">
            <h2 className="font-semibold mb-3">👥 Satıcılar və partnyorlar</h2>

            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input value={invPhone} onChange={(e) => setInvPhone(e.target.value)} placeholder="Telefon (+994…)" className={inputCls} />
              <input type="number" min={0} max={90} value={invPercent} onChange={(e) => setInvPercent(e.target.value)} placeholder="Xüsusi % (istəyə bağlı)" className={`${inputCls} sm:w-48`} />
              <button onClick={invite} disabled={busyId === "invite"} className={`${btnPrimary} whitespace-nowrap`}>{busyId === "invite" ? "..." : "Dəvət et"}</button>
            </div>

            {requested.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-amber-600 mb-2">Gözləyən müraciətlər ({requested.length})</p>
                <div className="space-y-2">
                  {requested.map((s) => (
                    <div key={s.userId} className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-[11px] text-muted">{s.profession || "İxtisas yoxdur"}{s.phone ? ` · ${s.phone}` : ""}{s.partner?.note ? ` · “${s.partner.note}”` : ""}</p>
                      </div>
                      <button disabled={busyId === `p${s.partner.id}`} onClick={() => partnerAction(s.partner.id, { action: "approve" }, "Təsdiqləndi ✓")} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50">Təsdiqlə</button>
                      <button disabled={busyId === `p${s.partner.id}`} onClick={() => partnerAction(s.partner.id, { action: "reject" }, "Rədd edildi")} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-semibold disabled:opacity-50">Rədd et</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {invited.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-blue-600 mb-2">Dəvət göndərilib, cavab gözlənilir ({invited.length})</p>
                <div className="flex flex-wrap gap-2">
                  {invited.map((s) => (
                    <span key={s.userId} className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-input-bg border border-input-border text-xs">
                      {s.name}{s.partner?.percent != null ? ` · ${s.partner.percent}%` : ""}
                      <button disabled={busyId === `p${s.partner.id}`} onClick={() => partnerAction(s.partner.id, { action: "revoke" }, "Dəvət ləğv edildi")} className="text-red-500" title="Ləğv et">✕</button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {sellers.length === 0 ? <p className="text-sm text-muted text-center py-6">Hələ heç kim bu proqramla satmayıb.</p> : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm min-w-[760px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-card-border">
                      <th className="px-3 py-2 font-semibold">Şəxs</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Xüsusi %</th>
                      <th className="px-3 py-2 font-semibold text-right">Sifariş</th>
                      <th className="px-3 py-2 font-semibold text-right">Satış</th>
                      <th className="px-3 py-2 font-semibold text-right">Komissiya</th>
                      <th className="px-3 py-2 font-semibold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-card-border">
                    {sellers.map((s) => {
                      const p = s.partner;
                      const badge = p ? PARTNER[p.status] : null;
                      const st = s.stats || {};
                      const busy = p && busyId === `p${p.id}`;
                      return (
                        <tr key={s.userId}>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              {s.avatar ? <img src={imgUrl(s.avatar)} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" /> : <div className="w-8 h-8 rounded-full bg-input-bg shrink-0 flex items-center justify-center text-xs font-bold text-muted">{(s.name || "?")[0]}</div>}
                              <div className="min-w-0">
                                <p className="font-medium truncate">{s.name}</p>
                                <p className="text-[11px] text-muted truncate">{s.profession || "—"}{s.phone ? ` · ${s.phone}` : ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            {badge ? <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 whitespace-nowrap ${badge.cls}`}>{badge.label}</span> : <span className="text-[10px] text-muted">Açıq proqram</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {p ? (
                              <input type="number" min={0} max={90} placeholder="std"
                                value={partnerPct[p.id] ?? pctStr(p.percent)}
                                onChange={(e) => setPartnerPct((m) => ({ ...m, [p.id]: e.target.value }))}
                                onBlur={() => savePartnerPct(s)}
                                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                className="w-16 px-2 py-1 bg-input-bg border border-input-border rounded-lg text-xs" />
                            ) : <span className="text-xs text-muted">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">{st.orders || 0}<span className="block text-[10px] text-muted">{st.delivered || 0} çatdırılıb</span></td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">{azn(st.sales)}</td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold text-orange-500">{azn(st.commission)}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1.5 justify-end">
                              <Link href={`/messages?chat=${s.userId}&seg=BUSINESS&name=${encodeURIComponent(s.name || "")}`} className={btnGhost}>💬 Mesaj</Link>
                              {p && (p.status === "REVOKED" || p.status === "REJECTED") ? (
                                <button disabled={!!busy} onClick={() => partnerAction(p.id, { action: "reactivate" }, "Yenidən aktivləşdirildi ✓")} className={btnGhost}>Aktivləşdir</button>
                              ) : p && p.status === "ACTIVE" ? (
                                <button disabled={!!busy} onClick={() => { if (confirm(`${s.name} bloklansın? Bütün linkləri dayandırılacaq.`)) partnerAction(p.id, { action: "revoke" }, "Bloklandı"); }} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-medium disabled:opacity-50">Blokla</button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] text-muted mt-3">Bloklanan şəxs heç bir rejimdə sata bilməz, aktiv linkləri dayandırılır. Komissiya kart sifarişlərində qazancınızdan çıxılır, nağd sifarişlərdə platformaya borc kimi yazılır.</p>
          </section>

          {/* d) Linklər */}
          <section className="surface p-4 sm:p-5">
            <h2 className="font-semibold mb-3">🔗 Referal linklər</h2>
            {links.length === 0 ? <p className="text-sm text-muted text-center py-6">Hələ link yaradılmayıb.</p> : (
              <div className="divide-y divide-card-border">
                {links.map((l) => {
                  const expired = !!l.expiresAt && new Date(l.expiresAt).getTime() < now;
                  return (
                    <div key={l.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{l.referrer || `#${l.referrerId}`}
                          {expired && <span className="ml-2 text-[10px] font-semibold rounded px-1.5 py-0.5 text-red-500 bg-red-500/10">Vaxtı bitib</span>}
                          {!l.active && !expired && <span className="ml-2 text-[10px] font-semibold rounded px-1.5 py-0.5 text-muted bg-input-bg">Dayandırılıb</span>}
                        </p>
                        <p className="text-[11px] text-muted">Yaradılıb {dstr(l.createdAt)} · bitir {dstr(l.expiresAt)} · {l.clicks || 0} klik</p>
                      </div>
                      <Switch on={!!l.active} disabled={busyId === `l${l.id}`} onChange={(v) => toggleLink(l.id, v)} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
