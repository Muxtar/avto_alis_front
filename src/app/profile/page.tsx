"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, token, isLoggedIn, authLoading, login } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: "", phone: "" });
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
      setEditData({ name: p.user.name, phone: p.user.phone });
      setListings(l.listings || []);
    }).catch(() => { toast(t('error'), 'error'); }).finally(() => setLoading(false));
  }, [isLoggedIn, authLoading]);

  const handleSave = async () => {
    const res = await fetch(`${API}/me`, { method: "PUT", headers, body: JSON.stringify(editData) });
    const data = await res.json();
    if (data.success) {
      setProfile(data.user);
      login(token!, data.user);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
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
      <div className="bg-card border border-card-border rounded-2xl p-5 sm:p-8 mb-6">
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
                  <input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className={inputCls} />
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

        {/* Workplaces */}
        {profile.workplaces?.length > 0 && (
          <div className="mt-5 pt-5 border-t border-card-border">
            <div className="flex flex-wrap gap-2">
              {profile.workplaces.map((w: any) => (
                <div key={w.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs">
                  <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  <span className="font-medium">{w.name}</span> - {w.address}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Email Verification */}
      <div className="bg-card border border-card-border rounded-2xl p-5 sm:p-8 mb-6">
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

      {listings.length === 0 ? (
        <div className="text-center py-12 bg-card border border-card-border rounded-2xl text-muted">
          <p>{t("noListingsYet")}</p>
          <Link href="/account" className="text-orange-500 text-sm mt-2 inline-block">{t("createFirstListing")}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {listings.map((l) => (
            <Link key={l.id} href={`/marketplace/${l.id}`} className="bg-card border border-card-border rounded-xl p-4 hover:border-orange-500/20 transition-colors group">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${l.type === 'SERVICE' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                  {l.type === 'SERVICE' ? t("service") : t("product")}
                </span>
                <span className="px-1.5 py-0.5 bg-input-bg border border-input-border rounded text-[10px]">{l.category}</span>
              </div>
              <h3 className="font-medium text-sm truncate group-hover:text-orange-500 transition-colors">{l.title}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-orange-500 font-bold text-sm">{l.price} AZN</span>
                <div className="flex items-center gap-3 text-muted text-xs">
                  <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>{l.viewCount} {t("views")}</span>
                  <span className="flex items-center gap-1"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>{l._count?.comments || 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
