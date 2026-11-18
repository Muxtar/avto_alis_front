"use client";
// İnternet axtarışının SAHƏSİ — istifadəçi üç seçimdən birini edir və axtarış
// yalnız həmin sahənin saytlarında aparılır (backend: POST /search/web `scope`):
//   Maşın            → turbo.az + tap.az (avtomobillər)
//   Daşınmaz əmlak   → bina.az + tap.az (daşınmaz əmlak)
//   Digər            → tap.az + lalafo.az
import { useEffect, useState } from "react";

export type WebScope = "car" | "realestate" | "other";

export const WEB_SCOPES: { id: WebScope; icon: string; label: string; sites: string }[] = [
  { id: "car", icon: "🚗", label: "Maşın", sites: "turbo.az · tap.az" },
  { id: "realestate", icon: "🏠", label: "Daşınmaz əmlak", sites: "bina.az · tap.az" },
  { id: "other", icon: "📦", label: "Digər", sites: "tap.az · lalafo.az" },
];

const KEY = "webSearchScope";
const EVT = "web-scope-changed";
const isScope = (v: unknown): v is WebScope => v === "car" || v === "realestate" || v === "other";

/** Seçim yadda qalır və səhifədəki bütün axtarış yerləri (üst panel, elanlar) sinxron olur. */
export function useWebScope(): [WebScope, (s: WebScope) => void] {
  const [scope, setScope] = useState<WebScope>("other");
  useEffect(() => {
    try { const v = localStorage.getItem(KEY); if (isScope(v)) setScope(v); } catch {}
    const on = (e: Event) => { const v = (e as CustomEvent).detail; if (isScope(v)) setScope(v); };
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  const set = (s: WebScope) => {
    setScope(s);
    try { localStorage.setItem(KEY, s); } catch {}
    window.dispatchEvent(new CustomEvent(EVT, { detail: s }));
  };
  return [scope, set];
}

export default function WebScopeTabs({ value, onChange, className = "" }: { value: WebScope; onChange: (s: WebScope) => void; className?: string }) {
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
