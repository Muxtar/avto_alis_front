"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { TAXONOMY, buildCategoryPath, parseCategoryPath, getSubsFor, getPartsFor } from "@/lib/taxonomy";

export default function AdminListingsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [listings, setListings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchListings = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (catFilter) params.set("category", catFilter);
    params.set("page", String(page));
    params.set("limit", "20");
    fetch(`${API}/admin/listings?${params}`, { headers })
      .then((r) => r.json())
      .then((d) => { setListings(d.listings || []); setTotalPages(d.totalPages || 1); })
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchListings(); }, [typeFilter, catFilter, page]);
  useEffect(() => { setPage(1); const tm = setTimeout(fetchListings, 300); return () => clearTimeout(tm); }, [search]);

  const handleDelete = async (id: number) => {
    if (!confirm(t("adminConfirmDelete"))) return;
    try {
      const res = await fetch(`${API}/admin/listings/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok || !data.success) { toast(data.message || t("error"), "error"); return; }
      setListings(listings.filter((l) => l.id !== id));
      toast(t("adminDeleted") || "Silindi", "success");
    } catch { toast(t("error"), "error"); }
  };

  const openEdit = (listing: any) => {
    setModal({
      id: listing.id, title: listing.title, description: listing.description,
      price: listing.price, category: listing.category, type: listing.type,
      location: listing.location || "", phone: listing.phone || "",
    });
  };

  const handleSave = async () => {
    if (!modal) return;
    const { id, ...data } = modal;
    try {
      const res = await fetch(`${API}/admin/listings/${id}`, { method: "PUT", headers, body: JSON.stringify(data) });
      const r = await res.json();
      if (!res.ok || !r.success) { toast(r.message || t("error"), "error"); return; }
      setModal(null);
      fetchListings();
      toast(t("adminSaved") || "Yadda saxlanıldı", "success");
    } catch { toast(t("error"), "error"); }
  };

  // Unique categories from data
  const uniqueCats = [...new Set(listings.map((l) => l.category))].sort();

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t("adminListings")}</h1>
            <p className="text-muted text-xs mt-1">{listings.length} elan</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-56">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("adminSearch")}
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

        {/* Category chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setCatFilter("")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${!catFilter ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border text-muted hover:text-foreground'}`}>
            {t("all")}
          </button>
          {uniqueCats.map((cat) => (
            <button key={cat} onClick={() => setCatFilter(catFilter === cat ? "" : cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${catFilter === cat ? 'bg-orange-500 text-white' : 'bg-input-bg border border-input-border text-muted hover:text-foreground'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 text-muted">{t("adminNoData")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-card border border-card-border rounded-xl p-3 sm:p-4 hover:border-orange-500/20 transition-colors">
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                {/* Type badge */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${listing.type === 'SERVICE' ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                  {listing.type === 'SERVICE' ? (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" /></svg>
                  ) : (
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 basis-full sm:basis-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate max-w-full break-words">{listing.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${listing.type === 'SERVICE' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                      {listing.type === 'SERVICE' ? t("service") : t("product")}
                    </span>
                    <span className="px-1.5 py-0.5 bg-input-bg border border-input-border rounded text-[10px]">{listing.category}</span>
                  </div>
                  <p className="text-muted text-xs mt-0.5 truncate break-all">{listing.user?.name} · ID: {listing.id} · {listing.description?.slice(0, 60)}...</p>
                </div>

                {/* Price */}
                <div className="text-orange-500 font-bold text-sm shrink-0">{listing.price} AZN</div>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => openEdit(listing)} className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors" title={t("adminEdit")}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => handleDelete(listing.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors" title={t("adminDelete")}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6 flex-wrap">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium ${page === p ? "bg-orange-500 text-white" : "bg-input-bg border border-input-border text-muted hover:text-foreground"}`}>
              {p}
            </button>
          ))}
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
                const { main, sub, leaf } = parseCategoryPath(modal.category);
                const mainName = main || TAXONOMY[0].name;
                const subs = getSubsFor(mainName);
                const subName = sub || subs[0]?.name || "";
                const parts = getPartsFor(mainName, subName);
                const selectCls = "w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none";
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Ana kateqoriya</label>
                      <select
                        value={mainName}
                        onChange={(e) => {
                          const nm = e.target.value;
                          const ns = getSubsFor(nm);
                          setModal({ ...modal, category: buildCategoryPath(nm, ns[0]?.name || "", ns[0]?.parts[0] || "") });
                        }}
                        className={selectCls}
                      >
                        {TAXONOMY.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Alt kateqoriya</label>
                      <select
                        value={subName}
                        onChange={(e) => {
                          const ns = e.target.value;
                          const np = getPartsFor(mainName, ns);
                          setModal({ ...modal, category: buildCategoryPath(mainName, ns, np[0] || "") });
                        }}
                        className={selectCls}
                      >
                        {subs.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Hissə</label>
                      <select
                        value={leaf}
                        onChange={(e) => setModal({ ...modal, category: buildCategoryPath(mainName, subName, e.target.value) })}
                        className={selectCls}
                      >
                        {parts.map((p) => <option key={p} value={p}>{p}</option>)}
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
              <button onClick={handleSave} className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium hover:from-orange-600 hover:to-red-700 transition-all">
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
