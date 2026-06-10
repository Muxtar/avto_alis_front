"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/lib/LanguageContext";
import { API } from "@/lib/api";

interface Promo {
  id: number;
  code: string;
  description?: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  validFrom: string;
  validUntil?: string | null;
  active: boolean;
  createdAt: string;
}

export default function AdminPromoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discountType: "PERCENT" as "PERCENT" | "FIXED",
    discountValue: "10",
    minOrderAmount: "",
    maxDiscount: "",
    usageLimit: "",
    validUntil: "",
  });
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const adminToken = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  useEffect(() => {
    if (!adminToken) { router.push("/admin/login"); return; }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/promo`, { headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await res.json();
      setItems(data.promos || []);
    } catch {
      toast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ code: "", description: "", discountType: "PERCENT", discountValue: "10", minOrderAmount: "", maxDiscount: "", usageLimit: "", validUntil: "" });
    setEditId(null);
  };

  const openEdit = (p: Promo) => {
    setEditId(p.id);
    setForm({
      code: p.code,
      description: p.description || "",
      discountType: p.discountType,
      discountValue: String(p.discountValue),
      minOrderAmount: p.minOrderAmount != null ? String(p.minOrderAmount) : "",
      maxDiscount: p.maxDiscount != null ? String(p.maxDiscount) : "",
      usageLimit: p.usageLimit != null ? String(p.usageLimit) : "",
      validUntil: p.validUntil ? p.validUntil.slice(0, 10) : "",
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body: any = {
        code: form.code.toUpperCase(),
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
        maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
        validUntil: form.validUntil || null,
      };
      const res = await fetch(`${API}/admin/promo${editId ? `/${editId}` : ""}`, {
        method: editId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { toast(data.message || t("error"), "error"); return; }
      toast(editId ? (t("adminSaved") || "Yeniləndi") : "Promo kod yaradıldı", "success");
      setShowForm(false);
      resetForm();
      refresh();
    } catch { toast(t("error"), "error"); } finally { setBusy(false); }
  };

  const toggle = async (p: Promo) => {
    try {
      const res = await fetch(`${API}/admin/promo/${p.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ active: !p.active }),
      });
      if (!res.ok) throw new Error();
      refresh();
    } catch { toast(t("error"), "error"); }
  };

  const remove = async (id: number) => {
    if (!confirm(t("adminConfirmDelete") || "Promo kodu silmək istəyirsiniz?")) return;
    try {
      const res = await fetch(`${API}/admin/promo/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) throw new Error();
      refresh();
    } catch { toast(t("error"), "error"); }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Promo kodları</h1>
          <p className="text-muted text-sm">Endirim kodlarını idarə et</p>
        </div>
        <button onClick={() => { if (showForm) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); } }} className="btn-primary">
          {showForm ? "Bağla" : "+ Yeni promo"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="surface p-5 mb-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Kod *</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="WINTER20"
                required
                className="input-base px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Növ *</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                className="input-base px-3 py-2 w-full"
              >
                <option value="PERCENT">Faizlə (%)</option>
                <option value="FIXED">Sabit (AZN)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Endirim *</label>
              <input
                type="number"
                step="0.01"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                required
                className="input-base px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Min sifariş</label>
              <input
                type="number"
                step="0.01"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                className="input-base px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Max endirim</label>
              <input
                type="number"
                step="0.01"
                value={form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                className="input-base px-3 py-2 w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">İstifadə limiti</label>
              <input
                type="number"
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                placeholder="Limitsiz"
                className="input-base px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Bitmə tarixi</label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                className="input-base px-3 py-2 w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Təsvir</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-base px-3 py-2 w-full"
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "..." : editId ? (t("adminSave") || "Yadda saxla") : "Yarat"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="surface text-center py-16 text-muted">
          Promo kod yoxdur
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="surface p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-lg font-bold text-orange-500">{p.code}</code>
                    {!p.active && <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded-full text-xs">Deaktiv</span>}
                  </div>
                  {p.description && <p className="text-sm text-muted mb-1">{p.description}</p>}
                  <p className="text-sm">
                    <span className="font-bold">
                      {p.discountValue}{p.discountType === "PERCENT" ? "%" : " AZN"}
                    </span>
                    {p.minOrderAmount && <span className="text-muted text-xs"> • min {p.minOrderAmount} AZN</span>}
                    {p.maxDiscount && <span className="text-muted text-xs"> • max {p.maxDiscount} AZN</span>}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    İstifadə: {p.usageCount}{p.usageLimit ? `/${p.usageLimit}` : " (limitsiz)"}
                    {p.validUntil && ` • Bitir: ${new Date(p.validUntil).toLocaleDateString("az-AZ")}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggle(p)} className="btn-outline text-xs">
                    {p.active ? "Deaktiv et" : "Aktiv et"}
                  </button>
                  <button onClick={() => openEdit(p)} className="px-3 py-1.5 bg-orange-500/10 text-orange-500 rounded-lg text-xs hover:bg-orange-500/20">
                    {t("adminEdit") || "Redaktə"}
                  </button>
                  <button onClick={() => remove(p.id)} className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs hover:bg-red-500/20">
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
