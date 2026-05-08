"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

export default function Home() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const { isLoggedIn, authLoading } = useAuth();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      router.replace("/marketplace");
    }
  }, [authLoading, isLoggedIn, router]);

  if (authLoading || isLoggedIn) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)] flex items-center justify-center py-6 sm:py-12 px-3 sm:px-4 relative">
      {/* Subtle decorative gradient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex w-14 h-14 sm:w-16 sm:h-16 brand-gradient rounded-2xl items-center justify-center font-bold text-white text-lg sm:text-xl shadow-xl shadow-orange-500/25 mb-4">
            AB
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1.5">{t("registerTitle")}</h1>
          <p className="text-muted text-sm sm:text-base">{t("loginWithPhoneSubtitle")}</p>
        </div>

        <div className="surface p-5 sm:p-8 transition-colors duration-300">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">{t("phone")}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                className="w-full px-4 py-3 input-base placeholder-muted-foreground"
                autoFocus
                required
              />
              <p className="text-xs text-muted mt-2">{t("loginWithPhoneHint")}</p>
            </div>

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full py-3.5 btn-primary text-base"
            >
              {loading ? t("submitting") : t("sendCodeButton")}
            </button>

            <p className="text-center text-xs text-muted pt-1">
              {t("browseWithoutLogin")}{" "}
              <Link href="/marketplace" className="text-orange-500 hover:text-orange-400 font-semibold">
                {t("marketplace")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
