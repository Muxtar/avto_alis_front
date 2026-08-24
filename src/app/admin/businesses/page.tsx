"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

interface Biz {
  id: number; kind: string; proofType: string; name: string; voen: string; ownerName: string; founderName: string; phone: string | null;
  status: string; rejectionReason: string | null; createdAt: string; isActive: boolean; deletedAt?: string | null;
  aiAuthorized: boolean | null; aiVoenMatch: boolean | null; aiConfidence: number | null; aiFraudSignals: string[]; aiReason: string | null; autoApproved: boolean;
  taxDocImage: string | null; companyDocImage: string | null; powerOfAttorneyImage: string | null; bankDocImage: string | null; idCardImage: string | null; selfieImage: string | null;
  user: {
    id: number; name: string; phone: string; publicId: string | null;
    idNumber: string | null; birthDate: string | null; gender: string | null;
    idVerifyStatus: string | null; idCardImage: string | null; selfieImage: string | null;
    idAiNameMatch: boolean | null; idAiFaceMatch: boolean | null;
  };
  banks: { id: number; iban: string; title: string | null; isActive: boolean }[];
  objects: { id: number; name: string; address: string; city: string | null; activityAreas: string[]; isActive?: boolean }[];
}

// Fayl PDF-dirmi? (şəkil kimi göstərmək olmaz — belge formasında açılır)
function isPdf(name: string | null | undefined): boolean {
  return !!name && /\.pdf($|\?)/i.test(name);
}

// Sadə ad uyğunluğu — ən azı 2 söz (və ya hamısı) üst-üstə düşürsə "uyğun".
function nameMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-zəçğıöşüА-я ]/gi, "").split(/\s+/).filter(Boolean);
  const wa = norm(a), wb = norm(b);
  if (!wa.length || !wb.length) return false;
  const common = wa.filter((w) => wb.includes(w)).length;
  return common >= Math.min(2, Math.min(wa.length, wb.length));
}

