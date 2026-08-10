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

  const features = [
    { icon: "🛡️", label: "Təhlükəsiz ödəniş" },
    { icon: "🛵", label: "Sürətli çatdırılma" },
    { icon: "✅", label: "Doğrulanmış satıcılar" },
    { icon: "💬", label: "Birbaşa əlaqə" },
  ];

  return (
    <div className="relative min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Modern gradient mesh background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-28 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-[var(--brand-from)]/30 to-indigo-500/10 blur-3xl animate-float-slow" />
        <div className="absolute top-1/4 -right-28 w-[24rem] h-[24rem] rounded-full bg-gradient-to-br from-violet-500/20 to-sky-400/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-[26rem] h-[26rem] rounded-full bg-gradient-to-tr from-cyan-400/15 to-[var(--brand-to)]/15 blur-3xl" />
        {/* fine grid overlay */}
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(var(--card-border)_1px,transparent_1px),linear-gradient(90deg,var(--card-border)_1px,transparent_1px)] [background-size:44px_44px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-14 grid lg:grid-cols-[1.05fr_.95fr] gap-8 lg:gap-14 items-center">
        {/* Sol: hero mesaj */}
        <div className="min-w-0 text-center lg:text-left animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--brand-soft)] border border-card-border text-[13px] font-semibold text-foreground/80 mb-5 backdrop-blur">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-70 animate-ping" /><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" /></span>
            Azərbaycanın onlayn ticarət platforması
          </div>

          <h1 className="text-[2.1rem] leading-[1.08] sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-[var(--brand-from)] via-indigo-500 to-[var(--brand-to)] bg-clip-text text-transparent">Al, sat, kəşf et</span>
            <br />hər şey bir yerdə
          </h1>
          <p className="text-muted text-base sm:text-lg mt-4 max-w-md mx-auto lg:mx-0 leading-relaxed">
            Məhsullar, xidmətlər və ixtisas sahibləri — təhlükəsiz ödəniş, sürətli çatdırılma və birbaşa əlaqə ilə.
          </p>

          <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-6">
            {features.map((f) => (
              <span key={f.label} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card/70 border border-card-border text-[13px] font-medium backdrop-blur-sm shadow-sm">
                <span>{f.icon}</span> {f.label}
              </span>
            ))}
          </div>

          {/* Qeydiyyatsız bax — desktopda hero altında */}
          <div className="hidden lg:flex items-center gap-4 mt-8 text-sm">
            <Link href="/elanlar" className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand-to)] hover:opacity-80 transition-opacity">
              🛍️ {t("marketplace")} →
            </Link>
            <Link href="/locations" className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand-to)] hover:opacity-80 transition-opacity">
              📍 {t("browseByLocationLong")}
            </Link>
          </div>
        </div>

        {/* Sağ: giriş kartı */}
        <div className="min-w-0 w-full max-w-md mx-auto lg:mx-0 lg:justify-self-end animate-fade-in">
          <div className="relative rounded-3xl border border-card-border bg-card/80 backdrop-blur-xl shadow-2xl shadow-[var(--brand-to)]/10 p-5 sm:p-8 overflow-hidden">
            {/* üst kənar parıltı */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-from)]/60 to-transparent" />

            <div className="text-center mb-6">
              <div className="inline-flex px-5 h-14 sm:h-16 brand-gradient rounded-2xl items-center justify-center font-bold text-white text-lg sm:text-2xl shadow-lg shadow-[var(--brand-to)]/30 mb-4 tracking-tight">
                tradixai
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">{t("registerTitle")}</h2>
              <p className="text-muted text-sm">{t("loginWithPhoneSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2">{t("phone")}</label>
                <div className="flex items-stretch w-full input-base p-0 overflow-hidden focus-within:ring-2 focus-within:ring-[var(--brand-from)]/50 transition-shadow">
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
                <Link href="/elanlar" className="text-[var(--brand-to)] hover:opacity-80 font-semibold">
                  {t("marketplace")}
                </Link>
                {" · "}
                <Link href="/locations" className="text-[var(--brand-to)] hover:opacity-80 font-semibold">
                  {t("browseByLocationLong")}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
