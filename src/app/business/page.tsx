"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import LocationPicker from "@/components/LocationPickerWrapper";
import SellerContract from "@/components/SellerContract";
import ProfessionPicker from "@/components/ProfessionPicker";
import QRShare from "@/components/QRShare";
import VerifyCard from "@/components/VerifyCard";

// Obyektin fəaliyyət sahələri — 16 əsas kateqoriya.
const ACTIVITY_AREAS = [
  "Nəqliyyat", "Avtomobil ehtiyat hissələri", "Daşınmaz əmlak", "Elektronika",
  "Məişət texnikası", "Ev və bağ", "Tikinti və təmir", "Geyim və aksesuar",
  "Gözəllik və sağlamlıq", "Uşaq aləmi", "Hobbi və idman", "Heyvanlar",
  "İş elanları", "Xidmətlər", "Kənd təsərrüfatı", "Digər",
];

interface Bank { id: number; iban: string; title: string | null; isActive: boolean; isPrimary: boolean }
interface BizObject { id: number; name: string; phone: string | null; address: string; city: string | null; activityAreas: string[]; isActive: boolean; latitude: number | null; longitude: number | null; _count?: { listings: number } }
interface Member { id: number; status?: string; canSell?: boolean; canBuy?: boolean; user: { id: number; name: string; publicId: string | null }; object: { id: number; name: string } | null }
interface Business {
  id: number; kind: string; proofType: string; name: string; voen: string; ownerName: string; founderName: string; phone: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED"; isActive: boolean; rejectionReason: string | null;
  website?: string | null; instagram?: string | null; facebook?: string | null; tiktok?: string | null; youtube?: string | null; linkedin?: string | null;
  banks: Bank[]; objects: BizObject[]; members: Member[];
}

const blankFiles = { taxDocImage: null, companyDocImage: null, powerOfAttorneyImage: null, bankDocImage: null, idCardImage: null, selfieImage: null } as Record<string, File | null>;

// Şəxs növü VÖEN-in son rəqəmindən avtomatik təyin olunur (əl ilə seçilmir):
//   son rəqəm 1 → Hüquqi şəxs (LEGAL), 2 → Fiziki şəxs (PHYSICAL).
// Server də eyni məntiqlə yoxlayır (mənbə odur); bu yalnız UI göstərişi üçündür.
function kindFromVoen(voen?: string | null): "LEGAL" | "PHYSICAL" | null {
  const digits = String(voen || "").replace(/\D/g, "");
  if (!digits) return null;
  const last = digits[digits.length - 1];
  return last === "1" ? "LEGAL" : last === "2" ? "PHYSICAL" : null;
}

