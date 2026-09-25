"use client";
import { useState } from "react";
import Link from "next/link";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";

// Rəyə satıcının İCTİMAİ cavabı — hamı görür. `canReply` (elanın / obyektin sahibi,
// peşəkar) olanda altında «Cavab yaz / Cavabı dəyiş / Cavabı sil» və rəy yazanla
// «💬 Əlaqə» linki çıxır. Sahiblik serverdə yenidən yoxlanır (403).

export const REPLY_MAX = 1000;

export function chatLink(userId: number, name?: string | null) {
  return `/messages?chat=${userId}&seg=BUSINESS&name=${encodeURIComponent(name || "")}`;
}

export function fmtReviewDate(d?: string | Date | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("az-AZ", { day: "numeric", month: "short", year: "numeric" });
}

/** Yalnız göstəriş bloku: «Satıcının cavabı». */
export function SellerReplyBlock({ reply, at }: { reply?: string | null; at?: string | Date | null }) {
  if (!reply) return null;
  return (
    <div className="mt-2 ml-2 sm:ml-4 pl-3 border-l-2 border-orange-500/40 bg-orange-500/[0.04] rounded-r-xl py-2 pr-3">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-[11px] font-bold text-orange-600">↳ Satıcının cavabı</span>
        {at && <span className="text-[10px] text-muted ml-auto">{fmtReviewDate(at)}</span>}
      </div>
      <p className="text-sm text-foreground/85 break-words whitespace-pre-line">{reply}</p>
    </div>
  );
}

/**
 * Cavab göstərişi + (sahib üçün) redaktə vasitələri.
 * onChange yeni {sellerReply, sellerReplyAt} ilə çağırılır — valideyn lokal state-i yeniləyir.
 */
export default function SellerReply({
  comment,
  canReply,
  showContact = true,
  onChange,
}: {
  comment: any;
  canReply: boolean;
  showContact?: boolean;
  onChange?: (patch: { sellerReply: string | null; sellerReplyAt: string | null }) => void;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const reply = text.trim();
    if (!reply || !token) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/comments/${comment.id}/reply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reply }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        onChange?.({ sellerReply: d.comment?.sellerReply ?? reply, sellerReplyAt: d.comment?.sellerReplyAt ?? new Date().toISOString() });
        setOpen(false); setText("");
        toast("Cavab dərc olundu ✓", "success");
      } else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!token || !confirm("Cavabı silmək istəyirsiniz?")) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/comments/${comment.id}/reply`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) { onChange?.({ sellerReply: null, sellerReplyAt: null }); toast("Cavab silindi", "success"); }
      else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  return (
    <>
      {!open && <SellerReplyBlock reply={comment.sellerReply} at={comment.sellerReplyAt} />}
      {canReply && (open ? (
        <div className="mt-2 space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, REPLY_MAX))} rows={3} autoFocus maxLength={REPLY_MAX}
            placeholder="Müştəriyə ictimai cavabınız..."
            className="w-full px-3 py-2 bg-card border border-orange-500/40 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/40" />
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={busy || !text.trim()} className="px-3.5 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50">{busy ? "..." : "Dərc et"}</button>
            <button onClick={() => { setOpen(false); setText(""); }} className="px-3.5 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs">İmtina</button>
            <span className="text-[10px] text-muted ml-auto">{text.length}/{REPLY_MAX}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 mt-1.5">
          <button onClick={() => { setText(comment.sellerReply || ""); setOpen(true); }}
            className="text-[11px] text-orange-500 hover:text-orange-600 font-semibold">
            ↩ {comment.sellerReply ? "Cavabı dəyiş" : "Cavab yaz"}
          </button>
          {comment.sellerReply && (
            <button onClick={remove} disabled={busy} className="text-[11px] text-muted hover:text-red-500 font-medium disabled:opacity-50">✕ Cavabı sil</button>
          )}
          {showContact && comment.user?.id && (
            <Link href={chatLink(comment.user.id, comment.user.name)} className="text-[11px] text-muted hover:text-orange-500 font-medium">💬 Əlaqə</Link>
          )}
        </div>
      ))}
    </>
  );
}