export default function AdminBusinessesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState<Biz[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  // Silinmiş bizneslər normalda gizlidir. Onlara hesablaşma (bizim borcumuz)
  // bağlı ola bilər — admin lazım olanda göstərir.
  const [showDeleted, setShowDeleted] = useState(false);
  // Sahibinin kimliyi TƏSDİQSİZ olan bizneslər — köhnə qayda ilə yaradılmış və
  // ya sonradan kimliyini silmiş hesablar. Bunlar təsdiqlənməməlidir.
  const [onlyUnverifiedOwner, setOnlyUnverifiedOwner] = useState(false);
  const [rejectReason, setRejectReason] = useState<{ [id: number]: string }>({});
  const [busyId, setBusyId] = useState<number | null>(null); // AI əməliyyatı gedən biznes
  const [edit, setEdit] = useState<{ id: number; name: string; voen: string; ownerName: string; founderName: string; phone: string } | null>(null);
  // Hansı biznesin bank bölməsi redaktə rejimindədir.
  const [bankEditFor, setBankEditFor] = useState<number | null>(null);
  const [ibanInput, setIbanInput] = useState<{ [bizId: number]: string }>({});
  // Eyni VÖEN/IBAN başqa biznesdə varmı? Saxtakarlıq əlaməti — admin təsdiqdən
  // əvvəl görsün ki, yüzlərlə VÖEN-i əl ilə tutuşdurmasın.
  const [dupVoen, setDupVoen] = useState<any[]>([]);
  const [dupIban, setDupIban] = useState<any[]>([]);
  const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openId, setOpenId] = useState<number | null>(null); // açıq (genişlənmiş) biznes kartı

  const headers: any = { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`, "Content-Type": "application/json" };

  // silent=true → spinner göstərmə, siyahını sakitcə yenilə (açıq kart bağlanmasın).
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API}/admin/businesses?status=${filter}&search=${encodeURIComponent(search)}${showDeleted ? "&includeDeleted=1" : ""}`, { headers });
      const data = await res.json();
      setItems(data.businesses || []);
    } catch { toast(t("error"), "error"); } finally { if (!silent) setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search, showDeleted]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number, force = false) => {
    try {
      const res = await fetch(`${API}/admin/businesses/${id}/approve${force ? "?force=1" : ""}`, { method: "PUT", headers });
      const data = await res.json().catch(() => ({}));
      // Sahibin kimliyi təsdiqsizdirsə server 409 qaytarır — admin bilərək təsdiqləyir.
      if (res.status === 409 && data.code === "OWNER_ID_NOT_VERIFIED") {
        if (confirm(`${data.message}\n\nYenə də təsdiqlənsin?`)) return approve(id, true);
        return;
      }
      if (res.ok) { toast(t("bizApproved") || "Təsdiqləndi", "success"); load(); } else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };
  const reject = async (id: number) => {
    const reason = rejectReason[id];
    if (!reason?.trim()) { toast(t("bizRejectReason") || "Səbəb yazın", "error"); return; }
    try {
      const res = await fetch(`${API}/admin/businesses/${id}/reject`, { method: "PUT", headers, body: JSON.stringify({ reason }) });
      if (res.ok) { toast(t("bizRejected") || "Rədd edildi", "success"); load(); } else toast(t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  // Biznesi sil — ona aid bütün obyektlər və elanlar da silinir.
  const deleteBusiness = async (id: number, name: string) => {
    if (!confirm(`"${name}" biznesini silmək istəyirsiniz?\n\n⚠️ Bütün obyektlər və elanlar saytdan GÖTÜRÜLƏCƏK.\n\nSatış tarixçəsi və hesablaşma (kimə nə qədər borcluyuq) Maliyyə bölməsində QALIR.`)) return;
    try {
      const res = await fetch(`${API}/admin/businesses/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (res.ok && data.success) { toast(`Biznes silindi — ${data.deletedObjects} obyekt, ${data.deletedListings} elan saytdan götürüldü`, "success"); load(); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  // Obyekti sil — ona aid bütün elanlar da silinir.
  const deleteObject = async (id: number, name: string) => {
    if (!confirm(`"${name}" obyektini silmək istəyirsiniz?\n\n⚠️ Bu obyektin bütün elanları saytdan GÖTÜRÜLƏCƏK.\n\nSatış tarixçəsi Maliyyə bölməsində QALIR.`)) return;
    try {
      const res = await fetch(`${API}/admin/objects/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (res.ok && data.success) { toast(`Obyekt silindi — ${data.deletedListings} elan saytdan götürüldü`, "success"); load(); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  // Aktiv/deaktiv — SİLMƏ DEYİL. Elanlar bazada qalır, sadəcə saytda görünmür;
  // yenidən aktiv ediləndə hər şey olduğu kimi qayıdır.
  const toggleBusinessActive = async (id: number, name: string, next: boolean) => {
    if (!next && !confirm(`"${name}" deaktiv edilsin?\n\nElanlar SİLİNMİR — sadəcə saytda görünməyəcək. İstənilən vaxt geri qaytara bilərsiniz.`)) return;
    try {
      const r = await fetch(`${API}/admin/businesses/${id}/active`, { method: "PATCH", headers, body: JSON.stringify({ isActive: next }) }).then((x) => x.json());
      if (r.success) { toast(next ? "Biznes aktiv edildi" : "Biznes deaktiv edildi — elanlar saytda görünmür", "success"); load(); }
      else toast(r.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  const toggleObjectActive = async (id: number, name: string, next: boolean) => {
    if (!next && !confirm(`"${name}" obyekti deaktiv edilsin?\n\nElanlar SİLİNMİR — sadəcə saytda görünməyəcək.`)) return;
    try {
      const r = await fetch(`${API}/admin/objects/${id}/active`, { method: "PATCH", headers, body: JSON.stringify({ isActive: next }) }).then((x) => x.json());
      if (r.success) { toast(next ? "Obyekt aktiv edildi" : "Obyekt deaktiv edildi", "success"); load(); }
      else toast(r.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  // AI ilə yenidən yoxla (saxlanmış sənədlər üzərində).
  const aiRecheck = async (id: number) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API}/admin/businesses/${id}/ai-recheck`, { method: "POST", headers });
      const data = await res.json();
      if (res.ok && data.success) { toast(data.aiRecommendsApprove ? "AI yoxladı: təsdiq tövsiyə edir ✓" : "AI yoxladı (nəticəyə baxın)", data.aiRecommendsApprove ? "success" : "info"); load(true); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); } finally { setBusyId(null); }
  };

  // Redaktə formasını aç + (istəyə görə) AI ilə sənəddən doldur.
  const startEdit = (b: Biz) => {
    setDupVoen([]); setDupIban([]);
    setEdit({ id: b.id, name: b.name, voen: b.voen, ownerName: b.ownerName, founderName: b.founderName, phone: b.phone || "" });
    checkVoen(b.id, b.voen);   // mövcud VÖEN də dərhal yoxlanır
  };

  // VÖEN dəyişəndə serverdən dublikat soruş (yazma dayandıqdan 400 ms sonra).
  const checkVoen = (id: number, voen: string) => {
    if (dupTimer.current) clearTimeout(dupTimer.current);
    const digits = (voen || "").replace(/\D/g, "");
    if (digits.length < 6) { setDupVoen([]); return; }
    dupTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/admin/businesses/${id}/voen-check?voen=${encodeURIComponent(voen)}`, { headers }).then((x) => x.json());
        if (r.success) setDupVoen(r.duplicates || []);
      } catch { /* şəbəkə — xəbərdarlıq göstərilmir */ }
    }, 400);
  };
  const aiFill = async (id: number) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API}/admin/businesses/${id}/ai-extract`, { method: "POST", headers });
      const data = await res.json();
      if (res.ok && data.success && data.info) {
        const i = data.info;
        const gotFields = !!(i.companyName || i.voen || i.ownerName || i.founderName);
        const gotIban = Array.isArray(data.ibans) && data.ibans.length > 0;
        if (!gotFields && !gotIban) {
          // AI heç nə oxuya bilmədi — əsl səbəbi göstər (adətən Anthropic kredit/oxunma xətası).
          toast(i.error || "AI sənəddən məlumat oxuya bilmədi — sahələri əl ilə doldurun (Anthropic kreditini yoxlayın)", "error");
        } else {
          setEdit((e) => e && e.id === id ? {
            ...e,
            name: i.companyName || e.name,
            voen: i.voen || e.voen,
            ownerName: i.ownerName || e.ownerName,
            founderName: i.founderName || e.founderName,
          } : e);
          if (gotIban) setIbanInput((p) => ({ ...p, [id]: data.ibans[0] }));
          // Dublikat xəbərdarlığı — AI-ın oxuduğu VÖEN/IBAN başqa biznesdədirsə.
          setDupVoen(data.voenDuplicates || []);
          setDupIban(data.ibanDuplicates || []);
          if (data.voenDuplicates?.length) {
            toast(`⚠ Bu VÖEN artıq ${data.voenDuplicates.length} biznesdə var — aşağıya baxın`, "error");
          } else {
            toast(gotIban ? `AI oxudu — məlumat + IBAN dolduruldu (yoxlayın)` : "AI sənəddən oxudu — yoxlayıb yadda saxlayın", "success");
          }
        }
      } else toast(data.message || "AI oxuya bilmədi", "error");
    } catch { toast(t("error"), "error"); } finally { setBusyId(null); }
  };
  const saveEdit = async () => {
    if (!edit) return;
    setBusyId(edit.id);
    try {
      const res = await fetch(`${API}/admin/businesses/${edit.id}`, { method: "PUT", headers, body: JSON.stringify(edit) });
      const data = await res.json();
      if (res.ok && data.success) { toast("Biznes məlumatları yeniləndi ✓", "success"); setEdit(null); load(true); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); } finally { setBusyId(null); }
  };

  // Biznesə IBAN əlavə et (admin sənədə baxıb).
  const addBank = async (bizId: number) => {
    const iban = (ibanInput[bizId] || "").trim();
    if (!iban) return;
    try {
      const res = await fetch(`${API}/admin/businesses/${bizId}/banks`, { method: "POST", headers, body: JSON.stringify({ iban }) });
      const data = await res.json();
      if (res.ok && data.success) { toast("IBAN əlavə edildi", "success"); setIbanInput((p) => ({ ...p, [bizId]: "" })); load(true); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  // Bank hesabını sil (admin).
  const deleteBank = async (id: number) => {
    if (!confirm("Bu bank hesabını silmək istəyirsiniz?")) return;
    try {
      const res = await fetch(`${API}/admin/banks/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (res.ok && data.success) { toast("Bank hesabı silindi", "success"); load(true); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  const statuses = ["PENDING", "APPROVED", "REJECTED", "all"];

  // Süzgəc: yalnız sahibinin kimliyi təsdiqlənməmiş bizneslər.
  const shown = onlyUnverifiedOwner ? items.filter((b) => b.user?.idVerifyStatus !== "APPROVED") : items;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t("adminBusinesses") || "Biznes təsdiqi"}</h1>
      <p className="text-muted text-sm mb-4">Şirkət adı, VÖEN, sahib və ya müraciəti göndərən şəxs üzrə axtarın.</p>

      <div className="flex items-center gap-3 flex-wrap mb-6">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Şirkət adı, VÖEN, sahibi, telefon…"
          className="ui-field max-w-md flex-1 min-w-[240px]" />
        <div className="flex gap-1 flex-wrap bg-input-bg border border-input-border rounded-xl p-1">
          {statuses.map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3.5 h-8 rounded-lg text-xs font-semibold transition-colors ${filter === s ? "text-white cta-gradient" : "text-muted hover:text-foreground"}`}>
              {s === "all" ? t("all") : s}
            </button>
          ))}
        </div>
        {/* Silinmiş bizneslər — sətir bazada qalır (hesablaşma/borc üçün) */}
        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
          <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
          Silinmişləri də göstər
        </label>
        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none" title="Sahibinin profili Veriff ilə təsdiqlənməyib">
          <input type="checkbox" checked={onlyUnverifiedOwner} onChange={(e) => setOnlyUnverifiedOwner(e.target.checked)} />
          ⚠ Sahibi təsdiqsiz
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : shown.length === 0 ? (
        <div className="text-center py-16 text-muted">{t("adminNoData")}</div>
      ) : (
        <div className="space-y-4">
          {shown.map((b) => (
            <div key={b.id} className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
              {/* Kompakt başlıq — klik detalları açır/bağlayır */}
              <button onClick={() => setOpenId(openId === b.id ? null : b.id)} className="w-full flex items-center gap-2 text-left">
                <span className="text-lg shrink-0">🏢</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">
                    {b.name || "Yeni biznes müraciəti"} <span className="text-[10px] font-normal text-muted">({b.kind === "LEGAL" ? "Hüquqi" : "Fiziki"})</span>
                    {b.deletedAt && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[10px] font-bold">🗑 silinib</span>}
                  </p>
                  <p className="text-[11px] text-muted truncate">{b.user?.name} · {b.user?.phone}{b.user?.publicId ? ` · ID ${b.user.publicId}` : ""}</p>
                </div>
                {b.autoApproved && <span className="hidden sm:inline px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500" title="AI təsdiq tövsiyə edir">🤖</span>}
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border ${b.status === "APPROVED" ? "bg-green-500/10 text-green-500 border-green-500/20" : b.status === "REJECTED" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"}`}>{b.status}</span>
                <span className="text-muted text-xs shrink-0 w-4 text-center">{openId === b.id ? "▲" : "▼"}</span>
              </button>

              {openId === b.id && (
              <div className="mt-3">
              {/* Əməliyyatlar */}
              {/* Əməliyyat düymələri — barmaqla da rahat basılan ölçü (h-9),
                  oxunaqlı mətn. Əvvəl `py-0.5` + 11px idi: sıxılmış və zəif
                  görünürdü, mobil ekranda düz basmaq çətin idi. */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <button onClick={() => aiRecheck(b.id)} disabled={busyId === b.id} title="Sənədləri AI ilə yenidən yoxla"
                  className="ui-btn ui-btn-soft">
                  {busyId === b.id ? "Yoxlanılır…" : <><span aria-hidden>🤖</span>AI yoxla</>}
                </button>
                <button onClick={() => toggleBusinessActive(b.id, b.name, !b.isActive)}
                  title={b.isActive ? "Deaktiv et — elanlar saytda görünməsin (silinmir)" : "Aktiv et"}
                  className={`ui-btn ${b.isActive ? "ui-btn-warn" : "ui-btn-ok"}`}>
                  {b.isActive ? <><span aria-hidden>⏸</span>Deaktiv et</> : <><span aria-hidden>▶</span>Aktiv et</>}
                </button>
                <button onClick={() => deleteBusiness(b.id, b.name)} title="Biznesi sil — elanlar saytdan götürülür, satış tarixçəsi qalır"
                  className="ui-btn ui-btn-danger ml-auto">
                  <span aria-hidden>🗑</span>Sil
                </button>
              </div>

              {/* Yaradanın təsdiqlənmiş kimliyi — admin sənəddəki sahiblə müqayisə etsin */}
              <div className="mb-3 p-3 bg-input-bg border border-input-border rounded-lg">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                  <p className="ui-section-title">🪪 Yaradanın kimliyi (sənəddəki sahiblə müqayisə edin)</p>
                  {/* Bu sahələr istifadəçinin təsdiqlənmiş KYC məlumatıdır —
                      biznes kartından dəyişdirilmir, "İstifadəçilər" bölməsindən
                      idarə olunur. Yanlış redaktə kimlik yoxlamasını mənasız edərdi. */}
                  <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${b.user.idVerifyStatus === "APPROVED" ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"}`}>
                    {b.user.idVerifyStatus === "APPROVED"
                      ? "✓ Təsdiqlənmiş kimlik"
                      : b.user.idVerifyStatus === "REJECTED" ? "Kimlik rədd edilib"
                        : b.user.idVerifyStatus ? "Kimlik yarımçıq (köhnə axın)" : "Kimlik təsdiqlənməyib"}
                  </span>
                </div>
                {/* Status təsdiqsiz, amma FIN/doğum/cins dolu ola bilər: bu məlumat
                    ya köhnə (Veriff-dən əvvəlki) axından, ya da istifadəçinin
                    sonradan sildiyi doğrulamadan qalıb — etibarlı sayılmır. */}
                {b.user.idVerifyStatus !== "APPROVED" && (
                  <p className="text-[11px] mb-2 px-2 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                    ⚠ Bu profil hazırda <b>təsdiqlənməmişdir</b>
                    {(b.user.idNumber || b.user.birthDate) && <> — aşağıdakı FIN/doğum məlumatı köhnə və ya silinmiş doğrulamadan qalıb, <b>etibarlı deyil</b></>}.
                    Biznes ya qayda sərtləşməmişdən əvvəl yaradılıb, ya da sahibi sonradan kimliyini qaldırıb.
                    Təsdiqləməzdən əvvəl istifadəçidən Veriff doğrulaması tələb edin.
                  </p>
                )}
                {/* Etiket/dəyər cütləri — iki sütunlu şəbəkə. Etiket sütunu ən uzun
                    sözə görə ölçülür, ona görə BÜTÜN dəyərlər eyni şaquli xətdən
                    başlayır. Əvvəl 4 sütunlu şəbəkə idi və "Sənəddəki sahib" ayrıca
                    sətirdə qalırdı — göz müqayisə edə bilmirdi. */}
                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                  <dt className="text-muted">Ad</dt>
                  <dd className="font-semibold break-words">{b.user.name || "—"}</dd>

                  <dt className="text-muted">FIN</dt>
                  <dd className="font-semibold font-mono">{b.user.idNumber || "—"}</dd>

                  <dt className="text-muted">Doğum</dt>
                  <dd className="font-semibold">{b.user.birthDate ? new Date(b.user.birthDate).toLocaleDateString("az-AZ") : "—"}</dd>

                  <dt className="text-muted">Cins</dt>
                  <dd className="font-semibold">{b.user.gender || "—"}</dd>

                  {/* Müqayisənin əsas sətri — yuxarıdakı "Ad" ilə yan-yana oxunsun deyə
                      eyni şəbəkədədir və üstündən nazik xətlə ayrılır. */}
                  <dt className="text-muted border-t border-input-border pt-1.5">Sənəddəki sahib</dt>
                  <dd className="border-t border-input-border pt-1.5">
                    <b className={b.ownerName ? "" : "text-muted font-normal"}>{b.ownerName || "(admin doldurmayıb)"}</b>
                    {b.ownerName && b.user.name && (
                      nameMatch(b.user.name, b.ownerName)
                        ? <span className="text-emerald-500 ml-1.5 whitespace-nowrap">✓ ad uyğun görünür</span>
                        : <span className="text-amber-500 ml-1.5 whitespace-nowrap">⚠ ad fərqlidir — yoxlayın</span>
                    )}
                  </dd>
                </dl>
                {(b.user.idCardImage || b.user.selfieImage) && (
                  <div className="flex gap-2 mt-2">
                    {b.user.idCardImage && (
                      <a href={`${imgUrl(b.user.idCardImage)}`} target="_blank" rel="noreferrer"><span className="text-[10px] text-muted block">Vəsiqə</span><img src={`${imgUrl(b.user.idCardImage)}`} alt="vəsiqə" className="w-24 h-16 object-cover rounded-lg border border-input-border" /></a>
                    )}
                    {b.user.selfieImage && (
                      <a href={`${imgUrl(b.user.selfieImage)}`} target="_blank" rel="noreferrer"><span className="text-[10px] text-muted block">Selfie</span><img src={`${imgUrl(b.user.selfieImage)}`} alt="selfie" className="w-16 h-16 object-cover rounded-lg border border-input-border" /></a>
                    )}
                  </div>
                )}
              </div>

                {/* ── ŞİRKƏT MƏLUMATLARI — baxış və REDAKTƏ eyni yerdə ──
                    Ayrıca redaktə forması yoxdur: "Redaktə et" basanda elə bu blokdakı
                    sətirlər inputa çevrilir. Beləliklə admin harada nə dəyişdiyini görür
                    və eyni yerdən saxlayır. */}
                <div className="mb-3 p-3 bg-input-bg border border-input-border rounded-lg">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <p className="ui-section-title">🏢 Şirkət məlumatları (sənəddən daxil edilib)</p>
                    <div className="flex items-center gap-1.5">
                      {edit?.id === b.id && (
                        <button onClick={() => aiFill(b.id)} disabled={busyId === b.id}
                          className="ui-btn ui-btn-sm ui-btn-soft">
                          {busyId === b.id ? "AI oxuyur…" : "🤖 AI ilə doldur"}
                        </button>
                      )}
                      <button onClick={() => (edit?.id === b.id ? setEdit(null) : startEdit(b))}
                        className="ui-btn ui-btn-sm ui-btn-soft">
                        {edit?.id === b.id ? "✕ Bağla" : "✏️ Redaktə et"}
                      </button>
                    </div>
                  </div>

                  {edit?.id === b.id ? (
                    /* Redaktə rejimi — eyni sətirlər, dəyər yerinə input. */
                    <>
                      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-[13px] items-center max-w-lg">
                        <dt className="text-muted">Şirkət adı</dt>
                        <dd><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                          className="ui-field" /></dd>

                        <dt className="text-muted">VÖEN {dupVoen.length > 0 && <span className="text-red-500 font-bold">⚠</span>}</dt>
                        <dd><input value={edit.voen}
                          onChange={(e) => { setEdit({ ...edit, voen: e.target.value }); checkVoen(edit.id, e.target.value); }}
                          className={`w-full px-2.5 py-1.5 bg-card border rounded-lg text-sm font-mono ${dupVoen.length > 0 ? "border-red-500 ring-1 ring-red-500/40 text-red-600 font-semibold" : "border-input-border"}`} /></dd>

                        <dt className="text-muted">Sahibi / Rəhbər</dt>
                        <dd><input value={edit.ownerName} onChange={(e) => setEdit({ ...edit, ownerName: e.target.value })}
                          className="ui-field" /></dd>

                        <dt className="text-muted">Təsisçi</dt>
                        <dd><input value={edit.founderName} onChange={(e) => setEdit({ ...edit, founderName: e.target.value })}
                          className="ui-field" /></dd>

                        <dt className="text-muted">Telefon</dt>
                        <dd><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
                          className="ui-field" /></dd>
                      </dl>

                      <div className="mt-2 space-y-2">
{dupVoen.length > 0 && (
                  <div className="border-2 border-red-500 bg-red-500/10 rounded-xl p-3">
                    <p className="text-sm font-bold text-red-600 mb-1">
                      ⚠ Bu VÖEN artıq {dupVoen.length} biznesdə qeydiyyatdadır
                    </p>
                    <p className="text-[11px] text-muted mb-2">
                      Eyni VÖEN ikinci dəfə istifadə olunur — saxta müraciət ola bilər. Təsdiqləməzdən əvvəl yoxlayın.
                    </p>
                    <div className="space-y-1">
                      {dupVoen.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between gap-2 bg-card rounded-lg px-2.5 py-1.5">
                          <span className="min-w-0">
                            <span className="text-xs font-semibold block truncate">{d.name}</span>
                            <span className="text-[11px] text-muted">
                              #{d.id} · VÖEN {d.voen} · {new Date(d.createdAt).toLocaleDateString("az-AZ")}
                            </span>
                          </span>
                          <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${d.status === "APPROVED" ? "bg-green-500/15 text-green-600" : d.status === "REJECTED" ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-600"}`}>
                            {d.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {dupIban.length > 0 && (
                  <div className="border-2 border-amber-500 bg-amber-500/10 rounded-xl p-3">
                    <p className="text-sm font-bold text-amber-600 mb-1">⚠ Bu IBAN başqa biznesdə də var</p>
                    <p className="text-[11px] text-muted mb-2">Pul eyni bank hesabına gedəcək — yoxlayın.</p>
                    <div className="space-y-1">
                      {dupIban.map((d: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-2 bg-card rounded-lg px-2.5 py-1.5">
                          <span className="text-xs font-semibold truncate">{d.name} <span className="font-normal text-muted">#{d.id}</span></span>
                          <span className="text-[11px] font-mono text-muted shrink-0">{d.iban}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                      </div>

                      <div className="flex gap-2 mt-2.5">
                        <button onClick={saveEdit} disabled={busyId === b.id}
                          className="ui-btn ui-btn-primary">Yadda saxla</button>
                        <button onClick={() => setEdit(null)}
                          className="ui-btn ui-btn-ghost">Ləğv et</button>
                      </div>
                    </>
                  ) : (
                    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                      <dt className="text-muted">Şirkət adı</dt>
                      <dd className="font-semibold break-words">{b.name || <span className="text-muted font-normal">—</span>}</dd>

                      <dt className="text-muted">VÖEN</dt>
                      <dd className="font-semibold font-mono">{b.voen || <span className="text-muted font-normal">—</span>}</dd>

                      <dt className="text-muted">Sahibi / Rəhbər</dt>
                      <dd className="font-semibold break-words">{b.ownerName || <span className="text-muted font-normal">—</span>}</dd>

                      <dt className="text-muted">Təsisçi</dt>
                      <dd className="font-semibold break-words">{b.founderName || <span className="text-muted font-normal">—</span>}</dd>

                      <dt className="text-muted">Telefon</dt>
                      <dd className="font-semibold">{b.phone || <span className="text-muted font-normal">—</span>}</dd>

                      <dt className="text-muted border-t border-input-border pt-1.5">Şəxs növü</dt>
                      <dd className="border-t border-input-border pt-1.5 font-semibold">
                        {b.kind === "LEGAL" ? "Hüquqi şəxs" : b.kind === "PHYSICAL" ? "Fiziki şəxs" : "—"}
                      </dd>

                      <dt className="text-muted">Sənəd növü</dt>
                      <dd className="font-semibold">
                        {b.proofType === "TAX_DOC" ? "Vergi qeydiyyatı sənədi" : b.proofType === "POWER_OF_ATTORNEY" ? "Etibarnamə" : "—"}
                      </dd>

                      <dt className="text-muted">Vəziyyət</dt>
                      <dd className="font-semibold">
                        <span className={b.isActive ? "text-green-600" : "text-amber-600"}>{b.isActive ? "Aktiv" : "Deaktiv"}</span>
                        <span className="text-muted font-normal"> · {new Date(b.createdAt).toLocaleDateString("az-AZ")} tarixində yaradılıb</span>
                      </dd>
                    </dl>
                  )}
                </div>

              {/* Claude AI sənəd yoxlaması */}
              {(b.aiAuthorized !== null || b.aiReason) && (
                <div className="mb-3 p-3 bg-input-bg border border-input-border rounded-lg">
                  <p className="ui-section-title block mb-1.5">🤖 Claude AI sənəd yoxlaması</p>
                  <div className="flex flex-wrap gap-2">
                    {b.aiAuthorized !== null && (
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${b.aiAuthorized ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                        {b.aiAuthorized ? "✓ Səlahiyyətli (rəhbər/etibarnamə)" : "⚠ Səlahiyyət təsdiqlənmədi"}
                      </span>
                    )}
                    {b.aiVoenMatch !== null && (
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${b.aiVoenMatch ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}>
                        {b.aiVoenMatch ? "✓ VÖEN uyğun" : "⚠ VÖEN uyğun deyil"}
                      </span>
                    )}
                    {typeof b.aiConfidence === "number" && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-input-bg text-muted border border-input-border">Etibarlılıq: {Math.round(b.aiConfidence * 100)}%</span>
                    )}
                  </div>
                  {b.aiFraudSignals?.length > 0 && <p className="text-[11px] text-red-500 mt-1">⚠ Əlamətlər: {b.aiFraudSignals.join(", ")}</p>}
                  {b.aiReason && <p className="text-[11px] text-muted mt-1 leading-snug">{b.aiReason}</p>}
                </div>
              )}

              {/* Bank hesabları — admin yoxlayır (biznes təsdiqi bankları da əhatə edir) */}
              <div className="mb-3 p-3 bg-input-bg border border-input-border rounded-lg">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                  <p className="ui-section-title">🏦 Bank hesabları</p>
                  <button onClick={() => setBankEditFor(bankEditFor === b.id ? null : b.id)}
                    className="ui-btn ui-btn-sm ui-btn-soft">
                    {bankEditFor === b.id ? "✕ Bağla" : "✏️ Redaktə et"}
                  </button>
                </div>
                {b.banks?.length ? (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {b.banks.map((bk) => (
                      <span key={bk.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-input-bg border border-input-border rounded-lg text-xs font-mono">
                        {bk.iban}{bk.title ? <span className="text-muted font-sans">({bk.title})</span> : null}
                        {bankEditFor === b.id && (
                          <button onClick={() => deleteBank(bk.id)} title="Bank hesabını sil" className="text-red-500 hover:text-red-600 font-bold leading-none">×</button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted mb-2">Hələ IBAN yoxdur — sənədə (aşağıda «Bank sənədi») baxıb əlavə edin.</p>}
                {/* Sənədə baxıb IBAN əlavə et — yalnız redaktə rejimində */}
                {bankEditFor === b.id && (
                <div className="flex items-center gap-2">
                  <input
                    value={ibanInput[b.id] || ""}
                    onChange={(e) => setIbanInput((p) => ({ ...p, [b.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") addBank(b.id); }}
                    placeholder="AZ00 XXXX 0000 ... (sənəddən)"
                    className="ui-field flex-1 sm:max-w-sm font-mono"
                  />
                  <button onClick={() => addBank(b.id)} className="ui-btn ui-btn-primary">+ Əlavə et</button>
                </div>
                )}
              </div>

              {/* KYC sənədləri — admin əllə yoxlayır (üz tanıma) */}
              <div className="flex flex-wrap gap-2 mb-3">
                {([["taxDocImage", "Vergi"], ["companyDocImage", "Şirkət"], ["powerOfAttorneyImage", "Etibarnamə"], ["bankDocImage", "Bank sənədi"], ["idCardImage", "Vəsiqə"], ["selfieImage", "Selfie"]] as const).map(([key, label]) => {
                  const file = (b as any)[key] as string | null;
                  if (!file) return null;
                  return (
                    <a key={key} href={`${imgUrl(file)}`} target="_blank" rel="noreferrer" className="block">
                      <span className="text-[10px] text-muted block mb-0.5">{label}</span>
                      {isPdf(file) ? (
                        <div className="w-20 h-20 rounded-lg border border-input-border bg-input-bg flex flex-col items-center justify-center gap-1 hover:border-orange-500/50 transition-colors">
                          <span className="text-2xl">📄</span>
                          <span className="text-[9px] text-orange-500 font-semibold">PDF aç</span>
                        </div>
                      ) : (
                        <img src={`${imgUrl(file)}`} alt={label} className="w-20 h-20 object-cover rounded-lg border border-input-border" />
                      )}
                    </a>
                  );
                })}
              </div>
              {b.objects.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-muted mb-1">{t("bizObjects") || "Obyektlər"}:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {b.objects.map((o) => (
                      <span key={o.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-input-bg border border-input-border rounded-lg text-xs">
                        <span>{o.name}{o.activityAreas?.length ? ` (${o.activityAreas.join(", ")})` : ""} — {o.city ? o.city + ", " : ""}{o.address}</span>
                        <button
                          onClick={() => deleteObject(o.id, o.name)}
                          title="Obyekti sil (elanları da silinir)"
                          className="text-red-500 hover:text-red-600 font-bold leading-none"
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {b.status === "PENDING" && (
                <div className="flex flex-col sm:flex-row gap-2 border-t border-card-border pt-3">
                  <button onClick={() => approve(b.id)} className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-sm font-medium hover:bg-green-500/20">✓ {t("bizApprove") || "Təsdiqlə"}</button>
                  <input value={rejectReason[b.id] || ""} onChange={(e) => setRejectReason((p) => ({ ...p, [b.id]: e.target.value }))} placeholder={t("bizRejectReason") || "Rədd səbəbi"} className="flex-1 px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm" />
                  <button onClick={() => reject(b.id)} className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/20">✕ {t("bizReject") || "Rədd et"}</button>
                </div>
              )}
              {b.status === "REJECTED" && b.rejectionReason && <p className="text-xs text-red-500 border-t border-card-border pt-2">{b.rejectionReason}</p>}
              </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
