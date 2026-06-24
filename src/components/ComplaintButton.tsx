"use client";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "TIME_WASTED", label: "Vaxtı boşa xərclədi / rəy vermədi" },
  { value: "FRAUD", label: "Fırıldaq / aldatma" },
  { value: "RUDE", label: "Kobud davranış" },
  { value: "FAKE_INFO", label: "Saxta / yanlış məlumat" },
  { value: "OTHER", label: "Başqa" },
];

// Şikayət düyməsi + modal. consultationId verilərsə seans şikayəti, yoxsa profil şikayəti.
export default function ComplaintButton({
  consultationId, targetUserId, label = "Şikayət et", className,
}: { consultationId?: number; targetUserId?: number; label?: string; className?: string }) {
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(consultationId ? "TIME_WASTED" : "FAKE_INFO");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!isLoggedIn) { toast("Əvvəlcə daxil olun", "error"); return; }
    if (description.trim().length < 5) { toast("Şikayətin təsvirini yazın", "error"); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/complaints`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId, targetUserId, category, description: description.trim() }),
      }).then((x) => x.json());
      if (r.success) { setSent(true); setOpen(false); toast("Şikayət göndərildi — admin yoxlayacaq", "success"); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  if (sent) return <span className="text-xs text-muted">✓ Şikayət göndərildi</span>;

  return (
    <>
      <button onClick={() => setOpen(true)} className={className || "text-xs text-red-500 hover:underline"}>{label}</button>
      {open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">Şikayət et</h3>
            <p className="text-xs text-muted mb-3">Şikayətiniz admin tərəfindən araşdırılacaq.</p>
            <label className="block text-xs font-medium text-muted mb-1">Səbəb</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm mb-3">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label className="block text-xs font-medium text-muted mb-1">Təsvir</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Nə baş verdi?" className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm resize-none mb-3" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 bg-input-bg border border-input-border rounded-xl text-sm">Ləğv</button>
              <button onClick={submit} disabled={busy} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{busy ? "..." : "Göndər"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
