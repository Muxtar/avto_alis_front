"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

interface AiFlag {
  key: string;
  label: string;
  description: string;
  value: boolean;
  isDefault: boolean;
}

// Hər flag hansı env açarından asılıdır — açar yoxdursa flag aktiv olsa belə işləməz.
const NEEDS_ENV: Record<string, "anthropic" | "tavily"> = {
  ai_websearch_tavily: "tavily",
  ai_person_search: "tavily",
  ai_websearch_claude: "anthropic",
  ai_assistant: "anthropic",
  ai_assistant_opus: "anthropic",
  ai_vision_search: "anthropic",
  ai_identity: "anthropic",
  ai_business_docs: "anthropic",
};

// Vizual qruplaşdırma — hansı AI hansı bölmədə işləyir.
const GROUPS: { title: string; hint: string; keys: string[] }[] = [
  { title: "İnternet axtarışı", hint: "Başlıqdakı axtarış çubuğu — məhsul və şəxs axtarışı", keys: ["internet_search", "ai_websearch_tavily", "ai_websearch_claude", "ai_person_search"] },
  { title: "AI köməkçi", hint: "Saytdakı süni intellekt söhbət botu", keys: ["ai_assistant", "ai_assistant_opus"] },
  { title: "Şəkillə axtarış", hint: "Axtarış çubuğundakı kamera düyməsi", keys: ["ai_vision_search"] },
  { title: "Doğrulama / KYC", hint: "Profil və biznes təsdiqi zamanı avtomatik sənəd yoxlaması", keys: ["ai_identity", "ai_business_docs"] },
];

export default function AdminAiPage() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<AiFlag[]>([]);
  const [env, setEnv] = useState<{ anthropic: boolean; tavily: boolean }>({ anthropic: false, tavily: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/ai`, { headers: { Authorization: `Bearer ${token()}` } });
      const d = await res.json();
      if (!res.ok || !d.success) { toast(d.message || "Xəta", "error"); return; }
      setFlags(d.flags || []);
      setEnv(d.env || { anthropic: false, tavily: false });
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (f: AiFlag) => {
    setBusy(f.key);
    const next = !f.value;
    // Optimistik yeniləmə.
    setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, value: next, isDefault: false } : x)));
    try {
      const res = await fetch(`${API}/admin/ai`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ key: f.key, value: next }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) { setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, value: f.value } : x))); toast(d.message || "Xəta", "error"); }
      else toast(next ? "Aktiv edildi" : "Söndürüldü", "success");
    } catch {
      setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, value: f.value } : x)));
      toast("Xəta", "error");
    } finally { setBusy(null); }
  };

  const byKey = (k: string) => flags.find((f) => f.key === k);

  const Row = ({ f }: { f: AiFlag }) => {
    const needs = NEEDS_ENV[f.key];
    const envOk = !needs || (needs === "tavily" ? env.tavily : env.anthropic);
    return (
      <div className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{f.label}</span>
            {f.value ? (
              <span className="px-1.5 py-0.5 bg-green-500/15 text-green-600 rounded text-[10px] font-bold">AKTİV</span>
            ) : (
              <span className="px-1.5 py-0.5 bg-gray-500/15 text-gray-500 rounded text-[10px] font-bold">SÖNÜLÜ</span>
            )}
            {f.value && !envOk && (
              <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-600 rounded text-[10px] font-bold" title={`${needs === "tavily" ? "TAVILY_API_KEY" : "ANTHROPIC_API_KEY"} açarı Railway-də yoxdur`}>AÇAR YOXDUR</span>
            )}
          </div>
          <p className="text-xs text-muted mt-0.5">{f.description}</p>
        </div>
        {/* Toggle */}
        <button
          onClick={() => toggle(f)}
          disabled={busy === f.key}
          className={`shrink-0 relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${f.value ? "bg-green-500" : "bg-input-border"}`}
          title={f.value ? "Söndür" : "Aktiv et"}
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${f.value ? "translate-x-5" : ""}`} />
        </button>
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Süni intellekt idarəetməsi</h1>
      <p className="text-muted text-sm mb-4">Hər AI motorunu ayrıca aç/söndür. Söndürülən motor işləmir — asılı olduğu bölmə AI-sız işləyir (məs. axtarış nəticəsiz, KYC əl ilə). Dəyişiklik dərhal (≈15 saniyə keşdən sonra) qüvvəyə minir.</p>

      {/* Env vəziyyəti */}
      <div className="flex flex-wrap gap-2 mb-6 text-xs">
        <span className={`px-2.5 py-1 rounded-lg font-medium ${env.anthropic ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"}`}>
          Claude (ANTHROPIC_API_KEY): {env.anthropic ? "quraşdırılıb ✓" : "yoxdur ✕"}
        </span>
        <span className={`px-2.5 py-1 rounded-lg font-medium ${env.tavily ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"}`}>
          Tavily (TAVILY_API_KEY): {env.tavily ? "quraşdırılıb ✓" : "yoxdur ✕"}
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {GROUPS.map((g) => {
            const rows = g.keys.map(byKey).filter(Boolean) as AiFlag[];
            if (rows.length === 0) return null;
            return (
              <div key={g.title} className="bg-card border border-card-border rounded-xl p-4">
                <div className="mb-1">
                  <h2 className="font-semibold">{g.title}</h2>
                  <p className="text-[11px] text-muted">{g.hint}</p>
                </div>
                <div className="divide-y divide-card-border">
                  {rows.map((f) => <Row key={f.key} f={f} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
