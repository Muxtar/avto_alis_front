"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { IXTISAS_SECTORS, ALL_IXTISAS } from "@/lib/ixtisas";

// İxtisas axtarışı (typeahead): istifadəçi yazdıqca uyğun ixtisaslar təklif kimi çıxır.
// Azərbaycan hərflərinə həssas deyil — "he" yazanda "Həkim" tapılır.
function norm(s: string) {
  return s.toLowerCase()
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u")
    .replace(/ç/g, "c").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/İ/g, "i");
}

// İxtisasın aid olduğu sektoru tap (təklifdə alt başlıq kimi göstərmək üçün).
const SECTOR_OF: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const s of IXTISAS_SECTORS) for (const p of s.professions) if (!m[p]) m[p] = s.sector;
  return m;
})();

export default function ProfessionPicker({
  value,
  onChange,
  className = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-foreground text-sm",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const suggestions = useMemo(() => {
    const q = norm(value.trim());
    if (!q) return [];
    const starts: string[] = [];
    const contains: string[] = [];
    for (const p of ALL_IXTISAS) {
      const np = norm(p);
      if (np === q) continue;
      if (np.startsWith(q)) starts.push(p);
      else if (np.includes(q)) contains.push(p);
    }
    return [...starts, ...contains].slice(0, 10);
  }, [value]);

  // Kənara klik edəndə bağla.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (p: string) => { onChange(p); setOpen(false); };

  return (
    <div ref={boxRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setFocusedIdx(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIdx((i) => Math.max(i - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); pick(suggestions[focusedIdx]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        placeholder="İxtisas yazın (məs. həkim, müəllim, frontend...)"
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-input-border rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((p, i) => (
            <button
              key={p}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setFocusedIdx(i)}
              className={`w-full text-left px-3.5 py-2.5 border-b border-input-border/50 last:border-0 ${i === focusedIdx ? "bg-input-bg" : ""}`}
            >
              <span className="block text-sm font-medium">{p}</span>
              {SECTOR_OF[p] && <span className="block text-[11px] text-muted">{SECTOR_OF[p]}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
