"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

interface Page { id: number; slug: string; title: string; content: string; published: boolean; updatedAt: string; }

export default function AdminPagesPage() {
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Partial<Page> | null>(null);
  const [busy, setBusy] = useState(false);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);
  const H = () => ({ Authorization: `Bearer ${token()}`, "Content-Type": "application/json" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/pages`, { headers: { Authorization: `Bearer ${token()}` } }).then((x) => x.json());
      if (r.success) setPages(r.pages || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!edit) return;
    if (!edit.title?.trim()) { toast("Başlıq tələb olunur", "error"); return; }
    setBusy(true);
    try {
      const isNew = !edit.id;
      const r = await fetch(`${API}/admin/pages${isNew ? "" : `/${edit.id}`}`, {
        method: isNew ? "POST" : "PUT", headers: H(),
        body: JSON.stringify({ title: edit.title, slug: edit.slug, content: edit.content || "", published: edit.published !== false }),
      }).then((x) => x.json());
      if (r.success) { toast("Yadda saxlanıldı", "success"); setEdit(null); await load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!confirm("Səhifə silinsin?")) return;
    try {
      const r = await fetch(`${API}/admin/pages/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } }).then((x) => x.json());
      if (r.success) { toast("Silindi", "success"); await load(); }
    } catch { toast("Xəta", "error"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl sm:text-2xl font-bold">Səhifələr (CMS)</h1>
        <button onClick={() => setEdit({ title: "", slug: "", content: "", published: true })} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold">+ Yeni səhifə</button>
      </div>
      <p className="text-muted text-sm mb-5">Haqqımızda, şərtlər, FAQ kimi məzmun səhifələrini yaradın/redaktə edin. Ünvan: <span className="font-mono">/p/&lt;slug&gt;</span></p>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {pages.length === 0 ? <p className="text-muted text-sm py-8 text-center">Hələ səhifə yoxdur.</p> : pages.map((p) => (
            <div key={p.id} className="surface p-3.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{p.title}</span>
                  <span className="font-mono text-[11px] text-muted">/p/{p.slug}</span>
                  {!p.published && <span className="px-1.5 py-0.5 bg-gray-500/15 text-gray-500 rounded text-[10px] font-bold">GİZLİ</span>}
                </div>
                <p className="text-[11px] text-muted mt-0.5">Yeniləndi: {new Date(p.updatedAt).toLocaleDateString("az-AZ")}</p>
              </div>
              <a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 shrink-0">Bax ↗</a>
              <button onClick={() => setEdit(p)} className="text-xs text-orange-500 shrink-0">Redaktə</button>
              <button onClick={() => remove(p.id)} className="text-xs text-red-500 shrink-0">Sil</button>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" onClick={() => setEdit(null)}>
          <div className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">{edit.id ? "Səhifəni redaktə et" : "Yeni səhifə"}</h3>
            <label className="block text-xs font-medium text-muted mb-1">Başlıq</label>
            <input value={edit.title || ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm mb-3" />
            <label className="block text-xs font-medium text-muted mb-1">Slug (ünvan) — boş buraxsanız başlıqdan yaranır</label>
            <input value={edit.slug || ""} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} placeholder="haqqimizda" className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm mb-3 font-mono" />
            <label className="block text-xs font-medium text-muted mb-1">Məzmun (HTML dəstəklənir)</label>
            <textarea value={edit.content || ""} onChange={(e) => setEdit({ ...edit, content: e.target.value })} rows={12} className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm mb-3 font-mono" />
            <label className="flex items-center gap-2 text-sm mb-4"><input type="checkbox" checked={edit.published !== false} onChange={(e) => setEdit({ ...edit, published: e.target.checked })} className="w-4 h-4 accent-orange-500" /> Dərc olunsun (saytda görünsün)</label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEdit(null)} className="px-4 py-2 bg-input-bg border border-input-border rounded-lg text-sm">Ləğv</button>
              <button onClick={save} disabled={busy} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50">{busy ? "..." : "Yadda saxla"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
