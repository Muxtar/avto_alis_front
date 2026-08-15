"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { API, imgUrl } from "@/lib/api";

/**
 * BİR İSTİFADƏÇİ HAQQINDA HƏR ŞEY.
 *
 * Admin siyahıdan bir sətrə basanda açılır və `/admin/users/:id/full`
 * endpoint-indən tək sorğu ilə bütün mənzərəni gətirir: profil və sənədləri,
 * bizneslər və obyektlər, elanlar, alış/satış tarixçəsi, pul hesabatı,
 * reytinq və şikayətlər, sosial hesablar.
 *
 * Məlumat siyahı sorğusuna QOŞULMUR — 20 istifadəçi üçün birdən çəkmək
 * siyahını ağırlaşdırardı. Yalnız kart açılanda bir dəfə yüklənir.
 */

const azn = (n: number) => (n || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (s?: string | null) => (s ? new Date(s).toLocaleDateString("az-AZ") : "—");
const dtFull = (s?: string | null) => (s ? new Date(s).toLocaleString("az-AZ") : "—");

const TYPE_LABEL: Record<string, string> = {
  CAR_OWNER: "Sahib", MECHANIC: "Usta", PARTS_SELLER: "Satıcı", COURIER: "Kuryer",
};
const STATUS_CLS: Record<string, string> = {
  APPROVED: "bg-green-500/15 text-green-600", PENDING: "bg-amber-500/15 text-amber-600",
  REJECTED: "bg-red-500/15 text-red-500", PAID: "bg-green-500/15 text-green-600",
  PAID_OUT: "bg-green-500/15 text-green-600", AVAILABLE: "bg-amber-500/15 text-amber-600",
  REVERSED: "bg-red-500/15 text-red-500", CANCELLED: "bg-red-500/15 text-red-500",
  DELIVERED: "bg-green-500/15 text-green-600",
};
const chip = (s?: string | null) => STATUS_CLS[String(s || "")] || "bg-input-bg text-muted";

// Ledger statuslarının insan dilində adı — admin "AVAILABLE" oxumamalıdır.
const LEDGER_LABEL: Record<string, string> = {
  AVAILABLE: "Ödəniləcək", PAID_OUT: "Ödənilib", PENDING: "Gözləyir", REVERSED: "Ləğv",
};

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">
        {title}{typeof count === "number" ? ` · ${count}` : ""}
      </p>
      {children}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="bg-input-bg/50 border border-card-border rounded-xl px-3 py-2">
      <p className="text-[10px] text-muted leading-tight">{label}</p>
      <p className={`text-base font-extrabold leading-tight ${tone || ""}`}>{value}</p>
    </div>
  );
}

// Sənəd şəkli — kliklə tam ölçüdə açılır. Yoxdursa ümumiyyətlə göstərilmir.
function Doc({ label, file }: { label: string; file?: string | null }) {
  if (!file) return null;
  return (
    <a href={imgUrl(file)} target="_blank" rel="noreferrer" className="block group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imgUrl(file)} alt={label} loading="lazy"
        className="w-full h-24 object-cover rounded-lg border border-card-border group-hover:border-orange-500 transition-colors bg-input-bg" />
      <p className="text-[10px] text-muted mt-1 truncate">{label} ↗</p>
    </a>
  );
}

