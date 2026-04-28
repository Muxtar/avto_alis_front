"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { brandNames, getModels, years } from "@/lib/vehicleData";

interface Vehicle {
  brand: string;
  model: string;
  year: string;
  passportImage: File | null;
  previewUrl: string;
}

export default function CarOwnerForm() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { brand: "", model: "", year: "", passportImage: null, previewUrl: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const addVehicle = () => {
    setVehicles([...vehicles, { brand: "", model: "", year: "", passportImage: null, previewUrl: "" }]);
  };

  const removeVehicle = (index: number) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter((_, i) => i !== index));
    }
  };

  const updateVehicle = (index: number, field: keyof Vehicle, value: any) => {
    const updated = [...vehicles];
    if (field === "passportImage" && value instanceof File) {
      updated[index].passportImage = value;
      updated[index].previewUrl = URL.createObjectURL(value);
    } else {
      (updated[index] as any)[field] = value;
      // Marka degisince modeli sifirla
      if (field === "brand") {
        updated[index].model = "";
      }
    }
    setVehicles(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("phone", phone);
    formData.append(
      "vehicles",
      JSON.stringify(vehicles.map((v) => ({ brand: v.brand, model: v.model, year: v.year })))
    );
    vehicles.forEach((v) => {
      if (v.passportImage) formData.append("passportImages", v.passportImage);
    });

    try {
      const res = await fetch(`${API}/register/car-owner`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/verify?userId=${data.user.id}&code=${data.verificationCode}`);
        return;
      }
    } catch {
      toast(t("error"), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-green-400 mb-2">{t("successTitle")}</h3>
        <p className="text-muted">{t("successMessageOwner")}</p>
        <button onClick={() => setSuccess(false)} className="mt-6 px-6 py-2 bg-input-bg border border-input-border rounded-lg hover:opacity-80 transition-colors">
          {t("newRegister")}
        </button>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 placeholder-muted-foreground transition-all text-foreground";

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
          <h3 className="text-lg font-semibold">{t("vehicles")}</h3>
          <button type="button" onClick={addVehicle} className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-400 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("addVehicle")}
          </button>
        </div>

        {vehicles.map((vehicle, index) => (
          <div key={index} className="p-5 bg-input-bg/50 border border-input-border/50 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted">{t("vehicleNum")} #{index + 1}</span>
              {vehicles.length > 1 && (
                <button type="button" onClick={() => removeVehicle(index)} className="text-red-500 hover:text-red-400 text-sm">{t("delete")}</button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <select value={vehicle.brand} onChange={(e) => updateVehicle(index, "brand", e.target.value)} required className={inputClass}>
                <option value="">{t("brandPlaceholder")}</option>
                {brandNames.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={vehicle.model} onChange={(e) => updateVehicle(index, "model", e.target.value)} required className={inputClass} disabled={!vehicle.brand}>
                <option value="">{t("modelPlaceholder")}</option>
                {getModels(vehicle.brand).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={vehicle.year} onChange={(e) => updateVehicle(index, "year", e.target.value)} required className={inputClass}>
                <option value="">{t("yearPlaceholder")}</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted mb-2">{t("passportPhoto")}</label>
              {vehicle.previewUrl ? (
                <div className="relative group">
                  <img src={vehicle.previewUrl} alt="Texpassport" className="w-full h-48 object-cover rounded-xl border border-input-border" />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...vehicles];
                      updated[index].passportImage = null;
                      updated[index].previewUrl = "";
                      setVehicles(updated);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-input-border rounded-xl cursor-pointer hover:border-orange-500/30 transition-colors bg-input-bg/30">
                  <svg className="w-8 h-8 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-sm text-muted-foreground">{t("uploadPhoto")}</span>
                  <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) updateVehicle(index, "passportImage", file); }} className="hidden" />
                </label>
              )}
            </div>
          </div>
        ))}
      </div>

      <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 disabled:opacity-50 disabled:cursor-not-allowed">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t("submitting")}
          </span>
        ) : t("submitButton")}
      </button>
    </form>
  );
}
