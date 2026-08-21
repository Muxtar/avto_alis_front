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

interface ChannelStatus {
  configured: boolean;
  missing: string[];
  sender: string | null;
  baseUrl: string | null;
  templateName?: string | null; // yalnız WhatsApp
  language?: string; // yalnız WhatsApp
  otpButton?: boolean; // yalnız WhatsApp
}
interface OtpDiag {
  channel: "sms" | "whatsapp" | "both";
  sms: ChannelStatus;
  whatsapp: ChannelStatus;
}

// Rəqəmli tənzimləmə (tarif) — açıq/bağlı deyil, dəyər.
interface NumberSetting {
  key: string;
  label: string;
  description: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  decimals: number;
  isDefault: boolean;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [flags, setFlags] = useState<Flag[]>([]);
  const [numbers, setNumbers] = useState<NumberSetting[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({}); // input mətni (yazarkən)
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [wa, setWa] = useState<OtpDiag | null>(null);
  // Hər kanal üçün AYRI test nömrəsi (WhatsApp və SMS-i müstəqil test etmək üçün).
  const [testPhone, setTestPhone] = useState<{ whatsapp: string; sms: string }>({ whatsapp: "", sms: "" });
  const [testingCh, setTestingCh] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ whatsapp?: any; sms?: any }>({});

  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = () => {
    setLoading(true);
    fetch(`${API}/admin/settings`, { headers })
      .then((r) => r.json())
      .then((d) => {
        setFlags(d.settings || []);
        const nums: NumberSetting[] = d.numbers || [];
        setNumbers(nums);
        setDraft(Object.fromEntries(nums.map((n) => [n.key, n.value.toFixed(n.decimals)])));
      })
      .catch(() => toast("Tənzimləmələr yüklənmədi", "error"))
      .finally(() => setLoading(false));
    fetch(`${API}/admin/whatsapp-status`, { headers })
      .then((r) => r.json())
      .then((d) => setWa(d.channel ? { channel: d.channel, sms: d.sms, whatsapp: d.whatsapp } : null))
      .catch(() => {});
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Bir kanalı ayrıca test et (WhatsApp və ya SMS) — provayderin real cavabı gəlir.
  const runTest = async (channel: "whatsapp" | "sms") => {
    const phone = testPhone[channel].trim();
    if (!phone) { toast("Test nömrəsini yazın", "error"); return; }
    setTestingCh(channel);
    try {
      const res = await fetch(`${API}/admin/whatsapp-test`, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone, channel }),
      });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [channel]: data.result?.[channel] || { ok: false, detail: data.message } }));
    } catch (e: any) {
      setTestResults((prev) => ({ ...prev, [channel]: { ok: false, detail: e?.message || "Xəta" } }));
    } finally {
      setTestingCh(null);
    }
  };

  // Bir kanal paneli — konfiqurasiya vəziyyəti + test düyməsi + nəticə.
  const channelPanel = (key: "whatsapp" | "sms", label: string, icon: string, st?: ChannelStatus) => {
    const r = testResults[key];
    return (
      <div className="border border-card-border rounded-xl p-3">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span>{icon}</span>
          <span className="font-semibold text-sm">{label}</span>
          {st && <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${st.configured ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"}`}>{st.configured ? "OK" : "natamam"}</span>}
        </div>
        {st && !st.configured && <p className="text-[11px] text-red-500 mb-1.5">Çatışmayan: <b>{st.missing.join(", ")}</b></p>}
        {st && st.configured && (
          <p className="text-[11px] text-muted mb-1.5">Sender: <b className="text-foreground">{st.sender}</b>{key === "whatsapp" && st.templateName ? <> · Şablon: <b className="text-foreground">{st.templateName}</b> · Dil: <b className="text-foreground">{st.language}</b></> : null}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={testPhone[key]}
            onChange={(e) => setTestPhone((p) => ({ ...p, [key]: e.target.value }))}
            placeholder={`${label} test nömrəsi (+99450...)`}
            className="flex-1 px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          />
          <button type="button" onClick={() => runTest(key)} disabled={testingCh !== null || !testPhone[key].trim()} className="px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 whitespace-nowrap">
            {testingCh === key ? "Göndərilir…" : `${label} test et`}
          </button>
        </div>
        {r && (
          <div className={`mt-2 rounded-lg px-2.5 py-1.5 text-[11px] border ${r.ok ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-red-500 bg-red-500/10 border-red-500/20"}`}>
            <p className="font-semibold">{r.ok ? "✓ Göndərildi" : `✗ Alınmadı${r.status ? ` (HTTP ${r.status})` : ""}`}</p>
            {r.detail && <p className="break-words opacity-90">{r.detail}</p>}
          </div>
        )}
      </div>
    );
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

  const saveNumber = async (n: NumberSetting) => {
    const v = parseFloat((draft[n.key] ?? "").replace(",", "."));
    if (!Number.isFinite(v)) { toast("Rəqəm yazın", "error"); return; }
    if (v < n.min || v > n.max) { toast(`${n.min}–${n.max} ${n.unit} aralığında olmalıdır`, "error"); return; }
    setSavingKey(n.key);
    try {
      const res = await fetch(`${API}/admin/settings/number`, {
        method: "PATCH", headers, body: JSON.stringify({ key: n.key, value: v }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      setNumbers((prev) => prev.map((x) => (x.key === n.key ? { ...x, value: data.value, isDefault: false } : x)));
      setDraft((p) => ({ ...p, [n.key]: Number(data.value).toFixed(n.decimals) }));
      toast(`${n.label}: ${Number(data.value).toFixed(n.decimals)} ${n.unit} ✓`, "success");
    } catch (e: any) {
      toast(e?.message || "Yenilənmədi", "error");
    } finally {
      setSavingKey(null);
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

      {/* OTP (Infobip) — WhatsApp + SMS. Real rejimdə əvvəl WhatsApp, çatmasa SMS.
          Hər kanalı ayrıca test et; nömrəyə kod gəlmirsə səbəbi aşağıda görünür. */}
      <div className="mb-6 bg-card border border-card-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🔐</span>
          <p className="font-semibold text-sm">OTP doğrulama (Infobip)</p>
          {wa && (
            <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-blue-500/10 text-blue-500">
              Rejim: {wa.channel === "both" ? "WhatsApp → SMS (fallback)" : wa.channel === "whatsapp" ? "yalnız WhatsApp" : "yalnız SMS"}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted mb-3">Real rejimdə əvvəl WhatsApp sınanır; çatmasa avtomatik SMS göndərilir. Hər kanalın öz test nömrəsi və düyməsi var — ayrıca yoxlayın (kod: 123456).</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {channelPanel("whatsapp", "WhatsApp", "📱", wa?.whatsapp)}
          {channelPanel("sms", "SMS", "✉️", wa?.sms)}
        </div>
      </div>

      {/* ── Tariflər (rəqəmli tənzimləmələr) ── */}
      {numbers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border text-blue-500 bg-blue-500/10 border-blue-500/20">Tariflər</span>
            <span className="text-xs text-muted">Məbləğlər. Dəyişiklik dərhal qüvvəyə minir — yeni ödənişlərə tətbiq olunur.</span>
          </div>
          <div className="bg-card border border-card-border rounded-2xl divide-y divide-card-border overflow-hidden">
            {numbers.map((n) => {
              const dirty = (draft[n.key] ?? "") !== n.value.toFixed(n.decimals);
              return (
                <div key={n.key} className="flex flex-col sm:flex-row sm:items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{n.label}</p>
                      {n.isDefault && <span className="text-[10px] text-muted border border-card-border rounded px-1.5 py-0.5">default</span>}
                      <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 text-emerald-500 bg-emerald-500/10">
                        {n.value === 0 ? "pulsuz" : `${n.value.toFixed(n.decimals)} ${n.unit}`}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1 leading-relaxed">{n.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <input
                        type="number" inputMode="decimal" step={n.decimals ? 0.01 : 1} min={n.min} max={n.max}
                        value={draft[n.key] ?? ""}
                        onChange={(e) => setDraft((p) => ({ ...p, [n.key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") saveNumber(n); }}
                        className="w-28 pl-3 pr-10 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted pointer-events-none">{n.unit}</span>
                    </div>
                    <button
                      type="button" onClick={() => saveNumber(n)} disabled={!dirty || savingKey === n.key}
                      className="px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-semibold disabled:opacity-40 whitespace-nowrap"
                    >
                      {savingKey === n.key ? "…" : "Yadda saxla"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
