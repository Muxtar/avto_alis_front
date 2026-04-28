"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

interface WorkplaceData {
  name: string;
  address: string;
}

export default function MechanicForm() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [workplaces, setWorkplaces] = useState<WorkplaceData[]>([{ name: "", address: "" }]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const addWorkplace = () => setWorkplaces([...workplaces, { name: "", address: "" }]);
  const removeWorkplace = (index: number) => { if (workplaces.length > 1) setWorkplaces(workplaces.filter((_, i) => i !== index)); };
  const updateWorkplace = (index: number, field: keyof WorkplaceData, value: string) => { const updated = [...workplaces]; updated[index][field] = value; setWorkplaces(updated); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API}/register/mechanic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, workplaces }),
      });
      if (res.ok) { const data = await res.json(); router.push(`/verify?userId=${data.user.id}&code=${data.verificationCode}`); return; }
    } catch { toast(t("error"), 'error'); } finally { setLoading(false); }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 className="text-2xl font-bold text-green-400 mb-2">{t("successTitle")}</h3>
        <p className="text-muted">{t("successMessageMechanic")}</p>
        <button onClick={() => setSuccess(false)} className="mt-6 px-6 py-2 bg-input-bg border border-input-border rounded-lg hover:opacity-80 transition-colors">{t("newRegister")}</button>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 placeholder-muted-foreground transition-all text-foreground";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">{t("fullName")}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t("fullNamePlaceholder")} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">{t("phone")}</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder={t("phonePlaceholder")} className={inputClass} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t("workplaces")}</h3>
          <button type="button" onClick={addWorkplace} className="flex items-center gap-1 text-sm text-green-500 hover:text-green-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t("addWorkplace")}
          </button>
        </div>

        {workplaces.map((workplace, index) => (
          <div key={index} className="p-5 bg-input-bg/50 border border-input-border/50 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">{t("workplaceNum")} #{index + 1}</span>
              {workplaces.length > 1 && <button type="button" onClick={() => removeWorkplace(index)} className="text-red-500 hover:text-red-400 text-sm">{t("delete")}</button>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" value={workplace.name} onChange={(e) => updateWorkplace(index, "name", e.target.value)} required placeholder={t("workplaceNamePlaceholder")} className={inputClass} />
              <input type="text" value={workplace.address} onChange={(e) => updateWorkplace(index, "address", e.target.value)} required placeholder={t("addressPlaceholder")} className={inputClass} />
            </div>
          </div>
        ))}
      </div>

      <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-semibold text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            {t("submitting")}
          </span>
        ) : t("submitButton")}
      </button>
    </form>
  );
}
