"use client";
import { useState } from "react";
import { IXTISAS_SECTORS } from "@/lib/ixtisas";

// Sektor → İxtisas iyerarxik seçici (İxtisas Təsnifatı: 15 sektor, 223 ixtisas).
// Siyahıda olmayan peşə üçün "əl ilə yaz" rejimi də var.
export default function ProfessionPicker({
  value,
  onChange,
  className = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-foreground text-sm",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  // Mövcud dəyərə görə sektoru tap (profildə redaktə üçün).
  const sectorOf = (v: string) => IXTISAS_SECTORS.find((s) => s.professions.includes(v))?.sector || "";
  const [sector, setSector] = useState<string>(() => sectorOf(value));
  // Dəyər siyahıda yoxdursa əl ilə rejim.
  const [manual, setManual] = useState<boolean>(() => !!value && !sectorOf(value));

  const profs = IXTISAS_SECTORS.find((s) => s.sector === sector)?.professions || [];

  if (manual) {
    return (
      <div className="space-y-1.5">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="İxtisasınızı yazın" className={className} autoComplete="off" />
        <button type="button" onClick={() => { setManual(false); onChange(""); }} className="text-[11px] text-orange-500">← Siyahıdan seç</button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select value={sector} onChange={(e) => { setSector(e.target.value); onChange(""); }} className={className}>
          <option value="">Sektor seçin</option>
          {IXTISAS_SECTORS.map((s) => <option key={s.sector} value={s.sector}>{s.sector}</option>)}
        </select>
        <select value={value} onChange={(e) => onChange(e.target.value)} disabled={!sector} className={`${className} disabled:opacity-50`}>
          <option value="">{sector ? "İxtisas seçin" : "Əvvəlcə sektor"}</option>
          {profs.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <button type="button" onClick={() => { setManual(true); }} className="text-[11px] text-muted hover:text-orange-500">Siyahıda yoxdur? Əl ilə yaz →</button>
    </div>
  );
}
