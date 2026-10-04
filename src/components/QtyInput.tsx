"use client";
import { useState } from "react";

/** Say xanası — «+ / −» ilə yanaşı rəqəmi birbaşa YAZMAQ üçün (stok 500-dürsə
    500 dəfə «+» basmaq olmaz). Yazarkən sərbəstdir; Enter və ya xanadan
    çıxanda yoxlanır: boş/yanlış → əvvəlki say, stokdan çox → `onOver` çağırılır
    və maksimuma endirilir. */
export default function QtyInput({ value, max, onCommit, onOver, className = "" }: {
  value: number;
  max?: number | null;
  onCommit: (qty: number) => void;
  onOver?: (max: number) => void;
  className?: string;
}) {
  // Yazarkən öz mətni göstərilir; fokusda deyilsə həmişə real say (± düyməsi,
  // server cavabı dərhal əks olunur).
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  const commit = () => {
    let n = parseInt(draft, 10);
    if (!Number.isFinite(n) || n < 1) return;
    if (typeof max === "number" && n > max) { onOver?.(max); n = Math.max(1, max); }
    if (n !== value) onCommit(n);
  };

  return (
    <input
      type="text" inputMode="numeric" pattern="[0-9]*" aria-label="Say"
      value={focused ? draft : String(value)}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 6))}
      onFocus={(e) => { setDraft(String(value)); setFocused(true); const el = e.target; setTimeout(() => el.select(), 0); }}
      onBlur={() => { setFocused(false); commit(); }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className={`h-7 w-12 text-center text-sm font-medium bg-input-bg border border-input-border rounded-lg outline-none focus:border-[var(--brand-to)] ${className}`}
    />
  );
}
