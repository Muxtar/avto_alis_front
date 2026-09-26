"use client";
import { useState, useEffect, useCallback } from "react";
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
import { referralUrl } from "@/lib/referral";
import ReferralLinkBox from "@/components/ReferralLinkBox";

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
  const [refLink, setRefLink] = useState<{ url: string; expiresAt: string; percent: number } | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyNote, setApplyNote] = useState("");

  useEffect(() => {
    fetch(`${API}/objects/${params.id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => { toast(t("error"), "error"); })
      .finally(() => setLoading(false));
  }, [params.id]);

  const loadElig = useCallback(() => {
    if (!isLoggedIn || !token || !data?.object?.referralEnabled) return;
    fetch(`${API}/objects/${params.id}/referral-eligibility`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => { if (d.success) setElig(d); }).catch(() => {});
  }, [isLoggedIn, token, data, params.id]);
  useEffect(() => { loadElig(); }, [loadElig]);

  // Müraciət (INVITED auditoriya) və ya dəvəti qəbul — eyni endpoint.
  const applyProgram = async (withNote: boolean) => {
    if (!elig?.programId) return;
    setRefBusy(true);
    try {
      const r = await fetch(`${API}/referral/programs/${elig.programId}/apply`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(withNote && applyNote.trim() ? { note: applyNote.trim() } : {}),
      }).then((x) => x.json());
      if (r.success) {
        toast(r.partner?.status === "ACTIVE" ? "Qəbul olundu — indi link yarada bilərsiniz ✓" : "Müraciət göndərildi ✓", "success");
        setApplyOpen(false); setApplyNote(""); loadElig();
      } else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setRefBusy(false); }
  };

  const toggleSel = (id: number) => setSel((s) => { const n = { ...s }; if (n[id]) delete n[id]; else n[id] = 1; return n; });
  const setQty = (id: number, q: number) => setSel((s) => ({ ...s, [id]: Math.max(1, q) }));

  const generateLink = async () => {
    const items = Object.entries(sel).map(([listingId, quantity]) => ({ listingId: Number(listingId), quantity }));
    if (items.length === 0) { toast("Ən azı bir məhsul seçin", "error"); return; }
    setRefBusy(true);
    try {
      const r = await fetch(`${API}/referral/cart`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }).then((x) => x.json());
      if (r.success) { setRefLink({ url: referralUrl(r.token), expiresAt: r.expiresAt, percent: r.percent }); toast("Link yaradıldı ✓", "success"); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setRefBusy(false); }
  };

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
    <div className="page-wrap py-4 sm:py-6">
      {/* Geri qayıtma qlobal BackButton ilə edilir (layout) */}

      {/* Obyekt başlığı */}
      <div className="bg-card border border-card-border rounded-2xl p-5 sm:p-7 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-3xl shrink-0">🏪</div>
          <div className="flex-1 min-w-0">
            {/* Ad + № + biznes — bir başlıq bloku, sağda paylaş/QR */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold leading-tight">{object.name}</h1>
                <p className="text-xs text-muted mt-0.5">
                  Obyekt №{object.id}
                  {object.business?.name ? <> · <span className="font-medium text-foreground">{object.business.name}</span></> : null}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ShareButton title={object.name} text={`${object.name} — tradixai`} compact className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-input-bg border border-input-border text-muted hover:text-orange-500 hover:border-orange-500/50 transition-all" />
                <QRShare path={`/object/${params.id}`} title={object.name} subtitle={`Obyekt №${object.id}`} compact className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-input-bg border border-input-border text-muted hover:text-orange-500 hover:border-orange-500/50 transition-all" />
              </div>
            </div>

            {/* Reytinq zolağı — bir baxışda etibar (5 ulduz + bəyən/bəyənmə %) + məhsul sayı */}
            <div className="mt-3 rounded-xl border border-card-border bg-input-bg/40 p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {object.rating && object.rating.count > 0 ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold leading-none">{(object.rating.avg || 0).toFixed(1)}</span>
                    <div className="flex flex-col">
                      <span className="inline-flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span key={n} className={`text-sm leading-none ${n <= Math.round(object.rating.avg || 0) ? "text-amber-400" : "text-muted/30"}`}>★</span>
                        ))}
                      </span>
                      <span className="text-[11px] text-muted">{object.rating.count} rəy</span>
                    </div>
                  </div>
                  {object.rating.likePercent != null && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-500/10 text-green-600">👍 {object.rating.likePercent}% müsbət</span>
                  )}
                  <span className="inline-flex items-center gap-2.5 text-xs">
                    <span className="text-green-600 font-medium">👍 {object.rating.likes}</span>
                    <span className="text-red-500 font-medium">👎 {object.rating.dislikes}</span>
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted">⭐ Hələ reytinq yoxdur — ilk rəyi siz yazın</span>
              )}
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted">🛍 <b className="text-foreground">{listings?.length || 0}</b> məhsul</span>
            </div>

            {/* Əlaqə/məkan — səliqəli chip-lər */}
            <div className="flex flex-wrap gap-2 mt-3">
              {(object.city || object.address) && (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-input-bg border border-input-border text-muted">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                  {[object.city, object.address].filter(Boolean).join(", ")}
                </span>
              )}
              {mapHref && (
                <a href={mapHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-input-bg border border-input-border text-orange-500 hover:border-orange-500/50 transition-colors">🗺 Xəritədə aç</a>
              )}
              {object.referralEnabled && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 text-orange-500 border border-orange-500/30 rounded-lg text-xs font-semibold">🤝 Referal satış</span>
              )}
            </div>

            {/* Sosial şəbəkələr */}
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

            {/* Fəaliyyət sahələri */}
            {object.activityAreas?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {object.activityAreas.map((a: string) => (
                  <span key={a} className="px-2.5 py-1 bg-input-bg border border-input-border rounded-lg text-[11px] text-muted">{a}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* İxtisas endirimləri — sənədlə təsdiqli peşə sahiblərinə */}
      <ObjectProDiscounts objectId={Number(params.id)} />

      {/* Referal satış — daxil olmuş istifadəçi üçün (proqram varsa) */}
      {object.referralEnabled && elig && (() => {
        const refIds: number[] = Array.isArray(elig.listingIds) ? elig.listingIds : [];
        const refListings = (listings || []).filter((l: any) => refIds.includes(l.id));
        const ps: string | null = elig.partnerStatus || null;
        return (
        <div className="bg-card border border-card-border rounded-2xl p-5 mb-6">
          <h2 className="font-semibold mb-1 flex items-center gap-2">🤝 Referal satış</h2>
          {elig.eligible ? (
            <>
              <p className="text-sm text-muted mb-3">Bu mağazanın məhsullarını satıb <b className="text-orange-500">{elig.commissionPercent}%</b> komissiya qazanın. Məhsul seçin, link yaradın və alıcıya göndərin. Komissiya məhsul çatdırılıb qaytarma müddəti bitəndən sonra ödənilir. <Link href="/referral" className="text-orange-500 hover:underline">Linklərim →</Link></p>
              {refListings.length === 0 ? (
                <p className="text-sm text-muted">Hazırda referal satışa daxil olan məhsul yoxdur.</p>
              ) : (
                <>
                  {!refMode && !refLink && (
                    <button onClick={() => setRefMode(true)} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold">Referal link yarat ({refListings.length} məhsul)</button>
                  )}
                  {refMode && !refLink && (
                    <div className="space-y-2">
                      <div className="max-h-72 overflow-y-auto space-y-1.5 border border-input-border rounded-xl p-2">
                        {refListings.map((l: any) => (
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
                    <ReferralLinkBox url={refLink.url} expiresAt={refLink.expiresAt} percent={refLink.percent} title={object.name}
                      onReset={() => { setRefLink(null); setRefMode(false); setSel({}); }} />
                  )}
                </>
              )}
            </>
          ) : ps === "INVITED" ? (
            <>
              <p className="text-sm text-muted mb-2">Mağaza sizi məhsullarını komissiya ilə satmağa dəvət edib.</p>
              <button onClick={() => applyProgram(false)} disabled={refBusy} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Dəvəti qəbul et</button>
            </>
          ) : ps === "REQUESTED" ? (
            <p className="text-sm text-muted">⏳ Müraciətiniz mağazada gözləyir.</p>
          ) : (
            <>
              <p className="text-sm text-muted">{elig.reason || "Bu mağazanın məhsullarını referal ilə sata bilməzsiniz."}</p>
              {elig.audience === "INVITED" && ps !== "REVOKED" && elig.programId && (
                applyOpen ? (
                  <div className="mt-2 space-y-2">
                    <textarea value={applyNote} onChange={(e) => setApplyNote(e.target.value)} maxLength={300} rows={2} placeholder="Qeyd (istəyə bağlı): özünüz haqqında qısa məlumat"
                      className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => applyProgram(true)} disabled={refBusy} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{refBusy ? "..." : "Göndər"}</button>
                      <button onClick={() => setApplyOpen(false)} className="px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm">Ləğv</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setApplyOpen(true)} className="mt-2 px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-semibold hover:border-orange-500/50">{ps === "REJECTED" ? "Yenidən müraciət et" : "Müraciət et"}</button>
                )
              )}
              {elig.audience === "PROFESSION" && (
                <Link href="/profile" className="inline-block mt-1.5 text-xs text-orange-500 hover:underline">Profildə ixtisas əlavə et →</Link>
              )}
            </>
          )}
        </div>
        );
      })()}

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

function ObjectProDiscounts({ objectId }: { objectId: number }) {
  const { token } = useAuth();
  const [rules, setRules] = useState<{ profession: string; percent: number; productCount: number | null; mine: boolean }[]>([]);
  useEffect(() => {
    let alive = true;
    fetch(`${API}/objects/${objectId}/pro-discounts`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json()).then((d) => { if (alive) setRules(d?.rules || []); }).catch(() => {});
    return () => { alive = false; };
  }, [objectId, token]);
  if (!rules.length) return null;
  return (
    <div className="surface rounded-2xl p-4 sm:p-5 mb-5">
      <h2 className="font-semibold mb-1 flex items-center gap-2">🎓 İxtisas endirimləri</h2>
      <p className="text-xs text-muted mb-3">İxtisasını sənədlə təsdiqləmiş alıcılara bu mağazanın məhsullarında endirim — səbətdə avtomatik tətbiq olunur.</p>
      <div className="flex flex-wrap gap-2">
        {rules.map((r) => (
          <span key={r.profession} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${r.mine ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-input-bg border-input-border"}`}>
            {r.mine ? "✓ " : ""}{r.profession} −{r.percent}%{r.productCount ? ` · ${r.productCount} məhsul` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
