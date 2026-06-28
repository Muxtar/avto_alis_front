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
      router.replace("/elanlar");
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
    const local = phone.replace(/\D/g, "");
    if (local.length !== 9) {
      toast("Nömrə +994-dən sonra dəqiq 9 rəqəm olmalıdır (məs. 50 123 45 67)", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/register/phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+994${local}` }),
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
          <div className="inline-flex px-5 h-14 sm:h-16 brand-gradient rounded-2xl items-center justify-center font-bold text-white text-lg sm:text-2xl shadow-xl shadow-orange-500/25 mb-4 tracking-tight">
            tradixai
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1.5">{t("registerTitle")}</h1>
          <p className="text-muted text-sm sm:text-base">{t("loginWithPhoneSubtitle")}</p>
        </div>

        <div className="surface p-5 sm:p-8 transition-colors duration-300">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">{t("phone")}</label>
              <div className="flex items-stretch w-full input-base p-0 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500/40">
                <span className="flex items-center px-3.5 bg-input-bg/70 border-r border-input-border text-sm font-semibold text-foreground select-none">
                  🇦🇿 +994
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  placeholder="50 123 45 67"
                  className="flex-1 min-w-0 px-4 py-3 bg-transparent outline-none placeholder-muted-foreground tracking-wide"
                  autoFocus
                  required
                />
              </div>
              <p className={`text-xs mt-2 ${phone.length > 0 && phone.length !== 9 ? "text-red-500" : "text-muted"}`}>
                {phone.length > 0 && phone.length !== 9
                  ? `+994-dən sonra 9 rəqəm yazın (hazırda ${phone.length})`
                  : "Yalnız nömrəni yazın — +994 avtomatik əlavə olunur."}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 9}
              className="w-full py-3.5 btn-primary text-base"
            >
              {loading ? t("submitting") : t("sendCodeButton")}
            </button>

            <p className="text-center text-xs text-muted pt-1">
              {t("browseWithoutLogin")}{" "}
              <Link href="/elanlar" className="text-orange-500 hover:text-orange-400 font-semibold">
                {t("marketplace")}
              </Link>
              {" · "}
              <Link href="/locations" className="text-orange-500 hover:text-orange-400 font-semibold">
                {t("browseByLocationLong")}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
