"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { ALL_IXTISAS } from "@/lib/ixtisas";

// Çoxlu ixtisas seçici (max 3) — yazdıqca təklif, seçilənlər çip kimi.
function norm(s: string) {
  return s.toLowerCase()
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u")
    .replace(/ç/g, "c").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/İ/g, "i");
}

export default function ProfessionMultiPicker({
  values,
  onChange,
  max = 3,
  className = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-foreground text-sm",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  max?: number;
  className?: string;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const full = values.length >= max;

  const suggestions = useMemo(() => {
    const q = norm(text.trim());
    if (!q) return [];
    const starts: string[] = [], contains: string[] = [];
    for (const p of ALL_IXTISAS) {
      if (values.includes(p)) continue;
      const np = norm(p);
      if (np === q) continue;
      if (np.startsWith(q)) starts.push(p);
      else if (np.includes(q)) contains.push(p);
    }
    return [...starts, ...contains].slice(0, 10);
  }, [text, values]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const add = (p: string) => {
    const v = p.trim();
    if (!v || values.includes(v) || values.length >= max) return;
    onChange([...values, v]);
    setText(""); setOpen(false); setFocusedIdx(0);
  };
  const remove = (p: string) => onChange(values.filter((x) => x !== p));

  return (
    <div ref={boxRef} className="relative">
      {/* Seçilmiş ixtisaslar */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-500/10 text-orange-500">
              {p}
              <button type="button" onClick={() => remove(p)} className="text-orange-500/70 hover:text-orange-500">×</button>
            </span>
          ))}
        </div>
      )}
      {!full && (
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); setFocusedIdx(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); if (suggestions.length) add(suggestions[focusedIdx]); else if (text.trim()) add(text.trim()); return; }
            if (!open || suggestions.length === 0) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIdx((i) => Math.max(i - 1, 0)); }
            else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={values.length ? `Daha bir ixtisas əlavə et (${values.length}/${max})` : "İxtisas yazın (məs. həkim, müəllim, frontend...)"}
          className={className}
          autoComplete="off"
        />
      )}
      {full && <p className="text-[11px] text-muted">Maksimum {max} ixtisas seçilə bilər.</p>}
      {open && suggestions.length > 0 && !full && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-input-border rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((p, i) => (
            <button
              key={p}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); add(p); }}
              onMouseEnter={() => setFocusedIdx(i)}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${i === focusedIdx ? "bg-orange-500/10 text-orange-500" : "hover:bg-input-bg"}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
