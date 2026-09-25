"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { useLive } from "@/lib/live";
import { API } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { referralUrl, copyText, shareLink, canNativeShare, fmtDate, storeHref, AUDIENCE_LABEL } from "@/lib/referral";

const btnPrimary = "px-3.5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50";
const btnGhost = "px-3.5 py-2 bg-input-bg border border-input-border rounded-xl text-sm font-medium hover:border-orange-500/50 disabled:opacity-50";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="font-bold text-base mb-0.5">{title}</h2>
      {hint && <p className="text-xs text-muted mb-2.5">{hint}</p>}
      {!hint && <div className="mb-2.5" />}
      {children}
    </section>
  );
}

function StoreLine({ s }: { s: any }) {
  return (
    <div className="flex-1 min-w-0">
      <Link href={storeHref(s)} className="font-bold text-sm truncate block hover:text-orange-500">{s.name}</Link>
      <p className="text-xs text-muted truncate">
        {[s.businessName, s.city].filter(Boolean).join(" · ")}{(s.businessName || s.city) ? " · " : ""}{s.listingCount} məhsul
      </p>
      <p className="text-[11px] text-muted mt-0.5">{s.objectId ? "🏪 Mağaza" : "👤 Satıcı"} · {AUDIENCE_LABEL[s.audience] || s.audience}</p>
    </div>
  );
}

