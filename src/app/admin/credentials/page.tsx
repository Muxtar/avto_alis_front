"use client";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API, UPLOADS } from "@/lib/api";

interface CredDoc {
  id: number;
  title: string;
  image: string;
  documentType: string | null;
  issuer: string | null;
  holderName: string | null;
  nameMatch: boolean;
  nameMatchScore: number | null;
  professionMatch: boolean | null;
  confidence: number | null;
  fraudSignals: string[];
  aiReason: string | null;
  status: string;
  createdAt: string;
  user: { id: number; name: string | null; phone: string; profession: string | null };
}

export default function AdminCredentialsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<CredDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  const headers: any = { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/credentials?status=${filter}`, { headers });
      const data = await res.json();
      setItems(data.documents || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: number, action: "approve" | "reject") => {
    try {
      const res = await fetch(`${API}/admin/credentials/${id}/${action}`, { method: "POST", headers });
      if (res.ok) { toast(action === "approve" ? "Təsdiqləndi" : "Rədd edildi", "success"); load(); }
      else toast("Xəta", "error");
    } catch { toast("Xəta", "error"); }
  };

  const statuses = ["PENDING", "APPROVED", "REJECTED", "ALL"];
  const pct = (n: number | null) => (typeof n === "number" ? `${Math.round(n * 100)}%` : "—");

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Peşə sənədləri</h1>
      <p className="text-muted text-sm mb-4">Claude AI sənəddəki ad-soyadı istifadəçinin adı ilə müqayisə edir. Yoxlayıb təsdiqləyin.</p>
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
          {items.map((d) => (
            <div key={d.id} className="bg-card border border-card-border rounded-xl p-4 sm:p-5">
              <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                <div>
                  <p className="font-semibold">{d.title} <span className="text-muted text-sm font-normal">· {d.documentType || "naməlum"}</span></p>
                  <p className="text-xs text-muted">{d.user.name || "—"} (#{d.user.id}) · {d.user.phone}{d.user.profession ? ` · ${d.user.profession}` : ""}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${d.status === "APPROVED" ? "bg-green-500/10 text-green-500" : d.status === "REJECTED" ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500"}`}>
                  {d.status}
                </span>
              </div>

              <div className="flex gap-4 flex-wrap">
                <a href={`${UPLOADS}/${d.image}`} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${UPLOADS}/${d.image}`} alt={d.title} className="w-40 h-28 object-cover rounded-lg border border-input-border hover:opacity-90" />
                </a>
                <div className="flex-1 min-w-[200px]">
                  <div className="p-3 bg-input-bg border border-input-border rounded-lg">
                    <p className="text-[11px] font-semibold text-muted mb-1.5">🤖 Claude AI yoxlaması</p>
                    <div className="flex flex-wrap gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${d.nameMatch ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                        {d.nameMatch ? "✓ Ad-soyad uyğun" : "⚠ Ad-soyad uyğun deyil"} ({pct(d.nameMatchScore)})
                      </span>
                      {d.professionMatch !== null && (
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${d.professionMatch ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}>
                          {d.professionMatch ? "✓ Məsləklə uyğun" : "⚠ Məsləklə uyğun deyil"}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-input-bg text-muted border border-input-border">Etibarlılıq: {pct(d.confidence)}</span>
                    </div>
                    {d.holderName && <p className="text-[11px] text-muted">Sənəddə: <b>{d.holderName}</b>{d.issuer ? ` · ${d.issuer}` : ""}</p>}
                    {d.fraudSignals?.length > 0 && (
                      <p className="text-[11px] text-red-500 mt-1">⚠ Əlamətlər: {d.fraudSignals.join(", ")}</p>
                    )}
                    {d.aiReason && <p className="text-[11px] text-muted mt-1 leading-snug">{d.aiReason}</p>}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button onClick={() => act(d.id, "approve")} className="flex-1 py-2.5 bg-green-500/90 hover:bg-green-500 text-white rounded-xl text-sm font-semibold">✓ Təsdiqlə</button>
                    <button onClick={() => act(d.id, "reject")} className="flex-1 py-2.5 bg-red-500/90 hover:bg-red-500 text-white rounded-xl text-sm font-semibold">✕ Rədd et</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
