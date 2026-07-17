"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import LocationPicker from "@/components/LocationPickerWrapper";
import ProfessionPicker from "@/components/ProfessionPicker";

// Obyektin fəaliyyət sahələri — 16 əsas kateqoriya.
const ACTIVITY_AREAS = [
  "Nəqliyyat", "Avtomobil ehtiyat hissələri", "Daşınmaz əmlak", "Elektronika",
  "Məişət texnikası", "Ev və bağ", "Tikinti və təmir", "Geyim və aksesuar",
  "Gözəllik və sağlamlıq", "Uşaq aləmi", "Hobbi və idman", "Heyvanlar",
  "İş elanları", "Xidmətlər", "Kənd təsərrüfatı", "Digər",
];

interface Bank { id: number; iban: string; title: string | null; isActive: boolean; isPrimary: boolean }
interface BizObject { id: number; name: string; phone: string | null; address: string; city: string | null; activityAreas: string[]; isActive: boolean; latitude: number | null; longitude: number | null }
interface Member { id: number; status?: string; canSell?: boolean; canBuy?: boolean; user: { id: number; name: string; publicId: string | null }; object: { id: number; name: string } | null }
interface Business {
  id: number; kind: string; proofType: string; name: string; voen: string; ownerName: string; founderName: string; phone: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED"; isActive: boolean; rejectionReason: string | null;
  banks: Bank[]; objects: BizObject[]; members: Member[];
}

const blankFiles = { taxDocImage: null, companyDocImage: null, powerOfAttorneyImage: null, bankDocImage: null, idCardImage: null, selfieImage: null } as Record<string, File | null>;

