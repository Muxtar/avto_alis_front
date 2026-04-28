"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { API } from "@/lib/api";

export default function CourierLoginPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/courier/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || t("error"));
        return;
      }
      login(data.token, data.courier);
      localStorage.setItem("courierToken", data.token);
      localStorage.setItem("courierData", JSON.stringify(data.courier));
      router.push("/courier");
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm";

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
          </div>
          <h1 className="text-2xl font-bold">{t("courierLogin")}</h1>
          <p className="text-muted text-sm mt-1">{t("courierLoginSubtitle")}</p>
        </div>

        <form onSubmit={handleLogin} className="bg-card border border-card-border rounded-2xl p-6 space-y-4">
          {error && (
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t("phone")}</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phonePlaceholder")} className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">{t("courierPassword")}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" className={inputCls} required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white font-semibold text-sm disabled:opacity-50">
            {loading ? "..." : t("courierLoginBtn")}
          </button>
        </form>
      </div>
    </div>
  );
}
