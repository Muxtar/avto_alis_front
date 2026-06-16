"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

export default function CompleteProfilePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token, user, login, authLoading } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profession, setProfession] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push("/"); return; }
    if (user?.profileComplete) { router.push("/elanlar"); return; }
    if (user?.name) {
      const parts = user.name.trim().split(/\s+/);
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
  }, [token, user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) { toast(t("nameRequired") || "Ad və soyad tələb olunur", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/register/complete-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: `${firstName.trim()} ${lastName.trim()}`,
          profession: profession.trim() || undefined,
          idNumber: idNumber.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        login(token!, data.user);
        router.push("/elanlar");
      } else {
        toast(data.message || t("error"), "error");
      }
    } catch {
      toast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground transition-all text-foreground";

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)] flex items-center justify-center py-6 sm:py-12 px-3 sm:px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t("completeProfileTitle")}</h1>
          <p className="text-muted text-sm sm:text-base">{t("completeProfileSimpleSub") || "Davam etmək üçün məlumatlarınızı daxil edin"}</p>
        </div>

        <form onSubmit={handleSubmit} className="surface p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("firstName") || "Ad"}</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder={t("firstName") || "Ad"} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("lastName") || "Soyad"}</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder={t("lastName") || "Soyad"} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t("profession") || "Məslək"}</label>
            <input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder={t("professionPlaceholder") || "Məs: Mühəndis, Həkim, Satıcı, Tələbə"} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t("idNumber") || "Şəxsiyyət vəsiqəsi / FIN"}</label>
            <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder={t("idNumberPlaceholder") || "Məs: 5AB12345"} className={inputClass} />
            <p className="text-[11px] text-muted mt-1">{t("idNumberHint") || "Kimliyiniz təhlükəsiz saxlanılır."}</p>
          </div>

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50">
            {loading ? t("submitting") : (t("save") || "Yadda saxla")}
          </button>
        </form>
      </div>
    </div>
  );
}