export default function BusinessPage() {
  const router = useRouter();
  const { token, authLoading, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [publicId, setPublicId] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [idVerified, setIdVerified] = useState<boolean | null>(null); // kimlik təqdim olunub?
  const [identityReusable, setIdentityReusable] = useState(false); // kimlik+üz təsdiqlənib (>50%) → biznesdə təkrar istənilmir

  // create form
  const [kind, setKind] = useState("PHYSICAL");
  const [proofType, setProofType] = useState("TAX_DOC");
  const [f, setF] = useState({ name: "", voen: "", ownerName: "", founderName: "", phone: "", website: "", instagram: "", facebook: "", tiktok: "", youtube: "", linkedin: "" });
  const [files, setFiles] = useState<Record<string, File | null>>(blankFiles);
  const [banks, setBanks] = useState<{ iban: string; title: string }[]>([{ iban: "", title: "" }]);
  const [bizInfoReading, setBizInfoReading] = useState(false); // AI vergi sənədindən şirkət məlumatı oxuyur
  const [bizInfoFilled, setBizInfoFilled] = useState(false);
  const [ownerCheck, setOwnerCheck] = useState<{ isOwner: boolean; message: string } | null>(null); // kimlik ↔ rəhbər uyğunluğu
  const [bankDropOver, setBankDropOver] = useState(false);
  const [docDropKey, setDocDropKey] = useState<string | null>(null);
  // Bank sənədləri (bir neçə) — hər biri AI ilə oxunur, biri "əsas" (ödəniş) seçilir.
  const [bankDocs, setBankDocs] = useState<{ file: File; accounts: { iban: string; bankName: string | null }[]; reading: boolean }[]>([]);
  const [primaryBankIdx, setPrimaryBankIdx] = useState(0);

  // per-business inline inputs
  const [bankInput, setBankInput] = useState<Record<number, { iban: string; title: string }>>({});
  const [showAddBank, setShowAddBank] = useState<Record<number, boolean>>({}); // əl ilə bank əlavə (opsional)
  const [objInput, setObjInput] = useState<Record<number, { name: string; phone: string; address: string; city: string; activityAreas: string[]; latitude: number | null; longitude: number | null }>>({});
  const [editingObjId, setEditingObjId] = useState<number | null>(null); // redaktə olunan obyekt
  const [objEditInput, setObjEditInput] = useState<any>(null);
  const [memberInput, setMemberInput] = useState<Record<number, { publicId: string; objectId: string }>>({});

  const authH: any = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/me/businesses`, { headers: authH });
      const data = await res.json();
      setBusinesses(data.businesses || []);
      const pid = await fetch(`${API}/me/public-id`, { headers: authH }).then((r) => r.json());
      setPublicId(pid.publicId || "");
      // Kimlik + üz təsdiqi olmadan biznes yaratmaq olmaz.
      const me = await fetch(`${API}/me`, { headers: authH }).then((r) => r.json());
      setIdVerified(me?.user?.idVerifyStatus === "APPROVED");
      const u = me?.user || {};
      const faceOk = (u.faceMatchScore ?? 0) > 0.5 || u.idAiFaceMatch === true || (u.idAiFaceScore ?? 0) > 0.5;
      // Profil təsdiqlidirsə (Veriff APPROVED) — biznesdə vəsiqə+selfie təkrar istənilmir.
      setIdentityReusable(u.idVerifyStatus === "APPROVED" || (!!u.idCardImage && !!u.selfieImage && faceOk));
    } catch { toast(t("error"), "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    load();
  }, [authLoading, isLoggedIn, load, router]);

  const jsonReq = async (url: string, method: string, body?: any) => {
    const res = await fetch(url, { method, headers: { ...authH, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.message || t("error"));
    return data;
  };

  // Vergi/şirkət sənədi seçiləndə AI ilə şirkət adı/VÖEN/sahib/təsisçi avtomatik dolsun.
  const onPickCompanyDoc = async (key: string, file: File | null) => {
    setFiles((p) => ({ ...p, [key]: file }));
    if (!file) return;
    setBizInfoReading(true); setBizInfoFilled(false); setOwnerCheck(null);
    try {
      const fd = new FormData();
      fd.append("doc", file);
      const res = await fetch(`${API}/me/extract-business-info`, { method: "POST", headers: authH, body: fd });
      const data = await res.json();
      if (res.ok && data.success) {
        setF((prev) => ({
          ...prev,
          name: data.companyName || prev.name,
          voen: data.voen || prev.voen,
          ownerName: data.ownerName || prev.ownerName,
          founderName: data.founderName || prev.founderName,
        }));
        if (data.companyName || data.voen) setBizInfoFilled(true);
        if (typeof data.isOwner === "boolean") setOwnerCheck({ isOwner: data.isOwner, message: data.ownerMessage || "" });
      }
    } catch { /* səssiz keç */ } finally { setBizInfoReading(false); }
  };

  // Vergi sənədi halında rəhbər uyğunsuzluğu varsa biznes yaradıla bilməz.
  const ownerBlocked = proofType === "TAX_DOC" && ownerCheck !== null && !ownerCheck.isOwner;

  // Bank sənədi əlavə et → AI ilə IBAN-ları oxu.
  const addBankDoc = async (file: File | null) => {
    if (!file) return;
    const idx = bankDocs.length;
    setBankDocs((p) => [...p, { file, accounts: [], reading: true }]);
    try {
      const fd = new FormData();
      fd.append("doc", file);
      const res = await fetch(`${API}/me/extract-bank-doc`, { method: "POST", headers: authH, body: fd });
      const data = await res.json();
      setBankDocs((p) => p.map((d, i) => i === idx ? { ...d, accounts: data.accounts || [], reading: false } : d));
    } catch {
      setBankDocs((p) => p.map((d, i) => i === idx ? { ...d, reading: false } : d));
    }
  };
  const removeBankDoc = (idx: number) => {
    setBankDocs((p) => p.filter((_, i) => i !== idx));
    setPrimaryBankIdx((pi) => (idx === pi ? 0 : idx < pi ? pi - 1 : pi));
  };

  const createBusiness = async () => {
    if (!f.name || !f.voen || !f.ownerName) { toast("Şirkət sənədi oxunmadı — sənədi yenidən yükləyin", "error"); return; }
    if (ownerBlocked) { toast(ownerCheck?.message || "Kimliyiniz şirkətin rəhbəri ilə uyğun deyil", "error"); return; }
    if (proofType === "TAX_DOC" && !files.taxDocImage) { toast("Vergi sənədi tələb olunur", "error"); return; }
    if (proofType === "POWER_OF_ATTORNEY" && (!files.companyDocImage || !files.powerOfAttorneyImage)) { toast("Şirkət sənədi və etibarnamə tələb olunur", "error"); return; }
    if (!identityReusable && (!files.idCardImage || !files.selfieImage)) { toast("Şəxsiyyət vəsiqəsi və selfie tələb olunur", "error"); return; }
    if (bankDocs.length === 0) { toast("Ən azı bir bank hesabı sənədi əlavə edin", "error"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("kind", kind); fd.append("proofType", proofType);
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      Object.entries(files).forEach(([k, file]) => { if (file) fd.append(k, file); });
      bankDocs.forEach((d) => fd.append("bankDocImage", d.file)); // çoxlu bank sənədi
      fd.append("primaryBankIndex", String(primaryBankIdx));
      fd.append("banks", JSON.stringify(banks.filter((b) => b.iban.trim())));
      const res = await fetch(`${API}/me/businesses`, { method: "POST", headers: authH, body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) { toast(data.message || t("error"), "error"); return; }
      const ibanMsg = data.bankAccountsFound ? ` · AI ${data.bankAccountsFound} bank hesabı (IBAN) tapdı` : "";
      toast(
        (data.autoApproved
          ? "✓ Biznes AI tərəfindən təsdiqləndi — artıq kartla satış mümkündür!"
          : (t("bizCreated") || "Biznes göndərildi — admin təsdiqini gözləyir")) + ibanMsg,
        "success",
      );
      setShowForm(false); setKind("PHYSICAL"); setProofType("TAX_DOC"); setF({ name: "", voen: "", ownerName: "", founderName: "", phone: "", website: "", instagram: "", facebook: "", tiktok: "", youtube: "", linkedin: "" }); setFiles(blankFiles); setBanks([{ iban: "", title: "" }]); setBankDocs([]); setPrimaryBankIdx(0); setBizInfoFilled(false); setOwnerCheck(null);
      load();
    } catch { toast(t("error"), "error"); } finally { setBusy(false); }
  };

  const wrap = (fn: () => Promise<any>) => async () => { try { await fn(); load(); } catch (e: any) { toast(e.message || t("error"), "error"); } };

  const statusBadge = (s: string) => s === "APPROVED" ? "bg-green-500/10 text-green-500 border-green-500/20" : s === "REJECTED" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  const statusText = (s: string) => s === "APPROVED" ? (t("bizApproved") || "Təsdiqləndi") : s === "REJECTED" ? (t("bizRejected") || "Rədd edildi") : (t("bizPending") || "Gözləyir");

  const inputCls = "w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground";
  const fileInputCls = "block w-full text-xs mt-1 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-orange-500/10 file:text-orange-500";
  const fileLabel = (key: string, label: string) => (
    <label className="block">
      <span className="text-xs text-muted">{label}{files[key] ? " ✓" : ""}</span>
      <input type="file" accept="image/*" onChange={(e) => setFiles((p) => ({ ...p, [key]: e.target.files?.[0] || null }))} className={fileInputCls} />
    </label>
  );
  // PDF + şəkil qəbul edən böyük drop-zona (vergi/şirkət sənədi — kliklə və ya sürüklə-burax).
  const docFileLabel = (key: string, label: string, onPick?: (file: File | null) => void) => {
    const file = files[key];
    const pick = (fl: File | null) => { onPick ? onPick(fl) : setFiles((p) => ({ ...p, [key]: fl })); };
    return (
      <label
        onDragOver={(e) => { e.preventDefault(); setDocDropKey(key); }}
        onDragLeave={() => setDocDropKey((k) => (k === key ? null : k))}
        onDrop={(e) => { e.preventDefault(); setDocDropKey(null); pick(e.dataTransfer.files?.[0] || null); }}
        className={`block cursor-pointer border-2 border-dashed rounded-xl px-3 py-4 text-center text-sm transition-colors ${docDropKey === key ? "border-orange-500 bg-orange-500/10 text-orange-500" : file ? "border-green-500/40 bg-green-500/5 text-green-600" : "border-input-border text-muted hover:border-orange-500/50"}`}
      >
        {file ? <span className="font-medium">✓ {file.name.length > 32 ? file.name.slice(0, 32) + "…" : file.name}</span>
          : <span>📎 {label} — kliklə və ya sürüklə-burax</span>}
        <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
      </label>
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">{t("bizTitle") || "Biznes hesablarım"}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {publicId && <span className="px-3 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs font-mono">ID: <b>{publicId}</b></span>}
          <a href="/business/sales" className="px-4 py-2 bg-input-bg border border-input-border rounded-xl text-sm font-semibold hover:bg-orange-500/10">{t("bizSales") || "Satış pəncərəsi"}</a>
          {idVerified === false ? (
            <a href="/complete-profile" className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold">Profili tamamlayın</a>
          ) : (
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold">{showForm ? (t("adminCancel") || "Bağla") : `+ ${t("bizAdd") || "Biznes əlavə et"}`}</button>
          )}
        </div>
      </div>
      <p className="text-muted text-sm mb-5">{t("bizDesc") || "Biznes təsdiqləndikdən sonra məhsullarınız kartla satıla bilər."}</p>

      {idVerified === false && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-5 flex items-start gap-3">
          <span className="text-2xl">🪪</span>
          <div className="flex-1">
            <p className="font-semibold text-sm">Biznes yaratmaq üçün kimlik təsdiqi lazımdır</p>
            <p className="text-xs text-muted mt-0.5">Şəxsiyyət vəsiqəsi şəkli + selfie ilə profilinizi tamamlayın, sonra biznes əlavə edə bilərsiniz.</p>
            <a href="/complete-profile" className="inline-block mt-2 text-sm text-orange-500 font-semibold hover:text-orange-400">Profili tamamla →</a>
          </div>
        </div>
      )}

      {showForm && idVerified !== false && (
        <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5 mb-5 space-y-4">
          {/* Tip */}
          <div className="grid grid-cols-2 gap-2">
            {[["PHYSICAL", t("bizPhysical") || "Fiziki şəxs"], ["LEGAL", t("bizLegal") || "Hüquqi şəxs"]].map(([v, l]) => (
              <button key={v} onClick={() => setKind(v)} className={`py-2 rounded-lg text-sm ${kind === v ? "bg-orange-500 text-white" : "bg-input-bg border border-input-border"}`}>{l}</button>
            ))}
          </div>
          {/* Sübut növü */}
          <div className="grid grid-cols-2 gap-2">
            {[["TAX_DOC", t("bizTaxDoc") || "Vergi sənədi"], ["POWER_OF_ATTORNEY", t("bizPoa") || "Etibarnamə"]].map(([v, l]) => (
              <button key={v} onClick={() => setProofType(v)} className={`py-2 rounded-lg text-sm ${proofType === v ? "bg-orange-500 text-white" : "bg-input-bg border border-input-border"}`}>{l}</button>
            ))}
          </div>
          {/* Sənədlər */}
          <div className="space-y-2 p-3 bg-input-bg/40 rounded-xl">
            <p className="text-[11px] text-muted">📄 Sənədləri PDF və ya şəkil kimi yükləyin — 🤖 AI şirkət adı, VÖEN və bank hesablarını avtomatik oxuyacaq.</p>
            {proofType === "TAX_DOC"
              ? docFileLabel("taxDocImage", "Vergi qeydiyyatı sənədi (PDF/şəkil)", (file) => onPickCompanyDoc("taxDocImage", file))
              : (<>{docFileLabel("companyDocImage", "Şirkət sənədi (PDF/şəkil)", (file) => onPickCompanyDoc("companyDocImage", file))}{docFileLabel("powerOfAttorneyImage", "Etibarnamə (PDF/şəkil)")}</>)}
            {bizInfoReading && <p className="text-xs text-orange-500">🤖 AI sənəddən şirkət məlumatlarını oxuyur…</p>}
            {bizInfoFilled && !bizInfoReading && <p className="text-xs text-green-500">✓ Şirkət adı / VÖEN sənəddən dolduruldu (aşağıda yoxlayın)</p>}
            {/* Kimlik ↔ şirkət rəhbəri uyğunluğu */}
            {ownerCheck && proofType === "TAX_DOC" && (
              ownerCheck.isOwner
                ? <p className="text-xs text-green-500">✓ {ownerCheck.message}</p>
                : <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">⚠ {ownerCheck.message}</div>
            )}
            {ownerCheck && proofType === "POWER_OF_ATTORNEY" && !ownerCheck.isOwner && (
              <p className="text-[11px] text-muted">ℹ️ Siz rəhbər deyilsiniz — etibarnamə ilə səlahiyyət təsdiqlənəcək.</p>
            )}

            {/* Bank hesabı sənədləri — bir neçə, biri əsas (ödəniş) seçilir */}
            <div className="pt-2 border-t border-input-border">
              <p className="text-xs font-semibold text-muted mb-1">Bank hesabı sənədləri (bir neçə ola bilər)</p>
              {bankDocs.map((d, i) => (
                <div key={i} className="flex items-start gap-2 mb-2 bg-card border border-input-border rounded-lg p-2">
                  <input type="radio" name="primaryBank" checked={primaryBankIdx === i} onChange={() => setPrimaryBankIdx(i)} className="mt-1 accent-orange-500" title="Ödəniş bu hesaba" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{d.file.name}</p>
                    {d.reading ? <p className="text-[11px] text-orange-500">🤖 IBAN oxunur…</p>
                      : d.accounts.length ? <p className="text-[11px] text-green-500">✓ {d.accounts.map((a) => a.iban).join(", ")}</p>
                      : <p className="text-[11px] text-amber-500">IBAN tapılmadı</p>}
                    {primaryBankIdx === i && <span className="text-[10px] text-orange-500">⬅ Ödəniş bu hesaba gedəcək</span>}
                  </div>
                  <button type="button" onClick={() => removeBankDoc(i)} className="text-muted hover:text-red-500 text-xs">✕</button>
                </div>
              ))}
              <label
                onDragOver={(e) => { e.preventDefault(); setBankDropOver(true); }}
                onDragLeave={() => setBankDropOver(false)}
                onDrop={(e) => { e.preventDefault(); setBankDropOver(false); const fs = Array.from(e.dataTransfer.files || []); fs.forEach((file) => addBankDoc(file)); }}
                className={`block text-xs cursor-pointer border-2 border-dashed rounded-lg px-3 py-3 text-center transition-colors ${bankDropOver ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-input-border text-muted hover:border-orange-500/50"}`}
              >
                📎 Bank sənədi əlavə et — kliklə və ya sürüklə-burax (PDF/şəkil)
                <input type="file" accept=".pdf,image/*" multiple className="hidden" onChange={(e) => { Array.from(e.target.files || []).forEach((file) => addBankDoc(file)); e.currentTarget.value = ""; }} />
              </label>
            </div>

            {identityReusable ? (
              <div className="flex items-center gap-2 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                <span>✓</span>
                <span>Kimliyiniz artıq təsdiqlənib — vəsiqə və selfie təkrar istənilmir.</span>
              </div>
            ) : (
              <>
                {fileLabel("idCardImage", t("bizIdCard") || "Şəxsiyyət vəsiqəsi")}
                {fileLabel("selfieImage", t("bizSelfie") || "Selfie (üz tanıma)")}
              </>
            )}
          </div>
          {/* Şirkət məlumatları — yalnız sənəddən oxunur, əl ilə dəyişilmir (🔒) */}
          <div className="space-y-2">
            <p className="text-[11px] text-muted">🔒 Şirkət adı, VÖEN, sahibi və təsisçi yalnız sənəddən AI ilə oxunur — əl ilə dəyişilmir.</p>
            <input className={`${inputCls} opacity-70 cursor-not-allowed`} placeholder={t("bizName") || "Şirkət adı (sənəddən)"} value={f.name} readOnly disabled />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className={`${inputCls} opacity-70 cursor-not-allowed`} placeholder="VÖEN (sənəddən)" value={f.voen} readOnly disabled />
              <input className={inputCls} placeholder={t("phone") || "Telefon (əl ilə)"} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              <input className={`${inputCls} opacity-70 cursor-not-allowed`} placeholder={t("bizOwner") || "Şirkətin sahibi (sənəddən)"} value={f.ownerName} readOnly disabled />
              <input className={`${inputCls} opacity-70 cursor-not-allowed`} placeholder={t("bizFounder") || "Şirkətin təsisçisi (sənəddən)"} value={f.founderName} readOnly disabled />
            </div>
          </div>
          {/* Opsional: veb-sayt və sosial şəbəkələr */}
          <div>
            <p className="text-xs font-semibold text-muted mb-1">🌐 Veb-sayt və sosial şəbəkələr <span className="font-normal text-muted-foreground">(opsional)</span></p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className={inputCls} placeholder="Veb-sayt (məs. https://sirket.az)" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
              <input className={inputCls} placeholder="Instagram" value={f.instagram} onChange={(e) => setF({ ...f, instagram: e.target.value })} />
              <input className={inputCls} placeholder="Facebook" value={f.facebook} onChange={(e) => setF({ ...f, facebook: e.target.value })} />
              <input className={inputCls} placeholder="TikTok" value={f.tiktok} onChange={(e) => setF({ ...f, tiktok: e.target.value })} />
              <input className={inputCls} placeholder="YouTube" value={f.youtube} onChange={(e) => setF({ ...f, youtube: e.target.value })} />
              <input className={inputCls} placeholder="LinkedIn" value={f.linkedin} onChange={(e) => setF({ ...f, linkedin: e.target.value })} />
            </div>
          </div>
          {/* Bank hesabları — yalnız bank sənədindən AI ilə oxunur (əl ilə girilmir) */}
          {bankDocs.some((d) => d.accounts.length > 0) && (
            <div>
              <p className="text-xs font-semibold text-muted mb-1">🔒 Bank hesabları (sənəddən oxundu)</p>
              <div className="space-y-1">
                {bankDocs.flatMap((d, i) => d.accounts.map((a, j) => (
                  <div key={`${i}-${j}`} className="flex items-center gap-2 text-xs bg-input-bg border border-input-border rounded-lg px-3 py-1.5">
                    <span className="font-mono">{a.iban}</span>
                    {a.bankName && <span className="text-muted">· {a.bankName}</span>}
                    {primaryBankIdx === i && <span className="text-orange-500 text-[10px]">⬅ ödəniş</span>}
                  </div>
                )))}
              </div>
            </div>
          )}
          {ownerBlocked && <p className="text-xs text-red-500 text-center">Kimliyiniz şirkətin rəhbəri ilə uyğun olmadığı üçün göndərmək mümkün deyil.</p>}
          <button onClick={createBusiness} disabled={busy || ownerBlocked} className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{busy ? "..." : (t("bizSubmit") || "Təsdiq üçün göndər")}</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : businesses.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center text-muted">{t("bizNone") || "Hələ biznesiniz yoxdur"}</div>
      ) : (
        <div className="space-y-4">
          {businesses.map((b) => (
            <div key={b.id} className={`bg-card border border-card-border rounded-xl p-4 sm:p-5 ${!b.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold">{b.name}</h2>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${statusBadge(b.status)}`}>{statusText(b.status)}</span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] bg-input-bg border border-input-border">{b.kind === "LEGAL" ? (t("bizLegal") || "Hüquqi") : (t("bizPhysical") || "Fiziki")}</span>
                  </div>
                  <p className="text-xs text-muted mt-1">VÖEN: {b.voen} · {b.ownerName}{b.phone ? ` · ${b.phone}` : ""}</p>
                  {b.status === "REJECTED" && b.rejectionReason && <p className="text-xs text-red-500 mt-1">{b.rejectionReason}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={b.isActive} onChange={(e) => wrap(() => jsonReq(`${API}/me/businesses/${b.id}/active`, "PATCH", { isActive: e.target.checked }))()} />
                    {t("bizActive") || "Aktiv"}
                  </label>
                  <button onClick={wrap(async () => { if (confirm(t("bizDeleteConfirm") || "Silinsin?")) await jsonReq(`${API}/me/businesses/${b.id}`, "DELETE"); })} className="text-red-500 text-xs">{t("delete") || "Sil"}</button>
                </div>
              </div>

              {/* Banklar */}
              <div className="border-t border-card-border pt-3 mb-3">
                <p className="text-xs font-semibold text-muted mb-1.5">{t("bizBank") || "Bank hesabları"}</p>
                {b.banks.map((bk) => (
                  <div key={bk.id} className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm mb-1 ${bk.isPrimary ? "bg-green-500/10 border border-green-500/30" : "bg-input-bg/50"}`}>
                    <span className="min-w-0 truncate">
                      <span className={bk.isActive ? "" : "line-through text-muted"}>{bk.iban}{bk.title ? ` · ${bk.title}` : ""}</span>
                      {bk.isPrimary && <span className="ml-1.5 text-[10px] text-green-600 font-semibold">💳 Ödəniş</span>}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {!bk.isPrimary && (
                        <button onClick={wrap(() => jsonReq(`${API}/me/banks/${bk.id}/primary`, "PATCH"))} className="text-[11px] text-orange-500 hover:text-orange-400" title="Ödəniş bu IBAN-a gedəcək">Ödəniş seç</button>
                      )}
                      <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={bk.isActive} onChange={(e) => wrap(() => jsonReq(`${API}/me/banks/${bk.id}/active`, "PATCH", { isActive: e.target.checked }))()} />{t("bizActive") || "Aktiv"}</label>
                      <button onClick={wrap(() => jsonReq(`${API}/me/banks/${bk.id}`, "DELETE"))} className="text-red-500 text-xs" title="Sil">✕</button>
                    </div>
                  </div>
                ))}
                {/* Banklar sənəddən AI ilə oxundu — əl ilə əlavə OPSIONALDIR (təkrar istənilmir). */}
                {(showAddBank[b.id] || b.banks.length === 0) ? (
                  <div className="flex gap-2 mt-1">
                    <input className={inputCls} placeholder="IBAN (əl ilə, opsional)" value={bankInput[b.id]?.iban || ""} onChange={(e) => setBankInput((p) => ({ ...p, [b.id]: { ...(p[b.id] || { iban: "", title: "" }), iban: e.target.value } }))} />
                    <button onClick={wrap(async () => { const v = bankInput[b.id]; if (!v?.iban?.trim()) throw new Error("IBAN"); await jsonReq(`${API}/me/businesses/${b.id}/banks`, "POST", v); setBankInput((p) => ({ ...p, [b.id]: { iban: "", title: "" } })); setShowAddBank((p) => ({ ...p, [b.id]: false })); })} className="px-3 bg-orange-500/10 text-orange-500 rounded-lg text-xs whitespace-nowrap">+ {t("bizAddBank") || "Bank"}</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowAddBank((p) => ({ ...p, [b.id]: true }))} className="text-xs text-orange-500 mt-1 hover:text-orange-400">+ Başqa bank əlavə et</button>
                )}
              </div>

              {/* Obyektlər */}
              <div className="border-t border-card-border pt-3 mb-3">
                <p className="text-xs font-semibold text-muted mb-1.5">{t("bizObjects") || "Obyektlər"}</p>
                {b.objects.map((o) => (
                  <div key={o.id} className={`px-3 py-2 bg-input-bg/50 rounded-lg text-sm mb-1.5 ${!o.isActive ? "opacity-50" : ""}`}>
                    {editingObjId === o.id ? (
                      <ObjectAdder bizId={b.id} input={objEditInput} setInput={setObjEditInput} inputCls={inputCls} t={t}
                        saveLabel="💾 Yadda saxla" onCancel={() => { setEditingObjId(null); setObjEditInput(null); }}
                        onAdd={wrap(async () => {
                          const v = objEditInput; if (!v?.name?.trim() || !v?.address?.trim()) throw new Error(t("bizObjRequired") || "Ad və ünvan");
                          await jsonReq(`${API}/me/objects/${o.id}`, "PUT", v);
                          setEditingObjId(null); setObjEditInput(null);
                        })} />
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{o.name}{o.phone ? ` · ${o.phone}` : ""}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => { setEditingObjId(o.id); setObjEditInput({ name: o.name, phone: o.phone || "", address: o.address, city: o.city || "", activityAreas: o.activityAreas || [], latitude: o.latitude ?? null, longitude: o.longitude ?? null }); }} className="text-orange-500 text-xs" title="Redaktə et">✎</button>
                            <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={o.isActive} onChange={(e) => wrap(() => jsonReq(`${API}/me/objects/${o.id}/active`, "PATCH", { isActive: e.target.checked }))()} />{t("bizActive") || "Aktiv"}</label>
                            <button onClick={wrap(() => jsonReq(`${API}/me/objects/${o.id}`, "DELETE"))} className="text-red-500 text-xs" title="Sil">✕</button>
                          </div>
                        </div>
                        <p className="text-muted text-xs">{o.city ? o.city + ", " : ""}{o.address}{o.activityAreas?.length ? ` · ${o.activityAreas.join(", ")}` : ""}</p>
                        <ObjectReferral objectId={o.id} inputCls={inputCls} />
                      </>
                    )}
                  </div>
                ))}
                {/* Yeni obyekt */}
                <ObjectAdder bizId={b.id} input={objInput[b.id]} setInput={(v: any) => setObjInput((p) => ({ ...p, [b.id]: v }))} onAdd={wrap(async () => {
                  const v = objInput[b.id]; if (!v?.name?.trim() || !v?.address?.trim()) throw new Error(t("bizObjRequired") || "Ad və ünvan");
                  await jsonReq(`${API}/me/businesses/${b.id}/objects`, "POST", v); setObjInput((p) => ({ ...p, [b.id]: { name: "", phone: "", address: "", city: "", activityAreas: [], latitude: null, longitude: null } }));
                })} inputCls={inputCls} t={t} />
              </div>

              {/* İşçilər — sorğu/dəvət + səlahiyyətlər */}
              <div className="border-t border-card-border pt-3">
                <p className="text-xs font-semibold text-muted mb-1.5">👥 İşçilər</p>

                {/* Gələn işçi sorğuları — sahibin təsdiqini gözləyir */}
                {b.members.filter((m: any) => m.status === "PENDING_BUSINESS").map((m: any) => (
                  <div key={m.id} className="p-3 bg-amber-500/5 border border-amber-500/30 rounded-xl text-sm mb-1.5">
                    <p><b>{m.user.name}</b> <span className="text-muted text-xs">({m.user.publicId})</span> — işçiniz olduğunu bildirir.</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={wrap(() => jsonReq(`${API}/me/businesses/${b.id}/members/${m.id}`, "PUT", { action: "accept" }))} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold">Qəbul et</button>
                      <button onClick={wrap(() => jsonReq(`${API}/me/businesses/${b.id}/members/${m.id}`, "PUT", { action: "reject" }))} className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg text-xs font-semibold">Rədd et</button>
                    </div>
                  </div>
                ))}

                {/* Göndərilmiş dəvətlər — istifadəçi təsdiqi gözlənilir */}
                {b.members.filter((m: any) => m.status === "PENDING_USER").map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-1.5 bg-input-bg/50 rounded-lg text-sm mb-1">
                    <span className="text-muted">⏳ {m.user.name} <span className="text-xs">({m.user.publicId})</span> — dəvət göndərilib, təsdiq gözlənilir</span>
                    <button onClick={wrap(() => jsonReq(`${API}/me/members/${m.id}`, "DELETE"))} className="text-red-500 text-xs shrink-0">✕</button>
                  </div>
                ))}

                {/* Aktiv işçilər — səlahiyyət redaktoru (satış / alış / obyekt) */}
                {b.members.filter((m: any) => !m.status || m.status === "ACTIVE").map((m: any) => (
                  <div key={m.id} className="px-3 py-2 bg-input-bg/50 rounded-lg text-sm mb-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span>✅ <b>{m.user.name}</b> <span className="text-muted text-xs">({m.user.publicId})</span></span>
                      <button onClick={() => { if (confirm("İşçini çıxarmaq istədiyinizə əminsiniz?")) wrap(() => jsonReq(`${API}/me/members/${m.id}`, "DELETE"))(); }} className="text-red-500 text-xs shrink-0">✕ Çıxar</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5">
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={!!m.canSell} onChange={wrap(() => jsonReq(`${API}/me/businesses/${b.id}/members/${m.id}`, "PUT", { canSell: !m.canSell }))} className="w-3.5 h-3.5 accent-orange-500" />
                        🛒 Məhsul satmaq
                      </label>
                      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" checked={!!m.canBuy} onChange={wrap(() => jsonReq(`${API}/me/businesses/${b.id}/members/${m.id}`, "PUT", { canBuy: !m.canBuy }))} className="w-3.5 h-3.5 accent-orange-500" />
                        📦 Biznes adına almaq
                      </label>
                      <select className="px-2 py-1 bg-input-bg border border-input-border rounded-lg text-xs" value={m.object?.id || ""}
                        onChange={(e) => wrap(() => jsonReq(`${API}/me/businesses/${b.id}/members/${m.id}`, "PUT", { objectId: e.target.value || null }))()}>
                        <option value="">{t("bizWholeBusiness") || "Bütün biznes"}</option>
                        {b.objects.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                  </div>
                ))}

                {/* Yeni işçi dəvəti — ID ilə (istifadəçi qəbul edəndə aktivləşir) */}
                <p className="text-[11px] text-muted mt-2 mb-1">İşçi dəvət et — istifadəçi qəbul edəndə rəsmi işçi olur:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <input className={`${inputCls} flex-1`} placeholder={t("bizMemberId") || "İstifadəçi ID (məs. TX-7F3K2Q)"} value={memberInput[b.id]?.publicId || ""} onChange={(e) => setMemberInput((p) => ({ ...p, [b.id]: { ...(p[b.id] || { publicId: "", objectId: "" }), publicId: e.target.value } }))} />
                  <select className={inputCls + " w-auto"} value={memberInput[b.id]?.objectId || ""} onChange={(e) => setMemberInput((p) => ({ ...p, [b.id]: { ...(p[b.id] || { publicId: "", objectId: "" }), objectId: e.target.value } }))}>
                    <option value="">{t("bizWholeBusiness") || "Bütün biznes"}</option>
                    {b.objects.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <button onClick={wrap(async () => { const v = memberInput[b.id]; if (!v?.publicId?.trim()) throw new Error("ID"); await jsonReq(`${API}/me/businesses/${b.id}/members`, "POST", { publicId: v.publicId.trim(), objectId: v.objectId || undefined }); setMemberInput((p) => ({ ...p, [b.id]: { publicId: "", objectId: "" } })); })} className="px-3 bg-orange-500/10 text-orange-500 rounded-lg text-xs">+ Dəvət göndər</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ObjectAdder({ bizId, input, setInput, onAdd, inputCls, t, saveLabel, onCancel }: any) {
  const v = input || { name: "", phone: "", address: "", city: "", activityAreas: [], latitude: null, longitude: null };
  const toggle = (a: string) => setInput({ ...v, activityAreas: v.activityAreas.includes(a) ? v.activityAreas.filter((x: string) => x !== a) : [...v.activityAreas, a] });
  return (
    <div className="mt-2 p-3 bg-input-bg/30 rounded-xl space-y-2">
      <input className={inputCls} placeholder={t("bizObjName") || "Obyekt adı (mağaza, dükan...)"} value={v.name} onChange={(e) => setInput({ ...v, name: e.target.value })} />
      <input className={inputCls} placeholder={t("phone") || "Obyekt telefonu"} value={v.phone} onChange={(e) => setInput({ ...v, phone: e.target.value })} />
      {/* Xəritədən konum seç — şəhər/ünvan/koordinat avtomatik dolur */}
      <div>
        <p className="text-[11px] text-muted mb-1">📍 Obyektin yerini xəritədən seçin:</p>
        <LocationPicker
          city={v.city}
          address={v.address}
          latitude={v.latitude ?? null}
          longitude={v.longitude ?? null}
          onChange={(n: any) => setInput({ ...v, ...n })}
          height="220px"
        />
      </div>
      <div>
        <p className="text-[11px] text-muted mb-1">{t("bizActivity") || "Fəaliyyət sahələri"}</p>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_AREAS.map((a) => (
            <button key={a} type="button" onClick={() => toggle(a)} className={`px-2 py-1 rounded-full text-[11px] border ${v.activityAreas.includes(a) ? "bg-orange-500 border-orange-500 text-white" : "bg-input-bg border-input-border"}`}>{a}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 items-center">
        <button onClick={onAdd} className="text-sm text-orange-500 font-medium">{saveLabel || `+ ${t("bizAddObject") || "Obyekt əlavə et"}`}</button>
        {onCancel && <button type="button" onClick={onCancel} className="text-sm text-muted hover:text-foreground">Ləğv</button>}
      </div>
    </div>
  );
}

// Obyekt üçün referal (komissiyalı) satış qaydaları redaktoru.
function ObjectReferral({ objectId, inputCls }: { objectId: number; inputCls: string }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<{ profession: string; commissionPercent: string; requiredDoc: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    try {
      const r = await fetch(`${API}/me/objects/${objectId}/referral`, { headers }).then((x) => x.json());
      if (r.success) {
        setEnabled(!!r.referralEnabled);
        setRules((r.rules || []).map((x: any) => ({ profession: x.profession, commissionPercent: String(x.commissionPercent), requiredDoc: x.requiredDoc || "NONE" })));
      }
    } catch { /* keç */ } finally { setLoaded(true); }
  };
  const toggleOpen = () => { const n = !open; setOpen(n); if (n && !loaded) load(); };
  const addRule = () => { if (rules.length < 4) setRules([...rules, { profession: "", commissionPercent: "", requiredDoc: "NONE" }]); };
  const save = async () => {
    setBusy(true);
    try {
      const body = JSON.stringify({ enabled, rules: rules.map((r) => ({ profession: r.profession, commissionPercent: parseFloat(r.commissionPercent) || 0, requiredDoc: r.requiredDoc })) });
      const r = await fetch(`${API}/me/objects/${objectId}/referral`, { method: "PUT", headers, body }).then((x) => x.json());
      if (r.success) toast("Referal qaydaları yadda saxlandı ✓", "success");
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  return (
    <div className="mt-2 border-t border-card-border/50 pt-2">
      <button onClick={toggleOpen} className="text-xs text-orange-500 font-medium">🤝 Referal satış {open ? "▲" : "▼"}</button>
      {open && (
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 accent-orange-500" /> Bu mağazada referal (komissiyalı) satışa icazə ver</label>
          {enabled && (
            <>
              {rules.map((r, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_70px_110px_auto] gap-1.5 items-center">
                  <ProfessionPicker value={r.profession} onChange={(v) => setRules(rules.map((x, j) => j === i ? { ...x, profession: v } : x))} className={inputCls + " text-xs"} />
                  <input type="number" min={0} max={100} placeholder="%" value={r.commissionPercent} onChange={(e) => setRules(rules.map((x, j) => j === i ? { ...x, commissionPercent: e.target.value } : x))} className={inputCls + " text-xs"} />
                  <select value={r.requiredDoc} onChange={(e) => setRules(rules.map((x, j) => j === i ? { ...x, requiredDoc: e.target.value } : x))} className={inputCls + " text-xs"}>
                    <option value="NONE">Sənəd yox</option>
                    <option value="DIPLOMA">Diplom</option>
                    <option value="CV">CV</option>
                    <option value="ANY">Diplom və ya CV</option>
                  </select>
                  <button onClick={() => setRules(rules.filter((_, j) => j !== i))} className="text-red-500 text-xs px-1">✕</button>
                </div>
              ))}
              {rules.length < 4 && <button onClick={addRule} className="text-xs text-orange-500">+ İxtisas əlavə et (max 4)</button>}
            </>
          )}
          <button onClick={save} disabled={busy} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">{busy ? "..." : "Yadda saxla"}</button>
        </div>
      )}
    </div>
  );
}
