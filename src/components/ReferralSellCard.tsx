"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { referralUrl } from "@/lib/referral";
import ReferralLinkBox from "@/components/ReferralLinkBox";

/**
 * Məhsul səhifəsində (sahib olmayan, daxil olmuş istifadəçi üçün) yığcam
 * «bu məhsulu referal ilə sat» kartı. Proqram yoxdursa heç nə göstərmir.
 */
export default function ReferralSellCard({ listingId, maxQty }: { listingId: number; maxQty?: number }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [info, setInfo] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt: string; percent: number } | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await fetch(`${API}/listings/${listingId}/referral`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
      if (d?.success) setInfo(d);
    } catch { /* şəbəkə — kart görünməsin */ }
  }, [listingId, token]);

  useEffect(() => { load(); }, [load]);

  if (!info?.available) return null;

  const createLink = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${API}/referral/cart`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ listingId, quantity: qty }] }),
      }).then((x) => x.json());
      if (r.success) { setLink({ url: referralUrl(r.token), expiresAt: r.expiresAt, percent: r.percent }); toast("Link yaradıldı ✓", "success"); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta baş verdi", "error"); } finally { setBusy(false); }
  };

  const apply = async (withNote: boolean) => {
    setBusy(true);
    try {
      const r = await fetch(`${API}/referral/programs/${info.programId}/apply`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(withNote && note.trim() ? { note: note.trim() } : {}),
      }).then((x) => x.json());
      if (r.success) {
        toast(r.partner?.status === "ACTIVE" ? "Qəbul olundu — indi link yarada bilərsiniz ✓" : "Müraciət göndərildi ✓", "success");
        setApplyOpen(false); setNote("");
        await load();
      } else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta baş verdi", "error"); } finally { setBusy(false); }
  };

  const ps = info.partnerStatus as string | null;

  return (
    <div className="bg-card border border-card-border rounded-2xl p-4">
      {info.eligible ? (
        <>
          <p className="text-sm font-semibold flex items-center gap-1.5">
            🤝 Bu məhsulu referal ilə sat — <span className="text-orange-500">{info.percent}% komissiya</span>
          </p>
          <p className="text-[11px] text-muted mt-0.5 mb-3">Link yaradın, alıcıya göndərin. Link {info.linkDays} gün etibarlıdır. <Link href="/referral" className="text-orange-500 hover:underline">Ətraflı →</Link></p>
          {link ? (
            <ReferralLinkBox url={link.url} expiresAt={link.expiresAt} percent={link.percent} onReset={() => { setLink(null); setQty(1); }} />
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted shrink-0">Say</label>
              <input type="number" min={1} max={maxQty || 999} value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(maxQty || 999, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-2 bg-input-bg border border-input-border rounded-lg text-sm" />
              <button onClick={createLink} disabled={busy}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {busy ? "..." : "Link yarat"}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">🤝 Referal satış</p>
          {ps === "INVITED" ? (
            <>
              <p className="text-xs text-muted mt-1 mb-2">Satıcı sizi bu məhsulları komissiya ilə satmağa dəvət edib.</p>
              <div className="flex gap-2">
                <button onClick={() => apply(false)} disabled={busy} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Dəvəti qəbul et</button>
                <Link href="/referral" className="px-4 py-2 bg-input-bg border border-input-border rounded-xl text-sm">Dəvətlərim</Link>
              </div>
            </>
          ) : ps === "REQUESTED" ? (
            <p className="text-xs text-muted mt-1">⏳ Müraciətiniz satıcıda gözləyir.</p>
          ) : (
            <>
              <p className="text-xs text-muted mt-1">{info.reason || "Bu məhsulu referal ilə sata bilməzsiniz."}</p>
              {info.audience === "INVITED" && ps !== "REVOKED" && (
                applyOpen ? (
                  <div className="mt-2 space-y-2">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} placeholder="Qeyd (istəyə bağlı): özünüz haqqında qısa məlumat"
                      className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => apply(true)} disabled={busy} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{busy ? "..." : "Göndər"}</button>
                      <button onClick={() => setApplyOpen(false)} className="px-4 py-2 bg-input-bg border border-input-border rounded-xl text-sm">Ləğv</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setApplyOpen(true)} className="mt-2 px-4 py-2 bg-input-bg border border-input-border rounded-xl text-sm font-semibold hover:border-orange-500/50">
                    {ps === "REJECTED" ? "Yenidən müraciət et" : "Müraciət et"}
                  </button>
                )
              )}
              {info.audience === "PROFESSION" && (
                <Link href="/profile" className="inline-block mt-1.5 text-xs text-orange-500 hover:underline">Profildə ixtisas əlavə et →</Link>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
