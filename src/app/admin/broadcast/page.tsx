"use client";
import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

const USER_TYPES = [
  { value: "", label: "Hamı" },
  { value: "CAR_OWNER", label: "Avtomobil sahibi" },
  { value: "MECHANIC", label: "Usta" },
  { value: "PARTS_SELLER", label: "Satıcı" },
  { value: "COURIER", label: "Kuryer" },
];

export default function AdminBroadcastPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [userType, setUserType] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastCount, setLastCount] = useState<number | null>(null);

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast(t("error"), "error"); return; }
    if (!confirm(t("adminBroadcastConfirm"))) return;
    setBusy(true);
    try {
      const adminToken = localStorage.getItem("adminToken");
      const res = await fetch(`${API}/admin/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), link: link.trim() || undefined, userType: userType || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastCount(data.count);
        toast(`${data.count} ${t("adminBroadcastSent")}`, "success");
        setTitle(""); setBody(""); setLink("");
      } else {
        toast(data.message || t("error"), "error");
      }
    } catch {
      toast(t("error"), "error");
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground text-foreground text-sm";

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">{t("adminBroadcast")}</h1>
      <p className="text-muted text-sm mb-6">{t("adminBroadcastDesc")}</p>

      <div className="bg-card border border-card-border rounded-xl p-4 sm:p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("adminBroadcastAudience")}</label>
          <select value={userType} onChange={(e) => setUserType(e.target.value)} className={inputCls}>
            {USER_TYPES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("adminBroadcastTitle")}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("adminBroadcastBody")}</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={500} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">{t("adminBroadcastLink")}</label>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/marketplace" className={inputCls} />
        </div>
        <button onClick={send} disabled={busy} className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-semibold text-white disabled:opacity-50">
          {busy ? "..." : t("adminBroadcastSend")}
        </button>
        {lastCount !== null && <p className="text-sm text-green-500">✓ {lastCount} {t("adminBroadcastSent")}</p>}
      </div>
    </div>
  );
}
