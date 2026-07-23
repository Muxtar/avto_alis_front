"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

interface Flag {
  key: string;
  section: "production" | "developer";
  label: string;
  description: string;
  value: boolean;
  isDefault: boolean;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = () => {
    setLoading(true);
    fetch(`${API}/admin/settings`, { headers })
      .then((r) => r.json())
      .then((d) => setFlags(d.settings || []))
      .catch(() => toast("Tənzimləmələr yüklənmədi", "error"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (f: Flag) => {
    const next = !f.value;
    setBusyKey(f.key);
    // Optimistik yeniləmə — dərhal görünsün, xəta olsa geri qaytar.
    setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, value: next, isDefault: false } : x)));
    try {
      const res = await fetch(`${API}/admin/settings`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ key: f.key, value: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      toast("Tənzimləmə yeniləndi ✓", "success");
    } catch (e: any) {
      setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, value: f.value } : x)));
      toast(e?.message || "Yenilənmədi", "error");
    } finally {
      setBusyKey(null);
    }
  };

  const sections: { id: Flag["section"]; title: string; hint: string; accent: string }[] = [
    { id: "production", title: "Production", hint: "Canlı istifadəçilərə təsir edən tənzimləmələr — diqqətlə dəyişin.", accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { id: "developer", title: "Developer", hint: "Yalnız test/debug üçün — real istifadədə deaktiv saxlayın.", accent: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  ];

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Tənzimləmələr</h1>
        <p className="text-muted text-sm mt-1">Xüsusiyyətləri aktiv/deaktiv edin. Dəyişikliklər dərhal tətbiq olunur.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted text-sm py-10">
          <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /> Yüklənir…
        </div>
      ) : (
        sections.map((sec) => {
          const items = flags.filter((f) => f.section === sec.id);
          if (!items.length) return null;
          return (
            <div key={sec.id} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${sec.accent}`}>{sec.title}</span>
                <span className="text-xs text-muted">{sec.hint}</span>
              </div>
              <div className="bg-card border border-card-border rounded-2xl divide-y divide-card-border overflow-hidden">
                {items.map((f) => (
                  <div key={f.key} className="flex items-start gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{f.label}</p>
                        {f.isDefault && <span className="text-[10px] text-muted border border-card-border rounded px-1.5 py-0.5">default</span>}
                        <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${f.value ? "text-emerald-500 bg-emerald-500/10" : "text-muted bg-input-bg"}`}>{f.value ? "Aktiv" : "Deaktiv"}</span>
                      </div>
                      <p className="text-xs text-muted mt-1 leading-relaxed">{f.description}</p>
                    </div>
                    {/* Toggle switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={f.value}
                      disabled={busyKey === f.key}
                      onClick={() => toggle(f)}
                      className={`shrink-0 mt-0.5 relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${f.value ? "bg-emerald-500" : "bg-input-border"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${f.value ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
