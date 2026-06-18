"use client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { SOCIAL_META } from "@/lib/social";
import SocialIcon from "@/components/SocialIcon";

interface SLink {
  id: number;
  platform: string;
  url: string;
  verified: boolean;
  user: { id: number; name: string | null; phone: string };
}

export default function AdminSocialLinksPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<SLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  const headers: any = { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/social-links?status=${filter}`, { headers });
      const data = await res.json();
      setItems(data.links || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: number, action: "verify" | "reject") => {
    try {
      const res = await fetch(`${API}/admin/social-links/${id}/${action}`, { method: "POST", headers });
      if (res.ok) { toast(action === "verify" ? "Təsdiqləndi" : "Təsdiq götürüldü", "success"); load(); }
      else toast("Xəta", "error");
    } catch { toast("Xəta", "error"); }
  };

  const statuses = ["PENDING", "VERIFIED", "ALL"];

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Sosial media təsdiqi</h1>
      <p className="text-muted text-sm mb-4">Linkin istifadəçiyə aid olduğunu yoxlayıb təsdiqləyin — təsdiqlənənlər public profildə görünür.</p>
      <div className="flex gap-1.5 flex-wrap bg-input-bg border border-input-border rounded-xl p-1 mb-6 w-fit">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>
            {s === "ALL" ? "Hamısı" : s === "PENDING" ? "Gözləyən" : "Təsdiqli"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted">Məlumat yoxdur</div>
      ) : (
        <div className="space-y-3">
          {items.map((s) => {
            const meta = SOCIAL_META[s.platform] || { label: s.platform, icon: "🔗" };
            return (
              <div key={s.id} className="bg-card border border-card-border rounded-xl p-4 flex items-center gap-3 flex-wrap">
                <SocialIcon platform={s.platform} className="w-6 h-6 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{meta.label} <span className="text-muted font-normal">· {s.user.name || s.user.phone}</span></p>
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-orange-500 truncate block hover:underline">{s.url}</a>
                </div>
                {s.verified
                  ? <button onClick={() => act(s.id, "reject")} className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm">Təsdiqi götür</button>
                  : <button onClick={() => act(s.id, "verify")} className="px-4 py-2 bg-green-500/90 hover:bg-green-500 text-white rounded-xl text-sm font-semibold">✓ Təsdiqlə</button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
