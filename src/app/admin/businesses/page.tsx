"use client";
import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

interface Biz {
  id: number; kind: string; proofType: string; name: string; voen: string; ownerName: string; founderName: string; phone: string | null;
  status: string; rejectionReason: string | null; createdAt: string;
  aiAuthorized: boolean | null; aiVoenMatch: boolean | null; aiConfidence: number | null; aiFraudSignals: string[]; aiReason: string | null; autoApproved: boolean;
  taxDocImage: string | null; companyDocImage: string | null; powerOfAttorneyImage: string | null; bankDocImage: string | null; idCardImage: string | null; selfieImage: string | null;
  user: { id: number; name: string; phone: string; publicId: string | null };
  banks: { id: number; iban: string; title: string | null; isActive: boolean }[];
  objects: { id: number; name: string; address: string; city: string | null; activityAreas: string[] }[];
}

export default function AdminBusinessesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [items, setItems] = useState<Biz[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [rejectReason, setRejectReason] = useState<{ [id: number]: string }>({});
  const [busyId, setBusyId] = useState<number | null>(null); // AI əməliyyatı gedən biznes
  const [edit, setEdit] = useState<{ id: number; name: string; voen: string; ownerName: string; founderName: string; phone: string } | null>(null);
  const [ibanInput, setIbanInput] = useState<{ [bizId: number]: string }>({});

  const headers: any = { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/businesses?status=${filter}`, { headers });
      const data = await res.json();
      setItems(data.businesses || []);
    } catch { toast(t("error"), "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number) => {
    try {
      const res = await fetch(`${API}/admin/businesses/${id}/approve`, { method: "PUT", headers });
      if (res.ok) { toast(t("bizApproved") || "Təsdiqləndi", "success"); load(); } else toast(t("error"), "error");
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
    if (!confirm(`"${name}" biznesini silmək istəyirsiniz?\n\n⚠️ BU BİZNESƏ AİD BÜTÜN OBYEKTLƏR VƏ ELANLAR SİLİNƏCƏK. Geri qaytarmaq mümkün deyil.`)) return;
    try {
      const res = await fetch(`${API}/admin/businesses/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (res.ok && data.success) { toast(`Biznes silindi (${data.deletedObjects} obyekt, ${data.deletedListings} elan)`, "success"); load(); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  // Obyekti sil — ona aid bütün elanlar da silinir.
  const deleteObject = async (id: number, name: string) => {
    if (!confirm(`"${name}" obyektini silmək istəyirsiniz?\n\n⚠️ BU OBYEKTƏ AİD BÜTÜN ELANLAR SİLİNƏCƏK. Geri qaytarmaq mümkün deyil.`)) return;
    try {
      const res = await fetch(`${API}/admin/objects/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (res.ok && data.success) { toast(`Obyekt silindi (${data.deletedListings} elan)`, "success"); load(); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  // AI ilə yenidən yoxla (saxlanmış sənədlər üzərində).
  const aiRecheck = async (id: number) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API}/admin/businesses/${id}/ai-recheck`, { method: "POST", headers });
      const data = await res.json();
      if (res.ok && data.success) { toast(data.aiRecommendsApprove ? "AI yoxladı: təsdiq tövsiyə edir ✓" : "AI yoxladı (nəticəyə baxın)", data.aiRecommendsApprove ? "success" : "info"); load(); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); } finally { setBusyId(null); }
  };

  // Redaktə formasını aç + (istəyə görə) AI ilə sənəddən doldur.
  const startEdit = (b: Biz) => setEdit({ id: b.id, name: b.name, voen: b.voen, ownerName: b.ownerName, founderName: b.founderName, phone: b.phone || "" });
  const aiFill = async (id: number) => {
    setBusyId(id);
    try {
      const res = await fetch(`${API}/admin/businesses/${id}/ai-extract`, { method: "POST", headers });
      const data = await res.json();
      if (res.ok && data.success && data.info) {
        const i = data.info;
        setEdit((e) => e && e.id === id ? {
          ...e,
          name: i.companyName || e.name,
          voen: i.voen || e.voen,
          ownerName: i.ownerName || e.ownerName,
          founderName: i.founderName || e.founderName,
        } : e);
        toast("AI sənəddən oxudu — yoxlayıb yadda saxlayın", "success");
      } else toast(data.message || "AI oxuya bilmədi", "error");
    } catch { toast(t("error"), "error"); } finally { setBusyId(null); }
  };
  const saveEdit = async () => {
    if (!edit) return;
    setBusyId(edit.id);
    try {
      const res = await fetch(`${API}/admin/businesses/${edit.id}`, { method: "PUT", headers, body: JSON.stringify(edit) });
      const data = await res.json();
      if (res.ok && data.success) { toast("Biznes məlumatları yeniləndi ✓", "success"); setEdit(null); load(); }
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
      if (res.ok && data.success) { toast("IBAN əlavə edildi", "success"); setIbanInput((p) => ({ ...p, [bizId]: "" })); load(); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  // Bank hesabını sil (admin).
  const deleteBank = async (id: number) => {
    if (!confirm("Bu bank hesabını silmək istəyirsiniz?")) return;
    try {
      const res = await fetch(`${API}/admin/banks/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (res.ok && data.success) { toast("Bank hesabı silindi", "success"); load(); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  const statuses = ["PENDING", "APPROVED", "REJECTED", "all"];

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-4">{t("adminBusinesses") || "Biznes təsdiqi"}</h1>
      <div className="flex gap-1.5 flex-wrap bg-input-bg border border-input-border rounded-xl p-1 mb-6 w-fit">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>
            {s === "all" ? t("all") : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted">{t("adminNoData")}</div>
      ) : (
        <div className="space-y-4">
          {items.map((b) => (
            <div key={b.id} className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <h2 className="font-bold">{b.name} <span className="text-xs font-normal text-muted">({b.kind === "LEGAL" ? "Hüquqi" : "Fiziki"} · {b.proofType === "TAX_DOC" ? "Vergi sənədi" : "Etibarnamə"})</span></h2>
                  <p className="text-xs text-muted">{b.user?.name} · {b.user?.phone}{b.user?.publicId ? ` · ID ${b.user.publicId}` : ""}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {b.autoApproved && <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20" title="AI təsdiq tövsiyə edir — yekun qərar sizindir">🤖 AI tövsiyə: təsdiq</span>}
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium border bg-input-bg">{b.status}</span>
                  <button
                    onClick={() => aiRecheck(b.id)}
                    disabled={busyId === b.id}
                    title="Sənədləri AI ilə yenidən yoxla"
                    className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-50"
                  >{busyId === b.id ? "…" : "🤖 AI yoxla"}</button>
                  <button
                    onClick={() => (edit?.id === b.id ? setEdit(null) : startEdit(b))}
                    title="Məlumatları əl ilə redaktə et"
                    className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20"
                  >{edit?.id === b.id ? "✕ Bağla" : "✏️ Redaktə"}</button>
                  <button
                    onClick={() => deleteBusiness(b.id, b.name)}
                    title="Biznesi sil (obyektlər + elanlar da silinir)"
                    className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20"
                  >🗑 Sil</button>
                </div>
              </div>

              {/* Claude AI sənəd yoxlaması */}
              {(b.aiAuthorized !== null || b.aiReason) && (
                <div className="mb-3 p-3 bg-input-bg border border-input-border rounded-lg">
                  <p className="text-[11px] font-semibold text-muted mb-1.5">🤖 Claude AI sənəd yoxlaması</p>
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
              {edit?.id === b.id ? (
                /* ── Redaktə formu (əl ilə və ya AI ilə doldur) ── */
                <div className="mb-3 p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[11px] font-semibold text-orange-500">✏️ Şirkət məlumatlarını redaktə et</p>
                    <button onClick={() => aiFill(b.id)} disabled={busyId === b.id} className="px-2 py-1 rounded-lg text-[11px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 disabled:opacity-50">
                      {busyId === b.id ? "AI oxuyur…" : "🤖 AI ilə sənəddən doldur"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="text-[11px] text-muted">Ad<input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm" /></label>
                    <label className="text-[11px] text-muted">VÖEN<input value={edit.voen} onChange={(e) => setEdit({ ...edit, voen: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm" /></label>
                    <label className="text-[11px] text-muted">Sahibi/Rəhbər<input value={edit.ownerName} onChange={(e) => setEdit({ ...edit, ownerName: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm" /></label>
                    <label className="text-[11px] text-muted">Təsisçi<input value={edit.founderName} onChange={(e) => setEdit({ ...edit, founderName: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm" /></label>
                    <label className="text-[11px] text-muted sm:col-span-2">Telefon<input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} className="w-full mt-0.5 px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm" /></label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={busyId === b.id} className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Yadda saxla</button>
                    <button onClick={() => setEdit(null)} className="px-4 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm">Ləğv et</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                  <p><span className="text-muted text-xs">VÖEN:</span> {b.voen}</p>
                  <p><span className="text-muted text-xs">{t("phone") || "Tel"}:</span> {b.phone || "—"}</p>
                  <p><span className="text-muted text-xs">{t("bizOwner") || "Sahibi"}:</span> {b.ownerName}</p>
                  <p><span className="text-muted text-xs">{t("bizFounder") || "Təsisçi"}:</span> {b.founderName}</p>
                </div>
              )}

              {/* Bank hesabları — admin yoxlayır (biznes təsdiqi bankları da əhatə edir) */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted mb-1">🏦 Bank hesabları:</p>
                {b.banks?.length ? (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {b.banks.map((bk) => (
                      <span key={bk.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-input-bg border border-input-border rounded-lg text-xs font-mono">
                        {bk.iban}{bk.title ? <span className="text-muted font-sans">({bk.title})</span> : null}
                        <button onClick={() => deleteBank(bk.id)} title="Bank hesabını sil" className="text-red-500 hover:text-red-600 font-bold leading-none">×</button>
                      </span>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted mb-2">Hələ IBAN yoxdur — sənədə (aşağıda «Bank sənədi») baxıb əlavə edin.</p>}
                {/* Sənədə baxıb IBAN əlavə et */}
                <div className="flex items-center gap-2">
                  <input
                    value={ibanInput[b.id] || ""}
                    onChange={(e) => setIbanInput((p) => ({ ...p, [b.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") addBank(b.id); }}
                    placeholder="AZ00 XXXX 0000 ... (sənəddən)"
                    className="flex-1 sm:max-w-xs px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs font-mono"
                  />
                  <button onClick={() => addBank(b.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20">+ IBAN əlavə et</button>
                </div>
              </div>

              {/* KYC sənədləri — admin əllə yoxlayır (üz tanıma) */}
              <div className="flex flex-wrap gap-2 mb-3">
                {([["taxDocImage", "Vergi"], ["companyDocImage", "Şirkət"], ["powerOfAttorneyImage", "Etibarnamə"], ["bankDocImage", "Bank sənədi"], ["idCardImage", "Vəsiqə"], ["selfieImage", "Selfie"]] as const).map(([key, label]) => {
                  const img = (b as any)[key] as string | null;
                  if (!img) return null;
                  return (
                    <a key={key} href={`${imgUrl(img)}`} target="_blank" rel="noreferrer" className="block">
                      <span className="text-[10px] text-muted block">{label}</span>
                      <img src={`${imgUrl(img)}`} alt={label} className="w-20 h-20 object-cover rounded-lg border border-input-border" />
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
          ))}
        </div>
      )}
    </div>
  );
}
