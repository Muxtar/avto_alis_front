"use client";
// «Təklif göndər» — internet axtarışında tapılan KƏNAR elana (tap.az, turbo.az,
// bina.az, lalafo.az) qiymət təklifi. Düyməni basanda kiçik forma açılır; göndərəndə
// server YALNIZ o an, yalnız bu elan üçün satıcının nömrəsini tapmağa çalışır
// (nömrə alıcıya göstərilmir) və satıcıya sayt adından xəbər verilir.
import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

const SITES = ["tap.az", "turbo.az", "bina.az", "lalafo.az"];

export interface ExternalListing { url: string; title: string; site?: string; price?: number | null; currency?: string; image?: string | null }

export function canOffer(l: { url: string; site?: string }): boolean {
  let host = l.site || "";
  try { if (!host) host = new URL(l.url).hostname; } catch { return false; }
  return SITES.includes(host.replace(/^(www|ru|en)\./, "").toLowerCase());
}

export default function ExternalOfferButton({ listing, className = "" }: { listing: ExternalListing; className?: string }) {
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!canOffer(listing)) return null;

  const start = () => {
    if (!isLoggedIn || !token) { toast("Təklif göndərmək üçün hesabınıza daxil olun", "error"); return; }
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(price.replace(",", ".").replace(/\s/g, ""));
    if (!Number.isFinite(n) || n <= 0) { toast("Təklif qiymətini yazın", "error"); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/external-offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: listing.url, title: listing.title, price: listing.price ?? null, currency: listing.currency || "AZN", image: listing.image || null, offerPrice: n, note }),
      }).then((x) => x.json());
      if (!r?.success) { toast(r?.message || "Təklif göndərilmədi", "error"); return; }
      toast(r.message || "Təklifiniz qəbul edildi", "success");
      setSent(true); setOpen(false);
    } catch { toast("Təklif göndərilmədi", "error"); } finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" onClick={start} disabled={sent}
        className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
          sent ? "border-green-500/40 text-green-600 bg-green-500/10 cursor-default" : "border-orange-500/50 text-orange-600 hover:bg-orange-500/10"
        } ${className}`}>
        {sent ? "✓ Təklif göndərildi" : "💬 Təklif göndər"}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !busy && setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Təklif göndər"
            className="w-full sm:max-w-md bg-card text-foreground border border-card-border rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-sm">💬 Təklif göndər</p>
                <p className="text-xs text-muted line-clamp-2 mt-0.5">{listing.title}</p>
                {typeof listing.price === "number" && <p className="text-xs mt-0.5">Elandakı qiymət: <b>{listing.price} {listing.currency || "AZN"}</b></p>}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Bağla" className="shrink-0 p-1 text-muted hover:text-foreground">✕</button>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" htmlFor="ext-offer-price">Təklif etdiyiniz qiymət (AZN)</label>
              <input id="ext-offer-price" inputMode="decimal" autoFocus required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="məs. 950"
                className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" htmlFor="ext-offer-note">Qeyd (istəyə bağlı)</label>
              <textarea id="ext-offer-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="məs. bu gün götürə bilərəm"
                className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
            </div>
            <p className="text-[11px] text-muted leading-snug">
              Satıcıya saytımız adından xəbər veriləcək. Onun nömrəsi sizə göstərilmir — cavab yazanda «Təkliflər» bölməsində görəcəksiniz.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="flex-1 px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-sm font-semibold">Ləğv et</button>
              <button type="submit" disabled={busy} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50">{busy ? "Göndərilir…" : "Göndər"}</button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </>
  );
}
