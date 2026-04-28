"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { brandNames, getModels, years } from "@/lib/vehicleData";

type UserType = "CAR_OWNER" | "MECHANIC" | "PARTS_SELLER";

interface Vehicle { brand: string; model: string; year: string; passportImage: File | null; previewUrl: string; }
interface Workplace { name: string; address: string; }

export default function CompleteProfilePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token, user, login, authLoading } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<UserType>("CAR_OWNER");
  const [name, setName] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([{ brand: "", model: "", year: "", passportImage: null, previewUrl: "" }]);
  const [workplaces, setWorkplaces] = useState<Workplace[]>([{ name: "", address: "" }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push("/"); return; }
    if (user?.profileComplete) { router.push("/marketplace"); return; }
    if (user?.name) setName(user.name);
  }, [token, user, authLoading, router]);

  const addVehicle = () => setVehicles([...vehicles, { brand: "", model: "", year: "", passportImage: null, previewUrl: "" }]);
  const removeVehicle = (i: number) => vehicles.length > 1 && setVehicles(vehicles.filter((_, idx) => idx !== i));
  const updateVehicle = (i: number, field: keyof Vehicle, value: any) => {
    const copy = [...vehicles];
    if (field === "passportImage" && value instanceof File) {
      copy[i].passportImage = value;
      copy[i].previewUrl = URL.createObjectURL(value);
    } else {
      (copy[i] as any)[field] = value;
      if (field === "brand") copy[i].model = "";
    }
    setVehicles(copy);
  };

  const addWorkplace = () => setWorkplaces([...workplaces, { name: "", address: "" }]);
  const removeWorkplace = (i: number) => workplaces.length > 1 && setWorkplaces(workplaces.filter((_, idx) => idx !== i));
  const updateWorkplace = (i: number, field: keyof Workplace, value: string) => {
    const copy = [...workplaces];
    copy[i][field] = value;
    setWorkplaces(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast("Ad tələb olunur", "error"); return; }
    setLoading(true);

    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("type", type);

    if (type === "CAR_OWNER") {
      fd.append("vehicles", JSON.stringify(vehicles.map(v => ({ brand: v.brand, model: v.model, year: v.year }))));
      vehicles.forEach(v => { if (v.passportImage) fd.append("passportImages", v.passportImage); });
    } else {
      fd.append("workplaces", JSON.stringify(workplaces.map(w => ({ name: w.name, address: w.address }))));
    }

    try {
      const res = await fetch(`${API}/register/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        login(token!, data.user);
        router.push("/marketplace");
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

  const tabs: { id: UserType; label: string; desc: string; gradient: string }[] = [
    { id: "CAR_OWNER", label: t("tabCarOwner"), desc: t("tabCarOwnerDesc"), gradient: "from-blue-500 to-blue-600" },
    { id: "MECHANIC", label: t("tabMechanic"), desc: t("tabMechanicDesc"), gradient: "from-green-500 to-emerald-600" },
    { id: "PARTS_SELLER", label: t("tabPartsSeller"), desc: t("tabPartsSellerDesc"), gradient: "from-purple-500 to-violet-600" },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)] flex items-start justify-center py-4 sm:py-8 px-3 sm:px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-5 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">{t("completeProfileTitle")}</h1>
          <p className="text-muted text-sm sm:text-base">{t("completeProfileSubtitle")}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
          {tabs.map((tab) => {
            const active = type === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setType(tab.id)}
                className={`p-3 sm:p-4 rounded-xl border text-center transition-all ${
                  active
                    ? `bg-gradient-to-br ${tab.gradient} border-transparent text-white shadow-lg`
                    : "bg-card border-card-border hover:border-orange-500/30"
                }`}
              >
                <div className="text-sm font-semibold">{tab.label}</div>
                <div className={`text-xs mt-1 ${active ? "text-white/80" : "text-muted"}`}>{tab.desc}</div>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">{t("fullName")}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder={t("fullNamePlaceholder")} className={inputClass} />
          </div>

          {type === "CAR_OWNER" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{t("vehicles")}</h3>
                <button type="button" onClick={addVehicle} className="text-sm text-orange-500 hover:text-orange-400">+ {t("addVehicle")}</button>
              </div>
              {vehicles.map((v, i) => (
                <div key={i} className="p-4 bg-input-bg/50 border border-input-border/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">{t("vehicleNum")} #{i + 1}</span>
                    {vehicles.length > 1 && <button type="button" onClick={() => removeVehicle(i)} className="text-red-500 text-xs">{t("delete")}</button>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <select value={v.brand} onChange={(e) => updateVehicle(i, "brand", e.target.value)} required className={inputClass}>
                      <option value="">{t("brandPlaceholder")}</option>
                      {brandNames.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select value={v.model} onChange={(e) => updateVehicle(i, "model", e.target.value)} required disabled={!v.brand} className={inputClass}>
                      <option value="">{t("modelPlaceholder")}</option>
                      {getModels(v.brand).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={v.year} onChange={(e) => updateVehicle(i, "year", e.target.value)} required className={inputClass}>
                      <option value="">{t("yearPlaceholder")}</option>
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-2">{t("passportPhoto")}</label>
                    {v.previewUrl ? (
                      <div className="relative">
                        <img src={v.previewUrl} className="w-full h-40 object-cover rounded-xl border border-input-border" />
                        <button type="button" onClick={() => updateVehicle(i, "passportImage", null as any)} className="absolute top-2 right-2 p-1 bg-red-500/80 rounded-lg text-white">×</button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center h-28 border-2 border-dashed border-input-border rounded-xl cursor-pointer hover:border-orange-500/30 text-xs text-muted">
                        {t("uploadPhoto")}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) updateVehicle(i, "passportImage", f); }} />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{t("workplaces")}</h3>
                <button type="button" onClick={addWorkplace} className="text-sm text-orange-500 hover:text-orange-400">+ {t("addWorkplace")}</button>
              </div>
              {workplaces.map((w, i) => (
                <div key={i} className="p-4 bg-input-bg/50 border border-input-border/50 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">{t("workplaceNum")} #{i + 1}</span>
                    {workplaces.length > 1 && <button type="button" onClick={() => removeWorkplace(i)} className="text-red-500 text-xs">{t("delete")}</button>}
                  </div>
                  <input type="text" value={w.name} onChange={(e) => updateWorkplace(i, "name", e.target.value)} required placeholder={type === "PARTS_SELLER" ? t("workplaceNamePlaceholderSeller") : t("workplaceNamePlaceholder")} className={inputClass} />
                  <input type="text" value={w.address} onChange={(e) => updateWorkplace(i, "address", e.target.value)} required placeholder={t("addressPlaceholder")} className={inputClass} />
                </div>
              ))}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50">
            {loading ? t("submitting") : t("submitButton")}
          </button>
        </form>
      </div>
    </div>
  );
}
