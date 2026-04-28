"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import CourierLoginForm from "@/components/CourierLoginForm";
import { API } from "@/lib/api";

type Mode = "phone" | "courier";

export default function Home() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/register/phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const q = new URLSearchParams({ userId: String(data.userId) });
        if (data.verificationCode) q.set("code", data.verificationCode);
        router.push(`/verify?${q.toString()}`);
      } else {
        toast(data.message || t("error"), "error");
      }
    } catch {
      toast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)] flex items-start justify-center py-4 sm:py-8 px-3 sm:px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-5 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{t("registerTitle")}</h1>
          <p className="text-muted text-sm sm:text-base">{t("loginWithPhoneSubtitle")}</p>
        </div>

        {/* Mode switch */}
        <div className="grid grid-cols-2 gap-2 mb-5 sm:mb-6">
          <button
            type="button"
            onClick={() => setMode("phone")}
            className={`p-3 rounded-xl border text-sm font-medium transition-all ${
              mode === "phone"
                ? "bg-gradient-to-r from-orange-500 to-red-600 border-transparent text-white shadow"
                : "bg-card border-card-border text-foreground hover:border-orange-500/30"
            }`}
          >
            {t("userLoginTab")}
          </button>
          <button
            type="button"
            onClick={() => setMode("courier")}
            className={`p-3 rounded-xl border text-sm font-medium transition-all ${
              mode === "courier"
                ? "bg-gradient-to-r from-orange-500 to-red-600 border-transparent text-white shadow"
                : "bg-card border-card-border text-foreground hover:border-orange-500/30"
            }`}
          >
            {t("courierTab")}
          </button>
        </div>

        <div className="bg-card border border-card-border rounded-xl sm:rounded-2xl p-4 sm:p-8 transition-colors duration-300">
          {mode === "phone" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t("phone")}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("phonePlaceholder")}
                  className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground transition-all"
                  autoFocus
                  required
                />
                <p className="text-xs text-muted mt-2">{t("loginWithPhoneHint")}</p>
              </div>

              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
              >
                {loading ? t("submitting") : t("sendCodeButton")}
              </button>

              <p className="text-center text-xs text-muted pt-2">
                {t("browseWithoutLogin")}{" "}
                <Link href="/marketplace" className="text-orange-500 hover:text-orange-400">
                  {t("marketplace")}
                </Link>
              </p>
            </form>
          ) : (
            <CourierLoginForm />
          )}
        </div>
      </div>
    </div>
  );
}
