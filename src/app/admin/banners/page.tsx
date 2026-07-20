"use client";
import { useEffect, useState } from "react";
import { API, imgUrl } from "@/lib/api";
import { useToast } from "@/components/Toast";

export default function AdminBannersPage() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [position, setPosition] = useState("MAIN");
  const [uploading, setUploading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const load = () => {
    fetch(`${API}/admin/banners`, { headers: authHeaders })
      .then((r) => r.json()).then((d) => { if (d.success) setBanners(d.banners); }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const upload = async () => {
    if (!file) { toast("Şəkil seçin", "error"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      if (link.trim()) fd.append("link", link.trim());
      if (title.trim()) fd.append("title", title.trim());
      fd.append("position", position);
      fd.append("sortOrder", String(banners.length));
      const r = await fetch(`${API}/admin/banners`, { method: "POST", headers: authHeaders, body: fd }).then((x) => x.json());
      if (r.success) { toast("Banner əlavə edildi ✓", "success"); setFile(null); setLink(""); setTitle(""); load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setUploading(false); }
  };

  const patch = async (id: number, data: any) => {
    const r = await fetch(`${API}/admin/banners/${id}`, { method: "PUT", headers: { ...authHeaders, "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((x) => x.json());
    if (r.success) load(); else toast(r.message || "Xəta", "error");
  };

  const remove = async (id: number) => {
    if (!confirm("Banner silinsin?")) return;
    const r = await fetch(`${API}/admin/banners/${id}`, { method: "DELETE", headers: authHeaders }).then((x) => x.json());
    if (r.success) { setBanners((b) => b.filter((x) => x.id !== id)); toast("Silindi", "success"); } else toast(r.message || "Xəta", "error");
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">🖼️ Ana səhifə karuseli</h1>
        <p className="text-muted text-xs mt-1">Ana səhifədə göstərilən banner/endirim şəkilləri. {banners.length} banner.</p>
      </div>

      {/* Yeni banner */}
      <div className="bg-card border border-card-border rounded-xl p-4 sm:p-5 mb-6">
        <h2 className="font-semibold mb-3">Yeni banner əlavə et</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Şəkil (16:5 tövsiyə olunur)</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-500/10 file:text-orange-500 file:text-sm file:font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Keçid linki (opsional)</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/elanlar/... və ya https://..." className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Yerləşmə</label>
            <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none">
              <option value="MAIN">Əsas karusel (mərkəz)</option>
              <option value="SIDE">Yan banner (sağ sütun, maks 3)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Başlıq / alt yazı (opsional)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Məs: Böyük endirim! %50-yə qədər" className="w-full px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
          </div>
        </div>
        {file && <p className="text-[11px] text-green-500 mt-2">✓ {file.name}</p>}
        <button onClick={upload} disabled={uploading || !file} className="mt-3 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white text-sm font-semibold hover:from-orange-600 hover:to-red-700 transition-all disabled:opacity-50">
          {uploading ? "Yüklənir…" : "Əlavə et"}
        </button>
      </div>

      {/* Siyahı */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : banners.length === 0 ? (
        <div className="text-center py-20 text-muted">Banner yoxdur</div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="bg-card border border-card-border rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl(b.image)} alt="" className="w-full sm:w-48 h-24 object-cover rounded-lg bg-input-bg shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm truncate">{b.title || "(başlıqsız)"}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${b.position === "SIDE" ? "bg-purple-500/10 text-purple-500" : "bg-orange-500/10 text-orange-500"}`}>{b.position === "SIDE" ? "Yan banner" : "Əsas karusel"}</span>
                </div>
                {b.link && <p className="text-xs text-muted truncate">🔗 {b.link}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <select value={b.position || "MAIN"} onChange={(e) => patch(b.id, { position: e.target.value })} className="px-2 py-1 bg-input-bg border border-input-border rounded-lg text-xs">
                    <option value="MAIN">Əsas karusel</option>
                    <option value="SIDE">Yan banner</option>
                  </select>
                  <label className="text-xs flex items-center gap-1.5">Sıra:
                    <input type="number" defaultValue={b.sortOrder} onBlur={(e) => patch(b.id, { sortOrder: parseInt(e.target.value) || 0 })} className="w-16 px-2 py-1 bg-input-bg border border-input-border rounded-lg text-xs" />
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => patch(b.id, { active: !b.active })} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${b.active ? "bg-green-500/10 text-green-500" : "bg-input-bg text-muted"}`}>
                  {b.active ? "Aktiv ✓" : "Passiv"}
                </button>
                <button onClick={() => remove(b.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20">Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
