"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { API } from "@/lib/api";

export default function CourierLoginForm() {
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
      // Login to main auth system so navbar/pages recognize the user
      login(data.token, data.courier);
      // Also keep courier-specific token for courier dashboard
      localStorage.setItem("courierToken", data.token);
      localStorage.setItem("courierData", JSON.stringify(data.courier));
      router.push("/courier");
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm transition-all";

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-muted text-sm">{t("courierLoginInfo")}</p>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-muted mb-1.5">{t("phone")}</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("phonePlaceholder")}
          className={inputCls}
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted mb-1.5">{t("courierPassword")}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="******"
          className={inputCls}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white font-semibold text-sm disabled:opacity-50 hover:from-orange-600 hover:to-red-700 transition-all"
      >
        {loading ? "..." : t("courierLoginBtn")}
      </button>
    </form>
  );
}
