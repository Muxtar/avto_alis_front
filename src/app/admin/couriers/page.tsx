"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

export default function AdminCouriersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", password: "" });

  const headers: any = {
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`,
    "Content-Type": "application/json",
  };

  const fetchCouriers = () => {
    setLoading(true);
    fetch(`${API}/admin/couriers`, { headers })
      .then((r) => r.json())
      .then((d) => setCouriers(d.couriers || []))
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCouriers(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.phone || !form.password) return;
    await fetch(`${API}/admin/couriers`, { method: "POST", headers, body: JSON.stringify(form) });
    setForm({ name: "", phone: "", password: "" });
    setShowForm(false);
    fetchCouriers();
  };

  const handleUpdate = async () => {
    if (!editId) return;
    const body: any = { name: editForm.name, phone: editForm.phone };
    if (editForm.password) body.password = editForm.password;
    await fetch(`${API}/admin/couriers/${editId}`, { method: "PUT", headers, body: JSON.stringify(body) });
    setEditId(null);
    fetchCouriers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("adminConfirmDelete"))) return;
    await fetch(`${API}/admin/couriers/${id}`, { method: "DELETE", headers });
    fetchCouriers();
  };

  const inputCls = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm";

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">{t("adminCouriers")}</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium">
          {showForm ? t("adminCancel") : t("courierAdd")}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-card border border-card-border rounded-xl p-5 mb-6 space-y-3">
          <h2 className="font-semibold text-sm mb-2">{t("courierAdd")}</h2>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t("fullName")} className={inputCls} />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder={t("phone")} className={inputCls} />
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={t("courierPassword")} className={inputCls} />
          <button onClick={handleCreate}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium">
            {t("adminSave")}
          </button>
        </div>
      )}

      {/* Couriers List */}
      {couriers.length === 0 ? (
        <div className="text-center py-16 bg-card border border-card-border rounded-2xl text-muted">
          <svg className="w-16 h-16 text-muted-foreground/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
          <p>{t("adminNoData")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {couriers.map((c) => (
            <div key={c.id} className="bg-card border border-card-border rounded-xl p-4">
              {editId === c.id ? (
                <div className="space-y-3">
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder={t("fullName")} className={inputCls} />
                  <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder={t("phone")} className={inputCls} />
                  <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder={t("courierNewPassword")} className={inputCls} />
                  <div className="flex gap-2">
                    <button onClick={handleUpdate} className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl text-white text-sm font-medium">{t("adminSave")}</button>
                    <button onClick={() => setEditId(null)} className="px-4 py-2 bg-input-bg border border-input-border rounded-xl text-sm">{t("adminCancel")}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-muted text-sm">{c.phone}</p>
                    <p className="text-muted text-xs mt-1">{t("courierActiveOrders")}: {c._count?.courierOrders || 0}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditId(c.id); setEditForm({ name: c.name, phone: c.phone, password: "" }); }}
                      className="px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-medium hover:bg-orange-500/20">
                      {t("adminEdit")}
                    </button>
                    <button onClick={() => handleDelete(c.id)}
                      className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20">
                      {t("adminDelete")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
