"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { brandNames, getModels, years } from "@/lib/vehicleData";
import { rotateImageFile } from "@/lib/rotateImage";

type UserType = "CAR_OWNER" | "MECHANIC" | "PARTS_SELLER";

// Texniki pasport sahələri — HƏR sətir üçün ayrıca string state
// (kullanıcı AI nəticəsini redaktə edə bilsin).
type PassportFields = {
  registrationNumber: string;
  registrationDate: string;
  ownerName: string;
  ownerAddress: string;
  ownershipType: string;
  validUntil: string;
  cardSerial: string;
  vehicleType: string;
  engineNumber: string;
  bodyNumber: string;
  chassisNumber: string;
  color: string;
  maxMass: string;
  unloadedMass: string;
  seatCount: string;
  engineCapacity: string;
  issuedBy: string;
  specialMarks: string;
};

const emptyPassport: PassportFields = {
  registrationNumber: "", registrationDate: "", ownerName: "", ownerAddress: "",
  ownershipType: "", validUntil: "", cardSerial: "", vehicleType: "",
  engineNumber: "", bodyNumber: "", chassisNumber: "", color: "",
  maxMass: "", unloadedMass: "", seatCount: "", engineCapacity: "",
  issuedBy: "", specialMarks: "",
};

interface Vehicle extends PassportFields {
  brand: string;
  model: string;
  year: string;
  // Lokal preview (kullanıcı seçdikdən sonra)
  pendingFront: { file: File; preview: string } | null;
  pendingBack: { file: File; preview: string } | null;
  // Backend-də saxlanılmış fayl adları (extract-dən gəlir)
  passportImageFront: string | null;
  passportImageBack: string | null;
  // AI status
  aiRaw: any;
  aiVerified: boolean;
  extractLoading: boolean;
  extractError: string | null;
}

const newVehicle = (): Vehicle => ({
  brand: "", model: "", year: "",
  pendingFront: null, pendingBack: null,
  passportImageFront: null, passportImageBack: null,
  aiRaw: null, aiVerified: false,
  extractLoading: false, extractError: null,
  ...emptyPassport,
});

interface Workplace { name: string; address: string; }

