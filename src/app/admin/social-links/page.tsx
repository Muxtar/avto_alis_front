"use client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { useAdminLive } from "@/lib/live";
import { SOCIAL_META } from "@/lib/social";
import SocialIcon from "@/components/SocialIcon";

interface SLink {
  id: number;
  platform: string;
  url: string;
  verified: boolean;
  verifyCode?: string | null;
  verifyMethod?: string | null;
  verifiedAt?: string | null;
  reviewRequestedAt?: string | null;
  proofUrl?: string | null;
  user: { id: number; name: string | null; phone: string };
}

export default function AdminSocialLinksPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<SLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  const headers: any = { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}` };

  // ANLIQ: yeni iş gələn kimi siyahı özü yenilənir.
  useAdminLive(["social"], () => { load(); });

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
      const reason = action === "reject" ? prompt("Səbəb (istifadəçiyə göndəriləcək):", "Kod profilinizin biosunda tapılmadı") : null;
      if (action === "reject" && reason === null) return;
      const res = await fetch(`${API}/admin/social-links/${id}/${action}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      if (res.ok) { toast(action === "verify" ? "Təsdiqləndi" : "Təsdiq götürüldü", "success"); load(); }
      else toast("Xəta", "error");
    } catch { toast("Xəta", "error"); }
  };

  const statuses = ["PENDING", "VERIFIED", "ALL"];

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Sosial media təsdiqi</h1>
      <p className="text-muted text-sm mb-4">Burada avtomatik oxunmayan hesablar (Instagram, TikTok, Facebook və s.) görünür. Linki açın və <b>istifadəçinin kodu</b> bioda yazılıbsa təsdiqləyin — kod yoxdursa təsdiqləməyin, sahiblik sübut olunmayıb.</p>
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
                  {s.proofUrl && <a href={s.proofUrl} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 truncate block hover:underline">Paylaşım: {s.proofUrl}</a>}
                  <p className="text-[11px] text-muted mt-1 flex items-center gap-2 flex-wrap">
                    {s.verifyCode && !s.verified && <>Bioda axtarın: <code className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 font-bold tracking-wider">{s.verifyCode}</code></>}
                    {s.verified && <span className="text-green-600">✓ {s.verifyMethod === "OAUTH" ? "Hesabla daxil olub" : s.verifyMethod === "BIO_CODE" ? "Bio kodu avtomatik tapıldı" : s.verifyMethod === "POST_CODE" ? "Paylaşımda kod tapıldı" : "Admin təsdiqi"}{s.verifiedAt ? ` · ${new Date(s.verifiedAt).toLocaleDateString("az-AZ")}` : ""}</span>}
                    {!s.verified && s.reviewRequestedAt && <span>göndərilib: {new Date(s.reviewRequestedAt).toLocaleString("az-AZ")}</span>}
                  </p>
                </div>
                {s.verified
                  ? <button onClick={() => act(s.id, "reject")} className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm">Təsdiqi götür</button>
                  : <div className="flex gap-2">
                      <button onClick={() => act(s.id, "reject")} className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm">Kod yoxdur</button>
                      <button onClick={() => act(s.id, "verify")} className="px-4 py-2 bg-green-500/90 hover:bg-green-500 text-white rounded-xl text-sm font-semibold">✓ Kod var — təsdiqlə</button>
                    </div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
