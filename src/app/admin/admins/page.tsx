"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

// Modul açarları backend ADMIN_MODULES ilə eyni olmalıdır. 'admins' modulu adi
// adminə verilmir (yalnız super-admin) — ona görə checkbox siyahısında yoxdur.
const MODULE_LABELS: Record<string, string> = {
  users: "İstifadəçilər", listings: "Elanlar", orders: "Sifarişlər", returns: "Qaytarmalar",
  finance: "Maliyyə", businesses: "Biznes / VÖEN", kyc: "KYC müraciətləri", credentials: "Sənədlər",
  complaints: "Şikayətlər", social: "Sosial linklər", promo: "Promo", comments: "Şərhlər",
  broadcast: "Bildiriş", banners: "Karusel", couriers: "Kuryerlər", settings: "Tənzimləmələr",
};

// Hazır rol şablonları — checkbox-ları sürətlə doldurmaq üçün.
const ROLE_TEMPLATES: { name: string; perms: string[] }[] = [
  { name: "Moderator", perms: ["listings", "comments", "complaints", "social"] },
  { name: "Doğrulama (KYC)", perms: ["kyc", "businesses", "credentials", "social"] },
  { name: "Maliyyə", perms: ["finance", "orders", "returns"] },
  { name: "Logistika", perms: ["orders", "couriers", "returns"] },
  { name: "Marketinq", perms: ["promo", "banners", "broadcast"] },
  { name: "Dəstək", perms: ["users", "complaints"] },
];

interface Admin {
  id: number;
  name: string;
  phone: string;
  avatar?: string | null;
  isSuperAdmin: boolean;
  isBlocked: boolean;
  permissions: string[];
}

