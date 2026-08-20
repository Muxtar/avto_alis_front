"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { API } from "@/lib/api";

/**
 * QAYDALARIN QƏBULU.
 *
 * Bir qutu = üç sənəd (İstifadəçi Razılaşması + Komissiya Qaydaları +
 * Qaytarma Qaydaları). Sənədlərin özü ayrı səhifələrdə açılır.
 *
 * İki rejim:
 *   `soft`  — qeydiyyatda: istifadəçi qəbul etmədən də davam edə bilər.
 *   `hard`  — səbətdə: qəbul edilməyincə sifariş verilmir (server də bloklayır).
 *
 * Qəbul serverdə qeyd olunur: hansı sənəd, hansı VERSİYA, nə vaxt, hansı IP.
 */

const DOC_HREF: Record<string, string> = {
  "user-agreement": "/terms",
  "commission-rules": "/komissiya",
  "return-rules": "/cancellation",
  "seller-agreement": "/satici-muqavilesi",
};

export default function ConsentBox({
  mode = "soft", onChange, className = "",
}: {
  mode?: "soft" | "hard";
  /** Qəbul vəziyyəti dəyişəndə xəbər verir (səbətdə düyməni açmaq üçün). */
  onChange?: (accepted: boolean) => void;
  className?: string;
}) {
  const { token, isLoggedIn } = useAuth();
  const [missing, setMissing] = useState<any[] | null>(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const H = useCallback(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const load = useCallback(async () => {
    if (!isLoggedIn || !token) return;
    try {
      const r = await fetch(`${API}/me/consents`, { headers: H() }).then((x) => x.json());
      if (r.success) {
        setMissing(r.missing || []);
        const ok = (r.missing || []).length === 0;
        setChecked(ok);
        onChange?.(ok);
      }
    } catch { /* şəbəkə — qutu göstərilir, server onsuz da yoxlayır */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token, H]);

  useEffect(() => { load(); }, [load]);

  const accept = async (next: boolean) => {
    setChecked(next);
    if (!next) { onChange?.(false); return; }   // işarəni götürmək serverdən silmir
    setSaving(true); setErr(null);
    try {
      const r = await fetch(`${API}/me/consents`, { method: "POST", headers: H(), body: JSON.stringify({}) }).then((x) => x.json());
      if (r.success) { setMissing(r.missing || []); onChange?.((r.missing || []).length === 0); }
      else { setErr(r.message || "Yadda saxlanmadı"); setChecked(false); onChange?.(false); }
    } catch { setErr("Şəbəkə xətası"); setChecked(false); onChange?.(false); }
    finally { setSaving(false); }
  };

  if (!isLoggedIn) return null;
  const done = missing !== null && missing.length === 0;

  // Artıq qəbul edilibsə səbətdə yer tutmasın — yalnız qısa təsdiq.
  if (done && mode === "hard") {
    return <p className={`text-[11px] text-green-600 ${className}`}>✓ Qaydalar qəbul edilib</p>;
  }

  return (
    <div className={`${mode === "hard" && !done ? "border border-amber-500/40 bg-amber-500/10 rounded-xl p-3" : ""} ${className}`}>
      {mode === "hard" && !done && (
        <p className="text-xs font-bold text-amber-700 mb-1.5">Sifariş vermək üçün qaydaları qəbul edin</p>
      )}
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input type="checkbox" checked={checked} disabled={saving}
          onChange={(e) => accept(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-orange-500 shrink-0" />
        <span className="text-xs leading-relaxed">
          Qaydalarla tanış oldum və qəbul edirəm —{" "}
          <a href={DOC_HREF["user-agreement"]} target="_blank" rel="noreferrer" className="text-[var(--brand-to)] hover:underline">İstifadəçi Razılaşması</a>,{" "}
          <a href={DOC_HREF["commission-rules"]} target="_blank" rel="noreferrer" className="text-[var(--brand-to)] hover:underline">Komissiya və Hesablaşma Qaydaları</a>,{" "}
          <a href={DOC_HREF["return-rules"]} target="_blank" rel="noreferrer" className="text-[var(--brand-to)] hover:underline">Məhsulun Qaytarılması Qaydaları</a>.
          {mode === "soft" && (
            <span className="block text-[11px] text-muted mt-0.5">
              İndi keçə bilərsiniz — amma məhsul almaq üçün bu tələb olunur.
            </span>
          )}
        </span>
      </label>
      {saving && <p className="text-[11px] text-muted mt-1">Yadda saxlanılır…</p>}
      {err && <p className="text-[11px] text-red-500 mt-1">{err}</p>}
    </div>
  );
}
