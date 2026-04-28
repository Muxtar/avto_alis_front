"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { API } from "@/lib/api";

export default function AdminLoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminName", data.admin.name);
        // Also set user token so admin has access to all user pages
        localStorage.setItem("userToken", data.token);
        // Fetch admin user data for user side
        try {
          const meRes = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${data.token}` } });
          const meData = await meRes.json();
          if (meData.user) localStorage.setItem("userData", JSON.stringify(meData.user));
        } catch {}
        router.push("/admin");
      } else {
        setError(t("adminLoginError"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-card-border rounded-2xl p-6 sm:p-8">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-center mb-1">{t("adminLogin")}</h1>
          <p className="text-muted text-center text-sm mb-6">{t("adminPanel")}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("adminUsername")}</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="admin"
                className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("adminPassword")}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••"
                className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm" />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50">
              {loading ? "..." : t("adminLoginBtn")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
