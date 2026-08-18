"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

/**
 * OBYEKTLƏR — biznesə bağlı mağaza/filial siyahısı.
 *
 * Əvvəl obyektlər yalnız biznesin içində görünürdü: hansı obyektin hansı
 * biznesə aid olduğunu görmək üçün hər biznesi bir-bir açmaq lazım idi.
 * Bu ekran obyekt üzrə baxış verir — sətrə basanda bütün məlumatı və həmin
 * obyektin elanlarını açır.
 */

const azn = (n: number) => (n || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (s?: string | null) => (s ? new Date(s).toLocaleDateString("az-AZ") : "—");

const ST: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: "Təsdiqli", cls: "bg-green-500/15 text-green-600" },
  PENDING: { label: "Gözləmədə", cls: "bg-amber-500/15 text-amber-600" },
  REJECTED: { label: "Rədd", cls: "bg-red-500/15 text-red-500" },
  ARCHIVED: { label: "Arxiv", cls: "bg-slate-500/15 text-slate-500" },
};

export default function AdminObjectsPage() {
  const { toast } = useToast();
  const [objects, setObjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [listings, setListings] = useState<Record<number, any[]>>({});
  const [busy, setBusy] = useState<number | null>(null);

  const H = useCallback(() => ({
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`,
    "Content-Type": "application/json",
  }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/objects?search=${encodeURIComponent(search)}`, { headers: H() }).then((x) => x.json());
      if (r.success) setObjects(r.objects || []);
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, H]);

  useEffect(() => { const tm = setTimeout(load, 300); return () => clearTimeout(tm); }, [load]);

  // Sətir açılanda elanları bir dəfə çək.
  const toggle = async (id: number) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    if (listings[id]) return;
    setBusy(id);
    try {
      const r = await fetch(`${API}/admin/objects/${id}/listings`, { headers: H() }).then((x) => x.json());
      if (r.success) setListings((p) => ({ ...p, [id]: r.listings || [] }));
    } catch { toast("Elanlar yüklənmədi", "error"); } finally { setBusy(null); }
  };

  const toggleActive = async (o: any) => {
    const next = !o.isActive;
    if (!next && !confirm(`"${o.name}" deaktiv edilsin?\n\nElanlar SİLİNMİR — sadəcə saytda görünməyəcək.`)) return;
    try {
      const r = await fetch(`${API}/admin/objects/${o.id}/active`, { method: "PATCH", headers: H(), body: JSON.stringify({ isActive: next }) }).then((x) => x.json());
      if (r.success) { toast(next ? "Aktiv edildi" : "Deaktiv edildi", "success"); load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); }
  };

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Obyektlər</h1>
      <p className="text-muted text-sm mb-4">
        Bizneslərə bağlı mağaza və filiallar. Sətrə basaraq obyektin bütün məlumatlarını və paylaşdığı elanları açın.
      </p>

      <input value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Obyekt adı, ünvan, şəhər, telefon, biznes adı və ya VÖEN…"
        className="w-full max-w-xl mb-4 px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : objects.length === 0 ? (
        <p className="text-muted text-sm py-10 text-center">Obyekt tapılmadı.</p>
      ) : (
        <div className="space-y-2">
          {objects.map((o) => {
            const open = openId === o.id;
            const st = o.listingStats || {};
            const rows = listings[o.id];
            return (
              <div key={o.id} className="surface overflow-hidden">
                {/* ── Sətir ── */}
                <button onClick={() => toggle(o.id)} className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-input-bg/40 transition-colors">
                  <span className="shrink-0 w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg">🏪</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm truncate">{o.name}</span>
                      {!o.isActive && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 text-[10px] font-bold">Deaktiv</span>}
                      {o.business?.isActive === false && <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 text-[10px] font-bold">Biznes deaktiv</span>}
                    </div>
                    {/* Hansı biznesə aiddir — əsas sual budur, ona görə sətirdə açıq yazılır. */}
                    <p className="text-[11px] text-muted truncate">
                      🏢 <b className="text-foreground">{o.business?.name}</b>
                      {o.business?.voen ? ` · VÖEN ${o.business.voen}` : ""}
                      {o.city ? ` · ${o.city}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded-lg bg-input-bg text-xs font-bold" title="Elan sayı">{o._count?.listings || 0} elan</span>
                  <span className="shrink-0 text-muted w-4 text-center">{open ? "⌄" : "›"}</span>
                </button>

                {/* ── Detal ── */}
                {open && (
                  <div className="border-t border-card-border bg-input-bg/20 p-3.5 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Obyektin məlumatları */}
                      <div className="p-3 bg-card border border-card-border rounded-lg">
                        <p className="text-[11px] font-semibold text-muted mb-2">🏪 Obyekt məlumatları</p>
                        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
                          <dt className="text-muted">Ad</dt><dd className="font-semibold break-words">{o.name}</dd>
                          <dt className="text-muted">Ünvan</dt><dd className="font-semibold break-words">{o.address || "—"}</dd>
                          <dt className="text-muted">Şəhər</dt><dd className="font-semibold">{o.city || "—"}</dd>
                          <dt className="text-muted">Telefon</dt><dd className="font-semibold">{o.phone || "—"}</dd>
                          <dt className="text-muted">Koordinat</dt>
                          <dd className="font-semibold">
                            {o.latitude != null && o.longitude != null ? (
                              <a href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`} target="_blank" rel="noreferrer" className="text-[var(--brand-to)] hover:underline">
                                {o.latitude.toFixed(5)}, {o.longitude.toFixed(5)} ↗
                              </a>
                            ) : <span className="text-amber-600">yoxdur — Yango çatdıra bilməz</span>}
                          </dd>
                          <dt className="text-muted">Fəaliyyət</dt>
                          <dd className="font-semibold break-words">{o.activityAreas?.length ? o.activityAreas.join(", ") : "—"}</dd>
                          <dt className="text-muted border-t border-card-border pt-1.5">Vəziyyət</dt>
                          <dd className="border-t border-card-border pt-1.5 font-semibold">
                            <span className={o.isActive ? "text-green-600" : "text-amber-600"}>{o.isActive ? "Aktiv" : "Deaktiv"}</span>
                            <span className="text-muted font-normal"> · {dt(o.createdAt)}</span>
                          </dd>
                          <dt className="text-muted">Referal satış</dt>
                          <dd className="font-semibold">{o.referralEnabled ? "açıq" : "bağlı"}</dd>
                        </dl>
                      </div>

                      {/* Bağlı olduğu biznes */}
                      <div className="p-3 bg-card border border-card-border rounded-lg">
                        <p className="text-[11px] font-semibold text-muted mb-2">🏢 Bağlı olduğu biznes</p>
                        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
                          <dt className="text-muted">Biznes</dt><dd className="font-semibold break-words">{o.business?.name}</dd>
                          <dt className="text-muted">VÖEN</dt><dd className="font-semibold font-mono">{o.business?.voen || "—"}</dd>
                          <dt className="text-muted">Status</dt>
                          <dd><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ST[o.business?.status]?.cls || "bg-input-bg text-muted"}`}>{ST[o.business?.status]?.label || o.business?.status}</span></dd>
                          <dt className="text-muted">Sahibi</dt>
                          <dd className="font-semibold">
                            {o.business?.user ? (
                              <Link href={`/admin/users?id=${o.business.user.id}`} className="text-[var(--brand-to)] hover:underline">{o.business.user.name}</Link>
                            ) : "—"}
                            {o.business?.user?.phone ? <span className="text-muted font-normal"> · {o.business.user.phone}</span> : null}
                          </dd>
                          <dt className="text-muted border-t border-card-border pt-1.5">İşçilər</dt>
                          <dd className="border-t border-card-border pt-1.5 font-semibold">{o._count?.managers || 0}</dd>
                          <dt className="text-muted">Rəylər</dt><dd className="font-semibold">{o._count?.comments || 0}</dd>
                          <dt className="text-muted">Obyekt adına alış</dt><dd className="font-semibold">{o._count?.purchases || 0}</dd>
                        </dl>
                        <div className="flex gap-2 mt-3">
                          <Link href="/admin/businesses" className="h-8 px-3 inline-flex items-center rounded-lg border border-card-border text-[11px] font-semibold hover:bg-input-bg">Biznesə keç ↗</Link>
                          <button onClick={() => toggleActive(o)}
                            className={`h-8 px-3 rounded-lg text-[11px] font-semibold border ${o.isActive ? "bg-amber-500/10 text-amber-600 border-amber-500/25" : "bg-green-500/10 text-green-600 border-green-500/25"}`}>
                            {o.isActive ? "⏸ Deaktiv et" : "▶ Aktiv et"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Elanlar */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <p className="text-[11px] font-semibold text-muted">📦 Bu obyektin elanları</p>
                        {Object.entries(st).map(([k, v]) => (
                          <span key={k} className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${ST[k]?.cls || "bg-input-bg text-muted"}`}>{ST[k]?.label || k}: {v as number}</span>
                        ))}
                      </div>
                      {busy === o.id && !rows ? (
                        <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
                      ) : !rows || rows.length === 0 ? (
                        <p className="text-xs text-muted py-3">Bu obyektə aid elan yoxdur.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                          {rows.map((l) => (
                            <Link key={l.id} href={`/marketplace/${l.id}`} target="_blank"
                              className="border border-card-border rounded-xl overflow-hidden hover:border-orange-500 transition-colors bg-card">
                              {l.images?.[0] ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={imgUrl(l.images[0])} alt="" loading="lazy" className="w-full h-20 object-cover bg-input-bg" />
                              ) : (
                                <div className="w-full h-20 bg-input-bg flex items-center justify-center text-xl text-muted">📦</div>
                              )}
                              <div className="p-1.5">
                                <p className="text-[11px] font-semibold truncate">{l.title}</p>
                                <p className="text-[11px] flex items-center gap-1">
                                  <b>{azn(l.price)} ₼</b>
                                  <span className={`px-1 rounded text-[9px] font-bold ${ST[l.status]?.cls || "bg-input-bg text-muted"}`}>{ST[l.status]?.label || l.status}</span>
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
