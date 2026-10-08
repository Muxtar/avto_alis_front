"use client";

// Admin siyahıları üçün ortaq səhifələmə. Əvvəl hər səhifə üçün bir düymə çəkilirdi:
// 50+ səhifədə sətir telefonda ekrandan daşırdı. İndi yalnız yaxın səhifələr görünür.
export default function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const near = new Set<number>([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const pages = Array.from(near).sort((a, b) => a - b);
  const btn = "min-w-8 h-8 px-2 rounded-lg text-xs font-medium disabled:opacity-40";
  const idle = "bg-input-bg border border-input-border text-muted hover:text-foreground";
  return (
    <div className="flex flex-wrap justify-center items-center gap-1.5 mt-6">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className={`${btn} ${idle}`} aria-label="Əvvəlki">‹</button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 && <span className="text-muted text-xs">…</span>}
          <button onClick={() => onChange(p)} className={`${btn} ${page === p ? "bg-orange-500 text-white" : idle}`}>{p}</button>
        </span>
      ))}
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={`${btn} ${idle}`} aria-label="Növbəti">›</button>
    </div>
  );
}