export default function AdminAdminsPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  // Hər admin üçün redaktə olunan icazə vəziyyəti (id -> Set).
  const [edit, setEdit] = useState<Record<number, string[]>>({});
  // Namizəd axtarışı (yeni admin əlavə etmək üçün).
  const [q, setQ] = useState("");
  const [candidates, setCandidates] = useState<{ id: number; name: string; phone: string }[]>([]);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/admins`, { headers: { Authorization: `Bearer ${token()}` } });
      const d = await res.json();
      if (!res.ok || !d.success) { toast(d.message || "Xəta", "error"); return; }
      setAdmins(d.admins || []);
      // 'admins' modulunu checkbox siyahısından çıxar.
      setModules((d.modules || []).filter((m: string) => m !== "admins"));
      const e: Record<number, string[]> = {};
      for (const a of d.admins || []) e[a.id] = [...(a.permissions || [])];
      setEdit(e);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // Namizəd axtarışı (debounce).
  useEffect(() => {
    if (q.trim().length < 2) { setCandidates([]); return; }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/admin/admins/candidates?q=${encodeURIComponent(q.trim())}`, { headers: { Authorization: `Bearer ${token()}` } });
        const d = await res.json();
        setCandidates(d.users || []);
      } catch { /* keç */ }
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const toggle = (adminId: number, mod: string) => {
    setEdit((prev) => {
      const cur = new Set(prev[adminId] || []);
      if (cur.has(mod)) cur.delete(mod); else cur.add(mod);
      return { ...prev, [adminId]: Array.from(cur) };
    });
  };

  const applyTemplate = (adminId: number, perms: string[]) => {
    setEdit((prev) => ({ ...prev, [adminId]: [...perms] }));
  };

  const savePerms = async (a: Admin) => {
    setBusyId(a.id);
    try {
      const res = await fetch(`${API}/admin/admins/${a.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ permissions: edit[a.id] || [] }),
      });
      const d = await res.json();
      if (res.ok && d.success) { toast("İcazələr yadda saxlanıldı", "success"); load(); }
      else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusyId(null); }
  };

  const promote = async (userId: number) => {
    setBusyId(-1);
    try {
      const res = await fetch(`${API}/admin/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ userId, permissions: [] }),
      });
      const d = await res.json();
      if (res.ok && d.success) { toast("Admin əlavə edildi — indi icazə təyin edin", "success"); setQ(""); setCandidates([]); load(); }
      else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusyId(null); }
  };

  const demote = async (a: Admin) => {
    if (!confirm(`${a.name} adminlikdən çıxarılsın?`)) return;
    setBusyId(a.id);
    try {
      const res = await fetch(`${API}/admin/admins/${a.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } });
      const d = await res.json();
      if (res.ok && d.success) { toast("Admin səlahiyyəti götürüldü", "success"); load(); }
      else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusyId(null); }
  };

  const dirty = (a: Admin) => {
    const cur = [...(edit[a.id] || [])].sort().join(",");
    const orig = [...(a.permissions || [])].sort().join(",");
    return cur !== orig;
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Adminlər və icazələr</h1>
      <p className="text-muted text-sm mb-6">Hər adminə hansı bölmələrə giriş icazəsi olduğunu təyin edin. Super-admin (ADMIN_PHONES) hər şeyə icazəlidir və dəyişdirilə bilməz.</p>

      {/* Yeni admin əlavə et */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-6">
        <p className="font-semibold text-sm mb-2">➕ Yeni admin əlavə et</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad və ya telefonla istifadəçi axtar (min. 2 hərf)"
          className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:border-orange-500" />
        {candidates.length > 0 && (
          <div className="mt-2 space-y-1">
            {candidates.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-input-bg">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{u.name}</p><p className="text-[11px] text-muted">{u.phone}</p></div>
                <button onClick={() => promote(u.id)} disabled={busyId === -1} className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">Admin et</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {admins.map((a) => (
            <div key={a.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{a.name}</span>
                    {a.isSuperAdmin && <span className="px-2 py-0.5 bg-red-500/15 text-red-500 rounded text-[10px] font-bold">SUPER ADMIN</span>}
                    {a.isBlocked && <span className="px-2 py-0.5 bg-gray-500/15 text-gray-500 rounded text-[10px] font-bold">BLOKLU</span>}
                  </div>
                  <p className="text-[11px] text-muted">{a.phone}</p>
                </div>
                {!a.isSuperAdmin && (
                  <button onClick={() => demote(a)} disabled={busyId === a.id} className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-50">Admindən çıxar</button>
                )}
              </div>

              {a.isSuperAdmin ? (
                <p className="text-sm text-muted">Bütün bölmələrə icazəlidir (ADMIN_PHONES).</p>
              ) : (
                <>
                  {/* Rol şablonları */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[11px] text-muted self-center">Şablon:</span>
                    {ROLE_TEMPLATES.map((tpl) => (
                      <button key={tpl.name} onClick={() => applyTemplate(a.id, tpl.perms)}
                        className="px-2 py-1 text-[11px] rounded-md bg-input-bg border border-input-border hover:border-orange-500 transition-colors">{tpl.name}</button>
                    ))}
                    <button onClick={() => applyTemplate(a.id, [])} className="px-2 py-1 text-[11px] rounded-md bg-input-bg border border-input-border hover:border-red-500 transition-colors">Təmizlə</button>
                  </div>

                  {/* Modul checkbox-ları */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
                    {modules.map((m) => {
                      const on = (edit[a.id] || []).includes(m);
                      return (
                        <button key={m} onClick={() => toggle(a.id, m)}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs border transition-colors ${on ? "bg-orange-500/10 border-orange-500/40 text-foreground" : "bg-input-bg border-transparent text-muted hover:text-foreground"}`}>
                          <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? "bg-orange-500 border-orange-500 text-white" : "border-input-border"}`}>{on ? "✓" : ""}</span>
                          {MODULE_LABELS[m] || m}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => savePerms(a)} disabled={busyId === a.id || !dirty(a)}
                      className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-40">
                      {busyId === a.id ? "Saxlanılır..." : "Yadda saxla"}
                    </button>
                    {dirty(a) && <span className="text-[11px] text-amber-500">Saxlanmamış dəyişiklik var</span>}
                    <span className="text-[11px] text-muted ml-auto">{(edit[a.id] || []).length} / {modules.length} modul</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
