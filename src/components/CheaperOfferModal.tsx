"use client";
// «DAHA UCUZ» pəncərəsi — hər məhsulun üzərindən (kart və detal səhifəsi) açılır.
//
// İki yol:
//   1) Bu satıcıya qiymət təklif et — PriceOfferForm. Biznes elanında qəbul
//      olunsa alış pəncərəsi açılır; fərdi elanda razılaşma chat-a yazılır.
//   2) Başqa satıcılardan daha ucuzunu istə — sorğu (inquiry) uyğun
//      satıcılara gedir; mətn məhsulun adı ilə, istinad qiyməti ilə dolur.
//
// Kartlar <Link> içindədir: pəncərə portal ilə body-yə çəkilir, kliklər isə
// kökdə dayandırılır ki, karta klik (səhifəyə keçid) işə düşməsin.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/lib/LanguageContext";
import { API } from "@/lib/api";
import { AZ_CITIES } from "@/lib/cities";
import PriceOfferForm, { type OfferListing } from "@/components/PriceOfferForm";

export interface CheaperListing extends OfferListing {
  city?: string | null;
  ownerId?: number | null;
}

export default function CheaperOfferModal({ listing, onClose, initialTab = "offer", initialQty = 1 }: {
  listing: CheaperListing; onClose: () => void; initialTab?: "offer" | "inquiry"; initialQty?: number;
}) {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState<"offer" | "inquiry">(initialTab);
  const [text, setText] = useState(listing.title);
  const [cities, setCities] = useState<string[]>(listing.city ? [listing.city] : []);
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const mine = user?.id != null && listing.ownerId === user.id;
  const out = listing.type !== "SERVICE" && typeof listing.stock === "number" && listing.stock <= 0;

  const sendInquiry = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: text.trim(), cities, listingId: listing.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) { toast(data?.message || t("error"), "error"); return; }
      toast(`${data.matchedSellers || 0} ${t("sellersMatched")}`, "success");
      onClose();
      router.push("/inquiries");
    } catch { toast(t("error"), "error"); } finally { setSending(false); }
  };

  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      // React hadisələri portal olsa da kartdakı <Link>-ə qədər qalxır — burada dayandırılır.
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div className="bg-card border border-card-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto orders-scroll"
        onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Daha ucuz təklif et">
        <div className="px-5 pt-4 pb-3 border-b border-card-border sticky top-0 bg-card z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-lg flex items-center gap-2">🔻 Daha ucuz təklif et</h3>
              <p className="text-muted text-xs truncate">«{listing.title}»</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full text-muted hover:text-foreground hover:bg-input-bg flex items-center justify-center" aria-label="Bağla">✕</button>
          </div>
          <div className="seg-tabs mt-3" role="tablist">
            <button type="button" role="tab" aria-selected={tab === "offer"} onClick={() => setTab("offer")}
              className={`seg-tab ${tab === "offer" ? "is-active" : ""}`} style={{ whiteSpace: "normal", lineHeight: 1.25 }}>💬 Bu satıcıya təklif</button>
            <button type="button" role="tab" aria-selected={tab === "inquiry"} onClick={() => setTab("inquiry")}
              className={`seg-tab ${tab === "inquiry" ? "is-active" : ""}`} style={{ whiteSpace: "normal", lineHeight: 1.25 }}>📨 Başqa satıcılardan istə</button>
          </div>
        </div>

        <div className="p-5">
          {!token ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted mb-3">Təklif göndərmək üçün daxil olun.</p>
              <button onClick={() => { onClose(); router.push("/"); }} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]">Daxil ol</button>
            </div>
          ) : tab === "offer" ? (
            mine ? (
              <p className="text-sm text-muted text-center py-6">Bu sizin elanınızdır — öz elanınıza təklif verə bilməzsiniz.</p>
            ) : out ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted">Bu məhsul stokda yoxdur. Başqa satıcılardan daha ucuzunu istəyə bilərsiniz.</p>
                <button onClick={() => setTab("inquiry")} className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--brand-soft)] text-[var(--brand-to)]">📨 Başqa satıcılardan istə</button>
              </div>
            ) : (
              <PriceOfferForm listing={listing} showListing initialQty={initialQty} onCancel={onClose} />
            )
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted">{t("cheaperSearchDesc")} Bu elanın qiyməti istinad kimi sorğuya əlavə olunur.</p>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Nə axtarırsınız?</label>
                <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} rows={3}
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-to)]/40"
                  placeholder={t("cheaperSearchTextPlaceholder")} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">📍 {t("cheaperSearchCities")} {cities.length > 0 && `(${cities.length})`}</label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto orders-scroll p-2 bg-input-bg/50 border border-input-border rounded-xl">
                  {AZ_CITIES.map((c) => {
                    const on = cities.includes(c);
                    return (
                      <button key={c} type="button" onClick={() => setCities((p) => on ? p.filter((x) => x !== c) : [...p, c])}
                        className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${on ? "bg-[var(--brand-to)] text-white border-transparent" : "bg-card border-input-border text-muted hover:text-foreground"}`}>
                        {c}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted mt-1.5">{t("cheaperSearchCitiesHint")}</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={onClose} className="px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm">Ləğv et</button>
                <button onClick={sendInquiry} disabled={sending || !text.trim()}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] disabled:opacity-50">
                  {sending ? "..." : `📨 ${t("cheaperSearchSubmit")}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
