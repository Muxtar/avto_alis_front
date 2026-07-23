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

interface WaStatus {
  configured: boolean;
  missing: string[];
  templateName: string | null;
  sender: string | null;
  language: string;
  otpButton: boolean;
  baseUrl: string | null;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [wa, setWa] = useState<WaStatus | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = () => {
    setLoading(true);
    fetch(`${API}/admin/settings`, { headers })
      .then((r) => r.json())
      .then((d) => setFlags(d.settings || []))
      .catch(() => toast("Tənzimləmələr yüklənmədi", "error"))
      .finally(() => setLoading(false));
    fetch(`${API}/admin/whatsapp-status`, { headers })
      .then((r) => r.json())
      .then((d) => setWa(d.status || null))
      .catch(() => {});
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runTest = async () => {
    if (!testPhone.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API}/admin/whatsapp-test`, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: testPhone.trim() }),
      });
      const data = await res.json();
      setTestResult(data.result || { ok: false, detail: data.message });
    } catch (e: any) {
      setTestResult({ ok: false, detail: e?.message || "Xəta" });
    } finally {
      setTesting(false);
    }
  };

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

      {/* WhatsApp (Infobip) diaqnostikası — nömrəyə kod gəlmirsə səbəbi burada görünür */}
      <div className="mb-6 bg-card border border-card-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📱</span>
          <p className="font-semibold text-sm">WhatsApp (Infobip) diaqnostika</p>
          {wa && (
            <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${wa.configured ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"}`}>
              {wa.configured ? "Konfiqurasiya OK" : "Konfiqurasiya natamam"}
            </span>
          )}
        </div>

        {wa && !wa.configured && (
          <div className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">
            Çatışmayan env dəyişənləri (Railway-də təyin edin): <b>{wa.missing.join(", ")}</b>
          </div>
        )}
        {wa && wa.configured && (
          <div className="text-[11px] text-muted mb-3 space-y-0.5">
            <div>Şablon: <b className="text-foreground">{wa.templateName}</b> · Dil: <b className="text-foreground">{wa.language}</b> · OTP düymə: <b className="text-foreground">{wa.otpButton ? "bəli" : "xeyr"}</b></div>
            <div>Sender: <b className="text-foreground">{wa.sender}</b> · Base: <b className="text-foreground">{wa.baseUrl}</b></div>
          </div>
        )}

        {/* Test göndər */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="Test nömrəsi (məs. +99450...)"
            className="flex-1 px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          />
          <button
            type="button"
            onClick={runTest}
            disabled={testing || !testPhone.trim()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
          >
            {testing ? "Göndərilir…" : "Test WhatsApp göndər"}
          </button>
        </div>
        <p className="text-[11px] text-muted mt-1.5">Bu nömrəyə test kodu (123456) göndərilir. Nəticə/xəta aşağıda görünür.</p>

        {testResult && (
          <div className={`mt-3 rounded-lg px-3 py-2 text-xs border ${testResult.ok ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"}`}>
            <p className="font-semibold mb-0.5">{testResult.ok ? "✓ Göndərildi (WhatsApp-ı yoxlayın)" : `✗ Alınmadı${testResult.status ? ` (HTTP ${testResult.status})` : ""}`}</p>
            {testResult.detail && <p className="break-words opacity-90">{testResult.detail}</p>}
          </div>
        )}
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