export default function CompleteProfilePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token, user, login, authLoading } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<UserType>("CAR_OWNER");
  const [name, setName] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([newVehicle()]);
  const [workplaces, setWorkplaces] = useState<Workplace[]>([{ name: "", address: "" }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push("/"); return; }
    if (user?.profileComplete) { router.push("/marketplace"); return; }
    if (user?.name) setName(user.name);
  }, [token, user, authLoading, router]);

  const addVehicle = () => setVehicles([...vehicles, newVehicle()]);
  const removeVehicle = (i: number) => vehicles.length > 1 && setVehicles(vehicles.filter((_, idx) => idx !== i));
  const updateVehicleField = (i: number, patch: Partial<Vehicle>) => {
    setVehicles((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], ...patch };
      return copy;
    });
  };

  // İki şəkil mövcud olduqda backend-ə extract çağrısı.
  const runExtract = async (i: number, frontFile: File, backFile: File) => {
    updateVehicleField(i, { extractLoading: true, extractError: null });
    const fd = new FormData();
    fd.append("passportImageFront", frontFile);
    fd.append("passportImageBack", backFile);
    try {
      const res = await fetch(`${API}/me/vehicles/extract`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!data.success) {
        updateVehicleField(i, { extractLoading: false, extractError: data.message || "Şəkillər oxunmadı" });
        return;
      }
      const f = data.fields || {};
      setVehicles((prev) => {
        const copy = [...prev];
        const cur = copy[i];
        copy[i] = {
          ...cur,
          passportImageFront: data.passportImageFront || cur.passportImageFront,
          passportImageBack: data.passportImageBack || cur.passportImageBack,
          brand: cur.brand || f.brand || "",
          model: cur.model || f.model || "",
          year: cur.year || (f.year ? String(f.year) : ""),
          registrationNumber: f.registrationNumber || "",
          registrationDate: f.registrationDate || "",
          ownerName: f.ownerName || "",
          ownerAddress: f.ownerAddress || "",
          ownershipType: f.ownershipType || "",
          validUntil: f.validUntil || "",
          cardSerial: f.cardSerial || "",
          vehicleType: f.vehicleType || "",
          engineNumber: f.engineNumber || "",
          bodyNumber: f.bodyNumber || "",
          chassisNumber: f.chassisNumber || "",
          color: f.color || "",
          maxMass: f.maxMass || "",
          unloadedMass: f.unloadedMass || "",
          seatCount: f.seatCount ? String(f.seatCount) : "",
          engineCapacity: f.engineCapacity || "",
          issuedBy: f.issuedBy || "",
          specialMarks: f.specialMarks || "",
          aiRaw: data.aiRaw,
          aiVerified: !!data.ok,
          extractLoading: false,
          extractError: data.ok ? null : (data.error ? `AI xəbərdarlığı: ${data.error}` : null),
        };
        return copy;
      });
    } catch (err: any) {
      updateVehicleField(i, { extractLoading: false, extractError: err?.message || "Şəkil yüklənmədi" });
    }
  };

  const onPickFile = (i: number, side: "front" | "back", file: File | null) => {
    setVehicles((prev) => {
      const copy = [...prev];
      const cur = copy[i];
      if (!file) {
        copy[i] = side === "front"
          ? { ...cur, pendingFront: null, passportImageFront: null }
          : { ...cur, pendingBack: null, passportImageBack: null };
        return copy;
      }
      const preview = URL.createObjectURL(file);
      copy[i] = side === "front"
        ? { ...cur, pendingFront: { file, preview } }
        : { ...cur, pendingBack: { file, preview } };
      return copy;
    });
    // Hər iki şəkil indi mövcud olduqda extract işə düşür.
    setTimeout(() => {
      setVehicles((prev) => {
        const cur = prev[i];
        const front = side === "front" ? file : cur.pendingFront?.file || null;
        const back = side === "back" ? file : cur.pendingBack?.file || null;
        if (front && back) runExtract(i, front, back);
        return prev;
      });
    }, 0);
  };

  // Multi-vehicle üçün rotation: hər avtomobilin öz pendingFront/Back-i var.
  const rotateVehicleImage = async (i: number, side: "front" | "back", direction: "left" | "right") => {
    const cur = vehicles[i];
    const slot = side === "front" ? cur.pendingFront : cur.pendingBack;
    if (!slot) return;
    try {
      const rotated = await rotateImageFile(slot.file, direction === "right" ? 90 : -90);
      const preview = URL.createObjectURL(rotated);
      setVehicles((prev) => {
        const copy = [...prev];
        copy[i] = side === "front"
          ? { ...copy[i], pendingFront: { file: rotated, preview }, extractError: null }
          : { ...copy[i], pendingBack: { file: rotated, preview }, extractError: null };
        return copy;
      });
      const front = side === "front" ? rotated : cur.pendingFront?.file || null;
      const back = side === "back" ? rotated : cur.pendingBack?.file || null;
      if (front && back) runExtract(i, front, back);
    } catch (err: any) {
      updateVehicleField(i, { extractError: err?.message || "Şəkil fırlatıla bilmədi" });
    }
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

    if (type === "CAR_OWNER") {
      for (let i = 0; i < vehicles.length; i++) {
        const v = vehicles[i];
        if (!v.passportImageFront || !v.passportImageBack) {
          toast(`Avtomobil #${i + 1}: pasportun ön və arxa şəkillərini yükləyin`, "error");
          return;
        }
        if (!v.brand || !v.model || !v.year) {
          toast(`Avtomobil #${i + 1}: marka, model və il sahələri tələb olunur`, "error");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const body: any = { name: name.trim(), type };
      if (type === "CAR_OWNER") {
        body.vehicles = vehicles.map((v) => ({
          brand: v.brand, model: v.model, year: v.year,
          passportImageFront: v.passportImageFront,
          passportImageBack: v.passportImageBack,
          registrationNumber: v.registrationNumber,
          registrationDate: v.registrationDate,
          ownerName: v.ownerName,
          ownerAddress: v.ownerAddress,
          ownershipType: v.ownershipType,
          validUntil: v.validUntil,
          cardSerial: v.cardSerial,
          vehicleType: v.vehicleType,
          engineNumber: v.engineNumber,
          bodyNumber: v.bodyNumber,
          chassisNumber: v.chassisNumber,
          color: v.color,
          maxMass: v.maxMass,
          unloadedMass: v.unloadedMass,
          seatCount: v.seatCount,
          engineCapacity: v.engineCapacity,
          issuedBy: v.issuedBy,
          specialMarks: v.specialMarks,
          aiRaw: v.aiRaw,
          aiVerified: v.aiVerified,
        }));
      } else {
        body.workplaces = workplaces;
      }

      const res = await fetch(`${API}/register/complete-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
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
  const fieldCls = "w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm";

  const tabs: { id: UserType; label: string; desc: string; gradient: string }[] = [
    { id: "CAR_OWNER", label: t("tabCarOwner"), desc: t("tabCarOwnerDesc"), gradient: "from-blue-500 to-blue-600" },
    { id: "MECHANIC", label: t("tabMechanic"), desc: t("tabMechanicDesc"), gradient: "from-green-500 to-emerald-600" },
    { id: "PARTS_SELLER", label: t("tabPartsSeller"), desc: t("tabPartsSellerDesc"), gradient: "from-purple-500 to-violet-600" },
  ];

  return (
    <div className="min-h-[calc(100vh-56px)] sm:min-h-[calc(100vh-64px)] flex items-start justify-center py-4 sm:py-8 px-3 sm:px-4">
      <div className="w-full max-w-3xl">
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
                <div key={i} className="p-4 bg-input-bg/50 border border-input-border/50 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted">{t("vehicleNum")} #{i + 1}</span>
                    {vehicles.length > 1 && <button type="button" onClick={() => removeVehicle(i)} className="text-red-500 text-xs">{t("delete")}</button>}
                  </div>

                  {/* STEP 1 — şəkillər */}
                  <div>
                    <p className="text-xs font-medium text-muted mb-1">
                      1. Texniki pasportun ön və arxa şəkillərini yükləyin
                    </p>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Şəkil yan/tərs olsa, <span className="text-orange-500 font-medium">"Sola"/"Sağa"</span> düymələri ilə düzəldin — AI daha doğru oxuyacaq.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["front", "back"] as const).map((side) => {
                        const pending = side === "front" ? v.pendingFront : v.pendingBack;
                        const sideLabel = side === "front" ? "Ön hissə" : "Arxa hissə";
                        return (
                          <div key={side}>
                            <p className="text-[10px] text-muted-foreground mb-1">{sideLabel}</p>
                            {pending ? (
                              <div>
                                <div className="relative">
                                  <img src={pending.preview} className="w-full h-32 object-contain rounded-xl border border-input-border bg-input-bg/40" />
                                  <button type="button" onClick={() => onPickFile(i, side, null)} className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-lg text-white text-xs" title="Sil">×</button>
                                </div>
                                <div className="flex gap-1 mt-1">
                                  <button type="button" onClick={() => rotateVehicleImage(i, side, "left")} className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-md text-[10px] font-medium" title="90° sola fırlat">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                    Sola
                                  </button>
                                  <button type="button" onClick={() => rotateVehicleImage(i, side, "right")} className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-md text-[10px] font-medium" title="90° sağa fırlat">
                                    Sağa
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" /></svg>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex items-center justify-center h-32 border-2 border-dashed border-input-border rounded-xl cursor-pointer hover:border-orange-500/30 text-xs text-muted">
                                {sideLabel} şəkli
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(i, side, e.target.files?.[0] || null)} />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {v.extractLoading && (
                      <p className="text-[11px] text-orange-500 mt-2 flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" />
                        </svg>
                        AI şəkilləri oxuyur, gözləyin...
                      </p>
                    )}
                    {v.extractError && (
                      <p className="text-[11px] text-red-500 mt-2">{v.extractError}</p>
                    )}
                    {v.aiVerified && !v.extractLoading && !v.extractError && (
                      <p className="text-[11px] text-green-500 mt-2">✓ AI sahələri oxudu — yoxlayın və düzəldə bilərsiniz</p>
                    )}
                  </div>

                  {/* STEP 2 — sahələr (yalnız extract uğurlu olduqdan sonra və ya manual əlavə) */}
                  <div>
                    <p className="text-xs font-medium text-muted mb-2">
                      2. Sahələri yoxlayın və lazım olarsa düzəldin
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select value={v.brand} onChange={(e) => updateVehicleField(i, { brand: e.target.value, model: "" })} required className={fieldCls}>
                        <option value="">{t("brandPlaceholder")}</option>
                        {brandNames.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <select value={v.model} onChange={(e) => updateVehicleField(i, { model: e.target.value })} required disabled={!v.brand} className={fieldCls}>
                        <option value="">{t("modelPlaceholder")}</option>
                        {getModels(v.brand).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select value={v.year} onChange={(e) => updateVehicleField(i, { year: e.target.value })} required className={fieldCls}>
                        <option value="">{t("yearPlaceholder")}</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <input value={v.registrationNumber} onChange={(e) => updateVehicleField(i, { registrationNumber: e.target.value })} placeholder="A — Qeydiyyat nişanı" className={fieldCls} />
                      <input value={v.registrationDate} onChange={(e) => updateVehicleField(i, { registrationDate: e.target.value })} placeholder="B.1 — Qeydiyyat tarixi" className={fieldCls} />
                      <input value={v.ownerName} onChange={(e) => updateVehicleField(i, { ownerName: e.target.value })} placeholder="C.1 — Mülkiyyətçi" className={fieldCls} />
                      <input value={v.ownerAddress} onChange={(e) => updateVehicleField(i, { ownerAddress: e.target.value })} placeholder="C.2 — Ünvan" className={fieldCls} />
                      <input value={v.ownershipType} onChange={(e) => updateVehicleField(i, { ownershipType: e.target.value })} placeholder="C.3 — Mülkiyyət növü" className={fieldCls} />
                      <input value={v.vehicleType} onChange={(e) => updateVehicleField(i, { vehicleType: e.target.value })} placeholder="D.3 — Tip" className={fieldCls} />
                      <input value={v.engineNumber} onChange={(e) => updateVehicleField(i, { engineNumber: e.target.value })} placeholder="E.1 — Mühərrik №" className={fieldCls} />
                      <input value={v.bodyNumber} onChange={(e) => updateVehicleField(i, { bodyNumber: e.target.value })} placeholder="E.2 — Ban / VIN" className={fieldCls} />
                      <input value={v.chassisNumber} onChange={(e) => updateVehicleField(i, { chassisNumber: e.target.value })} placeholder="E.3 — Şassi №" className={fieldCls} />
                      <input value={v.color} onChange={(e) => updateVehicleField(i, { color: e.target.value })} placeholder="E.4 — Rəng" className={fieldCls} />
                      <input value={v.maxMass} onChange={(e) => updateVehicleField(i, { maxMass: e.target.value })} placeholder="F.1 — Maks. kütlə" className={fieldCls} />
                      <input value={v.unloadedMass} onChange={(e) => updateVehicleField(i, { unloadedMass: e.target.value })} placeholder="F.2 — Yüksüz kütlə" className={fieldCls} />
                      <input type="number" min="1" max="20" value={v.seatCount} onChange={(e) => updateVehicleField(i, { seatCount: e.target.value })} placeholder="F.3 — Oturacaq sayı" className={fieldCls} />
                      <input value={v.engineCapacity} onChange={(e) => updateVehicleField(i, { engineCapacity: e.target.value })} placeholder="G — Mühərrik həcmi" className={fieldCls} />
                      <input value={v.validUntil} onChange={(e) => updateVehicleField(i, { validUntil: e.target.value })} placeholder="H — Etibarlıdır" className={fieldCls} />
                      <input value={v.cardSerial} onChange={(e) => updateVehicleField(i, { cardSerial: e.target.value })} placeholder="Kart seriyası" className={fieldCls} />
                      <input value={v.issuedBy} onChange={(e) => updateVehicleField(i, { issuedBy: e.target.value })} placeholder="Verilib" className={fieldCls} />
                      <input value={v.specialMarks} onChange={(e) => updateVehicleField(i, { specialMarks: e.target.value })} placeholder="Xüsusi qeydlər" className={fieldCls} />
                    </div>
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

          <button
            type="submit"
            disabled={loading || (type === "CAR_OWNER" && vehicles.some((v) => v.extractLoading))}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
          >
            {loading ? t("submitting") : "Yadda saxla"}
          </button>
        </form>
      </div>
    </div>
  );
}
