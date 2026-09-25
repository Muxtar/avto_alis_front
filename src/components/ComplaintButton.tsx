"use client";
import { useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { COMPLAINT_CATEGORIES, PERSON_COMPLAINT_CATEGORIES, CONSULTATION_COMPLAINT_CATEGORIES } from "@/lib/complaints";

// Şikayət düyməsi + modal.
// Şikayət = satıcının davranışı haqqında rəy → yalnız etibarlılıq reytinqinə təsir edir (pul qaytarılmır).
// - consultationId → seans şikayəti
// - listingId / orderId → məhsul/sifariş şikayəti (foto yükləmə açılır)
// - əks halda profil şikayəti (targetUserId)
export default function ComplaintButton({
  consultationId, listingId, orderId, targetUserId, label = "Şikayət et", className,
}: { consultationId?: number; listingId?: number; orderId?: number; targetUserId?: number; label?: string; className?: string }) {
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const isProduct = !!(listingId || orderId);
  const cats = isProduct ? COMPLAINT_CATEGORIES : consultationId ? CONSULTATION_COMPLAINT_CATEGORIES : PERSON_COMPLAINT_CATEGORIES;
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(isProduct ? "NOT_AS_DESCRIBED" : consultationId ? "TIME_WASTED" : "RUDE");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []).filter((f) => /^image\//.test(f.type) && f.size < 8 * 1024 * 1024);
    setImages((prev) => [...prev, ...list].slice(0, 6));
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!isLoggedIn) { toast("Əvvəlcə daxil olun", "error"); return; }
    if (description.trim().length < 5) { toast("Şikayətin təsvirini yazın (min 5 simvol)", "error"); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("category", category);
      fd.append("description", description.trim());
      if (consultationId) fd.append("consultationId", String(consultationId));
      if (listingId) fd.append("listingId", String(listingId));
      if (orderId) fd.append("orderId", String(orderId));
      if (targetUserId) fd.append("targetUserId", String(targetUserId));
      images.forEach((f) => fd.append("images", f));
      const r = await fetch(`${API}/complaints`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      }).then((x) => x.json());
      if (r.success) {
        setSent(true); setOpen(false);
        if (listingId && !orderId && r.affectsRating === false) {
          toast("Bildiriş adminə göndərildi (alış etmədiyiniz üçün reytinqə təsir etmir)", "success");
        } else {
          toast("Şikayət göndərildi — satıcıya bildiriş getdi", "success");
        }
      }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  if (sent) return <span className="text-xs text-muted">✓ Şikayət göndərildi</span>;

  return (
    <>
      <button onClick={() => setOpen(true)} className={className || "text-xs text-red-500 hover:underline"}>{label}</button>
      {open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-1">{orderId ? "Satıcıdan şikayət" : isProduct ? "Məhsul haqqında şikayət" : "Şikayət et"}</h3>
            <p className="text-xs text-muted bg-input-bg border border-input-border rounded-lg px-2.5 py-2 mb-3">
              Şikayət satıcının etibarlılıq reytinqinə təsir edir. Pulun qaytarılması üçün sifarişdən «İadə sorğusu» göndərin.
            </p>
            <label className="block text-xs font-medium text-muted mb-1">Səbəb</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm mb-3">
              {cats.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label className="block text-xs font-medium text-muted mb-1">Təsvir</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder={isProduct ? "Nə baş verdi? Satıcının davranışını təsvir edin." : "Nə baş verdi?"} className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm resize-none mb-3" />

            {isProduct && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-muted mb-1">Şəkillər (sübut) — max 6</label>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
                <div className="flex flex-wrap gap-2">
                  {images.map((f, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-input-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setImages((p) => p.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center">×</button>
                    </div>
                  ))}
                  {images.length < 6 && (
                    <button onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-lg border-2 border-dashed border-input-border text-muted flex items-center justify-center text-2xl hover:border-orange-500">+</button>
                  )}
                </div>
                <p className="text-[11px] text-muted mt-1">Problemi göstərən şəkillər əlavə edin (məs. qüsur, yazışma, yanlış model).</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 bg-input-bg border border-input-border rounded-xl text-sm">Ləğv</button>
              <button onClick={submit} disabled={busy || description.trim().length < 5} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{busy ? "..." : "Göndər"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
