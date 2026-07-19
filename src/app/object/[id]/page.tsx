"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import ListingCard from "@/components/ListingCard";
import ShareButton from "@/components/ShareButton";
import QRShare from "@/components/QRShare";
import ReviewsSection from "@/components/ReviewsSection";
import { API } from "@/lib/api";

export default function ObjectPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token, isLoggedIn } = useAuth();
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Referal
  const [elig, setElig] = useState<any>(null);
  const [refMode, setRefMode] = useState(false);
  const [sel, setSel] = useState<Record<number, number>>({});
  const [refBusy, setRefBusy] = useState(false);
  const [refLink, setRefLink] = useState("");

  useEffect(() => {
    fetch(`${API}/objects/${params.id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => { toast(t("error"), "error"); })
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!isLoggedIn || !token || !data?.object?.referralEnabled) return;
    fetch(`${API}/objects/${params.id}/referral-eligibility`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => { if (d.success) setElig(d); }).catch(() => {});
  }, [isLoggedIn, token, data, params.id]);

  const toggleSel = (id: number) => setSel((s) => { const n = { ...s }; if (n[id]) delete n[id]; else n[id] = 1; return n; });
  const setQty = (id: number, q: number) => setSel((s) => ({ ...s, [id]: Math.max(1, q) }));

  const generateLink = async () => {
    const items = Object.entries(sel).map(([listingId, quantity]) => ({ listingId: Number(listingId), quantity }));
    if (items.length === 0) { toast("Ən azı bir məhsul seçin", "error"); return; }
    setRefBusy(true);
    try {
      const r = await fetch(`${API}/referral/cart`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ objectId: Number(params.id), items }),
      }).then((x) => x.json());
      if (r.success) { setRefLink(`${window.location.origin}/r/${r.token}`); toast("Link yaradıldı ✓", "success"); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setRefBusy(false); }
  };

  const copyLink = () => { navigator.clipboard?.writeText(refLink); toast("Link kopyalandı", "success"); };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.object) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <p className="text-muted">Obyekt tapılmadı</p>
      </div>
    );
  }

  const { object, listings } = data;
  const mapHref = object.latitude && object.longitude
    ? `https://www.openstreetmap.org/?mlat=${object.latitude}&mlon=${object.longitude}#map=17/${object.latitude}/${object.longitude}`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Geri qayıtma qlobal BackButton ilə edilir (layout) */}

      {/* Obyekt başlığı */}
      <div className="bg-card border border-card-border rounded-2xl p-5 sm:p-7 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-3xl shrink-0">🏪</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold">{object.name}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <ShareButton title={object.name} text={`${object.name} — tradixai`} compact className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-input-bg border border-input-border text-muted hover:text-orange-500 hover:border-orange-500/50 transition-all" />
                <QRShare path={`/object/${params.id}`} title={object.name} subtitle={`Obyekt №${object.id}`} compact className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-input-bg border border-input-border text-muted hover:text-orange-500 hover:border-orange-500/50 transition-all" />
              </div>
            </div>
            {object.business?.name && (
              <p className="text-sm text-muted mb-2">Biznes: <span className="font-medium text-foreground">{object.business.name}</span></p>
            )}
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
              {(object.city || object.address) && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  {[object.city, object.address].filter(Boolean).join(", ")}
                </span>
              )}
              {object.phone && (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  {object.phone}
                </span>
              )}
              {mapHref && (
                <a href={mapHref} target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-400">Xəritədə aç →</a>
              )}
            </div>
            {/* Opsional veb-sayt / sosial şəbəkələr */}
            {object.business && [object.business.website, object.business.instagram, object.business.facebook, object.business.tiktok, object.business.youtube, object.business.linkedin].some(Boolean) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {[
                  { k: "website", label: "🌐 Sayt", v: object.business.website },
                  { k: "instagram", label: "📸 Instagram", v: object.business.instagram },
                  { k: "facebook", label: "👍 Facebook", v: object.business.facebook },
                  { k: "tiktok", label: "🎵 TikTok", v: object.business.tiktok },
                  { k: "youtube", label: "▶️ YouTube", v: object.business.youtube },
                  { k: "linkedin", label: "💼 LinkedIn", v: object.business.linkedin },
                ].filter((x) => x.v).map((x) => (
                  <a key={x.k} href={/^https?:\/\//.test(x.v) ? x.v : `https://${x.v}`} target="_blank" rel="noreferrer"
                    className="text-xs px-2.5 py-1 rounded-lg bg-input-bg border border-input-border hover:border-orange-500/50 hover:text-orange-500 transition-colors">{x.label}</a>
                ))}
              </div>
            )}
            {object.activityAreas?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {object.activityAreas.map((a: string) => (
                  <span key={a} className="px-2.5 py-1 bg-input-bg border border-input-border rounded-lg text-[11px] text-muted">{a}</span>
                ))}
              </div>
            )}
            {object.referralEnabled && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/30 rounded-lg text-[11px] font-semibold">
                  🤝 Referal satışa icazə verir
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Referal — peşəkar üçün */}
      {object.referralEnabled && elig && (
        <div className="bg-card border border-card-border rounded-2xl p-5 mb-6">
          <h2 className="font-semibold mb-1 flex items-center gap-2">🤝 Referal satış</h2>
          {elig.eligible ? (
            <>
              <p className="text-sm text-muted mb-3">Siz uyğunsunuz — komissiya <b className="text-orange-500">{elig.commissionPercent}%</b>. Məhsul seçin, link yaradın və alıcıya göndərin. Sifariş verildikdə komissiya hesabınıza yazılır.</p>
              {!refMode && !refLink && (
                <button onClick={() => setRefMode(true)} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold">Referal səbət yarat</button>
              )}
              {refMode && !refLink && (
                <div className="space-y-2">
                  <div className="max-h-72 overflow-y-auto space-y-1.5 border border-input-border rounded-xl p-2">
                    {listings.map((l: any) => (
                      <div key={l.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-input-bg">
                        <input type="checkbox" checked={!!sel[l.id]} onChange={() => toggleSel(l.id)} className="w-4 h-4 accent-orange-500" />
                        <span className="flex-1 min-w-0 text-sm truncate">{l.title}</span>
                        <span className="text-xs text-muted">{l.price} AZN</span>
                        {sel[l.id] && (
                          <input type="number" min={1} value={sel[l.id]} onChange={(e) => setQty(l.id, parseInt(e.target.value) || 1)} className="w-14 px-2 py-1 bg-input-bg border border-input-border rounded-lg text-xs" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={generateLink} disabled={refBusy} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{refBusy ? "..." : "Link yarat"}</button>
                    <button onClick={() => { setRefMode(false); setSel({}); }} className="px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm">Ləğv</button>
                  </div>
                </div>
              )}
              {refLink && (
                <div className="space-y-2">
                  <p className="text-sm text-green-500 font-medium">✓ Link hazırdır — alıcıya göndərin:</p>
                  <div className="flex gap-2">
                    <input readOnly value={refLink} className="flex-1 px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
                    <button onClick={copyLink} className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold">Kopyala</button>
                  </div>
                  <button onClick={() => { setRefLink(""); setRefMode(false); setSel({}); }} className="text-xs text-orange-500">Yeni link yarat</button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">{elig.reason}{elig.commissionPercent ? ` (komissiya ${elig.commissionPercent}%)` : ""}</p>
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Məhsullar / Xidmətlər ({listings?.length || 0})</h2>
      {!listings || listings.length === 0 ? (
        <div className="text-center py-16 text-muted">{t("noResults")}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {listings.map((listing: any) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {/* Obyekt rəyləri — yalnız bu obyektdən alış edən yaza bilər */}
      <ReviewsSection base={`/objects/${object.id}`} title="Obyekt rəyləri" />
    </div>
  );
}
