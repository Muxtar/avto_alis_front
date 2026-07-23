"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

function VerifyContent() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  // Yalnız həqiqi rəqəmli test kodunu qəbul et — "undefined"/boş dəyər yox.
  const rawCode = searchParams.get("code") || "";
  const initialCode = /^\d{4,8}$/.test(rawCode) ? rawCode : "";

  const [code, setCode] = useState("");
  const [testCode, setTestCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/verify/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        login(data.token, data.user);
        if (data.user?.profileComplete ?? data.profileComplete) {
          router.push("/elanlar");
        } else {
          router.push("/complete-profile");
        }
      } else {
        // Backend-in spesifik mesajını göstər (məs. bloklanmış hesab), yoxsa generic.
        setError(data.message || t("verifyError"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }, [code, userId, router, t]);

  const handleResend = async () => {
    try {
      // /verify/resend istifadəçi mövcudluğunu yoxlayır (ona görə /verify/send-dən təhlükəsizdir).
      const res = await fetch(`${API}/verify/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestCode(data.verificationCode || "");
        setCountdown(60);
        setCode("");
        setError("");
      } else {
        toast(data.message || t('error'), 'error');
      }
    } catch { toast(t('error'), 'error'); }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)] flex items-center justify-center px-3 sm:px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-card-border rounded-2xl p-6 sm:p-8">
          {/* Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">{t("verifyTitle")}</h1>
          <p className="text-muted text-center text-sm mb-4">{t("verifySubtitle")}</p>

          {/* Real göndərmə (Infobip WhatsApp konfiqurasiyalı) — test kodu yoxdur:
              istifadəçiyə kodun WhatsApp-a getdiyini bildir. */}
          {!testCode && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-6 text-center">
              <p className="text-green-500 text-xs font-medium">📱 Doğrulama kodu WhatsApp nömrənizə göndərildi. Kodu aşağıda daxil edin.</p>
            </div>
          )}

          {/* TEST MODE Banner - WhatsApp provider qoşulana kimi göstərilir */}
          {testCode && (
            <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl p-4 mb-6 text-center">
              <p className="text-amber-500 text-[11px] font-bold uppercase tracking-wider mb-1">⚠️ Test rejimi · Kod sizə SMS ilə getmir</p>
              <p className="text-amber-300 text-xs mb-2">Aşağıdakı kodu kopyalayın və test üçün daxil edin:</p>
              <div className="bg-black/30 rounded-lg py-3 px-4 border border-amber-500/30">
                <span className="text-amber-400 text-3xl font-mono font-bold tracking-[0.5em] select-all">{testCode}</span>
              </div>
            </div>
          )}

          {/* Code Input */}
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full px-4 py-4 bg-input-bg border border-input-border rounded-xl text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground transition-all text-foreground mb-4"
            autoFocus
          />

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={loading || code.length !== 6}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("verifying")}
              </span>
            ) : t("verifyButton")}
          </button>

          {/* Resend */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-muted text-sm">
                {t("resendIn")} <span className="text-foreground font-medium">{countdown} {t("seconds")}</span>
              </p>
            ) : (
              <button onClick={handleResend} className="text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors">
                {t("resendCode")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyContent />
    </Suspense>
  );
}