export default function UserDetail({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
    setD(null); setErr(null);
    fetch(`${API}/admin/users/${userId}/full`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((r) => { if (r.success) setD(r); else setErr(r.message || "Məlumat alınmadı"); })
      .catch(() => setErr("Şəbəkə xətası"));
  }, [userId]);

  // Escape ilə bağlansın — admin panelində sürətli baxış üçün.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const u = d?.user;
  const c = u?._count || {};
  const money = d?.money;
  // Satıcıya olan borcumuz — "ödəniləcək" sətirlərin cəmi.
  const owed = (money?.ledger || []).find((l: any) => l.status === "AVAILABLE")?.net || 0;

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card border border-card-border sm:rounded-2xl w-full max-w-4xl my-0 sm:my-6" onClick={(e) => e.stopPropagation()}>

        {/* ── Başlıq ── */}
        <div className="sticky top-0 z-10 bg-card border-b border-card-border rounded-t-2xl px-4 py-3 flex items-center gap-3">
          <p className="font-bold text-sm flex-1 truncate">İstifadəçi #{userId}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-input-bg hover:bg-input-bg/70 flex items-center justify-center text-muted">✕</button>
        </div>

        {err ? (
          <p className="p-8 text-center text-red-500 text-sm">{err}</p>
        ) : !d ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="p-4">

            {/* ── Profil kartı ── */}
            <div className="flex items-start gap-4 mb-5">
              {u.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgUrl(u.avatar)} alt="" className="w-20 h-20 rounded-2xl object-cover border border-card-border shrink-0 bg-input-bg" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/80 to-red-600/80 flex items-center justify-center text-white font-bold text-xl shrink-0">
                  {(u.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="font-bold text-lg truncate">{u.name || "—"}</span>
                  <span className="px-1.5 py-0.5 rounded bg-input-bg text-[10px] font-bold">{TYPE_LABEL[u.type] || u.type}</span>
                  {u.role === "ADMIN" && <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 text-[10px] font-bold">ADMIN</span>}
                  {u.verified && <span className="px-1.5 py-0.5 rounded bg-green-500/15 text-green-600 text-[10px] font-bold">✓ Doğrulanıb</span>}
                  {u.sellerVerified && <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 text-[10px] font-bold">🏢 Təsdiqli satıcı</span>}
                  {u.isPremium && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 text-[10px] font-bold">★ Premium</span>}
                  {u.isBlocked && <span className="px-1.5 py-0.5 rounded bg-red-600/20 text-red-600 text-[10px] font-bold">BLOKLU</span>}
                  {u.consultationSuspended && <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 text-[10px] font-bold">Rəy dayandırılıb</span>}
                </div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-0.5 text-[12px]">
                  <span className="text-muted">Telefon: <a href={`tel:${u.phone}`} className="text-foreground font-semibold">{u.phone || "—"}</a></span>
                  <span className="text-muted">E-mail: <b className="text-foreground">{u.email || "—"}</b> {u.emailVerified && <span className="text-green-600">✓</span>}</span>
                  <span className="text-muted">Şəhər: <b className="text-foreground">{u.city || "—"}</b></span>
                  <span className="text-muted">Açıq ID: <b className="text-foreground">{u.publicId || "—"}</b></span>
                  <span className="text-muted">Qeydiyyat: <b className="text-foreground">{dt(u.createdAt)}</b></span>
                  <span className="text-muted">Son görülmə: <b className="text-foreground">{dtFull(u.lastSeen)}</b></span>
                  <span className="text-muted">Profil tam: <b className="text-foreground">{u.profileComplete ? "bəli" : "xeyr"}</b></span>
                  <span className="text-muted">Son mesaj: <b className="text-foreground">{dt(d.lastMessageAt)}</b></span>
                </div>
                {u.bio && <p className="text-[12px] text-muted mt-1.5 italic">“{u.bio}”</p>}
                <Link href={`/seller/${u.id}`} target="_blank"
                  className="inline-block mt-2 px-2.5 py-1 rounded-lg border border-card-border text-[11px] font-semibold hover:bg-input-bg">
                  Saytdakı profili ↗
                </Link>
              </div>
            </div>

            {/* ── Rəqəmlər ── */}
            <Section title="Bir baxışda">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <Stat label="Elan" value={c.listings || 0} />
                <Stat label="Biznes" value={c.businesses || 0} />
                <Stat label="Aldığı sifariş" value={c.buyerOrders || 0} />
                <Stat label="Satdığı sifariş" value={c.sellerOrders || 0} />
                <Stat label="Reytinq" value={u.avgRating ? `${u.avgRating.toFixed(1)}★` : "—"} />
                <Stat label="Şikayət" value={c.complaintsAgainst || 0} tone={c.complaintsAgainst ? "text-red-500" : ""} />
                <Stat label="Mesaj" value={(c.sentMessages || 0) + (c.receivedMessages || 0)} />
                <Stat label="Kontakt" value={c.contacts || 0} />
                <Stat label="Sevimli" value={c.favorites || 0} />
                <Stat label="Rəy alıb" value={c.consultationsBought || 0} />
                <Stat label="Rəy satıb" value={c.consultationsSelling || 0} />
                <Stat label="Verdiyi rəy" value={c.givenRatings || 0} />
              </div>
            </Section>

            {/* ── Pul ── */}
            <Section title="Maliyyə">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <Stat label="Alışları (ödənilmiş)" value={<>{azn(money.boughtTotal)} <span className="text-[10px] text-muted">₼</span></>} />
                <Stat label={`Alış sifarişi`} value={money.boughtOrders} />
                <Stat label="Satışları (ödənilmiş)" value={<>{azn(money.soldTotal)} <span className="text-[10px] text-muted">₼</span></>} />
                <Stat label="Ona borcumuz" value={<>{azn(owed)} <span className="text-[10px] text-muted">₼</span></>} tone={owed > 0 ? "text-amber-600" : ""} />
              </div>
              {money.ledger.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {money.ledger.map((l: any) => (
                    <span key={l.status} className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${chip(l.status)}`}>
                      {LEDGER_LABEL[l.status] || l.status}: {azn(l.net)} ₼ ({l.count})
                    </span>
                  ))}
                </div>
              )}
            </Section>

            {/* ── Kimlik sənədləri ── */}
            {(u.idCardImage || u.selfieImage || u.cvFile || u.idVerifyStatus) && (
              <Section title="Kimlik sənədləri">
                {u.idVerifyStatus && (
                  <p className="text-[12px] mb-2">
                    Status: <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${chip(u.idVerifyStatus)}`}>{u.idVerifyStatus}</span>
                    {u.birthDate && <span className="text-muted ml-3">Doğum: <b className="text-foreground">{dt(u.birthDate)}</b></span>}
                    {u.gender && <span className="text-muted ml-3">Cins: <b className="text-foreground">{u.gender}</b></span>}
                  </p>
                )}
                {/* AI yoxlamasının nəticəsi — adı və üzü tutuşdurur. */}
                {(u.idAiReason || u.idAiNameMatch != null || u.idAiFaceMatch != null) && (
                  <div className="bg-input-bg/50 border border-card-border rounded-xl p-2.5 mb-2 text-[11px]">
                    <p className="font-bold mb-1">🤖 AI yoxlaması</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      {u.idAiNameMatch != null && <span>Ad uyğunluğu: <b className={u.idAiNameMatch ? "text-green-600" : "text-red-500"}>{u.idAiNameMatch ? "uyğun" : "uyğun deyil"}</b>{u.idAiNameScore != null && ` (${Math.round(u.idAiNameScore * 100)}%)`}</span>}
                      {u.idAiFaceMatch != null && <span>Üz uyğunluğu: <b className={u.idAiFaceMatch ? "text-green-600" : "text-red-500"}>{u.idAiFaceMatch ? "eyni şəxs" : "fərqli"}</b>{u.idAiFaceScore != null && ` (${Math.round(u.idAiFaceScore * 100)}%)`}</span>}
                      {u.faceMatchScore != null && <span>Brauzer balı: <b>{Math.round(u.faceMatchScore * 100)}%</b></span>}
                    </div>
                    {u.idAiReason && <p className="text-muted mt-1">{u.idAiReason}</p>}
                  </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <Doc label="Vəsiqə ön" file={u.idCardImage} />
                  <Doc label="Vəsiqə arxa" file={u.idCardBackImage} />
                  <Doc label="Selfie" file={u.selfieImage} />
                  <Doc label="Selfie sağ" file={u.selfieRightImage} />
                  <Doc label="Selfie sol" file={u.selfieLeftImage} />
                  {u.cvFile && (
                    <a href={imgUrl(u.cvFile)} target="_blank" rel="noreferrer"
                      className="h-24 rounded-lg border border-card-border bg-input-bg flex flex-col items-center justify-center text-[11px] hover:border-orange-500">
                      <span className="text-2xl">📄</span>CV ↗
                    </a>
                  )}
                </div>
              </Section>
            )}

            {/* ── Satıcı müraciəti ── */}
            {u.sellerApplication && (
              <Section title="Satıcı müraciəti">
                <div className="bg-input-bg/50 border border-card-border rounded-xl p-3 text-[12px] grid sm:grid-cols-2 gap-x-6 gap-y-1">
                  <span className="text-muted">Status: <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${chip(u.sellerApplication.status)}`}>{u.sellerApplication.status}</span></span>
                  <span className="text-muted">Şirkət: <b className="text-foreground">{u.sellerApplication.businessName || "—"}</b></span>
                  <span className="text-muted">VÖEN: <b className="text-foreground">{u.sellerApplication.taxId || "—"}</b></span>
                  <span className="text-muted">Göndərilib: <b className="text-foreground">{dt(u.sellerApplication.submittedAt)}</b></span>
                  {u.sellerApplication.rejectionReason && <span className="sm:col-span-2 text-red-500">Rədd səbəbi: {u.sellerApplication.rejectionReason}</span>}
                </div>
              </Section>
            )}

            {/* ── Bizneslər ── */}
            {d.businesses.length > 0 && (
              <Section title="Biznesləri" count={d.businesses.length}>
                <div className="space-y-2">
                  {d.businesses.map((b: any) => (
                    <div key={b.id} className="border border-card-border rounded-xl p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">🏢 {b.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${chip(b.status)}`}>{b.status}</span>
                        <Link href={`/admin/businesses?id=${b.id}`} className="ml-auto px-2 py-0.5 rounded-lg border border-card-border text-[11px] font-semibold hover:bg-input-bg">Biznes ↗</Link>
                      </div>
                      <p className="text-[11px] text-muted mt-0.5">
                        VÖEN {b.voen} · Sahib: {b.ownerName || "—"} · Təsisçi: {b.founderName || "—"}
                        {b.phone ? ` · ${b.phone}` : ""} · {dt(b.createdAt)}
                      </p>
                      {b.objects.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {b.objects.map((o: any) => (
                            <span key={o.id} className="px-2 py-1 rounded-lg bg-input-bg border border-card-border text-[11px]"
                              title={[o.city, o.address].filter(Boolean).join(", ")}>
                              📍 {o.name}{o.phone ? ` · ${o.phone}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── İşçi olduğu bizneslər ── */}
            {d.memberships.length > 0 && (
              <Section title="İşçi olduğu bizneslər" count={d.memberships.length}>
                <div className="flex flex-wrap gap-1.5">
                  {d.memberships.map((m: any) => (
                    <span key={m.id} className="px-2 py-1 rounded-lg bg-input-bg border border-card-border text-[11px]">
                      {m.business?.name}{m.object ? ` · ${m.object.name}` : ""}
                      <span className="text-muted"> ({[m.canSell && "satış", m.canBuy && "alış"].filter(Boolean).join(", ") || "icazəsiz"} · {m.status})</span>
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Elanlar ── */}
            {d.listings.length > 0 && (
              <Section title="Son elanları" count={c.listings}>
                {d.listingStats.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {d.listingStats.map((s: any) => (
                      <span key={s.status} className={`px-2 py-0.5 rounded text-[11px] font-semibold ${chip(s.status)}`}>{s.status}: {s.count}</span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {d.listings.map((l: any) => (
                    <Link key={l.id} href={`/marketplace/${l.id}`} target="_blank"
                      className="border border-card-border rounded-xl overflow-hidden hover:border-orange-500 transition-colors">
                      {l.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgUrl(l.images[0])} alt="" loading="lazy" className="w-full h-24 object-cover bg-input-bg" />
                      ) : (
                        <div className="w-full h-24 bg-input-bg flex items-center justify-center text-2xl text-muted">📦</div>
                      )}
                      <div className="p-2">
                        <p className="text-[11px] font-semibold truncate">{l.title}</p>
                        <p className="text-[11px] text-muted flex items-center gap-1">
                          <b className="text-foreground">{azn(l.price)} ₼</b>
                          <span className={`px-1 rounded text-[9px] font-bold ${chip(l.status)}`}>{l.status}</span>
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Sifarişlər ── */}
            {(d.recentBuyerOrders.length > 0 || d.recentSellerOrders.length > 0) && (
              <div className="grid sm:grid-cols-2 gap-4">
                {d.recentBuyerOrders.length > 0 && (
                  <Section title="Son alışları" count={c.buyerOrders}>
                    <div className="space-y-1">
                      {d.recentBuyerOrders.map((o: any) => (
                        <Link key={o.id} href={`/orders/${o.id}`} target="_blank" className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-card-border text-[11px] hover:bg-input-bg">
                          <span className="font-bold">#{o.id}</span>
                          <span className="text-muted truncate flex-1">{o.seller?.name || "—"}</span>
                          <span className={`px-1.5 rounded text-[10px] font-bold ${chip(o.paymentStatus)}`}>{o.paymentStatus}</span>
                          <span className="font-bold shrink-0">{azn(o.total)} ₼</span>
                        </Link>
                      ))}
                    </div>
                  </Section>
                )}
                {d.recentSellerOrders.length > 0 && (
                  <Section title="Son satışları" count={c.sellerOrders}>
                    <div className="space-y-1">
                      {d.recentSellerOrders.map((o: any) => (
                        <Link key={o.id} href={`/orders/${o.id}`} target="_blank" className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-card-border text-[11px] hover:bg-input-bg">
                          <span className="font-bold">#{o.id}</span>
                          <span className="text-muted truncate flex-1">{o.buyer?.name || "—"}</span>
                          <span className={`px-1.5 rounded text-[10px] font-bold ${chip(o.paymentStatus)}`}>{o.paymentStatus}</span>
                          <span className="font-bold shrink-0">{azn(o.total)} ₼</span>
                        </Link>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            )}

            {/* ── Reytinqlər ── */}
            {d.ratings.length > 0 && (
              <Section title="Aldığı rəylər" count={u.ratingCount || d.ratings.length}>
                <div className="space-y-1.5">
                  {d.ratings.map((r: any) => (
                    <div key={r.id} className="border border-card-border rounded-lg px-2.5 py-1.5 text-[11px]">
                      <p className="flex items-center gap-2">
                        <span className="text-amber-500">{"★".repeat(r.rating)}<span className="text-muted">{"★".repeat(5 - r.rating)}</span></span>
                        <span className="text-muted truncate">{r.buyer?.name || "—"}</span>
                        <span className="ml-auto text-muted shrink-0">{dt(r.createdAt)}</span>
                      </p>
                      {r.comment && <p className="text-muted mt-0.5">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* ── İxtisas / xidmət ── */}
            {(u.professions?.length > 0 || u.serviceBrands?.length > 0 || u.serviceAllBrands) && (
              <Section title="İxtisas və xidmət">
                <div className="text-[12px] space-y-1">
                  {u.professions?.length > 0 && <p className="text-muted">İxtisaslar: <b className="text-foreground">{u.professions.join(", ")}</b></p>}
                  {(u.serviceAllBrands || u.serviceBrands?.length > 0) && (
                    <p className="text-muted">Markalar: <b className="text-foreground">{u.serviceAllBrands ? "bütün markalar" : u.serviceBrands.join(", ")}</b></p>
                  )}
                  {u.serviceCategories?.length > 0 && <p className="text-muted">Kateqoriyalar: <b className="text-foreground">{u.serviceCategories.join(", ")}</b></p>}
                </div>
              </Section>
            )}

            {/* ── Sosial hesablar ── */}
            {u.socialLinks?.length > 0 && (
              <Section title="Sosial hesabları" count={u.socialLinks.length}>
                <div className="flex flex-wrap gap-1.5">
                  {u.socialLinks.map((s: any) => (
                    <a key={s.id} href={s.url} target="_blank" rel="noreferrer"
                      className="px-2 py-1 rounded-lg bg-input-bg border border-card-border text-[11px] hover:border-orange-500">
                      {s.platform}{s.verified ? " ✓" : ""} ↗
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Əlaqə və ünvanlar ── */}
            {(u.phones?.length > 0 || u.addresses?.length > 0 || u.address) && (
              <Section title="Əlaqə və ünvanlar">
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {u.phones?.map((p: any) => (
                    <span key={p.id} className="px-2 py-1 rounded-lg bg-input-bg border border-card-border">📞 {p.phone}{p.isPrimary ? " · əsas" : ""}{p.verified ? " ✓" : ""}</span>
                  ))}
                  {u.address && <span className="px-2 py-1 rounded-lg bg-input-bg border border-card-border">📍 {u.address}</span>}
                  {u.addresses?.map((a: any) => (
                    <span key={a.id} className="px-2 py-1 rounded-lg bg-input-bg border border-card-border">📍 {a.label ? `${a.label}: ` : ""}{a.address}</span>
                  ))}
                </div>
              </Section>
            )}

            {/* ── Obyektlər / avtomobillər (köhnə profil sahələri) ── */}
            {(u.workplaces?.length > 0 || u.vehicles?.length > 0) && (
              <Section title="Digər">
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {u.workplaces?.map((w: any) => (
                    <span key={w.id} className="px-2 py-1 rounded-lg bg-input-bg border border-card-border">🏬 {w.name} — {w.address}</span>
                  ))}
                  {u.vehicles?.map((v: any) => (
                    <span key={v.id} className="px-2 py-1 rounded-lg bg-input-bg border border-card-border">🚗 {v.brand} {v.model} ({v.year})</span>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
