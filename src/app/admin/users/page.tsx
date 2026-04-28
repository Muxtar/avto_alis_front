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

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchUsers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    params.set("limit", "100");
    fetch(`${API}/admin/users?${params}`, { headers })
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [typeFilter]);
  useEffect(() => { const t = setTimeout(fetchUsers, 300); return () => clearTimeout(t); }, [search]);

  const handleDelete = async (id: number) => {
    if (!confirm(t("adminConfirmDelete"))) return;
    await fetch(`${API}/admin/users/${id}`, { method: "DELETE", headers });
    setUsers(users.filter((u) => u.id !== id));
    if (detailUser?.id === id) setDetailUser(null);
  };

  const openEdit = (user: any) => {
    setModal({ id: user.id, name: user.name, phone: user.phone, type: user.type, role: user.role || "USER", verified: user.verified });
  };

  const handleSave = async () => {
    if (!modal) return;
    await fetch(`${API}/admin/users/${modal.id}`, { method: "PUT", headers, body: JSON.stringify(modal) });
    setModal(null);
    fetchUsers();
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
                    </div>
                    <p className="text-muted text-xs mt-0.5">{user.phone} · {user._count?.listings || 0} elan · ID: {user.id}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(user)} className="p-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors" title={t("adminEdit")}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(user.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors" title={t("adminDelete")}>
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
