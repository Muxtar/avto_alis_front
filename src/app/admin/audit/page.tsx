"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

interface Log {
  id: number; adminId: number; adminName: string; method: string; path: string;
  action: string; targetType: string | null; targetId: string | null; status: number;
  summary: string; meta: any; ip: string | null; createdAt: string;
}

const METHOD_CLS: Record<string, string> = {
  POST: "bg-green-500/15 text-green-600", PUT: "bg-blue-500/15 text-blue-600",
  PATCH: "bg-blue-500/15 text-blue-600", DELETE: "bg-red-500/15 text-red-500",
};

export default function AdminAuditPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<Log[]>([]);
  const [admins, setAdmins] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [adminId, setAdminId] = useState("");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (adminId) params.set("adminId", adminId);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`${API}/admin/audit?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const d = await res.json();
      if (!res.ok || !d.success) { toast(d.message || "Xəta", "error"); return; }
      setLogs(d.logs || []); setAdmins(d.admins || []); setTotalPages(d.totalPages || 1); setTotal(d.total || 0);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
  }, [page, adminId, q, toast]);

  useEffect(() => { load(); }, [load]);

  const dt = (s: string) => new Date(s).toLocaleString("az-AZ", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  const exportCsv = async () => {
    try {
      const res = await fetch(`${API}/admin/export/audit.csv`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) { toast("Export alınmadı", "error"); return; }
      const blob = await res.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "audit.csv"; a.click(); URL.revokeObjectURL(url);
    } catch { toast("Export alınmadı", "error"); }
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold">Audit jurnalı</h1>
        <button onClick={exportCsv} className="shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-input-bg border border-input-border hover:border-orange-500">⬇ CSV</button>
      </div>
      <p className="text-muted text-sm mb-4">Bütün admin əməliyyatları: kim, nə vaxt, nəyi etdi. Ümumi: {total}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={adminId} onChange={(e) => { setAdminId(e.target.value); setPage(1); }} className="px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm">
          <option value="">Bütün adminlər</option>
          {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); load(); } }}
          placeholder="Axtar (əməliyyat, path, admin)" className="flex-1 min-w-[180px] px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm" />
        <button onClick={() => { setPage(1); load(); }} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold">Filtrlə</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : logs.length === 0 ? (
        <p className="text-muted text-sm py-10 text-center">Qeyd yoxdur.</p>
      ) : (
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="divide-y divide-card-border">
            {logs.map((l) => (
              <div key={l.id}>
                <button onClick={() => setExpanded(expanded === l.id ? null : l.id)} className="w-full text-left px-3 py-2.5 hover:bg-input-bg flex items-center gap-3 text-sm">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${METHOD_CLS[l.method] || "bg-gray-500/15 text-gray-500"}`}>{l.method}</span>
                  <span className="shrink-0 font-mono text-xs text-orange-500 w-40 truncate">{l.action}</span>
                  <span className="min-w-0 flex-1 truncate text-muted text-xs">{l.summary}</span>
                  <span className="shrink-0 text-xs font-medium">{l.adminName}</span>
                  <span className="shrink-0 text-[11px] text-muted w-28 text-right">{dt(l.createdAt)}</span>
                </button>
                {expanded === l.id && (
                  <div className="px-4 pb-3 pt-1 text-xs bg-input-bg/40 space-y-1">
                    <p><span className="text-muted">Admin:</span> {l.adminName} (#{l.adminId})</p>
                    <p><span className="text-muted">Path:</span> <span className="font-mono">{l.path}</span> · status {l.status}</p>
                    {l.targetType && <p><span className="text-muted">Hədəf:</span> {l.targetType}{l.targetId ? ` #${l.targetId}` : ""}</p>}
                    {l.ip && <p><span className="text-muted">IP:</span> {l.ip}</p>}
                    {l.meta && <pre className="mt-1 p-2 bg-card rounded-lg overflow-x-auto text-[11px]">{JSON.stringify(l.meta, null, 2)}</pre>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4 text-sm">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-input-bg border border-input-border disabled:opacity-40">‹</button>
          <span className="text-muted">{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg bg-input-bg border border-input-border disabled:opacity-40">›</button>
        </div>
      )}
    </div>
  );
}
