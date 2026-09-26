"use client";
// QİYMƏT TƏKLİFİ FORMU — alıcı məhsula öz qiymətini təklif edir.
// Həm məhsul səhifəsindəki «Qiymət təklif et» pəncərəsində, həm də «Daha ucuza
// axtar» pəncərəsində (məhsul seçildikdən sonra) istifadə olunur.
//
// Hazırkı qiymət seçilən saya görə serverdən (/listings/:id/price) gəlir —
// «çox alanda ucuz» pilləsi varsa təklif həmin qiymətdən aşağı olmalıdır.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export interface OfferListing {
  id: number;
  title: string;
  price: number;
  stock?: number | null;
  images?: string[] | null;
  type?: string | null;
  /** Fərdi satıcının elanı (onlayn alınmır) — razılaşma chat-da davam edir. */
  personal?: boolean;
}

/** Təklif ən azı hazırkı qiymətin bu hissəsi olmalıdır (backend ilə eyni). */
const MIN_RATIO = 0.5;

export default function PriceOfferForm({
  listing,
  showListing = false,
  initialQty = 1,
  onSuccess,
  onCancel,
  onChangeListing,
}: {
  listing: OfferListing;
  /** Formun başında məhsulun şəkli/adı göstərilsin (axtarışdan seçiləndə). */
  showListing?: boolean;
  initialQty?: number;
  onSuccess?: (offer: any) => void;
  onCancel?: () => void;
  /** «Başqa məhsul seç» — axtarış siyahısına qayıtmaq üçün. */
  onChangeListing?: () => void;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const maxQty = typeof listing.stock === "number" && listing.stock > 0 ? listing.stock : 99;
  const [qty, setQty] = useState(Math.min(Math.max(1, initialQty), maxQty));
  const [priceStr, setPriceStr] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [curUnit, setCurUnit] = useState<number>(Number(listing.price) || 0);
  const [sent, setSent] = useState<any>(null);

  // Seçilən say üçün hazırkı qiymət (pillə endirimi nəzərə alınır).
  useEffect(() => {
    const tm = setTimeout(() => {
      fetch(`${API}/listings/${listing.id}/price?qty=${qty}`)
        .then((r) => r.json())
        .then((d) => { if (d?.success && d.unitPrice != null) setCurUnit(Number(d.unitPrice)); })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(tm);
  }, [listing.id, qty]);

  const price = parseFloat(priceStr.replace(",", "."));
  const hasPrice = Number.isFinite(price) && price > 0;
  const minPrice = Math.round(curUnit * MIN_RATIO * 100) / 100;
  const tooHigh = hasPrice && price >= curUnit;
  const tooLow = hasPrice && price < minPrice;
  const pct = hasPrice && curUnit > 0 ? Math.round((1 - price / curUnit) * 100) : 0;

  const submit = async () => {
    if (!token) { toast("Təklif göndərmək üçün daxil olun", "error"); return; }
    if (!hasPrice) { toast("Təklif etdiyiniz qiyməti yazın", "error"); return; }
    if (tooHigh) { toast(`Təklif hazırkı qiymətdən (${formatPrice(curUnit)} ₼) aşağı olmalıdır`, "error"); return; }
    if (tooLow) { toast(`Təklif çox aşağıdır — ən azı ${formatPrice(minPrice)} ₼ yazın`, "error"); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/listings/${listing.id}/offers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty, unitPrice: price, message: message.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) { toast(data?.message || "Xəta baş verdi", "error"); return; }
      toast("Təklifiniz satıcıya göndərildi ✓", "success");
      setSent(data.offer || { id: null });
      onSuccess?.(data.offer);
    } catch {
      toast("Xəta baş verdi", "error");
    } finally {
      setBusy(false);
    }
  };

  const img = listing.images?.[0];
  const inputCls = "w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-to)]/40";

  if (sent) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center text-2xl">✓</div>
        <p className="font-bold">Təklifiniz göndərildi</p>
        <p className="text-sm text-muted mt-1">
          {qty} ədəd × {formatPrice(price)} ₼ — satıcı cavab verəndə bildiriş alacaqsınız.
          {listing.personal
            ? " Qəbul etsə, razılaşma söhbətinizə yazılacaq — alışı satıcı ilə mesajlaşaraq tamamlayacaqsınız."
            : " Qəbul etsə, 48 saat ərzində bu qiymətlə ala bilərsiniz."}
        </p>
        <div className="mt-4 flex gap-2 justify-center flex-wrap">
          <Link href={sent.id ? `/offers?id=${sent.id}` : "/offers"}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] hover:brightness-110">
            💬 Qiymət təkliflərim →
          </Link>
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm bg-input-bg border border-input-border">Bağla</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {showListing && (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-input-bg/60 border border-card-border">
          <div className="w-12 h-12 rounded-lg bg-input-bg overflow-hidden shrink-0 flex items-center justify-center ring-1 ring-card-border">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imgUrl(img)} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : <span>📦</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{listing.title}</p>
            <p className="text-xs text-muted">{formatPrice(listing.price)} ₼{typeof listing.stock === "number" ? ` · stok: ${listing.stock}` : ""}</p>
          </div>
          {onChangeListing && (
            <button type="button" onClick={onChangeListing} className="text-xs font-semibold text-[var(--brand-to)] hover:underline shrink-0">Dəyiş</button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--brand-soft)] text-sm">
        <span className="text-muted">Hazırkı qiymət{qty > 1 ? ` (${qty} ədəd üçün)` : ""}</span>
        <b>{formatPrice(curUnit)} ₼ <span className="font-normal text-muted text-xs">/ ədəd</span></b>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Say</label>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}
              className="w-9 h-10 bg-input-bg border border-input-border rounded-lg disabled:opacity-40">−</button>
            <input type="number" min={1} max={maxQty} value={qty}
              onChange={(e) => { const n = parseInt(e.target.value) || 1; setQty(Math.min(Math.max(1, n), maxQty)); }}
              className="w-14 h-10 text-center bg-input-bg border border-input-border rounded-lg text-sm" />
            <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}
              className="w-9 h-10 bg-input-bg border border-input-border rounded-lg disabled:opacity-40">+</button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Təklif etdiyiniz qiymət (1 ədəd, ₼)</label>
          <input type="text" inputMode="decimal" value={priceStr} onChange={(e) => setPriceStr(e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder={formatPrice(Math.round(curUnit * 0.95))} className={inputCls} />
        </div>
      </div>

      {hasPrice && (
        <p className={`text-xs font-semibold ${tooHigh || tooLow ? "text-red-500" : "text-green-600"}`}>
          {tooHigh
            ? `Təklif hazırkı qiymətdən (${formatPrice(curUnit)} ₼) aşağı olmalıdır — bu qiymətə elə indi ala bilərsiniz`
            : tooLow
              ? `Təklif çox aşağıdır — ən azı ${formatPrice(minPrice)} ₼ yazın`
              : `−${pct}% · cəmi ${formatPrice(Math.round(price * qty * 100) / 100)} ₼`}
        </p>
      )}

      <div>
        <label className="block text-xs font-medium text-muted mb-1">Satıcıya mesaj (istəyə bağlı)</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} rows={2}
          placeholder="Məs.: bu gün götürə bilərəm" className={`${inputCls} resize-none`} />
      </div>

      <p className="text-[11px] text-muted leading-relaxed">
        {listing.personal
          ? <>ℹ️ Fərdi satıcı — satıcı qəbul etsə razılaşdırılmış qiymət söhbətinizə yazılır, görüş və ödənişi mesajla razılaşırsınız. Satıcı əks-təklif də göndərə bilər.</>
          : <>ℹ️ Satıcı qəbul etsə, <b>48 saat</b> ərzində bu qiymətlə ala bilərsiniz. Satıcı əks-təklif də göndərə bilər.</>}
      </p>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm">Ləğv et</button>
        )}
        <button type="button" onClick={submit} disabled={busy || !hasPrice || tooHigh || tooLow}
          className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] hover:brightness-110 disabled:opacity-50">
          {busy ? "..." : "💬 Təklif göndər"}
        </button>
      </div>
    </div>
  );
}
