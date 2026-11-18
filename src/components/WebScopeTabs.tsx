"use client";
// İnternet axtarışının SAHƏSİ — istifadəçi üç seçimdən birini edir və axtarış
// yalnız həmin sahənin saytlarında aparılır (backend: POST /search/web `scope`).
// İnternet axtarışı ÖZÜ BAŞLAMIR: istifadəçi əvvəl «İnternetdə axtar» düyməsini
// basır, sonra sahəni seçir — yalnız bundan sonra sorğu gedir (value=null → seçilməyib).
//   Maşın            → turbo.az + tap.az (avtomobillər)
//   Daşınmaz əmlak   → bina.az + tap.az (daşınmaz əmlak)
//   Digər            → tap.az + lalafo.az

export type WebScope = "car" | "realestate" | "other";

export const WEB_SCOPES: { id: WebScope; icon: string; label: string; sites: string }[] = [
  { id: "car", icon: "🚗", label: "Maşın", sites: "turbo.az · tap.az" },
  { id: "realestate", icon: "🏠", label: "Daşınmaz əmlak", sites: "bina.az · tap.az" },
  { id: "other", icon: "📦", label: "Digər", sites: "tap.az · lalafo.az" },
];

export default function WebScopeTabs({ value, onChange, className = "" }: { value: WebScope | null; onChange: (s: WebScope) => void; className?: string }) {
  return (
    <div role="radiogroup" aria-label="Axtarış sahəsi" className={`flex flex-wrap gap-2 ${className}`}>
      {WEB_SCOPES.map((s) => {
        const on = value === s.id;
        return (
          <button key={s.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(s.id)} title={s.sites}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${
              on ? "bg-orange-500 border-orange-500 text-white" : "bg-input-bg border-input-border text-foreground hover:border-orange-500/60"
            }`}>
            <span aria-hidden>{s.icon}</span>{s.label}
          </button>
        );
      })}
    </div>
  );
}