export default function BusinessPage() {
  const router = useRouter();
  const { token, authLoading, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [publicId, setPublicId] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [openBizId, setOpenBizId] = useState<number | null>(null); // açıq (genişlənmiş) biznes kartı
  const [addObjFor, setAddObjFor] = useState<number | null>(null); // obyekt əlavə forması açıq olan biznes
  // Biznes redaktəsi (ad/sahib/təsisçi/telefon) — dəyişiklik admin yenidən təsdiqi tələb edir.
  const [bizEdit, setBizEdit] = useState<{ id: number; name: string; ownerName: string; founderName: string; phone: string; proofType: string } | null>(null);
  const [bizEditDoc, setBizEditDoc] = useState<File | null>(null); // yeni şirkət/vergi sənədi
  const [bizEditBank, setBizEditBank] = useState<File | null>(null); // yeni bank sənədi
  const [busy, setBusy] = useState(false);
  // Kimlik statusu — istifadəçiyə dəqiq səbəb göstərmək üçün.
  const [idVerified, setIdVerified] = useState<boolean | null>(null); // kimlik təqdim olunub?
  const [identityReusable, setIdentityReusable] = useState(false); // kimlik+üz təsdiqlənib (>50%) → biznesdə təkrar istənilmir

  // Biznes yaratma haqqı — birdəfəlik ödəniş (məbləği admin paneldən dəyişilir).
  const [fee, setFee] = useState<{ amount: number; required: boolean; paid: boolean } | null>(null);
  const [feePayUrl, setFeePayUrl] = useState<string | null>(null); // şlüz səhifəsi (iframe)
  const [feeBusy, setFeeBusy] = useState(false);

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
  const [openObjId, setOpenObjId] = useState<number | null>(null);       // açıq (genişlənmiş) obyekt kartı
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
      // YALNIZ TƏSDİQLƏNMİŞ kimlik. Əvvəl istənilən dolu status kifayət edirdi —
      // Veriff-i sadəcə başladan (və hətta rədd edilən) istifadəçi biznes
      // yarada bilirdi. Server də eyni şərti yoxlayır.
      setIdVerified(me?.user?.idVerifyStatus === "APPROVED");
      const u = me?.user || {};
      const faceOk = (u.faceMatchScore ?? 0) > 0.5 || u.idAiFaceMatch === true || (u.idAiFaceScore ?? 0) > 0.5;
      // Kimlik profildə edilib — biznesdə vəsiqə+selfie təkrar istənilmir.
      setIdentityReusable(!!u.idVerifyStatus || (!!u.idCardImage && !!u.selfieImage && faceOk));
      // Birdəfəlik haqq ödənilibmi (tarif 0-dırsa `required: false` gəlir).
      const fr = await fetch(`${API}/me/business-fee`, { headers: authH }).then((r) => r.json());
      if (fr?.success) setFee({ amount: fr.amount, required: fr.required, paid: fr.paid });
    } catch { toast(t("error"), "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    load();
  }, [authLoading, isLoggedIn, load, router]);

  // Deep-link: /business?new=1 → add forması açıq; /business?edit=<id> → həmin
  // biznesin redaktə forması açıq. (Elan səhifəsindən gələndə təkrar klik olmasın.)
  const deepLinkRef = useRef(false);
  useEffect(() => {
    if (loading || deepLinkRef.current) return;
    const sp = new URLSearchParams(window.location.search);
    // Haqq ödənişindən tam səhifə ilə qayıdış (iframe-dən çıxmış hallar).
    const feeRet = sp.get("fee");
    if (feeRet) {
      deepLinkRef.current = true;
      window.history.replaceState({}, "", "/business");
      if (feeRet === "success") pollFeePaid();
      else toast("Ödəniş baş tutmadı", "error");
      return;
    }
    if (sp.get("new") === "1") {
      deepLinkRef.current = true;
      resetForm();
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState({}, "", "/business");
      return;
    }
    const editId = parseInt(sp.get("edit") || "");
    if (editId > 0) {
      const b = businesses.find((x) => x.id === editId);
      if (b) {
        deepLinkRef.current = true;
        setOpenBizId(editId);
        setBizEditDoc(null); setBizEditBank(null);
        setBizEdit({ id: b.id, name: b.name, ownerName: b.ownerName, founderName: b.founderName, phone: b.phone || "", proofType: b.proofType });
        window.history.replaceState({}, "", "/business");
        setTimeout(() => document.getElementById(`biz-${editId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
      }
      return;
    }
    const addObjId = parseInt(sp.get("addobj") || "");
    if (addObjId > 0 && businesses.some((x) => x.id === addObjId)) {
      deepLinkRef.current = true;
      setOpenBizId(addObjId);
      setAddObjFor(addObjId);
      window.history.replaceState({}, "", "/business");
      setTimeout(() => document.getElementById(`biz-${addObjId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, businesses]);

  // ── Biznes yaratma haqqının ödənişi ──
  // Şlüz səhifəsi modal iframe-də açılır; ödəniş bitəndə /payment/return
  // parent-ə postMessage göndərir (səbətdəki ilə eyni mexanizm).
  const payFee = async () => {
    setFeeBusy(true);
    try {
      const r = await fetch(`${API}/me/business-fee/pay`, { method: "POST", headers: { ...authH, "Content-Type": "application/json" } }).then((x) => x.json());
      if (!r.success) { toast(r.message || t("error"), "error"); return; }
      // Şlüz iframe-dən çıxsa /payment/return bizi geri /business-ə qaytarsın.
      try { sessionStorage.setItem("bizFeePay", "1"); } catch { /* bloklanıb */ }
      setFeePayUrl(r.redirectUrl);
    } catch { toast(t("error"), "error"); } finally { setFeeBusy(false); }
  };

  // Ödənişin HƏQİQƏTƏN keçdiyini brauzerdən gələn siqnala görə deyil, SERVERDƏN
  // soruşuruq: şlüz callback-i gəlib haqqı PAID edənə qədər poll edirik.
  // (Brauzerin "uğurlu" mesajı saxtalaşdırıla bilər — ona güvənmirik.)
  const pollFeePaid = useCallback(async () => {
    for (let i = 0; i < 12; i++) {
      try {
        const r = await fetch(`${API}/me/business-fee`, { headers: authH }).then((x) => x.json());
        if (r?.success && r.paid) {
          setFee({ amount: r.amount, required: r.required, paid: true });
          toast("Ödəniş qəbul edildi ✓ İndi biznes müraciətinizi göndərə bilərsiniz.", "success");
          return true;
        }
      } catch { /* şəbəkə — yenidən cəhd */ }
      await new Promise((res) => setTimeout(res, 2000));
    }
    toast("Ödəniş hələ təsdiqlənməyib. Bir neçə saniyədən sonra səhifəni yeniləyin.", "error");
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const onMsg = async (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "kapital-payment") return;
      setFeePayUrl(null);
      if (e.data.status === "success") await pollFeePaid();
      else toast("Ödəniş baş tutmadı", "error");
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollFeePaid]);

  const jsonReq = async (url: string, method: string, body?: any) => {
    const res = await fetch(url, { method, headers: { ...authH, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error(data.message || t("error"));
    return data;
  };

  // Sənəd seçiləndə YALNIZ faylı saxla — AI oxuması YOXDUR (yoxlama admin paneldə).
  // İstifadəçi şirkət adı/VÖEN/sahib/təsisçi sahələrini əl ilə doldurur.
  const onPickCompanyDoc = (key: string, file: File | null) => {
    setFiles((p) => ({ ...p, [key]: file }));
  };

  // İstifadəçi tərəfində rəhbər bloklaması yoxdur — admin təsdiq edir.
  const ownerBlocked = false;

  // Bank sənədi əlavə et — AI ilə IBAN oxunmur; istifadəçi IBAN-ı əl ilə yazır.
  const addBankDoc = (file: File | null) => {
    if (!file) return;
    setBankDocs((p) => [...p, { file, accounts: [], reading: false }]);
  };
  const removeBankDoc = (idx: number) => {
    setBankDocs((p) => p.filter((_, i) => i !== idx));
    setPrimaryBankIdx((pi) => (idx === pi ? 0 : idx < pi ? pi - 1 : pi));
  };

  // Forma vəziyyətini tam sıfırla — hər açılışda təmiz başlanğıc (çoxlu biznes üçün).
  const resetForm = () => {
    setKind("PHYSICAL"); setProofType("TAX_DOC");
    setF({ name: "", voen: "", ownerName: "", founderName: "", phone: "", website: "", instagram: "", facebook: "", tiktok: "", youtube: "", linkedin: "" });
    setFiles({ ...blankFiles }); setBanks([{ iban: "", title: "" }]); setBankDocs([]); setPrimaryBankIdx(0); setBizInfoFilled(false); setOwnerCheck(null);
  };
  const openForm = () => { if (!showForm) { resetForm(); window.scrollTo({ top: 0, behavior: "smooth" }); } setShowForm(!showForm); };

  const createBusiness = async () => {
    // Şirkət adı/VÖEN/sahibi burada tələb olunmur — admin sənəddən doldurur.
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
      if (!res.ok || !data.success) {
        // Haqq ödənilməyib (məs. başqa cihazda artıq xərclənib) — ödəniş təklif et.
        if (data.code === "FEE_REQUIRED") {
          setFee((p) => ({ amount: data.amount ?? p?.amount ?? 0, required: true, paid: false }));
          toast(data.message || "Əvvəlcə biznes yaratma haqqını ödəyin", "error");
          setShowForm(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        toast(data.message || t("error"), "error"); return;
      }
      const ibanMsg = data.bankAccountsFound ? ` · AI ${data.bankAccountsFound} bank hesabı (IBAN) tapdı` : "";
      toast(
        (data.autoApproved
          ? "✓ Biznes AI tərəfindən təsdiqləndi — artıq kartla satış mümkündür!"
          : (t("bizCreated") || "Biznes göndərildi — admin təsdiqini gözləyir")) + ibanMsg,
        "success",
      );
      setShowForm(false); resetForm();
      load();   // haqq xərcləndi → vəziyyət yenidən oxunur
    } catch { toast(t("error"), "error"); } finally { setBusy(false); }
  };

  const wrap = (fn: () => Promise<any>) => async () => { try { await fn(); load(); } catch (e: any) { toast(e.message || t("error"), "error"); } };

  // Biznesi sil. Təsdiqlənmiş biznesdə silmə "yumşaqdır": elanlar arxivlənir,
  // obyektlər bağlanır, biznes saytdan yox olur — amma bizim ona olan pul
  // borcumuz (satışlardan yığılan qazanc) admin panelində qalır və ödənilir.
  // Bitməmiş sifariş varsa server silməyə imkan vermir (alıcı malı gözləyir).
  const deleteBusiness = async (b: any) => {
    const approved = b.status === "APPROVED";
    const msg = approved
      ? `«${b.name}» silinsin?\n\n• Bütün elanları saytdan götürüləcək (arxivlənəcək)\n• Obyektləri (${b.objects?.length || 0}) bağlanacaq\n• Satışlardan qazandığınız və hələ ödənilməmiş pul İTMİR — hesablaşma qeydi bizdə qalır və bank hesabınıza köçürülür\n\nBu əməliyyat geri qaytarılmır.`
      : "Bu biznes müraciəti ləğv edilsin?";
    if (!confirm(msg)) return;
    try {
      const d = await jsonReq(`${API}/me/businesses/${b.id}`, "DELETE");
      if (d.owed > 0) toast(`Biznes silindi. Sizə ödəniləcək ${d.owed} ₼ qeydə alınıb — bank hesabınıza köçürüləcək.`, "success");
      else if (d.soft) toast(`Biznes silindi — ${d.archivedListings || 0} elan saytdan götürüldü.`, "success");
      else toast("Biznes müraciəti ləğv edildi", "success");
      setOpenBizId(null);
      load();
    } catch (e: any) {
      toast(e.message || t("error"), "error");
    }
  };

  const statusBadge = (s: string) => s === "APPROVED" ? "bg-green-500/10 text-green-500 border-green-500/20" : s === "REJECTED" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  const statusText = (s: string) => s === "APPROVED" ? (t("bizApproved") || "Təsdiqləndi") : s === "REJECTED" ? (t("bizRejected") || "Rədd edildi") : (t("bizPending") || "Gözləyir");

  // Haqq tələb olunur, hələ ödənilməyib — forma bağlıdır. (Kimlik təsdiqi
  // ödənişdən ƏVVƏLKİ şərtdir: təsdiqlənməmiş profildən pul almırıq.)
  const feeUnpaid = !!fee && fee.required && !fee.paid && idVerified === true;

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
        <h1 className="text-xl sm:text-2xl font-bold">🏢 Biznes Kabinetim</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {publicId && <span className="px-3 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs font-mono">ID: <b>{publicId}</b></span>}
          <a href="/business/sales" className="ui-btn ui-btn-ghost">{t("bizSales") || "Satış pəncərəsi"}</a>
          {idVerified === false ? (
            <a href="/profile" className="ui-btn ui-btn-primary">🪪 Profilini təsdiqlə</a>
          ) : feeUnpaid ? (
            // Haqq ödənilməyib — forma açılmır, əvvəlcə ödəniş.
            <button onClick={payFee} disabled={feeBusy} className="ui-btn ui-btn-primary">
              {feeBusy ? "…" : `💳 ${fee!.amount.toFixed(2)} AZN ödə`}
            </button>
          ) : (
            <button onClick={openForm} className="ui-btn ui-btn-primary">{showForm ? (t("adminCancel") || "Bağla") : `+ ${t("bizAdd") || "Biznes əlavə et"}`}</button>
          )}
        </div>
      </div>
      <p className="text-muted text-[15px] mb-5">{t("bizDesc") || "Biznes təsdiqləndikdən sonra məhsullarınız kartla satıla bilər."}</p>

      {idVerified === false && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-5 flex items-start gap-3">
          <span className="text-2xl">🪪</span>
          <div className="flex-1">
            {/* İki hal: profil təsdiqlənib, ya təsdiqlənməyib. "Yoxlanılır"
                vəziyyəti göstərilmir — Veriff nəticəni dərhal qaytarır. */}
            <p className="font-semibold text-sm">Biznes yaratmaq üçün əvvəlcə profilinizi təsdiqləyin</p>
            <p className="text-xs text-muted mt-0.5">Profiliniz təsdiqlənməmişdir — Veriff ilə kimliyinizi doğrulayın.</p>
            <a href="/profile" className="inline-block mt-2 text-sm text-orange-500 font-semibold hover:text-orange-400">
              Profilini təsdiqlə →
            </a>
          </div>
        </div>
      )}

      {/* ── Birdəfəlik haqq ── */}
      {feeUnpaid && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-5 flex items-start gap-3">
          <span className="text-2xl">💳</span>
          <div className="flex-1">
            <p className="font-semibold text-sm">Biznes yaratmaq üçün birdəfəlik {fee!.amount.toFixed(2)} AZN</p>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Bu haqq sənədlərinizin yoxlanılması (kimlik doğrulaması, vergi və bank sənədlərinin analizi)
              xərclərini qarşılayır. <b className="text-foreground">Bir dəfə ödənilir</b> — sonrakı obyektlər,
              elanlar və satış üçün əlavə haqq yoxdur.
            </p>
            <p className="text-[11px] text-muted mt-1.5">
              Müraciətiniz rədd edilsə ödənişiniz qüvvədə qalır — düzəlişdən sonra yenidən ödəmirsiniz.
            </p>
            <button onClick={payFee} disabled={feeBusy} className="ui-btn ui-btn-primary ui-btn-sm mt-3">
              {feeBusy ? "Açılır…" : `💳 ${fee!.amount.toFixed(2)} AZN ödə`}
            </button>
          </div>
        </div>
      )}
      {fee && fee.required && fee.paid && businesses.length === 0 && (
        <p className="text-xs text-emerald-600 mb-4">✓ Biznes yaratma haqqı ödənilib — müraciətinizi göndərə bilərsiniz.</p>
      )}

      {/* Şlüz səhifəsi — modal iframe. Bitəndə /payment/return postMessage göndərir. */}
      {feePayUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-card w-full max-w-lg h-[85vh] rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-card-border">
              <p className="font-semibold text-sm">Biznes yaratma haqqı — {fee?.amount.toFixed(2)} AZN</p>
              <button onClick={() => setFeePayUrl(null)} className="text-muted hover:text-foreground text-lg leading-none">✕</button>
            </div>
            <iframe src={feePayUrl} title="fee-payment" className="flex-1 w-full border-0 bg-white" />
            <p className="text-[11px] text-muted px-4 py-2 text-center">
              Pəncərə açılmırsa <a href={feePayUrl} target="_blank" rel="noreferrer" className="text-orange-500 font-medium hover:underline">tam səhifədə açın</a>.
            </p>
          </div>
        </div>
      )}

      {showForm && idVerified !== false && !feeUnpaid && (
        <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5 mb-5 space-y-4">
          {/* Şəxs növü — əl ilə seçilmir; VÖEN sənəddən oxunduqda son rəqəmə görə
              avtomatik təyin olunur (1 → Hüquqi şəxs, 2 → Fiziki şəxs). */}
          <div className="flex items-center gap-2 py-2 px-3 bg-input-bg border border-input-border rounded-lg text-sm">
            <span className="text-muted">Şəxs növü:</span>
            {f.voen && kindFromVoen(f.voen) ? (
              <>
                <span className="font-semibold text-orange-500">{kindFromVoen(f.voen) === "LEGAL" ? (t("bizLegal") || "Hüquqi şəxs") : (t("bizPhysical") || "Fiziki şəxs")}</span>
                <span className="text-[11px] text-muted">(VÖEN-ə görə avtomatik)</span>
              </>
            ) : (
              <span className="text-muted-foreground">VÖEN sənəddən oxunduqda avtomatik təyin olunacaq</span>
            )}
          </div>
          {/* Sənədlər — yalnız vergi qeydiyyatı sənədi (Etibarnamə seçimi ləğv edildi) */}
          <div className="space-y-2 p-3 bg-input-bg/40 rounded-xl">
            <p className="text-[11px] text-muted">📄 Sənədləri PDF və ya şəkil kimi yükləyin, sonra məlumatları aşağıda əl ilə doldurun. Yoxlama və təsdiq admin tərəfindən aparılır.</p>
            {docFileLabel("taxDocImage", "Vergi qeydiyyatı sənədi (PDF/şəkil)", (file) => onPickCompanyDoc("taxDocImage", file))}

            {/* Bank hesabı sənədləri — bir neçə, biri əsas (ödəniş) seçilir */}
            <div className="pt-2 border-t border-input-border">
              <p className="text-xs font-semibold text-muted mb-1">Bank hesabı sənədləri (bir neçə ola bilər)</p>
              {bankDocs.map((d, i) => (
                <div key={i} className="flex items-start gap-2 mb-2 bg-card border border-input-border rounded-lg p-2">
                  <input type="radio" name="primaryBank" checked={primaryBankIdx === i} onChange={() => setPrimaryBankIdx(i)} className="mt-1 accent-orange-500" title="Ödəniş bu hesaba" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{d.file.name}</p>
                    <p className="text-[11px] text-muted">✓ Yükləndi — IBAN admin tərəfindən sənəddən daxil ediləcək.</p>
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
          {/* İstifadəçi YALNIZ sənədləri göndərir. Şirkət adı/VÖEN/sahibi admin
              tərəfindən doldurulur; telefon, sosial şəbəkə və obyektlər isə
              biznes TƏSDİQLƏNDİKDƏN sonra əlavə edilir. */}
          <div className="space-y-2">
            <p className="text-[11px] text-muted bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2">
              ℹ️ Yalnız <b>sənədləri</b> göndərin. <b>Şirkət adı, VÖEN, sahibi</b> sənədlərdən <b>admin tərəfindən</b> doldurulacaq. Biznes <b>təsdiqləndikdən sonra</b> telefon, sosial şəbəkələr və obyektlər (mağaza/filial) əlavə edə biləcəksiniz.
            </p>
          </div>
          {/* Bank IBAN-ı burada girilmir — admin sənədə baxıb daxil edir. */}
          <button onClick={createBusiness} disabled={busy} className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{busy ? "..." : (t("bizSubmit") || "Sənədləri təsdiq üçün göndər")}</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : businesses.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center text-muted">{t("bizNone") || "Hələ biznesiniz yoxdur"}</div>
      ) : (
        <>
          {/* Biznes kartları — profil səhifəsindəki doğrulama kartları ilə eyni dil:
              təsdiqlənib ✓, admin gözləyir ⏳, rədd/deaktiv ✕. Karta klikləyəndə
              həmin biznesin ətraflı paneli aşağıda açılır. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {businesses.map((b) => (
              <VerifyCard
                key={b.id}
                variant="business"
                title={b.kind === "LEGAL" ? "Hüquqi şəxs" : "Fiziki şəxs"}
                state={b.status === "APPROVED" ? (b.isActive ? "ok" : "none") : b.status === "REJECTED" ? "none" : "pending"}
                value={b.name || "Yeni biznes müraciəti"}
                hint={
                  b.status === "APPROVED"
                    ? `${b.voen ? `VÖEN: ${b.voen} · ` : ""}🏪 ${b.objects?.length || 0} obyekt${b.isActive ? "" : " · deaktiv"}`
                    : b.status === "REJECTED"
                      ? (b.rejectionReason ? `Rədd edildi: ${b.rejectionReason}` : "Müraciət rədd edildi")
                      : "Admin təsdiqini gözləyir"
                }
                cta={b.status === "REJECTED" ? "Düzəliş et" : "Ətraflı"}
                open={openBizId === b.id}
                onClick={() => setOpenBizId(openBizId === b.id ? null : b.id)}
              />
            ))}
          </div>

          {/* Açıq biznesin paneli */}
          {businesses.filter((b) => b.id === openBizId).map((b) => (
            <div key={b.id} id={`biz-${b.id}`} className={`mt-4 bg-card border border-card-border rounded-xl p-4 sm:p-5 animate-fade-in ${!b.isActive ? "opacity-70" : ""}`}>
              {/* Panel başlığı */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center text-xl shrink-0">🏢</div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-base truncate">{b.name || "Yeni biznes müraciəti"}</h2>
                  <p className="text-[11px] text-muted truncate">{b.voen ? `VÖEN: ${b.voen}` : (b.status === "PENDING" ? "⏳ Admin təsdiqini gözləyir" : "—")}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border shrink-0 ${statusBadge(b.status)}`}>{statusText(b.status)}</span>
                <button onClick={() => setOpenBizId(null)} aria-label="Bağla" className="text-muted hover:text-foreground text-sm shrink-0">✕</button>
              </div>
              <div>
              {/* Detal məlumat + idarəetmə */}
              <div className="flex items-start justify-between gap-2 mb-3 pb-3 border-b border-card-border">
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
                  {b.voen && <span>🆔 VÖEN: <b className="text-foreground">{b.voen}</b> ({b.kind === "LEGAL" ? "Hüquqi" : "Fiziki"})</span>}
                  {b.ownerName && <span>👤 {b.ownerName}</span>}
                  {b.phone && <span>📞 {b.phone}</span>}
                  {b.status === "PENDING" && (
                    <span className="text-amber-600 w-full">
                      ⏳ Admin təsdiqini gözləyir. Təsdiqdən sonra obyekt (mağaza/filial) əlavə edə və məhsul satışa qoya biləcəksiniz.
                      İndi məlumatları dəyişə və ya müraciəti ləğv edə bilərsiniz — dəyişiklik dərhal admin panelinə düşür.
                    </span>
                  )}
                  {b.status === "REJECTED" && b.rejectionReason && <span className="text-red-500 w-full mt-0.5">⚠ {b.rejectionReason}</span>}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {b.status === "APPROVED" && b.isActive && (
                    <QRShare path={`/business/${b.id}`} title={b.name} subtitle={`Biznes №${b.id}`} buttonLabel="QR" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-input-bg border border-input-border text-xs font-medium hover:border-orange-500/50 transition-all" />
                  )}
                  <label className="flex items-center gap-1 text-xs cursor-pointer">
                    <input type="checkbox" checked={b.isActive} onChange={(e) => wrap(() => jsonReq(`${API}/me/businesses/${b.id}/active`, "PATCH", { isActive: e.target.checked }))()} />
                    {t("bizActive") || "Aktiv"}
                  </label>
                  <button onClick={() => { setBizEditDoc(null); setBizEditBank(null); setBizEdit(bizEdit?.id === b.id ? null : { id: b.id, name: b.name, ownerName: b.ownerName, founderName: b.founderName, phone: b.phone || "", proofType: b.proofType }); }} className="text-orange-500 text-xs">{bizEdit?.id === b.id ? "✕ Bağla" : "✏️ Redaktə"}</button>
                  {/* Biznesi silmək HƏMİŞƏ mümkündür. Təsdiqlənmiş biznes silinəndə
                      sətir bazada qalır (saytda görünmür): bizim həmin biznesə olan
                      pul borcumuz admin panelində qalır və köçürülür. */}
                  <button onClick={() => deleteBusiness(b)} className="text-red-500 text-xs">
                    {b.status === "APPROVED" ? "🗑 Biznesi sil" : "Ləğv et"}
                  </button>
                </div>
              </div>

              {/* Biznes redaktə formu — dəyişiklik admin YENİDƏN təsdiqini tələb edir */}
              {bizEdit?.id === b.id && (
                <div className="mb-3 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl space-y-2">
                  <p className="text-[11px] text-amber-600">⚠️ Ad, sahib və ya təsisçi dəyişsəniz biznes yenidən <b>admin təsdiqinə</b> göndəriləcək. (VÖEN dəyişmək üçün biznesi silib yenidən yaradın.)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="text-[11px] text-muted">Ad<input value={bizEdit.name} onChange={(e) => setBizEdit({ ...bizEdit, name: e.target.value })} className={`${inputCls} mt-0.5`} /></label>
                    <label className="text-[11px] text-muted">Telefon<input value={bizEdit.phone} onChange={(e) => setBizEdit({ ...bizEdit, phone: e.target.value })} className={`${inputCls} mt-0.5`} /></label>
                    <label className="text-[11px] text-muted">Sahibi/Rəhbər<input value={bizEdit.ownerName} onChange={(e) => setBizEdit({ ...bizEdit, ownerName: e.target.value })} className={`${inputCls} mt-0.5`} /></label>
                    <label className="text-[11px] text-muted">Təsisçi<input value={bizEdit.founderName} onChange={(e) => setBizEdit({ ...bizEdit, founderName: e.target.value })} className={`${inputCls} mt-0.5`} /></label>
                  </div>
                  {/* Sənədləri yenilə (opsional) — yükləsəniz yenidən admin təsdiqinə gedir */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="text-[11px] text-muted">{bizEdit.proofType === "TAX_DOC" ? "Vergi sənədi (yenilə)" : "Şirkət sənədi (yenilə)"}
                      <input type="file" accept=".pdf,image/*" onChange={(e) => setBizEditDoc(e.target.files?.[0] || null)} className="block mt-0.5 text-xs text-muted file:mr-2 file:px-2 file:py-1 file:rounded-lg file:border-0 file:bg-orange-500/10 file:text-orange-500" />
                      {bizEditDoc && <span className="text-[10px] text-green-500">✓ {bizEditDoc.name}</span>}
                    </label>
                    <label className="text-[11px] text-muted">Bank sənədi (yenilə)
                      <input type="file" accept=".pdf,image/*" onChange={(e) => setBizEditBank(e.target.files?.[0] || null)} className="block mt-0.5 text-xs text-muted file:mr-2 file:px-2 file:py-1 file:rounded-lg file:border-0 file:bg-orange-500/10 file:text-orange-500" />
                      {bizEditBank && <span className="text-[10px] text-green-500">✓ {bizEditBank.name}</span>}
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={wrap(async () => {
                      const fd = new FormData();
                      fd.append("name", bizEdit.name); fd.append("ownerName", bizEdit.ownerName); fd.append("founderName", bizEdit.founderName); fd.append("phone", bizEdit.phone);
                      if (bizEditDoc) fd.append(bizEdit.proofType === "TAX_DOC" ? "taxDocImage" : "companyDocImage", bizEditDoc);
                      if (bizEditBank) fd.append("bankDocImage", bizEditBank);
                      const res = await fetch(`${API}/me/businesses/${b.id}/edit`, { method: "POST", headers: authH, body: fd });
                      const data = await res.json();
                      if (!res.ok || !data.success) throw new Error(data.message || t("error"));
                      toast(data.reApproval ? "Yadda saxlanıldı — biznes yenidən admin təsdiqinə göndərildi" : "Yadda saxlanıldı", "success");
                      setBizEdit(null); setBizEditDoc(null); setBizEditBank(null); load();
                    })} className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-semibold">Yadda saxla</button>
                    <button type="button" onClick={() => setBizEdit(null)} className="ui-btn ui-btn-ghost">Ləğv</button>
                  </div>
                </div>
              )}

              {/* Satıcı Müqaviləsi — dolmuş mətn, DocuSign imzası, PDF endirmə.
                  Yalnız biznes təsdiqləndikdən sonra imzaya göndərilir. */}
              <SellerContract businessId={b.id} />

              {b.status === "APPROVED" ? (
              <>
              {/* Əlaqə & sosial — SALT-OXUNUR (admin/təsdiqlənmiş məlumat, dəyişmir) */}
              {(b.website || b.instagram || b.facebook || b.tiktok || b.youtube || b.linkedin) && (
                <div className="border-t border-card-border pt-3 mb-3">
                  <p className="text-sm font-semibold mb-2">🔗 Sosial şəbəkələr</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {([["website", "🌐 Veb-sayt"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["linkedin", "LinkedIn"]] as const).map(([k, label]) => {
                      const v = (b as any)[k] as string | null | undefined;
                      if (!v) return null;
                      return <a key={k} href={v.startsWith("http") ? v : `https://${v}`} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-lg bg-input-bg border border-input-border text-orange-500 hover:border-orange-500/50">{label}</a>;
                    })}
                  </div>
                </div>
              )}

              {/* Banklar — SALT-OXUNUR (admin idarə edir) */}
              <div className="border-t border-card-border pt-3 mb-3">
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">🏦 {t("bizBank") || "Bank hesabları"} <span className="text-[10px] text-muted font-normal">({b.banks.length})</span></p>
                {b.banks.length > 0 ? b.banks.map((bk) => (
                  <div key={bk.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm mb-1 ${bk.isPrimary ? "bg-green-500/10 border border-green-500/30" : "bg-input-bg/50"}`}>
                    <span className="min-w-0 truncate font-mono">{bk.iban}{bk.title ? ` · ${bk.title}` : ""}</span>
                    {bk.isPrimary && <span className="text-[10px] text-green-600 font-semibold shrink-0">💳 Ödəniş</span>}
                  </div>
                )) : <p className="text-xs text-muted">—</p>}
              </div>

              {/* Obyektlər */}
              <div className="border-t border-card-border pt-3 mb-3">
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">🏪 {t("bizObjects") || "Obyektlər"} <span className="text-[10px] text-muted font-normal">({b.objects.length})</span></p>
                {b.objects.length === 0 && editingObjId === null && (
                  <p className="text-xs text-amber-600 text-center py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-2">⚠️ Hələ obyekt yoxdur. VÖEN ilə (kartla ödənişli) satış üçün ən azı bir <b>obyekt (mağaza / filial)</b> əlavə etməlisiniz — elanlar həmişə bir obyektə bağlı satılır.</p>
                )}
                {/* Obyekt kartları — biznes kartları ilə eyni dil (aktiv ✓ / deaktiv ✕).
                    Karta klikləyəndə obyektin idarəetmə paneli aşağıda açılır. */}
                {b.objects.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {b.objects.map((o) => (
                      <VerifyCard
                        key={o.id}
                        variant="object"
                        compact
                        title={`Obyekt №${o.id}`}
                        state={o.isActive ? "ok" : "none"}
                        value={o.name}
                        hint={`${[o.city, o.address].filter(Boolean).join(", ") || "—"}${typeof o._count?.listings === "number" ? ` · 📦 ${o._count.listings} məhsul` : ""}${o.isActive ? "" : " · deaktiv"}`}
                        cta="Ətraflı"
                        open={openObjId === o.id}
                        onClick={() => { setOpenObjId(openObjId === o.id ? null : o.id); setEditingObjId(null); }}
                      />
                    ))}
                  </div>
                )}

                {/* Açıq obyektin paneli — redaktə / idarəetmə */}
                {b.objects.filter((o) => o.id === openObjId).map((o) => (
                  <div key={o.id} className="mt-3 rounded-xl bg-input-bg/40 border border-card-border/60 p-3 animate-fade-in">
                    {editingObjId === o.id ? (
                      <ObjectAdder bizId={b.id} input={objEditInput} setInput={setObjEditInput} inputCls={inputCls} t={t}
                        saveLabel="💾 Yadda saxla" onCancel={() => { setEditingObjId(null); setObjEditInput(null); }}
                        onAdd={wrap(async () => {
                          const v = objEditInput; if (!v?.name?.trim() || !v?.address?.trim()) throw new Error(t("bizObjRequired") || "Ad və ünvan");
                          await jsonReq(`${API}/me/objects/${o.id}`, "PUT", v);
                          setEditingObjId(null); setObjEditInput(null);
                        })} />
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-600/10 flex items-center justify-center text-base shrink-0">🏪</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold truncate">{o.name} <span className="text-[10px] text-muted font-normal">№{o.id}</span></p>
                            <div className="flex items-center gap-2 shrink-0">
                              <QRShare path={`/object/${o.id}`} title={o.name} subtitle={`Obyekt №${o.id}`} compact className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted hover:text-orange-500 transition-colors" />
                              <button onClick={() => { setEditingObjId(o.id); setObjEditInput({ name: o.name, phone: o.phone || "", address: o.address, city: o.city || "", activityAreas: o.activityAreas || [], latitude: o.latitude ?? null, longitude: o.longitude ?? null }); }} className="text-orange-500 text-sm" title="Redaktə et">✎</button>
                              <label className="text-[11px] flex items-center gap-1"><input type="checkbox" checked={o.isActive} onChange={(e) => wrap(() => jsonReq(`${API}/me/objects/${o.id}/active`, "PATCH", { isActive: e.target.checked }))()} />{t("bizActive") || "Aktiv"}</label>
                              <button onClick={wrap(() => jsonReq(`${API}/me/objects/${o.id}`, "DELETE"))} className="text-red-500 text-sm" title="Sil">✕</button>
                            </div>
                          </div>
                          <div className="flex flex-col gap-0.5 mt-1 text-[11px] text-muted">
                            <span className="flex items-start gap-1"><span>📍</span><span>{[o.city, o.address].filter(Boolean).join(", ") || "—"}</span></span>
                            {o.phone && <span className="flex items-center gap-1">📞 {o.phone}</span>}
                          </div>
                          {o.activityAreas?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {o.activityAreas.map((a) => <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-md bg-input-bg border border-input-border">{a}</span>)}
                            </div>
                          )}
                          {/* Obyektə görə idarəetmə — məhsullar və sifarişlər */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <a href={`/object/${o.id}`} className="px-2.5 py-1.5 rounded-lg bg-input-bg border border-input-border text-[11px] font-medium hover:border-orange-500/50 hover:text-orange-500 transition-colors">📦 Məhsullar{typeof o._count?.listings === "number" ? ` (${o._count.listings})` : ""}</a>
                            <a href={`/business/sales?objectId=${o.id}`} className="px-2.5 py-1.5 rounded-lg bg-input-bg border border-input-border text-[11px] font-medium hover:border-orange-500/50 hover:text-orange-500 transition-colors">🛒 Sifarişlər</a>
                          </div>
                          <ObjectReferral objectId={o.id} inputCls={inputCls} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {/* Yeni obyekt — belirgin buton, klik ilə form açılır */}
                {addObjFor === b.id ? (
                  <div className="mt-2 p-3 bg-input-bg/40 border border-orange-500/20 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-orange-500">＋ Yeni obyekt (mağaza / filial)</p>
                      <button type="button" onClick={() => setAddObjFor(null)} className="text-muted text-xs hover:text-foreground">✕ Bağla</button>
                    </div>
                    <ObjectAdder bizId={b.id} input={objInput[b.id]} setInput={(v: any) => setObjInput((p) => ({ ...p, [b.id]: v }))} onAdd={wrap(async () => {
                      const v = objInput[b.id]; if (!v?.name?.trim() || !v?.address?.trim()) throw new Error(t("bizObjRequired") || "Ad və ünvan");
                      await jsonReq(`${API}/me/businesses/${b.id}/objects`, "POST", v); setObjInput((p) => ({ ...p, [b.id]: { name: "", phone: "", address: "", city: "", activityAreas: [], latitude: null, longitude: null } })); setAddObjFor(null);
                    })} inputCls={inputCls} t={t} />
                  </div>
                ) : (
                  <button type="button" onClick={() => setAddObjFor(b.id)} className="w-full mt-2 py-2.5 rounded-xl border-2 border-dashed border-orange-500/40 text-orange-500 text-sm font-semibold hover:bg-orange-500/5 transition-colors">
                    ＋ Obyekt əlavə et (mağaza / filial)
                  </button>
                )}
              </div>

              {/* İşçilər — sorğu/dəvət + səlahiyyətlər */}
              <div className="border-t border-card-border pt-3">
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">👥 İşçilər</p>

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
              </>
              ) : (
                <div className="border-t border-card-border pt-3 text-center">
                  <p className="text-sm text-amber-600 font-medium">⏳ Bu biznes admin təsdiqini gözləyir</p>
                  <p className="text-xs text-muted mt-1">Təsdiqdən sonra telefon/sosial şəbəkə, bank və obyekt (mağaza/filial) əlavə edə biləcəksiniz.</p>
                </div>
              )}
              </div>
            </div>
          ))}
        </>
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
          height="240px"
          hideFields
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
