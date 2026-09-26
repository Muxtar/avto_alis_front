"use client";
// MAĞAZANIN İXTİSAS ENDİRİMLƏRİ — «hansı peşə sahibinə neçə faiz».
// Endirim yalnız ixtisasını ADMİN TƏSDİQLİ SƏNƏDLƏ sübut etmiş alıcıya tətbiq
// olunur; profildə sadəcə «Həkim» yazmaq kifayət deyil.
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import ProfessionPicker from "@/components/ProfessionPicker";
import IdCard, { IdMini, IdField } from "@/components/IdCard";

interface Rule {
  profession: string; percent: number | string; scope: "ALL" | "SELECTED"; listingIds: number[];
  maxUnitsPerOrder: number | string | null; maxDiscountPerOrder: number | string | null;
  active: boolean; validUntil: string | null; _open?: boolean;
}
const empty = (): Rule => ({ profession: "", percent: 10, scope: "ALL", listingIds: [], maxUnitsPerOrder: "", maxDiscountPerOrder: "", active: true, validUntil: null, _open: true });
const inputCls = "w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-to)]/40";

function Inner() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const objectId = parseInt(sp.get("objectId") || "");
  const [objects, setObjects] = useState<{ id: number; name: string; business: string }[]>([]);
  const [data, setData] = useState<any>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // Mağazalarım — obyekt seçimi.
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/me/businesses`, { headers: H }).then((r) => r.json()).then((d) => {
      const list = (d.businesses || []).flatMap((b: any) => (b.objects || []).filter((o: any) => !o.deletedAt).map((o: any) => ({ id: o.id, name: o.name, business: b.name })));
      setObjects(list);
      if (!objectId && list.length) router.replace(`/business/pro-discounts?objectId=${list[0].id}`);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const load = useCallback(async () => {
    if (!token || !objectId) return;
    const d = await fetch(`${API}/me/objects/${objectId}/pro-discounts`, { headers: H }).then((r) => r.json()).catch(() => null);
    if (!d?.success) { toast(d?.message || "Xəta", "error"); setData(null); return; }
    setData(d);
    setRules((d.rules || []).map((r: any) => ({ ...r, validUntil: r.validUntil ? String(r.validUntil).slice(0, 10) : null, maxUnitsPerOrder: r.maxUnitsPerOrder ?? "", maxDiscountPerOrder: r.maxDiscountPerOrder ?? "" })));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, objectId]);
  useEffect(() => { load(); }, [load]);

  const upd = (i: number, patch: Partial<Rule>) => { setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r))); setDirty(true); };
  const save = async () => {
    setSaving(true);
    try {
      const body = { rules: rules.map((r) => ({ ...r, _open: undefined })) };
      const d = await fetch(`${API}/me/objects/${objectId}/pro-discounts`, { method: "PUT", headers: H, body: JSON.stringify(body) }).then((r) => r.json());
      if (!d?.success) { toast(d?.message || "Xəta", "error"); return; }
      toast("İxtisas endirimləri saxlanıldı ✓", "success");
      await load();
    } finally { setSaving(false); }
  };

  if (authLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--brand-to)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!isLoggedIn) return <p className="text-center py-20 text-muted">Daxil olun.</p>;

  const listings: any[] = data?.listings || [];
  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <Link href="/business" className="text-xs text-muted hover:text-foreground">← Biznes kabinetim</Link>
      <h1 className="text-xl sm:text-2xl font-bold mt-1 mb-1">🎓 İxtisas endirimləri</h1>
      <p className="text-sm text-muted mb-4">
        Mağazanızın məhsullarını hansı peşə sahiblərinə neçə faiz endirimlə satacağınızı seçin. Endirim yalnız
        <b> ixtisasını sənədlə sübut etmiş</b> (diplom/lisenziya admin tərəfindən təsdiqlənmiş) alıcılara avtomatik tətbiq olunur —
        profildə sadəcə «Həkim» yazmaq kifayət etmir.
      </p>

      {objects.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {objects.map((o) => (
            <button key={o.id} onClick={() => { if (dirty && !confirm("Saxlanmamış dəyişikliklər itəcək. Davam?")) return; router.push(`/business/pro-discounts?objectId=${o.id}`); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${o.id === objectId ? "bg-[var(--brand-soft)] text-[var(--brand-to)] border-transparent" : "border-card-border text-muted hover:text-foreground"}`}>
              🏪 {o.name}
            </button>
          ))}
        </div>
      )}
      {!objects.length && <p className="text-sm text-muted surface p-6 rounded-2xl text-center">Hələ mağazanız (biznes obyekti) yoxdur. <Link href="/business" className="text-[var(--brand-to)] font-semibold">Biznes kabinetindən</Link> əlavə edin.</p>}

      {data && (
        <>
          {!data.object.businessApproved && (
            <p className="mb-4 text-xs rounded-xl px-3 py-2 bg-amber-500/10 text-amber-700 border border-amber-500/20">⚠ Biznesiniz hələ təsdiqlənməyib — qaydalar saxlanılır, amma məhsullar onlayn satışa çıxanda işləyəcək.</p>
          )}

          <IdCard icon="📊" title={`«${data.object.name}» — nəticələr`} tone="teal"
            summary={`${data.stats.orders} sifariş · ${formatPrice(data.stats.totalDiscount)} ₼ endirim verilib`}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <IdField label="Endirimli sifariş" value={data.stats.orders} />
              <IdField label="Verilən endirim" value={`${formatPrice(data.stats.totalDiscount)} ₼`} />
              <IdField label="Aktiv qayda" value={rules.filter((r) => r.active).length} />
            </div>
            {Object.keys(data.stats.byProfession || {}).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(data.stats.byProfession).map(([k, v]: any) => (
                  <span key={k} className="text-[11px] px-2 py-1 rounded-full bg-input-bg border border-input-border">{k}: {v.orders} sətir · {formatPrice(v.amount)} ₼</span>
                ))}
              </div>
            )}
          </IdCard>

          <div className="space-y-3 mb-4">
            {rules.map((r, i) => {
              const selected = new Set(r.listingIds);
              return (
                <IdMini key={i} tone={r.active ? "brand" : "slate"} icon="🎓"
                  title={r.profession || "Yeni qayda"}
                  sub={`${r.percent || 0}% endirim · ${r.scope === "SELECTED" ? `${r.listingIds.length} məhsul` : "bütün məhsullar"}${r.validUntil ? ` · ${r.validUntil} tarixinədək` : ""}`}
                  stamp={r.active ? "ok" : "none"} stampText={{ ok: "Aktiv", none: "Dayandırılıb" }}
                  actions={<>
                    <button onClick={() => upd(i, { _open: !r._open })} className="text-xs font-semibold text-[var(--brand-to)]">{r._open ? "Bağla" : "Redaktə"}</button>
                    <button onClick={() => { if (confirm(`«${r.profession || "Qayda"}» silinsin?`)) { setRules(rules.filter((_, j) => j !== i)); setDirty(true); } }} className="text-muted hover:text-red-500 text-sm">✕</button>
                  </>}>
                  {r._open && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">İxtisas</label>
                          <ProfessionPicker value={r.profession} onChange={(v) => upd(i, { profession: v })} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">Endirim (%)</label>
                          <input type="number" min={1} max={data.maxPercent} value={r.percent} onChange={(e) => upd(i, { percent: e.target.value })} className={inputCls} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">Hansı məhsullara</label>
                        <div className="seg-tabs">
                          <button type="button" onClick={() => upd(i, { scope: "ALL" })} className={`seg-tab ${r.scope === "ALL" ? "is-active" : ""}`}>Bütün məhsullar</button>
                          <button type="button" onClick={() => upd(i, { scope: "SELECTED" })} className={`seg-tab ${r.scope === "SELECTED" ? "is-active" : ""}`}>Seçilmiş məhsullar</button>
                        </div>
                        {r.scope === "SELECTED" && (
                          <div className="mt-2 max-h-56 overflow-y-auto orders-scroll space-y-1.5 p-2 rounded-xl border border-input-border">
                            {listings.length === 0 && <p className="text-xs text-muted text-center py-3">Bu mağazada aktiv məhsul yoxdur.</p>}
                            {listings.map((l) => (
                              <label key={l.id} className={`flex items-center gap-2.5 p-1.5 rounded-lg cursor-pointer ${selected.has(l.id) ? "bg-[var(--brand-soft)]" : "hover:bg-input-bg"}`}>
                                <input type="checkbox" checked={selected.has(l.id)} className="w-4 h-4 accent-[var(--brand-to)]"
                                  onChange={(e) => upd(i, { listingIds: e.target.checked ? [...r.listingIds, l.id] : r.listingIds.filter((x) => x !== l.id) })} />
                                <span className="w-8 h-8 rounded-md bg-input-bg overflow-hidden shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  {l.images?.[0] && <img src={imgUrl(l.images[0])} alt="" className="w-full h-full object-cover" />}
                                </span>
                                <span className="text-sm truncate flex-1">{l.title}</span>
                                <span className="text-xs text-muted shrink-0">{formatPrice(l.price)} ₼</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">Bir sifarişdə maks. ədəd</label>
                          <input type="number" min={1} placeholder="limitsiz" value={r.maxUnitsPerOrder ?? ""} onChange={(e) => upd(i, { maxUnitsPerOrder: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">Bir sifarişdə maks. endirim (₼)</label>
                          <input type="number" min={1} placeholder="limitsiz" value={r.maxDiscountPerOrder ?? ""} onChange={(e) => upd(i, { maxDiscountPerOrder: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted mb-1">Bitmə tarixi</label>
                          <input type="date" value={r.validUntil || ""} onChange={(e) => upd(i, { validUntil: e.target.value || null })} className={inputCls} />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={r.active} onChange={(e) => upd(i, { active: e.target.checked })} className="w-4 h-4 accent-[var(--brand-to)]" />
                        Aktiv
                      </label>
                    </div>
                  )}
                </IdMini>
              );
            })}
            {rules.length === 0 && <p className="text-sm text-muted text-center py-6 surface rounded-2xl">Hələ qayda yoxdur — məsələn, «Həkim — 10%» əlavə edin.</p>}
          </div>

          <div className="flex gap-2 flex-wrap sticky bottom-3">
            <button onClick={() => { setRules([...rules, empty()]); setDirty(true); }} disabled={rules.length >= 20}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-card border border-dashed border-[var(--brand-to)]/50 text-[var(--brand-to)] disabled:opacity-40">＋ İxtisas əlavə et</button>
            <button onClick={save} disabled={saving || !dirty}
              className="ml-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] shadow-lg disabled:opacity-50">
              {saving ? "Saxlanılır…" : dirty ? "Yadda saxla" : "Saxlanılıb ✓"}
            </button>
          </div>

          <div className="mt-6 text-[12px] text-muted space-y-1.5 surface rounded-2xl p-4">
            <p className="font-semibold text-foreground">Necə işləyir?</p>
            <p>• Alıcı ixtisasını <b>profil → Peşə sənədləri</b> bölməsində diplom/lisenziya ilə sübut edir, admin sənədi həmin ixtisas üçün təsdiqləyir.</p>
            <p>• Sənədi təsdiqli alıcı sizin mağazadan alanda endirim səbətdə və sifarişdə avtomatik tətbiq olunur; sifarişdə «🎓 İxtisas endirimi» kimi görünür.</p>
            <p>• Bir alıcıya bir neçə qayda uyğundursa — ən yüksək faiz tətbiq olunur. Qiymət təklifi (razılaşdırılmış qiymət) və birgə alış məhsullarına tətbiq olunmur.</p>
            <p>• Müddəti bitmiş və ya rədd edilmiş sənəd endirim vermir. Maks. ədəd / məbləğ limiti sui-istifadənin (məs. topdan alıb satmaq) qarşısını alır.</p>
            <p>• Bu mağazanın məhsullarını <b>kimlər sizin əvəzinizə satıb komissiya qazana bilər</b> — onu <Link href={`/referral/manage?objectId=${objectId}`} className="text-[var(--brand-to)] font-semibold">Referal proqramında</Link> ixtisas qaydaları ilə təyin edirsiniz.</p>
          </div>
        </>
      )}
    </div>
  );
}

export default function ProDiscountsPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
