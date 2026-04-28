"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

type ApplicationStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export default function SellerApplyPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token, user, authLoading } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<ApplicationStatus>("NONE");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState("");
  const [idBackPreview, setIdBackPreview] = useState("");
  const [taxId, setTaxId] = useState("");
  const [iban, setIban] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push("/"); return; }
    if (!user?.profileComplete) { router.push("/complete-profile"); return; }
    if (user.type !== "MECHANIC" && user.type !== "PARTS_SELLER") {
      toast("Yalnız usta və hissə satıcıları KYC üçün müraciət edə bilər", "error");
      router.push("/account");
      return;
    }

    fetch(`${API}/seller/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.sellerVerified) setStatus("APPROVED");
        else if (d.sellerApplication) {
          setStatus(d.sellerApplication.status);
          setRejectionReason(d.sellerApplication.rejectionReason || null);
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [token, user, authLoading, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idFront) { toast(t("idImageFront") + " tələb olunur", "error"); return; }
    if (!taxId.trim()) { toast(t("taxId") + " tələb olunur", "error"); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append("idImageFront", idFront);
    if (idBack) fd.append("idImageBack", idBack);
    fd.append("taxId", taxId.trim());
    if (iban.trim()) fd.append("iban", iban.trim());
    if (businessName.trim()) fd.append("businessName", businessName.trim());
    try {
      const res = await fetch(`${API}/seller/apply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("PENDING");
        toast("Ərizəniz göndərildi, nəzərdən keçirilir", "success");
      } else {
        toast(data.message || t("error"), "error");
      }
    } catch {
      toast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground";

  if (fetching) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)] flex items-start justify-center py-6 px-3 sm:px-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t("sellerKycTitle")}</h1>
          <p className="text-muted text-sm">{t("sellerKycSubtitle")}</p>
        </div>

        {status === "APPROVED" && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-green-500 mb-1">{t("kycApproved")}</h3>
            <p className="text-sm text-muted">Artıq elan verə bilərsiniz</p>
            <Link href="/account" className="inline-block mt-4 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white font-medium">Elanlarım</Link>
          </div>
        )}

        {status === "PENDING" && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center">
            <div className="w-14 h-14 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-amber-500 mb-1">{t("kycPending")}</h3>
            <p className="text-sm text-muted">Admin tezliklə ərizənizi nəzərdən keçirəcək</p>
          </div>
        )}

        {(status === "NONE" || status === "REJECTED") && (
          <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-2xl p-5 sm:p-6 space-y-4">
            {status === "REJECTED" && rejectionReason && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-500">
                <strong>{t("kycRejected")}:</strong> {rejectionReason}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2">{t("idImageFront")} *</label>
              {idFrontPreview ? (
                <div className="relative">
                  <img src={idFrontPreview} className="w-full h-48 object-cover rounded-xl border border-input-border" />
                  <button type="button" onClick={() => { setIdFront(null); setIdFrontPreview(""); }} className="absolute top-2 right-2 p-1 bg-red-500/80 rounded text-white">×</button>
                </div>
              ) : (
                <label className="flex items-center justify-center h-32 border-2 border-dashed border-input-border rounded-xl cursor-pointer hover:border-orange-500/30 text-sm text-muted">
                  {t("uploadPhoto")}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setIdFront(f); setIdFrontPreview(URL.createObjectURL(f)); } }} />
                </label>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("idImageBack")}</label>
              {idBackPreview ? (
                <div className="relative">
                  <img src={idBackPreview} className="w-full h-48 object-cover rounded-xl border border-input-border" />
                  <button type="button" onClick={() => { setIdBack(null); setIdBackPreview(""); }} className="absolute top-2 right-2 p-1 bg-red-500/80 rounded text-white">×</button>
                </div>
              ) : (
                <label className="flex items-center justify-center h-32 border-2 border-dashed border-input-border rounded-xl cursor-pointer hover:border-orange-500/30 text-sm text-muted">
                  {t("uploadPhoto")}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setIdBack(f); setIdBackPreview(URL.createObjectURL(f)); } }} />
                </label>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("taxId")} *</label>
              <input type="text" value={taxId} onChange={(e) => setTaxId(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("iban")}</label>
              <input type="text" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="AZ00 AIIB 0000 0000 0000 0000 0000" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("businessName")}</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50">
              {loading ? t("submitting") : t("submitApplication")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
