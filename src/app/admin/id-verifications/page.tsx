"use client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API, UPLOADS } from "@/lib/api";

interface IdUser {
  id: number;
  name: string | null;
  phone: string;
  profession: string | null;
  idCardImage: string | null;
  selfieImage: string | null;
  faceMatchScore: number | null;
  idVerifyStatus: string | null;
}

export default function AdminIdVerificationsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<IdUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  const headers: any = { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/id-verifications?status=${filter}`, { headers });
      const data = await res.json();
      setItems(data.users || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const act = async (userId: number, action: "approve" | "reject") => {
    try {
      const res = await fetch(`${API}/admin/id-verifications/${userId}/${action}`, { method: "POST", headers });
      if (res.ok) { toast(action === "approve" ? "Təsdiqləndi" : "Rədd edildi", "success"); load(); }
      else toast("Xəta", "error");
    } catch { toast("Xəta", "error"); }
  };

  const statuses = ["PENDING", "APPROVED", "REJECTED", "ALL"];

  const scoreBadge = (s: number | null) => {
    if (s === null || s === undefined) return <span className="text-amber-500">üz balı yoxdur</span>;
    const pct = Math.round(s * 100);
    const cls = pct >= 60 ? "text-green-500" : pct >= 40 ? "text-amber-500" : "text-red-500";
    return <span className={cls}>Üz uyğunluğu: {pct}%</span>;
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Kimlik yoxlaması</h1>
      <p className="text-muted text-sm mb-4">Şəxsiyyət vəsiqəsi ↔ selfie üzünü müqayisə edin və təsdiqləyin.</p>
      <div className="flex gap-1.5 flex-wrap bg-input-bg border border-input-border rounded-xl p-1 mb-6 w-fit">
        {statuses.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>
            {s === "ALL" ? "Hamısı" : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted">Məlumat yoxdur</div>
      ) : (
        <div className="space-y-4">
          {items.map((u) => (
            <div key={u.id} className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div>
                  <p className="font-semibold">{u.name || "—"} <span className="text-muted text-sm font-normal">#{u.id}</span></p>
                  <p className="text-xs text-muted">{u.phone}{u.profession ? ` · ${u.profession}` : ""}</p>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium">
                  {scoreBadge(u.faceMatchScore)}
                  <span className={`px-2 py-0.5 rounded text-xs ${u.idVerifyStatus === "APPROVED" ? "bg-green-500/10 text-green-500" : u.idVerifyStatus === "REJECTED" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>
                    {u.idVerifyStatus || "—"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {([["idCardImage", "Şəxsiyyət vəsiqəsi"], ["selfieImage", "Selfie"]] as const).map(([key, label]) => {
                  const img = u[key];
                  return (
                    <div key={key}>
                      <p className="text-[11px] text-muted mb-1">{label}</p>
                      {img ? (
                        <a href={`${UPLOADS}/${img}`} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`${UPLOADS}/${img}`} alt={label} className="w-full h-44 object-cover rounded-lg border border-input-border hover:opacity-90" />
                        </a>
                      ) : <div className="w-full h-44 rounded-lg border border-dashed border-input-border flex items-center justify-center text-xs text-muted">yoxdur</div>}
                    </div>
                  );
                })}
              </div>

              {u.idVerifyStatus !== "APPROVED" || filter === "ALL" ? (
                <div className="flex gap-2">
                  <button onClick={() => act(u.id, "approve")} className="flex-1 py-2.5 bg-green-500/90 hover:bg-green-500 text-white rounded-xl text-sm font-semibold">✓ Təsdiqlə</button>
                  <button onClick={() => act(u.id, "reject")} className="flex-1 py-2.5 bg-red-500/90 hover:bg-red-500 text-white rounded-xl text-sm font-semibold">✕ Rədd et</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
