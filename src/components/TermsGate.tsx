"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { API } from "@/lib/api";

/**
 * SAYTA GİRİŞDƏ QAYDALARIN QƏBULU.
 *
 * Sayt ilk dəfə açılanda pəncərə çıxır: «Qaydalarla tanış oldum və qəbul
 * edirəm». Qəbul edilməyincə bağlanmır.
 *
 *   Qonaq       — qəbul bu brauzerdə yadda qalır (sənədlərin versiyası ilə).
 *   İstifadəçi  — qəbul serverdə qeyd olunur (versiya, vaxt, IP) — səbətdəki
 *                 `ConsentBox` ilə eyni qeyd, ona görə səbətdə ikinci dəfə soruşulmur.
 *
 * Admin sənədin mətnini dəyişəndə versiya artır və pəncərə yenidən çıxır.
 * Sənədlərin öz səhifələrində pəncərə göstərilmir — oxumaq mümkün olsun.
 */

const KEY = "terms_accepted";
const DOCS = [
  { slug: "user-agreement", href: "/terms", label: "İstifadəçi Razılaşması" },
  { slug: "commission-rules", href: "/komissiya", label: "Komissiya və Hesablaşma Qaydaları" },
  { slug: "return-rules", href: "/cancellation", label: "Məhsulun Qaytarılması Qaydaları" },
  { slug: "privacy", href: "/privacy", label: "Məxfilik Siyasəti" },
];
const LEGAL_PATHS = ["/terms", "/komissiya", "/cancellation", "/privacy", "/satici-muqavilesi"];

const readSaved = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const writeSaved = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* gizli rejim */ } };

export default function TermsGate() {
  const pathname = usePathname();
  const { token, isLoggedIn, authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [sig, setSig] = useState("");
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const record = useCallback(async () => {
    const r = await fetch(`${API}/me/consents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then((x) => x.json());
    if (!r.success) throw new Error(r.message || "Yadda saxlanmadı");
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      try {
        // Qüvvədə olan məcburi sənədlərin versiyaları — qəbulun «imzası».
        const list = await fetch(`${API}/legal`).then((x) => x.json());
        if (cancelled || !list.success) return;
        const cur = (list.documents || [])
          .filter((d: { requiredForPurchase: boolean }) => d.requiredForPurchase)
          .map((d: { slug: string; version: number }) => `${d.slug}:${d.version}`)
          .sort().join(",");
        setSig(cur);
        const localOk = readSaved() === cur;

        if (!isLoggedIn || !token) { setOpen(!localOk); return; }

        const me = await fetch(`${API}/me/consents`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json());
        if (cancelled || !me.success) return;
        if ((me.missing || []).length === 0) { writeSaved(cur); setOpen(false); return; }
        // Qonaq ikən bu brauzerdə eyni versiyaları qəbul edib, sonra daxil olub —
        // qəbulu hesabına yazırıq, ikinci dəfə soruşmuruq.
        if (localOk) { record().catch(() => {}); setOpen(false); return; }
        setOpen(true);
      } catch { /* şəbəkə xətası — pəncərəni göstərmirik, alışda server onsuz da yoxlayır */ }
    })();
    return () => { cancelled = true; };
  }, [authLoading, isLoggedIn, token, record]);

  const visible = open && !LEGAL_PATHS.some((p) => pathname === p || pathname?.startsWith(p + "/"));

  // Pəncərə açıq olanda arxadakı səhifə sürüşməsin.
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  const accept = async () => {
    if (!checked || saving) return;
    setSaving(true); setErr(null);
    try {
      if (isLoggedIn && token) await record();
      writeSaved(sig);
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Şəbəkə xətası — yenidən cəhd edin");
    } finally { setSaving(false); }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      role="dialog" aria-modal="true" aria-labelledby="terms-gate-title">
      <div className="w-full sm:max-w-md bg-card border border-card-border rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 id="terms-gate-title" className="text-lg font-bold leading-tight">Sayt qaydaları</h2>
            <p className="text-xs text-muted">Davam etmək üçün qaydaları qəbul edin</p>
          </div>
        </div>

        <p className="text-sm text-muted leading-relaxed mb-3">
          Saytdan istifadə etməzdən əvvəl aşağıdakı sənədlərlə tanış olun:
        </p>

        <ul className="space-y-1.5 mb-4">
          {DOCS.map((d) => (
            <li key={d.slug}>
              <a href={d.href} target="_blank" rel="noreferrer"
                className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border border-card-border hover:border-orange-500/60 transition-colors">
                <span className="text-sm font-medium">{d.label}</span>
                <span className="text-xs text-[var(--brand-to)] shrink-0">Oxu →</span>
              </a>
            </li>
          ))}
        </ul>

        <label className="flex items-start gap-3 cursor-pointer mb-4 p-3 rounded-xl bg-orange-500/10">
          <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)}
            className="w-5 h-5 mt-0.5 accent-orange-500 shrink-0" />
          <span className="text-sm font-medium leading-snug">Qaydalarla tanış oldum və qəbul edirəm</span>
        </label>

        {err && <p className="text-xs text-red-500 mb-2">{err}</p>}

        <button type="button" onClick={accept} disabled={!checked || saving}
          className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
          {saving ? "Yadda saxlanılır…" : "Qəbul edirəm"}
        </button>
      </div>
    </div>
  );
}
