"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { API } from "@/lib/api";

export default function AdminLoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<"phone" | "password">("phone");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // Nömrə (OTP) axını
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [userId, setUserId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Uğurlu girişdən sonra token-ləri saxla + admin istifadəçi məlumatını yüklə.
  const finishLogin = async (token: string, name: string) => {
    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminName", name);
    localStorage.setItem("userToken", token); // admin bütün user səhifələrinə də çıxış
    try {
      const meRes = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } });
      const meData = await meRes.json();
      if (meData.user) localStorage.setItem("userData", JSON.stringify(meData.user));
    } catch {}
    router.push("/admin");
  };

  // İsim + şifrə (yedək)
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) await finishLogin(data.token, data.admin.name);
      else setError(t("adminLoginError"));
    } catch { setError(t("error")); } finally { setLoading(false); }
  };

  // Nömrə → OTP göndər
  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setDevCode(null);
    try {
      const res = await fetch(`${API}/admin/login/phone`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUserId(data.userId);
        if (data.code) setDevCode(data.code); // test rejimi
        setStep("code");
      } else setError(data.message || t("error"));
    } catch { setError(t("error")); } finally { setLoading(false); }
  };

  // Kodu təsdiqlə → admin token
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/admin/login/phone/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: code.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) await finishLogin(data.token, data.admin.name);
      else setError(data.message || t("error"));
    } catch { setError(t("error")); } finally { setLoading(false); }
  };

  const inputCls = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm";

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-card-border rounded-2xl p-6 sm:p-8">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-center mb-1">{t("adminLogin")}</h1>
          <p className="text-muted text-center text-sm mb-6">{t("adminPanel")}</p>

          {/* Rejim seçici */}
          <div className="flex gap-1 bg-input-bg border border-input-border rounded-xl p-1 mb-5">
            <button type="button" onClick={() => { setMode("phone"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "phone" ? "bg-orange-500 text-white" : "text-muted"}`}>
              📱 Nömrə
            </button>
            <button type="button" onClick={() => { setMode("password"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "password" ? "bg-orange-500 text-white" : "text-muted"}`}>
              🔑 Şifrə
            </button>
          </div>

          {mode === "phone" ? (
            step === "phone" ? (
              <form onSubmit={sendCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Telefon nömrəsi</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+994..." autoComplete="tel" className={inputCls} />
                  <p className="text-[11px] text-muted mt-1">Yalnız icazə verilmiş admin nömrələri (Railway ADMIN_PHONES).</p>
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50">
                  {loading ? "..." : "Kod göndər"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyCode} className="space-y-4">
                {devCode && (
                  <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-3 text-center">
                    <p className="text-amber-500 text-[11px] font-bold uppercase mb-1">Test rejimi · kod</p>
                    <span className="text-amber-400 text-2xl font-mono font-bold tracking-widest select-all">{devCode}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1.5">SMS kodu</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required placeholder="000000" autoFocus
                    className={`${inputCls} text-center text-xl tracking-[0.4em] font-mono`} />
                  <p className="text-[11px] text-muted mt-1">{phone} nömrəsinə göndərildi.</p>
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button type="submit" disabled={loading || code.length < 4} className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50">
                  {loading ? "..." : "Daxil ol"}
                </button>
                <button type="button" onClick={() => { setStep("phone"); setCode(""); setError(""); }} className="w-full text-xs text-muted hover:text-foreground">← Nömrəni dəyiş</button>
              </form>
            )
          ) : (
            <form onSubmit={submitPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("adminUsername")}</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="admin" autoComplete="username" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("adminPassword")}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••" autoComplete="current-password" className={inputCls} />
              </div>
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50">
                {loading ? "..." : t("adminLoginBtn")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
