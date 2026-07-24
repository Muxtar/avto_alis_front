"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
const USER_TYPES = ["CAR_OWNER", "MECHANIC", "PARTS_SELLER"];
const USER_ROLES = ["USER", "ADMIN"];

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null); // edit modal data
  const [detailUser, setDetailUser] = useState<any>(null); // detail panel
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [nu, setNu] = useState<any>({ name: "", phone: "", email: "", type: "CAR_OWNER", role: "USER", verified: true, password: "" });
  const [confirmDel, setConfirmDel] = useState<any>(null); // silmə təsdiqi (ekran modalı)
  const [deleting, setDeleting] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchUsers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    params.set("page", String(page));
    params.set("limit", "20");
    fetch(`${API}/admin/users?${params}`, { headers })
      .then((r) => r.json())
      .then((d) => { setUsers(d.users || []); setTotalPages(d.totalPages || 1); })
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [typeFilter, page]);
  useEffect(() => { setPage(1); const tm = setTimeout(fetchUsers, 300); return () => clearTimeout(tm); }, [search]);

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch(`${API}/admin/users/${id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok || !data.success) { toast(data.message || t("error"), "error"); return; }
      setUsers(users.filter((u) => u.id !== id));
      if (detailUser?.id === id) setDetailUser(null);
      toast(t("adminDeleted") || "Silindi", "success");
      setConfirmDel(null);
    } catch { toast(t("error"), "error"); } finally { setDeleting(false); }
  };

  const toggleBlock = async (user: any) => {
    const blocked = !user.isBlocked;
    if (blocked && !confirm(t("adminBlockConfirm") || "Bu istifadəçi bloklansın?")) return;
    try {
      const res = await fetch(`${API}/admin/users/${user.id}/block`, { method: "PUT", headers, body: JSON.stringify({ blocked }) });
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(users.map((u) => u.id === user.id ? { ...u, isBlocked: blocked } : u));
        toast(blocked ? (t("adminBlocked") || "Bloklandı") : (t("adminUnblocked") || "Blok açıldı"), "success");
      } else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  const openEdit = (user: any) => {
    setModal({ id: user.id, name: user.name, phone: user.phone, type: user.type, role: user.role || "USER", verified: user.verified });
  };

  const openCreate = () => { setNu({ name: "", phone: "", email: "", type: "CAR_OWNER", role: "USER", verified: true, password: "" }); setCreateOpen(true); };
  const handleCreate = async () => {
    if (!nu.name.trim() || !nu.phone.trim()) { toast("Ad və telefon tələb olunur", "error"); return; }
    try {
      const res = await fetch(`${API}/admin/users`, { method: "POST", headers, body: JSON.stringify(nu) });
      const data = await res.json();
      if (!res.ok || !data.success) { toast(data.message || t("error"), "error"); return; }
      setCreateOpen(false); fetchUsers();
      toast("İstifadəçi əlavə edildi ✓", "success");
    } catch { toast(t("error"), "error"); }
  };

  const handleSave = async () => {
    if (!modal) return;
    try {
      const res = await fetch(`${API}/admin/users/${modal.id}`, { method: "PUT", headers, body: JSON.stringify(modal) });
      const data = await res.json();
      if (!res.ok || !data.success) { toast(data.message || t("error"), "error"); return; }
      setModal(null);
      fetchUsers();
      toast(t("adminSaved") || "Yadda saxlanıldı", "success");
    } catch { toast(t("error"), "error"); }
  };

  const typeLabel = (type: string) => {
    if (type === "MECHANIC") return { text: "Usta", cls: "bg-green-500/10 text-green-500 border-green-500/20" };
    if (type === "PARTS_SELLER") return { text: "Satıcı", cls: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
    return { text: "Sahib", cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("adminUsers")}</h1>
          <p className="text-muted text-xs mt-1">{users.length} istifadəçi</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openCreate} className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white text-sm font-semibold hover:from-orange-600 hover:to-red-700 transition-all flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <span className="hidden sm:inline">Yeni istifadəçi</span>
          </button>
          <div className="relative flex-1 sm:w-56">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("adminSearch")}
              className="w-full pl-9 pr-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none">
            <option value="">{t("all")}</option>
            <option value="CAR_OWNER">Sahib</option>
            <option value="MECHANIC">Usta</option>
            <option value="PARTS_SELLER">Satıcı</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-muted">{t("adminNoData")}</div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {users.map((user) => {
            const tl = typeLabel(user.type);
            return (
              <div key={user.id} className="bg-card border border-card-border rounded-xl p-4 hover:border-orange-500/20 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500/80 to-red-600/80 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailUser(detailUser?.id === user.id ? null : user)}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{user.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${tl.cls}`}>{tl.text}</span>
                      {user.verified && <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" title="Doğrulanıb" />}
                      {user.role === "ADMIN" && <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[10px] font-medium">ADMIN</span>}
                      {user.isBlocked && <span className="px-1.5 py-0.5 bg-red-600/15 text-red-600 border border-red-600/30 rounded text-[10px] font-bold">{t("adminBlockedTag") || "BLOKLU"}</span>}
                    </div>
                    <p className="text-muted text-xs mt-0.5">{user.phone} · {user._count?.listings || 0} elan · ID: {user.id}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    {user.role !== "ADMIN" && (
                      <button onClick={() => toggleBlock(user)} className={`p-2 rounded-lg transition-colors ${user.isBlocked ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20"}`} title={user.isBlocked ? (t("adminUnblock") || "Blok aç") : (t("adminBlock") || "Blokla")}>
                        {user.isBlocked ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                        )}
                      </button>
                    )}
                    <button onClick={() => openEdit(user)} className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors" title={t("adminEdit")}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setConfirmDel(user)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors" title={t("adminDelete")}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {/* Detail Panel (expandable) */}
                {detailUser?.id === user.id && (
                  <div className="mt-4 pt-4 border-t border-card-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted text-xs mb-1">Növ</p>
                      <p className="font-medium">{user.type}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs mb-1">Rol</p>
                      <p className="font-medium">{user.role || "USER"}</p>
                    </div>
                    <div>
                      <p className="text-muted text-xs mb-1">Qeydiyyat</p>
                      <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                    {user.workplaces?.length > 0 && (
                      <div className="sm:col-span-3">
                        <p className="text-muted text-xs mb-1">Obyektlər</p>
                        <div className="flex flex-wrap gap-2">
                          {user.workplaces.map((w: any) => (
                            <span key={w.id} className="px-2 py-1 bg-input-bg border border-input-border rounded-lg text-xs">{w.name} - {w.address}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {user.vehicles?.length > 0 && (
                      <div className="sm:col-span-3">
                        <p className="text-muted text-xs mb-1">Avtomobillər</p>
                        <div className="flex flex-wrap gap-2">
                          {user.vehicles.map((v: any) => (
                            <span key={v.id} className="px-2 py-1 bg-input-bg border border-input-border rounded-lg text-xs">{v.brand} {v.model} ({v.year})</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5">
              <svg className="w-5 h-5 inline mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              {t("adminEdit")} - ID #{modal.id}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t("adminName")}</label>
                <input value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t("adminPhone")}</label>
                <input value={modal.phone} onChange={(e) => setModal({ ...modal, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("adminType")}</label>
                  <select value={modal.type} onChange={(e) => setModal({ ...modal, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none">
                    {USER_TYPES.map((ut) => <option key={ut} value={ut}>{ut === "CAR_OWNER" ? "Sahib" : ut === "MECHANIC" ? "Usta" : "Satıcı"}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Rol</label>
                  <select value={modal.role} onChange={(e) => setModal({ ...modal, role: e.target.value })}
                    className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none">
                    {USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t("adminVerified")}</label>
                <button onClick={() => setModal({ ...modal, verified: !modal.verified })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full ${modal.verified ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                  {modal.verified ? "Doğrulanıb ✓" : "Doğrulanmayıb ✗"}
                </button>
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

      {/* Yeni istifadəçi yarat */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setCreateOpen(false)}>
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5">➕ Yeni istifadəçi</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t("adminName")} *</label>
                <input value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} placeholder="Ad Soyad"
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">{t("adminPhone")} *</label>
                <input value={nu.phone} onChange={(e) => setNu({ ...nu, phone: e.target.value })} placeholder="+994..."
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">E-mail (opsional)</label>
                <input value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} placeholder="mail@nümunə.az"
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">{t("adminType")}</label>
                  <select value={nu.type} onChange={(e) => setNu({ ...nu, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none">
                    <option value="CAR_OWNER">Sahib</option>
                    <option value="MECHANIC">Usta</option>
                    <option value="PARTS_SELLER">Satıcı</option>
                    <option value="COURIER">Kuryer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Rol</label>
                  <select value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}
                    className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none">
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Şifrə (opsional — giriş üçün)</label>
                <input type="text" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} placeholder="boş buraxıla bilər"
                  className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              </div>
              <button onClick={() => setNu({ ...nu, verified: !nu.verified })}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full ${nu.verified ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                {nu.verified ? "Doğrulanıb ✓" : "Doğrulanmayıb ✗"}
              </button>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleCreate} className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white text-sm font-medium hover:from-orange-600 hover:to-red-700 transition-all">
                Yarat
              </button>
              <button onClick={() => setCreateOpen(false)} className="flex-1 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-medium hover:opacity-80 transition-all">
                {t("adminCancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Silmə təsdiqi — ekran modalı (browser confirm əvəzinə) */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4" onClick={() => !deleting && setConfirmDel(null)}>
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h2 className="text-lg font-bold text-center mb-1">İstifadəçini sil?</h2>
            <p className="text-sm text-muted text-center mb-1">
              <b className="text-foreground">{confirmDel.name || "—"}</b>{confirmDel.phone ? ` · ${confirmDel.phone}` : ""}
            </p>
            <p className="text-xs text-red-500 text-center mb-5">
              Bu istifadəçiyə aid bütün elanlar, sifarişlər və məlumatlar da silinəcək. Geri qaytarmaq mümkün deyil.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(confirmDel.id)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-all disabled:opacity-60"
              >
                {deleting ? "Silinir…" : "Bəli, sil"}
              </button>
              <button
                onClick={() => setConfirmDel(null)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-medium hover:opacity-80 transition-all disabled:opacity-60"
              >
                {t("adminCancel") || "Ləğv et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
