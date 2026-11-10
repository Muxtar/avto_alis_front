"use client";
// REKLAMLARIM — ana səhifədə ödənişli reklam.
// Fərdi satıcı da, sahibkar da öz elanını və ya obyektini ana karuseldə
// (böyük slayd) və ya yan bannerdə reklam edə bilər. Axın:
//   yer seç → nəyi reklam edirsən → mətn/şəkil (canlı önizləmə) → paket → ödəniş
//   → admin yoxlaması → yayım (müddət təsdiqdən başlayır).
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import PageHero, { heroBtnPrimary } from "@/components/PageHero";
import { adImg } from "@/components/HomeCarousel";

type Placement = {
  key: "MAIN" | "SIDE"; label: string; perDay: number; max: number; used: number; free: number; nextFreeAt: string | null;
  packages: { days: number; discount: number; price: number }[];
};
type SrcListing = { id: number; title: string; price: number; image: string | null; type: string; city: string | null; sellerKind: string };
type SrcObject = { id: number; name: string; address: string; city: string | null; businessName: string | null; image: string | null };
type MyAd = {
  id: number; placement: string; sourceType: string; listingId: number | null; objectId: number | null; sellerKind: string;
  headline: string; subtitle: string | null; image: string | null; days: number; amount: number; status: string;
  rejectReason: string | null; refundStatus: string | null; startsAt: string | null; endsAt: string | null;
  impressions: number; clicks: number; createdAt: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  UNPAID: { label: "Ödəniş gözləyir", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  PENDING_REVIEW: { label: "Yoxlamada", cls: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
  ACTIVE: { label: "Yayımda", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  EXPIRED: { label: "Bitib", cls: "bg-input-bg text-muted border-input-border" },
  REJECTED: { label: "Rədd edilib", cls: "bg-red-500/10 text-red-500 border-red-500/30" },
};

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("az-AZ", { day: "numeric", month: "long" }) : "—");

export default function AdsPage() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [ads, setAds] = useState<MyAd[] | null>(null);
  const [wizard, setWizard] = useState(false);

  const load = () => {
    if (!token) return;
    fetch(`${API}/me/ads`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => setAds(d.ads || [])).catch(() => setAds([]));
  };
  useEffect(load, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bankdan qayıdış (?pay=success|failed) və ya «Reklam ver» linki (?new=1).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const pay = sp.get("pay");
    if (pay === "success") toast("Ödəniş qəbul edildi — reklam yoxlamaya göndərildi ✓", "success");
    else if (pay) toast("Ödəniş tamamlanmadı", "error");
    if (sp.get("new") === "1") setWizard(true);
    if (pay || sp.get("new")) router.replace("/reklam");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goPay = async (id: number) => {
    const r = await fetch(`${API}/me/ads/${id}/pay`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json()).catch(() => null);
    if (!r?.success) { toast(r?.message || "Ödəniş başlamadı", "error"); return; }
    try { sessionStorage.setItem("adPay", String(id)); } catch { /* keç */ }
    window.location.href = r.redirectUrl;
  };
  const remove = async (id: number) => {
    const r = await fetch(`${API}/me/ads/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json()).catch(() => null);
    if (!r?.success) { toast(r?.message || "Silinmədi", "error"); return; }
    load();
  };

  if (authLoading) return null;
  if (!isLoggedIn) return <p className="text-center py-20 text-muted">Reklam vermək üçün hesabınıza daxil olun.</p>;

  const active = (ads || []).filter((a) => a.status === "ACTIVE");
  const totalViews = (ads || []).reduce((s, a) => s + a.impressions, 0);
  const totalClicks = (ads || []).reduce((s, a) => s + a.clicks, 0);

  return (
    <div className="modern-page max-w-4xl mx-auto px-3 sm:px-6 py-6">
      <PageHero icon="📣" kicker="tradixai · reklam" title="Reklamlarım"
        subtitle="Elanınızı və ya obyektinizi ana səhifənin karuselində və yan bannerində reklam edin — fərdi satıcı da, sahibkar da."
        stats={ads ? [
          { label: "Yayımda", value: active.length, tone: "ok" },
          { label: "Göstərilmə", value: totalViews },
          { label: "Klik", value: totalClicks },
        ] : undefined}
        actions={<button onClick={() => setWizard(true)} className={heroBtnPrimary}>＋ Yeni reklam</button>} />

      {ads === null ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--brand-to)] border-t-transparent rounded-full animate-spin" /></div>
      ) : ads.length === 0 ? (
        <div className="wiz-card text-center py-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center text-2xl mb-2">📣</div>
          <p className="font-semibold">Hələ reklamınız yoxdur</p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">Məhsulunuz ana səhifədə hər gələn alıcıya görünsün. 3 gündən başlayan paketlər, uzun paketlərdə endirim.</p>
          <button onClick={() => setWizard(true)} className="mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]">Reklam ver</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {ads.map((a) => {
            const st = STATUS[a.status] || STATUS.EXPIRED;
            const ctr = a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(1) : "0";
            return (
              <div key={a.id} className="wiz-card !p-3 sm:!p-4 flex gap-3">
                <div className="w-20 h-20 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-input-bg shrink-0">
                  {a.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={adImg(a.image)} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">📣</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate flex-1 min-w-0">{a.headline}</p>
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {a.placement === "MAIN" ? "Ana karusel" : "Yan banner"} · {a.days} gün · {a.amount > 0 ? `${formatPrice(a.amount)} AZN` : "Pulsuz"} · {a.sellerKind === "BUSINESS" ? "Sahibkar" : "Fərdi"}
                  </p>
                  {a.status === "ACTIVE" && <p className="text-xs mt-1">⏳ {fmtDate(a.endsAt)} tarixinədək</p>}
                  {a.status === "REJECTED" && (
                    <p className="text-xs text-red-500 mt-1">
                      {a.rejectReason}
                      {a.refundStatus === "PENDING" && " · Pul kartınıza qaytarılacaq"}
                      {a.refundStatus === "DONE" && " · Pul qaytarıldı"}
                    </p>
                  )}
                  {(a.status === "ACTIVE" || a.status === "EXPIRED") && (
                    <p className="text-[11px] text-muted mt-1">👁 {a.impressions} göstərilmə · 👆 {a.clicks} klik · {ctr}% CTR</p>
                  )}
                  {a.status === "UNPAID" && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => goPay(a.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]">Ödə</button>
                      <button onClick={() => remove(a.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-input-bg border border-input-border hover:text-red-500">Sil</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {wizard && <AdWizard onClose={() => setWizard(false)} onDone={() => { setWizard(false); load(); }} />}
    </div>
  );
}

// ── Yeni reklam sihirbazı ────────────────────────────────────────────────────
function AdWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [placements, setPlacements] = useState<Placement[] | null>(null);
  const [sources, setSources] = useState<{ listings: SrcListing[]; objects: SrcObject[] } | null>(null);
  const [placement, setPlacement] = useState<"MAIN" | "SIDE">("MAIN");
  const [srcTab, setSrcTab] = useState<"LISTING" | "OBJECT">("LISTING");
  const [listingId, setListingId] = useState<number | null>(null);
  const [objectId, setObjectId] = useState<number | null>(null);
  const [headline, setHeadline] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState("");
  const [days, setDays] = useState(7);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API}/ads/packages`).then((r) => r.json()).then((d) => setPlacements(d.placements || [])).catch(() => setPlacements([]));
    fetch(`${API}/me/ad-sources`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => setSources({ listings: d.listings || [], objects: d.objects || [] })).catch(() => setSources({ listings: [], objects: [] }));
  }, [token]);
  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview); }, [filePreview]);

  const pl = placements?.find((p) => p.key === placement);
  const pkg = pl?.packages.find((p) => p.days === days);
  const listing = sources?.listings.find((l) => l.id === listingId) || null;
  const object = sources?.objects.find((o) => o.id === objectId) || null;
  const sourceType: "LISTING" | "OBJECT" = srcTab;
  const chosen = sourceType === "LISTING" ? listing : object;
  const sellerKind = sourceType === "OBJECT" ? "BUSINESS" : listing?.sellerKind || "INDIVIDUAL";
  const previewImg = filePreview || adImg(sourceType === "LISTING" ? listing?.image : object?.image);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!sources) return { listings: [], objects: [] };
    return {
      listings: sources.listings.filter((l) => !s || l.title.toLowerCase().includes(s)),
      objects: sources.objects.filter((o) => !s || o.name.toLowerCase().includes(s)),
    };
  }, [sources, q]);

  const pickListing = (l: SrcListing) => { setListingId(l.id); setObjectId(null); if (!headline) setHeadline(l.title.slice(0, 70)); };
  const pickObject = (o: SrcObject) => { setObjectId(o.id); setListingId(null); if (!headline) setHeadline(o.name.slice(0, 70)); if (!subtitle) setSubtitle(o.address.slice(0, 120)); };

  const submit = async () => {
    if (!chosen) { toast("Reklam ediləcək elanı və ya obyekti seçin", "error"); setStep(2); return; }
    if (headline.trim().length < 3) { toast("Başlıq yazın", "error"); setStep(3); return; }
    if (!previewImg) { toast("Şəkil yükləyin", "error"); setStep(3); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("placement", placement);
      fd.append("days", String(days));
      fd.append("sourceType", sourceType);
      if (sourceType === "LISTING") fd.append("listingId", String(listingId)); else fd.append("objectId", String(objectId));
      fd.append("headline", headline.trim());
      if (subtitle.trim()) fd.append("subtitle", subtitle.trim());
      if (file) fd.append("image", file);
      const r = await fetch(`${API}/me/ads`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }).then((x) => x.json());
      if (!r?.success) { toast(r?.message || "Reklam yaradılmadı", "error"); return; }
      if (r.free) { toast("Reklam yoxlamaya göndərildi ✓", "success"); onDone(); return; }
      try { sessionStorage.setItem("adPay", String(r.adId)); } catch { /* keç */ }
      window.location.href = r.redirectUrl;
    } catch { toast("Reklam yaradılmadı", "error"); } finally { setBusy(false); }
  };

  const STEPS = ["Yer", "Nə", "Dizayn", "Paket"];
  const canNext = step === 1 ? !!pl && pl.free > 0 : step === 2 ? !!chosen : step === 3 ? headline.trim().length >= 3 && !!previewImg : true;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-2xl max-h-[94vh] flex flex-col bg-card text-foreground border border-card-border rounded-t-3xl sm:rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Başlıq + addımlar */}
        <div className="px-5 pt-4 pb-3 border-b border-card-border">
          <div className="flex items-center justify-between">
            <p className="font-bold">📣 Yeni reklam</p>
            <button type="button" onClick={onClose} className="text-muted hover:text-foreground" aria-label="Bağla">✕</button>
          </div>
          <div className="flex gap-1.5 mt-3">
            {STEPS.map((s, i) => (
              <button key={s} type="button" onClick={() => i + 1 < step && setStep(i + 1)}
                className={`flex-1 text-left ${i + 1 < step ? "cursor-pointer" : "cursor-default"}`}>
                <span className={`block h-1.5 rounded-full ${i + 1 <= step ? "bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)]" : "bg-input-bg"}`} />
                <span className={`text-[11px] mt-1 block ${i + 1 === step ? "font-semibold" : "text-muted"}`}>{i + 1}. {s}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {placements === null || sources === null ? (
            <div className="py-12 flex justify-center"><span className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : step === 1 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {placements.map((p) => (
                <button key={p.key} type="button" onClick={() => setPlacement(p.key)} disabled={p.free <= 0}
                  className={`wiz-opt text-left !items-stretch ${placement === p.key ? "ring-2 ring-[var(--brand-to)]" : ""} disabled:opacity-50`}>
                  {/* Kiçik sxem — yerin harada olduğunu göstərir */}
                  <div className="w-full aspect-[16/7] rounded-lg bg-input-bg p-1.5 flex gap-1 mb-2">
                    <div className={`flex-[3] rounded ${p.key === "MAIN" ? "bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)]" : "bg-card-border/60"}`} />
                    <div className="flex-1 flex flex-col gap-1">
                      {[0, 1, 2].map((i) => <div key={i} className={`flex-1 rounded ${p.key === "SIDE" && i === 0 ? "bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)]" : "bg-card-border/60"}`} />)}
                    </div>
                  </div>
                  <p className="font-semibold text-sm">{p.key === "MAIN" ? "🖼 Ana karusel" : "📌 Yan banner"}</p>
                  <p className="text-xs text-muted mt-0.5">{p.key === "MAIN" ? "Ana səhifənin böyük slaydı — maksimum diqqət" : "Karuselin yanında kiçik plitə (kompüterdə)"}</p>
                  <p className="text-sm font-bold mt-2">{p.perDay > 0 ? `${formatPrice(p.perDay)} AZN / gün` : "Pulsuz"}</p>
                  <p className={`text-[11px] mt-0.5 ${p.free > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {p.free > 0 ? `${p.free} boş yer var` : `Dolu${p.nextFreeAt ? ` · ${fmtDate(p.nextFreeAt)} boşalır` : ""}`}
                  </p>
                </button>
              ))}
            </div>
          ) : step === 2 ? (
            <div>
              <div className="flex gap-1 p-1 bg-input-bg rounded-xl mb-3">
                {(["LISTING", "OBJECT"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setSrcTab(k)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold ${srcTab === k ? "bg-card shadow" : "text-muted"}`}>
                    {k === "LISTING" ? `📦 Elanlarım (${sources.listings.length})` : `🏢 Obyektlərim (${sources.objects.length})`}
                  </button>
                ))}
              </div>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Axtar..."
                className="w-full mb-3 px-3 py-2 rounded-xl bg-input-bg border border-input-border text-sm focus:outline-none focus:border-orange-500" />
              {srcTab === "LISTING" ? (
                filtered.listings.length === 0 ? (
                  <p className="text-sm text-muted text-center py-8">Saytda görünən elanınız yoxdur. Əvvəlcə elan yerləşdirin.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {filtered.listings.map((l) => (
                      <button key={l.id} type="button" onClick={() => pickListing(l)}
                        className={`flex gap-2.5 p-2 rounded-xl border text-left transition-colors ${listingId === l.id ? "border-[var(--brand-to)] bg-[var(--brand-soft)]" : "border-card-border hover:border-orange-500/50"}`}>
                        <span className="w-14 h-14 rounded-lg overflow-hidden bg-input-bg shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {l.image ? <img src={adImg(l.image)} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center">📦</span>}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-[13px] font-semibold line-clamp-2 block leading-snug">{l.title}</span>
                          <span className="text-xs font-bold text-[var(--brand-to)]">{formatPrice(l.price)} AZN</span>
                          <span className="text-[10px] text-muted ml-1.5">{l.sellerKind === "BUSINESS" ? "Sahibkar" : "Fərdi"}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )
              ) : filtered.objects.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Aktiv obyektiniz yoxdur. Obyekt reklamı üçün təsdiqlənmiş biznes və obyekt lazımdır.</p>
              ) : (
                <div className="space-y-2">
                  {filtered.objects.map((o) => (
                    <button key={o.id} type="button" onClick={() => pickObject(o)}
                      className={`w-full flex gap-2.5 p-2.5 rounded-xl border text-left ${objectId === o.id ? "border-[var(--brand-to)] bg-[var(--brand-soft)]" : "border-card-border hover:border-orange-500/50"}`}>
                      <span className="w-11 h-11 rounded-lg bg-input-bg flex items-center justify-center text-xl shrink-0">🏢</span>
                      <span className="min-w-0">
                        <span className="text-sm font-semibold block truncate">{o.name}</span>
                        <span className="text-xs text-muted block truncate">{o.businessName ? `${o.businessName} · ` : ""}{o.address}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : step === 3 ? (
            <div className="space-y-3">
              {/* Canlı önizləmə — karuseldə necə görünəcək */}
              <div className="relative w-full aspect-[16/8] rounded-xl overflow-hidden bg-[#140f3a]">
                {previewImg && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewImg} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl brightness-[0.45] scale-125" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#140f3a]/95 via-[#140f3a]/70 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-[46%] p-3 flex items-center">
                  <div className="relative w-full h-full rounded-xl overflow-hidden ring-1 ring-white/15 bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {previewImg ? <img src={previewImg} alt="" className="absolute inset-0 w-full h-full object-contain" /> : <span className="absolute inset-0 flex items-center justify-center text-white/60 text-xs">Şəkil yoxdur</span>}
                  </div>
                </div>
                <div className="absolute inset-y-0 left-0 w-[56%] p-3 sm:p-5 flex flex-col justify-center text-white">
                  <div className="flex gap-1 mb-1.5">
                    <span className="rounded-full bg-amber-400 text-[#1c1917] px-1.5 py-px text-[8px] font-extrabold uppercase tracking-wider">Reklam</span>
                    <span className="rounded-full bg-white/15 px-1.5 py-px text-[8px] font-bold">{sellerKind === "BUSINESS" ? "🏢 Sahibkar" : "👤 Fərdi"}</span>
                  </div>
                  <p className="font-black text-sm sm:text-xl leading-tight line-clamp-2">{headline || "Reklam başlığı"}</p>
                  {subtitle && <p className="text-[10px] sm:text-xs text-white/75 mt-1 line-clamp-2">{subtitle}</p>}
                  {listing && sourceType === "LISTING" && listing.price > 0 && <p className="font-black text-sm sm:text-lg mt-1.5">{formatPrice(listing.price)} <span className="text-[10px] text-white/70">AZN</span></p>}
                </div>
              </div>
              <p className="text-[11px] text-muted -mt-1">Önizləmə — ana səhifədə belə görünəcək.</p>
              <div>
                <label className="text-xs font-semibold text-muted">Başlıq <span className="font-normal">({headline.length}/70)</span></label>
                <input value={headline} onChange={(e) => setHeadline(e.target.value.slice(0, 70))} placeholder="Məs. iPhone 15 Pro — zəmanətli, ən sərfəli qiymət"
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-input-bg border border-input-border text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">Qısa izah (istəyə görə) <span className="font-normal">({subtitle.length}/120)</span></label>
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value.slice(0, 120))} placeholder="Məs. Pulsuz çatdırılma · 12 ay zəmanət"
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-input-bg border border-input-border text-sm focus:outline-none focus:border-orange-500" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="px-3 py-2 rounded-xl bg-input-bg border border-input-border text-xs font-semibold cursor-pointer hover:border-orange-500/50">
                  🖼 {file ? "Şəkli dəyiş" : "Xüsusi banner şəkli yüklə"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (filePreview) URL.revokeObjectURL(filePreview);
                    setFile(f); setFilePreview(URL.createObjectURL(f));
                    e.target.value = "";
                  }} />
                </label>
                {file && <button type="button" onClick={() => { URL.revokeObjectURL(filePreview); setFile(null); setFilePreview(""); }} className="text-xs text-muted underline">Elanın şəklinə qayıt</button>}
                <span className="text-[11px] text-muted">Tövsiyə: 1600×900 (16:9)</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {pl?.packages.map((p) => (
                  <button key={p.days} type="button" onClick={() => setDays(p.days)}
                    className={`relative p-3 rounded-xl border text-center ${days === p.days ? "border-[var(--brand-to)] bg-[var(--brand-soft)]" : "border-card-border hover:border-orange-500/50"}`}>
                    {p.discount > 0 && <span className="absolute -top-2 right-2 rounded-full bg-emerald-500 text-white px-1.5 text-[10px] font-bold">-{p.discount}%</span>}
                    <p className="text-lg font-black">{p.days}</p>
                    <p className="text-[11px] text-muted">gün</p>
                    <p className="text-sm font-bold mt-1">{p.price > 0 ? `${formatPrice(p.price)} AZN` : "Pulsuz"}</p>
                  </button>
                ))}
              </div>
              <div className="rounded-xl bg-input-bg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted">Yer</span><span className="font-semibold">{pl?.key === "MAIN" ? "Ana karusel" : "Yan banner"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Reklam</span><span className="font-semibold truncate ml-3">{headline}</span></div>
                <div className="flex justify-between"><span className="text-muted">Satıcı növü</span><span className="font-semibold">{sellerKind === "BUSINESS" ? "Sahibkar" : "Fərdi"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Müddət</span><span className="font-semibold">{days} gün</span></div>
                <div className="flex justify-between border-t border-card-border pt-1.5 mt-1.5"><span className="font-semibold">Cəmi</span><span className="font-black text-[var(--brand-to)]">{pkg && pkg.price > 0 ? `${formatPrice(pkg.price)} AZN` : "Pulsuz"}</span></div>
              </div>
              <p className="text-[11px] text-muted">
                Ödənişdən sonra reklam qısa yoxlamadan keçir (qaydalara uyğunluq). Müddət <b>təsdiq anından</b> başlayır. Reklam qəbul edilməsə pul kartınıza qaytarılır.
              </p>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-card-border flex items-center gap-2">
          {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-sm font-semibold">← Geri</button>}
          <div className="flex-1" />
          {step < 4 ? (
            <button type="button" onClick={() => canNext && setStep(step + 1)} disabled={!canNext}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] disabled:opacity-50">Davam →</button>
          ) : (
            <button type="button" onClick={submit} disabled={busy}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] disabled:opacity-60">
              {busy ? "..." : pkg && pkg.price > 0 ? `Ödə — ${formatPrice(pkg.price)} AZN` : "Göndər"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
