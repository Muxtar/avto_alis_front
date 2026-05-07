"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, UPLOADS } from "@/lib/api";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, token, isLoggedIn, authLoading, login } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [listingTab, setListingTab] = useState<"active" | "expired">("active");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "" });

  // Vehicles state
  const [vehicleForm, setVehicleForm] = useState<{ id: number | null; brand: string; model: string; year: string; passportImage: File | null }>({ id: null, brand: "", model: "", year: "", passportImage: null });
  const [showVehicleForm, setShowVehicleForm] = useState(false);

  // Workplaces state
  const [workplaceForm, setWorkplaceForm] = useState<{ id: number | null; name: string; address: string }>({ id: null, name: "", address: "" });
  const [showWorkplaceForm, setShowWorkplaceForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    Promise.all([
      fetch(`${API}/me`, { headers }).then((r) => r.json()),
      fetch(`${API}/me/listings`, { headers }).then((r) => r.json()),
    ]).then(([p, l]) => {
      setProfile(p.user);
      setEditData({ name: p.user.name });
      setListings(l.listings || []);
    }).catch(() => { toast(t('error'), 'error'); }).finally(() => setLoading(false));
  }, [isLoggedIn, authLoading]);

  const handleSave = async () => {
    const res = await fetch(`${API}/me`, { method: "PUT", headers, body: JSON.stringify({ name: editData.name }) });
    const data = await res.json();
    if (data.success) {
      setProfile(data.user);
      login(token!, data.user);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const refreshProfile = async () => {
    const res = await fetch(`${API}/me`, { headers }).then((r) => r.json());
    if (res.user) setProfile(res.user);
  };

  const refreshListings = async () => {
    const res = await fetch(`${API}/me/listings`, { headers }).then((r) => r.json());
    setListings(res.listings || []);
  };

  const handleDeleteListing = async (id: number) => {
    if (!confirm(t("confirmDeleteListing"))) return;
    const res = await fetch(`${API}/me/listings/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      toast(t("profileUpdated"), "success");
      refreshListings();
      refreshProfile();
    } else {
      toast(data.message || t("error"), "error");
    }
  };

  const handleReactivateListing = async (id: number) => {
    const res = await fetch(`${API}/me/listings/${id}/reactivate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      toast(t("listingReactivated"), "success");
      refreshListings();
    } else {
      toast(data.message || t("error"), "error");
    }
  };

  const isListingExpired = (l: any) => l.expiresAt && new Date(l.expiresAt) <= new Date();
  const activeListings = listings.filter((l) => !isListingExpired(l));
  const expiredListings = listings.filter((l) => isListingExpired(l));
  const visibleListings = listingTab === "active" ? activeListings : expiredListings;

  // ====== VEHICLES ======
  const startAddVehicle = () => {
    setVehicleForm({ id: null, brand: "", model: "", year: "", passportImage: null });
    setShowVehicleForm(true);
  };
  const startEditVehicle = (v: any) => {
    setVehicleForm({ id: v.id, brand: v.brand, model: v.model, year: String(v.year), passportImage: null });
    setShowVehicleForm(true);
  };
  const cancelVehicleForm = () => { setShowVehicleForm(false); setVehicleForm({ id: null, brand: "", model: "", year: "", passportImage: null }); };
  const submitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.brand || !vehicleForm.model || !vehicleForm.year) { toast(t('error'), 'error'); return; }
    if (!vehicleForm.id && !vehicleForm.passportImage) { toast('Texniki pasport şəkli tələb olunur', 'error'); return; }
    const fd = new FormData();
    fd.append('brand', vehicleForm.brand);
    fd.append('model', vehicleForm.model);
    fd.append('year', vehicleForm.year);
    if (vehicleForm.passportImage) fd.append('passportImage', vehicleForm.passportImage);
    const url = vehicleForm.id ? `${API}/me/vehicles/${vehicleForm.id}` : `${API}/me/vehicles`;
    const method = vehicleForm.id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await res.json();
    if (data.success) {
      toast(vehicleForm.id ? t('profileUpdated') : t('addedToCart'), 'success');
      cancelVehicleForm();
      refreshProfile();
    } else {
      toast(data.message || t('error'), 'error');
    }
  };
  const deleteVehicle = async (id: number) => {
    if (!confirm('Avtomobili silmək istəyirsiniz?')) return;
    const res = await fetch(`${API}/me/vehicles/${id}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (data.success) { toast(t('profileUpdated'), 'success'); refreshProfile(); }
    else toast(data.message || t('error'), 'error');
  };

  // ====== WORKPLACES ======
  const startAddWorkplace = () => { setWorkplaceForm({ id: null, name: "", address: "" }); setShowWorkplaceForm(true); };
  const startEditWorkplace = (w: any) => { setWorkplaceForm({ id: w.id, name: w.name, address: w.address }); setShowWorkplaceForm(true); };
  const cancelWorkplaceForm = () => { setShowWorkplaceForm(false); setWorkplaceForm({ id: null, name: "", address: "" }); };
  const submitWorkplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workplaceForm.name || !workplaceForm.address) { toast(t('error'), 'error'); return; }
    const url = workplaceForm.id ? `${API}/me/workplaces/${workplaceForm.id}` : `${API}/me/workplaces`;
    const method = workplaceForm.id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers, body: JSON.stringify({ name: workplaceForm.name, address: workplaceForm.address }) });
    const data = await res.json();
    if (data.success) {
      toast(t('profileUpdated'), 'success');
      cancelWorkplaceForm();
      refreshProfile();
    } else {
      toast(data.message || t('error'), 'error');
    }
  };
  const deleteWorkplace = async (id: number) => {
    if (!confirm('İş yerini silmək istəyirsiniz?')) return;
    const res = await fetch(`${API}/me/workplaces/${id}`, { method: 'DELETE', headers });
    const data = await res.json();
    if (data.success) { toast(t('profileUpdated'), 'success'); refreshProfile(); }
    else toast(data.message || t('error'), 'error');
  };

  const handleSendEmailCode = async () => {
    if (!emailInput) return;
    setEmailError("");
    setEmailLoading(true);
    try {
      const res = await fetch(`${API}/me/email/send-code`, { method: "POST", headers, body: JSON.stringify({ email: emailInput }) });
      const data = await res.json();
      if (data.success) {
        setEmailCodeSent(true);
        setVerificationCode(data.code);
      } else {
        setEmailError(data.message || t("error"));
      }
    } catch { setEmailError(t("error")); }
    finally { setEmailLoading(false); }
  };

  const handleVerifyEmail = async () => {
    if (!emailCode) return;
    setEmailError("");
    setEmailLoading(true);
    try {
      const res = await fetch(`${API}/me/email/verify`, { method: "POST", headers, body: JSON.stringify({ email: emailInput, code: emailCode }) });
      const data = await res.json();
      if (data.success) {
        setProfile(data.user);
        login(token!, data.user);
        setEmailVerified(true);
        setEmailCodeSent(false);
        setEmailCode("");
        setVerificationCode("");
        setTimeout(() => setEmailVerified(false), 3000);
      } else {
        setEmailError(data.message || t("error"));
      }
    } catch { setEmailError(t("error")); }
    finally { setEmailLoading(false); }
  };

  const typeLabel = (type: string) =>
    type === "MECHANIC" ? t("tabMechanic") : type === "PARTS_SELLER" ? t("tabPartsSeller") : t("tabCarOwner");
  const typeColor = (type: string) =>
    type === "MECHANIC" ? "from-green-500 to-emerald-600" : type === "PARTS_SELLER" ? "from-purple-500 to-violet-600" : "from-blue-500 to-blue-600";

  if (authLoading || loading || !profile) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const memberDate = new Date(profile.createdAt).toLocaleDateString("az-AZ", { year: "numeric", month: "long", day: "numeric" });

  const inputCls = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm";

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Profile Card */}
      <div className="surface p-5 sm:p-7 mb-5">
        {saved && (
          <div className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm text-center">
            {t("profileUpdated")}
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className={`w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br ${typeColor(profile.type)} rounded-2xl flex items-center justify-center text-white font-bold text-2xl sm:text-3xl shrink-0 shadow-lg`}>
            {profile.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
          </div>

          {/* Info */}
          <div className="flex-1 w-full">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("fullName")}</label>
                  <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("phone")}</label>
                  <input value={profile.phone} disabled className={inputCls + " opacity-60 cursor-not-allowed"} />
                  <p className="text-[11px] text-muted mt-1">Telefon nömrəsi dəyişdirilə bilməz</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium">{t("adminSave")}</button>
                  <button onClick={() => setEditing(false)} className="px-5 py-2 bg-input-bg border border-input-border rounded-xl text-sm">{t("adminCancel")}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-xl sm:text-2xl font-bold">{profile.name}</h1>
                  <span className={`px-3 py-1 bg-gradient-to-r ${typeColor(profile.type)} rounded-lg text-xs font-medium text-white`}>
                    {typeLabel(profile.type)}
                  </span>
                  {profile.verified && <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-xs">{t("adminVerified")}</span>}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted mb-3">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    {profile.phone}
                  </span>
                  {profile.email && (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      {profile.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                    {t("memberSince")}: {memberDate}
                  </span>
                </div>
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-4 py-2 bg-orange-500/10 text-orange-500 rounded-xl text-sm font-medium hover:bg-orange-500/20 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  {t("editProfile")}
                </button>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-500">{profile._count?.listings || 0}</p>
              <p className="text-xs text-muted">{t("totalListings")}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{(profile._count?.sentMessages || 0) + (profile._count?.receivedMessages || 0)}</p>
              <p className="text-xs text-muted">{t("messages")}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Vehicles section - only for CAR_OWNER */}
      {profile.type === "CAR_OWNER" && (
        <div className="surface p-5 sm:p-7 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25" /></svg>
              Avtomobillərim ({profile.vehicles?.length || 0})
            </h2>
            {!showVehicleForm && (
              <button onClick={startAddVehicle} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Avtomobil əlavə et
              </button>
            )}
          </div>

          {showVehicleForm && (
            <form onSubmit={submitVehicle} className="bg-input-bg/50 border border-input-border rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={vehicleForm.brand} onChange={(e) => setVehicleForm({ ...vehicleForm, brand: e.target.value })} placeholder="Marka (BMW, Mercedes...)" className={inputCls} required />
                <input value={vehicleForm.model} onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })} placeholder="Model (E60, W211...)" className={inputCls} required />
                <input type="number" min="1900" max={new Date().getFullYear() + 1} value={vehicleForm.year} onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })} placeholder="İl" className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Texniki pasport şəkli {vehicleForm.id ? "(dəyişmək üçün yenisini seç)" : ""}</label>
                <input type="file" accept="image/*" onChange={(e) => setVehicleForm({ ...vehicleForm, passportImage: e.target.files?.[0] || null })} className="text-sm text-foreground" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium">{vehicleForm.id ? t("adminSave") : "Əlavə et"}</button>
                <button type="button" onClick={cancelVehicleForm} className="px-5 py-2 bg-input-bg border border-input-border rounded-xl text-sm">{t("adminCancel")}</button>
              </div>
            </form>
          )}

          {!profile.vehicles?.length && !showVehicleForm ? (
            <p className="text-muted text-sm text-center py-4">Hələ avtomobil əlavə etməmisiniz.</p>
          ) : (
            <div className="space-y-2">
              {profile.vehicles?.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between gap-3 p-3 bg-input-bg/40 border border-input-border/60 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{v.brand} {v.model}</p>
                      <p className="text-muted text-xs">📅 {v.year}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => startEditVehicle(v)} className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors" title={t("adminEdit")}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteVehicle(v.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors" title={t("adminDelete")}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Workplaces section - for MECHANIC and PARTS_SELLER */}
      {(profile.type === "MECHANIC" || profile.type === "PARTS_SELLER") && (
        <div className="surface p-5 sm:p-7 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              {t("workplaces")} ({profile.workplaces?.length || 0})
            </h2>
            {!showWorkplaceForm && (
              <button onClick={startAddWorkplace} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                {t("addWorkplace")}
              </button>
            )}
          </div>

          {showWorkplaceForm && (
            <form onSubmit={submitWorkplace} className="bg-input-bg/50 border border-input-border rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={workplaceForm.name} onChange={(e) => setWorkplaceForm({ ...workplaceForm, name: e.target.value })} placeholder="İş yerinin adı" className={inputCls} required />
                <input value={workplaceForm.address} onChange={(e) => setWorkplaceForm({ ...workplaceForm, address: e.target.value })} placeholder="Ünvan" className={inputCls} required />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium">{workplaceForm.id ? t("adminSave") : "Əlavə et"}</button>
                <button type="button" onClick={cancelWorkplaceForm} className="px-5 py-2 bg-input-bg border border-input-border rounded-xl text-sm">{t("adminCancel")}</button>
              </div>
            </form>
          )}

          {!profile.workplaces?.length && !showWorkplaceForm ? (
            <p className="text-muted text-sm text-center py-4">Hələ iş yeri əlavə etməmisiniz.</p>
          ) : (
            <div className="space-y-2">
              {profile.workplaces?.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between gap-3 p-3 bg-input-bg/40 border border-input-border/60 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{w.name}</p>
                      <p className="text-muted text-xs truncate">{w.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => startEditWorkplace(w)} className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors" title={t("adminEdit")}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteWorkplace(w.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors" title={t("adminDelete")}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email Verification */}
      <div className="surface p-5 sm:p-7 mb-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
          {t("emailSection")}
        </h2>

        {emailVerified && (
          <div className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm text-center">
            {t("emailVerified")}
          </div>
        )}
        {emailError && (
          <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">{emailError}</div>
        )}

        {profile.email ? (
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-sm">{profile.email}</span>
            <span className="text-xs text-muted">{t("emailConfirmed")}</span>
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setEmailCodeSent(false); setEmailError(""); }}
              placeholder={t("emailPlaceholder")}
              className={inputCls + " flex-1"}
            />
            <button
              onClick={handleSendEmailCode}
              disabled={emailLoading || !emailInput}
              className="px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium whitespace-nowrap disabled:opacity-50"
            >
              {emailLoading ? "..." : t("emailSendCode")}
            </button>
          </div>

          {emailCodeSent && (
            <>
              {process.env.NODE_ENV === 'development' && verificationCode && (
                <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500 text-sm text-center">
                  {t("testModeLabel")}: <strong>{verificationCode}</strong>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder={t("emailCodePlaceholder")}
                  maxLength={6}
                  className={inputCls + " flex-1"}
                />
                <button
                  onClick={handleVerifyEmail}
                  disabled={emailLoading || !emailCode}
                  className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white text-sm font-medium whitespace-nowrap disabled:opacity-50"
                >
                  {emailLoading ? "..." : t("emailVerify")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* My Listings */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t("myListings")} ({listings.length})</h2>
        <Link href="/account" className="text-sm text-orange-500 hover:text-orange-400 transition-colors">{t("addListing")} &rarr;</Link>
      </div>

      {/* Tabs: Active / Expired */}
      <div className="flex gap-1 bg-input-bg border border-input-border rounded-xl p-1 mb-4 w-fit">
        <button
          onClick={() => setListingTab("active")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listingTab === "active" ? "bg-orange-500 text-white shadow-sm" : "text-muted hover:text-foreground"}`}
        >
          {t("activeListings")} ({activeListings.length})
        </button>
        <button
          onClick={() => setListingTab("expired")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${listingTab === "expired" ? "bg-orange-500 text-white shadow-sm" : "text-muted hover:text-foreground"}`}
        >
          {t("expiredListings")} ({expiredListings.length})
        </button>
      </div>

      {visibleListings.length === 0 ? (
        <div className="text-center py-12 surface text-muted">
          {listingTab === "active" ? (
            <>
              <p>{t("noListingsYet")}</p>
              <Link href="/account" className="text-orange-500 text-sm mt-2 inline-block">{t("createFirstListing")}</Link>
            </>
          ) : (
            <p>{t("noExpiredListings")}</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleListings.map((l) => {
            const expired = isListingExpired(l);
            const cardInner = (
              <>
                <div className="aspect-[4/3] bg-input-bg overflow-hidden relative">
                  {l.images && l.images.length > 0 ? (
                    <img
                      src={l.images[0].startsWith("http") ? l.images[0] : `${UPLOADS}/${l.images[0]}`}
                      alt={l.title}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-transform duration-500 ease-out ${expired ? "opacity-50 grayscale" : "group-hover:scale-110"}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md shadow-sm ${l.type === "SERVICE" ? "bg-emerald-500/95 text-white" : "bg-orange-500/95 text-white"}`}>
                      {l.type === "SERVICE" ? t("service") : t("product")}
                    </span>
                    {expired && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/95 text-white backdrop-blur-md shadow-sm">
                        {t("expiredBadge")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <span className="px-1.5 py-0.5 bg-input-bg border border-input-border rounded text-[10px] w-fit mb-1.5 truncate max-w-full">{l.category}</span>
                  <h3 className="font-medium text-sm truncate">{l.title}</h3>
                  <div className="flex items-center justify-between mt-1.5 mb-2">
                    <span className="text-orange-500 font-bold text-sm">{l.price} AZN</span>
                    <div className="flex items-center gap-2 text-muted text-[10px]">
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        {l.viewCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        {l._count?.comments || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-auto">
                    {expired ? (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleReactivateListing(l.id); }}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {t("reactivate")}
                      </button>
                    ) : (
                      <Link
                        href={`/account?edit=${l.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        {t("adminEdit")}
                      </Link>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteListing(l.id); }}
                      className="flex items-center justify-center px-2 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
                      title={t("adminDelete")}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </>
            );
            return expired ? (
              <div key={l.id} className="bg-card border border-card-border rounded-xl overflow-hidden flex flex-col">
                {cardInner}
              </div>
            ) : (
              <Link
                key={l.id}
                href={`/marketplace/${l.id}`}
                className="bg-card border border-card-border rounded-xl overflow-hidden flex flex-col group hover:border-orange-500/30 transition-colors"
              >
                {cardInner}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
