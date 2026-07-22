"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { CATEGORIES, getSubs, parseCat, buildCat } from "@/lib/categories";
import { formatPriceShort } from "@/lib/format";

export default function AdminListingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  // Elanlar SAHİBİNƏ (şəxs və ya biznes obyekti) görə qruplaşdırılır.
  // Sahibə klik → altında onun elanları açılır (akkordeon).
  const [owners, setOwners] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, any[]>>({});
  const [rowsLoading, setRowsLoading] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchOwners = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    fetch(`${API}/admin/listing-owners?${params}`, { headers })
      .then((r) => r.json())
      .then((d) => setOwners(d.owners || []))
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoading(false));
  };

  // Bir sahibin elanlarını gətir (açılanda və dəyişiklikdən sonra).
  const fetchRows = (owner: any) => {
    setRowsLoading(owner.key);
    const params = new URLSearchParams();
    params.set("ownerType", owner.kind === "OBJECT" ? "object" : "user");
    params.set("ownerId", String(owner.id));
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);
    params.set("limit", "100");
    return fetch(`${API}/admin/listings?${params}`, { headers })
      .then((r) => r.json())
      .then((d) => setRows((prev) => ({ ...prev, [owner.key]: d.listings || [] })))
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setRowsLoading(null));
  };

  const toggleOwner = (owner: any) => {
    if (openKey === owner.key) { setOpenKey(null); return; }
    setOpenKey(owner.key);
    if (!rows[owner.key]) fetchRows(owner);
  };

  useEffect(() => { fetchOwners(); setRows({}); setOpenKey(null); }, [statusFilter, typeFilter]);
  useEffect(() => { const tm = setTimeout(() => { fetchOwners(); setRows({}); setOpenKey(null); }, 300); return () => clearTimeout(tm); }, [search]);

  // Sahib sayğaclarını YERİNDƏ güncəllə (səhifə yenilənmədən) — bir elanın
  // köhnə→yeni statusu və/və ya total dəyişimi. total 0 olsa sahibi çıxar.
  const bumpOwner = (ownerKey: string, oldStatus: string | null, newStatus: string | null, totalDelta = 0) => {
    setOwners((prev) => prev.flatMap((o) => {
      if (o.key !== ownerKey) return [o];
      const total = (o.total || 0) + totalDelta;
      if (total <= 0) { if (openKey === ownerKey) setOpenKey(null); return []; }
      const n: any = { ...o, total, pending: o.pending || 0, approved: o.approved || 0, rejected: o.rejected || 0 };
      const key = (s: string) => (s === "PENDING" ? "pending" : s === "APPROVED" ? "approved" : "rejected");
      if (oldStatus) n[key(oldStatus)] = Math.max(0, n[key(oldStatus)] - 1);
      if (newStatus) n[key(newStatus)] = n[key(newStatus)] + 1;
      return [n];
    }));
  };

  const handleDelete = async (id: number, owner: any) => {
    if (!confirm(t("adminConfirmDelete"))) return;
    const oldStatus = (rows[owner.key] || []).find((l) => l.id === id)?.status || null;
    try {
      const res = await fetch(`${API}/admin/listings/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok || !data.success) { toast(data.message || t("error"), "error"); return; }
      toast(t("adminDeleted") || "Silindi", "success");
      // Yerində sil — siyahını yenidən çəkmirik.
      setRows((prev) => ({ ...prev, [owner.key]: (prev[owner.key] || []).filter((l) => l.id !== id) }));
      bumpOwner(owner.key, oldStatus, null, -1);
      window.dispatchEvent(new Event("admin:pending-changed"));
    } catch { toast(t("error"), "error"); }
  };

  // Moderasiya — təsdiqlə / rədd et / gözləməyə qaytar.
  const setStatus = async (id: number, status: "APPROVED" | "REJECTED" | "PENDING", owner: any) => {
    let rejectReason: string | null = null;
    if (status === "REJECTED") {
      rejectReason = prompt("Rədd səbəbi (elan sahibi görəcək):", "") ?? null;
      if (rejectReason === null) return;
    }
    const oldStatus = (rows[owner.key] || []).find((l) => l.id === id)?.status || null;
    try {
      const res = await fetch(`${API}/admin/listings/${id}/status`, {
        method: "PATCH", headers, body: JSON.stringify({ status, rejectReason }),
      });
      const r = await res.json();
      if (!res.ok || !r.success) { toast(r.message || t("error"), "error"); return; }
      toast(status === "APPROVED" ? "Elan təsdiqləndi" : status === "REJECTED" ? "Elan rədd edildi" : "Gözləməyə qaytarıldı", "success");
      // Elanın statusunu yerində dəyiş — səhifə/siyahı yenilənmir, akkordeon açıq qalır.
      setRows((prev) => ({
        ...prev,
        [owner.key]: (prev[owner.key] || []).map((l) => (l.id === id ? { ...l, status, rejectReason } : l)),
      }));
      if (oldStatus !== status) bumpOwner(owner.key, oldStatus, status);
      // Sol sidebar badge-i (overview) də yenilənmədən güncəllənsin.
      window.dispatchEvent(new Event("admin:pending-changed"));
    } catch { toast(t("error"), "error"); }
  };

  const openEdit = (listing: any) => {
    setModal({
      id: listing.id, title: listing.title, description: listing.description,
      price: listing.price, category: listing.category, type: listing.type,
      location: listing.location || "", phone: listing.phone || "",
      _owner: listing._owner,
    });
  };

  const handleSave = async () => {
    if (!modal) return;
    const { id, _owner, ...data } = modal;
    try {
      const res = await fetch(`${API}/admin/listings/${id}`, { method: "PUT", headers, body: JSON.stringify(data) });
      const r = await res.json();
      if (!res.ok || !r.success) { toast(r.message || t("error"), "error"); return; }
      // Redaktə edilən elanı yerində güncəllə — səhifə yenilənmir.
      if (_owner) setRows((prev) => ({
        ...prev,
        [_owner.key]: (prev[_owner.key] || []).map((l) => (l.id === id ? { ...l, ...data, price: Number(data.price) } : l)),
      }));
      setModal(null);
      toast(t("adminSaved") || "Yadda saxlanıldı", "success");
    } catch { toast(t("error"), "error"); }
  };

  const totalPending = owners.reduce((n, o) => n + (o.pending || 0), 0);
  const totalListings = owners.reduce((n, o) => n + (o.total || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t("adminListings")}</h1>
            <p className="text-muted text-xs mt-1">{owners.length} sahib · {totalListings} elan</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-56">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ad, şirkət və ya VÖEN"
                className="w-full pl-9 pr-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground" />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none">
              <option value="all">{t("all")}</option>
              <option value="PRODUCT">{t("product")}</option>
              <option value="SERVICE">{t("service")}</option>
            </select>
          </div>
        </div>

        {/* Moderasiya vəziyyəti */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { v: "PENDING", l: "Gözləmədə", badge: totalPending },
            { v: "APPROVED", l: "Təsdiqlənib", badge: 0 },
            { v: "REJECTED", l: "Rədd edilib", badge: 0 },
            { v: "all", l: "Hamısı", badge: 0 },
          ].map((o) => (
            <button key={o.v} onClick={() => setStatusFilter(o.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === o.v ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border text-muted hover:text-foreground'}`}>
              {o.l}
              {o.badge > 0 && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === o.v ? 'bg-white/25' : 'bg-amber-500 text-white'}`}>{o.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : owners.length === 0 ? (
        <div className="text-center py-20 text-muted">{t("adminNoData")}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {owners.map((owner) => {
            const open = openKey === owner.key;
            const isObj = owner.kind === "OBJECT";
            const list = rows[owner.key];
            return (
              <div key={owner.key} className="bg-card border border-card-border rounded-xl overflow-hidden">
                {/* Sahib sətri — klik edilə bilər */}
                <button onClick={() => toggleOwner(owner)}
                  className="w-full flex items-center gap-3 p-3 sm:p-4 text-left hover:bg-input-bg/60 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isObj ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                    {isObj ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{owner.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isObj ? 'bg-blue-500/10 text-blue-500' : 'bg-input-bg border border-input-border text-muted'}`}>
                        {isObj ? "Obyekt" : "Şəxs"}
                      </span>
                      {owner.voen && <span className="px-1.5 py-0.5 bg-input-bg border border-input-border rounded text-[10px]">VÖEN: {owner.voen}</span>}
                    </div>
                    {owner.subtitle && <p className="text-muted text-xs mt-0.5 truncate">{owner.subtitle}</p>}
                  </div>
                  {/* Elan sayları */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {owner.pending > 0 && <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-xs font-bold" title="Gözləmədə">{owner.pending}</span>}
                    {owner.rejected > 0 && <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold" title="Rədd edilib">{owner.rejected}</span>}
                    <span className="px-2.5 py-1 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-bold" title="Ümumi elan sayı">{owner.total} elan</span>
                    <svg className={`w-4 h-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </button>

                {/* Sahibin elanları */}
                {open && (
                  <div className="border-t border-card-border bg-input-bg/30 p-2 sm:p-3 flex flex-col gap-2">
                    {rowsLoading === owner.key && !list ? (
                      <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : !list || list.length === 0 ? (
                      <p className="text-center text-muted text-xs py-4">{t("adminNoData")}</p>
                    ) : list.map((listing: any) => (
                      <div key={listing.id} className="bg-card border border-card-border rounded-lg p-3">
                        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${listing.type === 'SERVICE' ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                            {listing.type === 'SERVICE' ? (
                              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" /></svg>
                            ) : (
                              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 basis-full sm:basis-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate max-w-full break-words">{listing.title}</span>
                              <span className="px-1.5 py-0.5 bg-input-bg border border-input-border rounded text-[10px]">{listing.category}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${listing.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' : listing.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {listing.status === 'APPROVED' ? 'Təsdiqlənib' : listing.status === 'REJECTED' ? 'Rədd edilib' : 'Gözləmədə'}
                              </span>
                            </div>
                            <p className="text-muted text-xs mt-0.5 truncate break-all">ID: {listing.id} · {listing.description?.slice(0, 60)}...</p>
                          </div>

                          <div className="text-orange-500 font-bold text-sm shrink-0">{formatPriceShort(listing.price)} AZN</div>

                          <div className="flex gap-1.5 shrink-0">
                            {listing.status !== 'APPROVED' && (
                              <button onClick={() => setStatus(listing.id, 'APPROVED', owner)} className="px-2.5 py-2 bg-green-500/10 text-green-500 rounded-lg text-xs font-semibold hover:bg-green-500/20 transition-colors">✓ Təsdiqlə</button>
                            )}
                            {listing.status !== 'REJECTED' && (
                              <button onClick={() => setStatus(listing.id, 'REJECTED', owner)} className="px-2.5 py-2 bg-red-500/10 text-red-500 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition-colors">✕ Rədd et</button>
                            )}
                            <button onClick={() => openEdit({ ...listing, _owner: owner })} className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors" title={t("adminEdit")}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDelete(listing.id, owner)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors" title={t("adminDelete")}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5">
              <svg className="w-5 h-5 inline mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              {t("adminEdit")} - Elan #{modal.id}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t("adminTitle")}</label>
                <input value={modal.title} onChange={(e) => setModal({ ...modal, title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t("description")}</label>
                <textarea rows={3} value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })}
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("adminPrice")} (AZN)</label>
                  <input type="number" value={modal.price} onChange={(e) => setModal({ ...modal, price: e.target.value })}
                    className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("adminType")}</label>
                  <select value={modal.type} onChange={(e) => setModal({ ...modal, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none">
                    <option value="PRODUCT">{t("product")}</option>
                    <option value="SERVICE">{t("service")}</option>
                  </select>
                </div>
              </div>
              {(() => {
                const { main, sub } = parseCat(modal.category);
                const mainName = main || CATEGORIES[0].name;
                const subs = getSubs(mainName);
                const subName = sub || subs[0] || "";
                const selectCls = "w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none";
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Ana kateqoriya</label>
                      <select
                        value={mainName}
                        onChange={(e) => {
                          const nm = e.target.value;
                          const ns = getSubs(nm);
                          setModal({ ...modal, category: buildCat(nm, ns[0] || "") });
                        }}
                        className={selectCls}
                      >
                        {CATEGORIES.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Alt kateqoriya</label>
                      <select
                        value={subName}
                        onChange={(e) => setModal({ ...modal, category: buildCat(mainName, e.target.value) })}
                        className={selectCls}
                      >
                        {subs.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("location")}</label>
                  <input value={modal.location} onChange={(e) => setModal({ ...modal, location: e.target.value })}
                    className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("adminPhone")}</label>
                  <input value={modal.phone} onChange={(e) => setModal({ ...modal, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={handleSave} className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white text-sm font-medium hover:from-orange-600 hover:to-red-700 transition-all">
                {t("adminSave")}
              </button>
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-medium hover:opacity-80 transition-all">
                {t("adminCancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
