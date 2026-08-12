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

interface ServiceHealth {
  id: string;
  name: string;
  category: string;
  configured: boolean;
  live: boolean;
  status: "ok" | "error" | "configured" | "not_configured";
  detail: string;
  meta?: { balance?: number | null; currency?: string };
}

export default function AdminAiPage() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<AiFlag[]>([]);
  const [env, setEnv] = useState<{ anthropic: boolean; tavily: boolean }>({ anthropic: false, tavily: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  // Servis sağlamlıq yoxlaması — yalnız düyməyə basanda (kredit qənaəti).
  const [services, setServices] = useState<ServiceHealth[] | null>(null);
  // Serverin çıxış IP-si — Yango kimi IP-yə bağlı API-lərə vermək üçün.
  const [outboundIp, setOutboundIp] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  // Hər AI-ın ayrıca testi.
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok?: boolean; manual?: boolean; output: string; query?: string }>>({});

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

  // Çıxış IP-si səhifə açılan kimi gəlir — "Yoxla" düyməsini gözləmir.
  // (Servis yoxlaması kredit xərclədiyi üçün o, düymə ilə qalır.)
  useEffect(() => {
    fetch(`${API}/admin/service-health/ip`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((d) => { if (d?.success) setOutboundIp(d.outboundIp || null); })
      .catch(() => { /* şəbəkə — kart göstərilmir */ });
  }, []);

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API}/admin/service-health`, { headers: { Authorization: `Bearer ${token()}` } });
      const d = await res.json();
      if (!res.ok || !d.success) { toast(d.message || "Xəta", "error"); return; }
      setServices(d.services || []);
      setOutboundIp(d.outboundIp || null);
    } catch { toast("Xəta", "error"); } finally { setChecking(false); }
  };

  const statusStyle: Record<string, { cls: string; label: string }> = {
    ok: { cls: "bg-green-500/15 text-green-600", label: "İŞLƏYİR" },
    error: { cls: "bg-red-500/15 text-red-500", label: "XƏTA" },
    configured: { cls: "bg-blue-500/15 text-blue-600", label: "QURAŞDIRILIB" },
    not_configured: { cls: "bg-gray-500/15 text-gray-500", label: "YOXDUR" },
  };

  const testAi = async (key: string) => {
    setTesting(key);
    try {
      const res = await fetch(`${API}/admin/ai/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id: key }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) { toast(d.message || "Test alınmadı", "error"); return; }
      setTestResult((prev) => ({ ...prev, [key]: { ok: d.ok, manual: d.manual, output: d.output || "", query: d.query } }));
    } catch { toast("Test alınmadı", "error"); } finally { setTesting(null); }
  };

  const byKey = (k: string) => flags.find((f) => f.key === k);

  const Row = ({ f }: { f: AiFlag }) => {
    const needs = NEEDS_ENV[f.key];
    const envOk = !needs || (needs === "tavily" ? env.tavily : env.anthropic);
    const tr = testResult[f.key];
    return (
      <div className="py-3">
        <div className="flex items-start justify-between gap-4">
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
          <div className="flex items-center gap-2 shrink-0">
            {/* Ayrıca test */}
            <button
              onClick={() => testAi(f.key)}
              disabled={testing === f.key}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-input-bg border border-input-border hover:border-orange-500 disabled:opacity-50"
              title="Bu AI-ı sınaqdan keçir">
              {testing === f.key ? "..." : "🧪 Test"}
            </button>
            {/* Toggle */}
            <button
              onClick={() => toggle(f)}
              disabled={busy === f.key}
              className={`relative w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${f.value ? "bg-green-500" : "bg-input-border"}`}
              title={f.value ? "Söndür" : "Aktiv et"}>
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${f.value ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>
        {tr && (
          <div className={`mt-2 rounded-lg p-2.5 text-xs whitespace-pre-wrap break-words border ${tr.manual ? "bg-blue-500/5 border-blue-500/20 text-foreground" : tr.ok ? "bg-green-500/5 border-green-500/20 text-foreground" : "bg-red-500/5 border-red-500/20 text-foreground"}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tr.manual ? "bg-blue-500/15 text-blue-600" : tr.ok ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-500"}`}>
                {tr.manual ? "ƏL İLƏ" : tr.ok ? "İŞLƏDİ ✓" : "XƏTA ✕"}
              </span>
              {tr.query && <span className="text-muted">Sorğu: «{tr.query}»</span>}
            </div>
            {tr.output}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Serverin çıxış IP-si — Yango/bank kimi xidmətlər API açarını IP-yə
          bağlayır. "Host is not allowed" xətası alanda bu IP onlara verilməlidir. */}
      {outboundIp && (
        <div className="surface p-3 mb-3 flex items-center gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">🌐 Serverin çıxış IP-si</p>
            <p className="text-[11px] text-muted">
              Yango, bank və s. API açarını IP-yə bağlayırsa bu ünvanı onlara verin.
              «Host is not allowed» xətası məhz bundan gəlir.
            </p>
          </div>
          <code className="px-3 py-1.5 rounded-lg bg-input-bg border border-input-border text-sm font-mono">{outboundIp}</code>
          <button onClick={() => { navigator.clipboard?.writeText(outboundIp); toast("Kopyalandı", "success"); }}
            className="px-3 py-1.5 rounded-lg border border-card-border text-xs font-semibold hover:bg-input-bg">Kopyala</button>
        </div>
      )}
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

      {/* ── Servis statusu (canlı yoxlama) ── */}
      <div className="bg-card border border-card-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div>
            <h2 className="font-semibold">Servis statusu</h2>
            <p className="text-[11px] text-muted">Hər xarici servisin canlı işləyib-işləmədiyini yoxlayır (Claude kredit vəziyyəti, Tavily, Infobip balans və s.).</p>
          </div>
          <button onClick={checkHealth} disabled={checking}
            className="shrink-0 px-4 py-2 text-sm font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">
            {checking ? "Yoxlanılır..." : "🔄 Yoxla"}
          </button>
        </div>
        {services === null ? (
          <p className="text-xs text-muted mt-2">«Yoxla» düyməsinə basın. Qeyd: canlı yoxlama az miqdar token/kredit istifadə edə bilər (Claude sınaq çağırışı, Tavily 1 kredit).</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">

            {services.map((s) => {
              const st = statusStyle[s.status] || statusStyle.not_configured;
              return (
                <div key={s.id} className="flex items-start justify-between gap-2 p-3 rounded-lg bg-input-bg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-[11px] text-muted mt-0.5">{s.detail}</p>
                    {!s.live && s.configured && <p className="text-[10px] text-muted/70 mt-0.5">canlı sınaq edilmir — yalnız konfiqurasiya</p>}
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
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
