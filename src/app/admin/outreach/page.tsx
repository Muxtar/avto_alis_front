"use client";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

interface Item {
  id: number;
  targetName: string; targetPlatform: string; targetHandle: string; targetUrl: string;
  targetAvatar: string | null; matchedUserId: number | null;
  message: string;
  status: "PENDING" | "SENT" | "REJECTED";
  adminNote: string | null; sentByName: string | null; sentAt: string | null; createdAt: string;
  requester: { id: number; name: string; phone: string } | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Göndəriləcək", cls: "bg-amber-500/10 text-amber-600" },
  SENT: { label: "Göndərildi", cls: "bg-green-500/10 text-green-600" },
  REJECTED: { label: "Rədd edildi", cls: "bg-red-500/10 text-red-500" },
};
const PLAT: Record<string, string> = {
  instagram: "📷 Instagram", facebook: "📘 Facebook", linkedin: "💼 LinkedIn",
  tiktok: "🎵 TikTok", x: "𝕏 X", twitter: "𝕏 X", youtube: "▶️ YouTube", telegram: "✈️ Telegram",
};

export default function AdminOutreachPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [note, setNote] = useState<Record<number, string>>({});

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("adminToken") : null);
  const H = () => ({ Authorization: `Bearer ${token()}`, "Content-Type": "application/json" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/social-outreach?status=${filter}`, { headers: H() }).then((x) => x.json());
      if (r.success) setItems(r.items || []);
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const act = async (id: number, action: "sent" | "reject") => {
    setBusy(id);
    try {
      const r = await fetch(`${API}/admin/social-outreach/${id}/${action}`, {
        method: "POST", headers: H(), body: JSON.stringify({ adminNote: note[id] || "" }),
      }).then((x) => x.json());
      if (r.success) { toast(action === "sent" ? "Göndərildi olaraq işarələndi" : "Rədd edildi", "success"); load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => toast("Kopyalandı", "success")).catch(() => {});
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Sosial media mesajları</h1>
      <p className="text-muted text-sm mb-4">
        İstifadəçilər websearch-də tapdıqları şəxslərə mesaj yazır. Siz profili açıb mesajı
        <b> əl ilə</b> göndərir, sonra "Göndərildi" ilə işarələyirsiniz.
      </p>

      <div className="flex gap-1 bg-input-bg border border-input-border rounded-xl p-1 mb-4 w-fit">
        {["PENDING", "SENT", "REJECTED", "all"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === s ? "bg-orange-500 text-white" : "text-muted"}`}>
            {s === "all" ? "Hamısı" : STATUS[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-muted text-sm py-10 text-center">Müraciət yoxdur.</p>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="surface p-4">
              {/* Hədəf profil */}
              <div className="flex items-start gap-3 mb-3">
                {it.targetAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.targetAvatar.startsWith("http") ? it.targetAvatar : imgUrl(it.targetAvatar)} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-input-bg flex items-center justify-center text-xl shrink-0">👤</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{it.targetName}</span>
                    <span className="text-[11px] text-muted">{PLAT[it.targetPlatform] || it.targetPlatform}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS[it.status]?.cls}`}>{STATUS[it.status]?.label}</span>
                  </div>
                  <p className="text-[11px] text-muted">@{it.targetHandle}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <a href={it.targetUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[var(--brand-to)] hover:underline">Profili aç ↗</a>
                    <button onClick={() => copy(it.targetUrl)} className="text-xs text-muted hover:text-foreground">🔗 Linki kopyala</button>
                  </div>
                </div>
              </div>

              {/* Kim göndərir + mesaj */}
              <div className="bg-input-bg/60 rounded-xl p-3 mb-3">
                <p className="text-[11px] text-muted mb-1">
                  Göndərən: <b className="text-foreground">{it.requester?.name || "—"}</b>
                  {it.requester?.phone ? ` · ${it.requester.phone}` : ""} · {new Date(it.createdAt).toLocaleString("az-AZ")}
                </p>
                <p className="text-sm whitespace-pre-wrap">{it.message}</p>
                <button onClick={() => copy(`${it.requester?.name || "tradixai istifadəçisi"}: ${it.message}`)}
                  className="mt-2 text-xs font-semibold text-[var(--brand-to)] hover:underline">
                  📋 Mesajı adla birlikdə kopyala
                </button>
              </div>

              {it.status === "PENDING" ? (
                <>
                  <input value={note[it.id] || ""} onChange={(e) => setNote((p) => ({ ...p, [it.id]: e.target.value }))}
                    placeholder="Qeyd (istəyə bağlı) — məs. 'DM bağlıdır' və ya 'göndərildi, cavab gözlənir'"
                    className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm mb-2" />
                  <div className="flex gap-2">
                    <button onClick={() => act(it.id, "sent")} disabled={busy === it.id}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-semibold disabled:opacity-50">✓ Göndərildi</button>
                    <button onClick={() => act(it.id, "reject")} disabled={busy === it.id}
                      className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm font-semibold disabled:opacity-50">✕ Rədd et</button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted">
                  {it.sentByName ? `${it.sentByName} · ` : ""}{it.sentAt ? new Date(it.sentAt).toLocaleString("az-AZ") : ""}
                  {it.adminNote ? ` · ${it.adminNote}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