export default function ReferralHubPage() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [applyFor, setApplyFor] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [nativeShare, setNativeShare] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) { setLoading(true); setError(false); }
    const h = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const [s, l] = await Promise.all([
        fetch(`${API}/referral/stores`, h).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
        fetch(`${API}/me/referral/links`, h).then((r) => r.json()).catch(() => ({ links: [] })),
      ]);
      if (s?.success === false) throw new Error();
      setData(s);
      setLinks(l?.links || []);
    } catch { if (!silent) setError(true); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    load();
    setNativeShare(canNativeShare());
  }, [isLoggedIn, authLoading, load, router]);

  // Dəvət / təsdiq bildiriş kimi gəlir — siyahı özü yenilənsin.
  useLive(["notification", "order"], () => load(true));

  const post = async (url: string, body: any, method = "POST") => {
    const r = await fetch(`${API}${url}`, {
      method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((x) => x.json()).catch(() => ({ success: false }));
    if (!r.success) toast(r.message || "Xəta baş verdi", "error");
    return r;
  };

  const respond = async (partnerId: number, accept: boolean) => {
    setBusyId(`p${partnerId}`);
    const r = await post(`/referral/partners/${partnerId}/respond`, { accept });
    if (r.success) { toast(accept ? "Dəvət qəbul edildi ✓" : "Dəvət rədd edildi", accept ? "success" : "info"); await load(true); }
    setBusyId(null);
  };

  const apply = async (programId: number) => {
    setBusyId(`a${programId}`);
    const r = await post(`/referral/programs/${programId}/apply`, note.trim() ? { note: note.trim() } : {});
    if (r.success) {
      toast(r.partner?.status === "ACTIVE" ? "Qəbul olundu — indi link yarada bilərsiniz ✓" : "Müraciət göndərildi ✓", "success");
      setApplyFor(null); setNote("");
      await load(true);
    }
    setBusyId(null);
  };

  const toggleLink = async (l: any) => {
    setBusyId(`l${l.id}`);
    const r = await post(`/me/referral/links/${l.id}`, { active: !l.active }, "PUT");
    if (r.success) {
      setLinks((ls) => ls.map((x) => (x.id === l.id ? { ...x, active: !l.active } : x)));
      toast(l.active ? "Link dayandırıldı" : "Link aktivləşdirildi", "success");
    }
    setBusyId(null);
  };

  const copy = async (t: string) => {
    const ok = await copyText(referralUrl(t));
    toast(ok ? "Link kopyalandı" : "Kopyalamaq alınmadı", ok ? "success" : "error");
  };
  const share = async (l: any) => {
    const r = await shareLink(referralUrl(l.token), l.title || l.store || "Referal link");
    if (r === "copied") toast("Link kopyalandı", "success");
    else if (r === "failed") toast("Paylaşmaq alınmadı", "error");
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (error) return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <div className="surface p-8 text-center">
        <p className="text-sm text-muted mb-3">Məlumat yüklənmədi. İnternet bağlantınızı yoxlayıb yenidən cəhd edin.</p>
        <button onClick={() => load()} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold">Yenidən cəhd et</button>
      </div>
    </div>
  );

  const stores: any[] = data?.stores || [];
  const professions: string[] = data?.professions?.length ? data.professions : (data?.profession ? [data.profession] : []);
  const invitations = stores.filter((s) => s.partnerStatus === "INVITED" && s.partnerId);
  const eligible = stores.filter((s) => s.eligible && s.partnerStatus !== "INVITED");
  const applicable = stores.filter((s) => !s.eligible && s.partnerStatus !== "INVITED" && s.partnerStatus !== "REVOKED");
  const professionMiss = stores.some((s) => s.audience === "PROFESSION" && !s.eligible);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">🤝 Referal satış</h1>
        <Link href="/referral-earnings" className="shrink-0 px-3.5 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold">💸 Qazancım</Link>
      </div>
      <p className="text-sm text-muted mb-4">Başqa satıcıların məhsullarını tövsiyə edin, satışdan komissiya qazanın.</p>

      {/* (a) Necə işləyir */}
      <div className="surface p-4 mb-6">
        <p className="font-semibold text-sm mb-3">Necə işləyir?</p>
        <ol className="grid sm:grid-cols-4 gap-3 text-xs">
          {[
            ["🔗", "Link yaradın", "Mağazadan və ya məhsul səhifəsindən məhsul seçib link yaradın."],
            ["🛒", "Alıcı alır", "Alıcı linki açır, məhsulu səbətə atıb adi qaydada (kart/nağd) sifariş verir."],
            ["⏳", "Çatdırılma + qaytarma", "Komissiya çatdırılmadan sonra gözləmədə qalır, qaytarma müddəti bitəndə ödənilə bilən olur."],
            ["🏦", "Ödəniş", "Admin komissiyanı IBAN hesabınıza köçürür."],
          ].map(([ic, t, d], i) => (
            <li key={i} className="rounded-xl bg-input-bg/60 border border-card-border p-3">
              <p className="text-lg leading-none mb-1.5">{ic}</p>
              <p className="font-semibold mb-0.5">{i + 1}. {t}</p>
              <p className="text-muted leading-snug">{d}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs">
          <span className="text-muted">İxtisaslarınız:</span>
          {professions.length ? professions.map((p) => (
            <span key={p} className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-600 font-medium">{p}</span>
          )) : <span className="text-muted">təyin olunmayıb</span>}
          <Link href="/profile" className="text-orange-500 hover:underline">{professions.length ? "Dəyiş" : "Profildə ixtisas əlavə et"} →</Link>
        </div>
        {professionMiss && (
          <p className="text-[11px] text-muted mt-2">💡 Bəzi satıcılar yalnız müəyyən ixtisaslı şəxslərə icazə verir. Profildə uyğun ixtisas (və tələb olunan sənəd) əlavə etsəniz, onların məhsullarını da sata bilərsiniz.</p>
        )}
      </div>

      {/* (b) Dəvətlər */}
      {invitations.length > 0 && (
        <Section title={`📨 Dəvətlər (${invitations.length})`} hint="Bu satıcılar sizi məhsullarını komissiya ilə satmağa dəvət edir.">
          <div className="space-y-2.5">
            {invitations.map((s) => (
              <div key={s.programId} className="surface p-4 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center gap-3">
                <StoreLine s={s} />
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-lg font-extrabold text-orange-500 mr-1">{s.percent}%</span>
                  <button onClick={() => respond(s.partnerId, true)} disabled={busyId === `p${s.partnerId}`} className={btnPrimary}>Qəbul et</button>
                  <button onClick={() => respond(s.partnerId, false)} disabled={busyId === `p${s.partnerId}`} className={btnGhost}>Rədd et</button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* (c) Sata biləcəklərim */}
      <Section title="✅ Sata biləcəyim mağazalar / satıcılar" hint="Mağazaya keçin, məhsulları seçib link yaradın (və ya istənilən məhsul səhifəsindən).">
        {eligible.length === 0 ? (
          <div className="surface p-6 text-center text-sm text-muted">Hələ məhsulunu sata biləcəyiniz satıcı yoxdur. Aşağıdan müraciət edin və ya profilə ixtisas əlavə edin.</div>
        ) : (
          <div className="space-y-2.5">
            {eligible.map((s) => (
              <div key={s.programId} className="surface p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/10 flex items-center justify-center text-xl shrink-0">{s.objectId ? "🏪" : "👤"}</div>
                <StoreLine s={s} />
                <div className="text-right shrink-0">
                  <p className="text-lg font-extrabold text-orange-500 leading-tight">{s.percent}%</p>
                  <p className="text-[10px] text-muted mb-1">komissiya</p>
                  <Link href={storeHref(s)} className="inline-block px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-xs font-semibold">Link yarat</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* (d) Müraciət edə biləcəklərim */}
      {applicable.length > 0 && (
        <Section title="📝 Müraciət edə biləcəklərim" hint="Bu satıcılar yalnız təsdiqlədikləri şəxslərə icazə verir.">
          <div className="space-y-2.5">
            {applicable.map((s) => (
              <div key={s.programId} className="surface p-4">
                <div className="flex items-center gap-3">
                  <StoreLine s={s} />
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-orange-500">{s.percent}%</p>
                    {s.partnerStatus === "REQUESTED" ? (
                      <span className="inline-block mt-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 text-[11px] font-semibold">⏳ Gözləyir</span>
                    ) : s.audience === "INVITED" && applyFor !== s.programId ? (
                      <button onClick={() => { setApplyFor(s.programId); setNote(""); }} className={`mt-1 ${btnGhost} !py-1.5 !text-xs`}>
                        {s.partnerStatus === "REJECTED" ? "Yenidən müraciət et" : "Müraciət et"}
                      </button>
                    ) : null}
                  </div>
                </div>
                {s.partnerStatus === "REJECTED" && <p className="text-[11px] text-red-500 mt-1.5">Əvvəlki müraciətiniz rədd edilib.</p>}
                {s.audience !== "INVITED" && s.reason && <p className="text-[11px] text-muted mt-1.5">{s.reason}</p>}
                {applyFor === s.programId && (
                  <div className="mt-3 space-y-2">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2}
                      placeholder="Qeyd (istəyə bağlı): özünüz, auditoriyanız haqqında qısa məlumat"
                      className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => apply(s.programId)} disabled={busyId === `a${s.programId}`} className={btnPrimary}>{busyId === `a${s.programId}` ? "..." : "Müraciət göndər"}</button>
                      <button onClick={() => setApplyFor(null)} className={btnGhost}>Ləğv</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* (e) Mənim linklərim */}
      <Section title={`🔗 Mənim linklərim${links.length ? ` (${links.length})` : ""}`}>
        {links.length === 0 ? (
          <div className="surface p-6 text-center text-sm text-muted">Hələ link yaratmamısınız.</div>
        ) : (
          <div className="space-y-2.5">
            {links.map((l) => {
              const off = !l.active || l.expired;
              return (
                <div key={l.id} className={`surface p-4 ${off ? "opacity-75" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{l.title || l.store || `Link #${l.id}`}</p>
                      <p className="text-xs text-muted truncate">{l.title && l.store ? `${l.store} · ` : ""}{l.itemCount} məhsul · <b className="text-orange-500">{l.percent}%</b></p>
                    </div>
                    <div className="shrink-0">
                      {l.expired ? (
                        <span className="px-2 py-0.5 rounded-lg bg-red-500/10 text-red-500 text-[11px] font-semibold">Müddəti bitib</span>
                      ) : !l.active ? (
                        <span className="px-2 py-0.5 rounded-lg bg-input-bg text-muted text-[11px] font-semibold">Dayandırılıb</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-green-500/10 text-green-600 text-[11px] font-semibold">Aktiv</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="rounded-lg bg-input-bg/60 py-1.5"><p className="text-sm font-bold">{l.clicks || 0}</p><p className="text-[10px] text-muted">baxış</p></div>
                    <div className="rounded-lg bg-input-bg/60 py-1.5"><p className="text-sm font-bold">{l.orders || 0}</p><p className="text-[10px] text-muted">sifariş</p></div>
                    <div className="rounded-lg bg-input-bg/60 py-1.5"><p className="text-sm font-bold text-orange-500">{formatPrice(l.commission || 0)}</p><p className="text-[10px] text-muted">komissiya, AZN</p></div>
                  </div>
                  <p className="text-[11px] text-muted mt-2">Yaradılıb {fmtDate(l.createdAt)} · {l.expired ? "bitib" : "bitir"} {fmtDate(l.expiresAt)}</p>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {!off && <button onClick={() => copy(l.token)} className={btnGhost}>📋 Kopyala</button>}
                    {!off && nativeShare && <button onClick={() => share(l)} className={btnGhost}>📤 Paylaş</button>}
                    <Link href={`/r/${l.token}`} className={btnGhost}>Aç</Link>
                    {!l.expired && (
                      <button onClick={() => toggleLink(l)} disabled={busyId === `l${l.id}`} className={`${btnGhost} ${l.active ? "!text-red-500" : "!text-green-600"}`}>
                        {l.active ? "Dayandır" : "Aktivləşdir"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <div className="surface p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Satıcısınız? Öz məhsullarınızı başqaları satsın.</p>
        <Link href="/referral/manage" className="shrink-0 text-sm font-semibold text-orange-500 hover:underline">Referal proqramı →</Link>
      </div>
    </div>
  );
}
