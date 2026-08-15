"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

/**
 * QAYTARILMALI PUL.
 *
 * Sifariş ləğv olunanda alıcının pulu şlüz vasitəsilə geri qaytarılır. Bu
 * sorğu uğursuz ola bilər (şlüz sınıb, token bitib, şəbəkə). Belə halda pul
 * ALICIDA DEYİL, BİZDƏDİR — və bunu kimsə görməlidir.
 *
 * Sistem özü ~10 dəqiqədən bir təkrar cəhd edir (5 cəhdə qədər). Bu ekran
 * hələ də bağlanmayanları göstərir: əl ilə təkrar cəhd etmək və ya bankdan
 * köçürüb sətri bağlamaq üçün.
 */

const azn = (n: number) => (n || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString("az-AZ") : "—");

const ST: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Gedir…", cls: "bg-amber-500/15 text-amber-600" },
  FAILED: { label: "Alınmadı", cls: "bg-red-500/15 text-red-500" },
  DONE: { label: "✓ Qaytarıldı", cls: "bg-green-500/15 text-green-600" },
};
const REASON: Record<string, string> = {
  CANCELLED: "Sifariş ləğv edildi",
  TIMEOUT: "Satıcı vaxtında təsdiqləmədi",
  RETURN: "Məhsul qaytarıldı",
  ADMIN: "Admin əl ilə",
};

export default function AdminRefundsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<{ openCount: number; openAmount: number } | null>(null);
  const [status, setStatus] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  const H = () => ({ Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`, "Content-Type": "application/json" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/refunds?status=${status}`, { headers: H() }).then((x) => x.json());
      if (r.success) { setRows(r.rows || []); setTotals(r.totals || null); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const retry = async (orderId: number) => {
    setBusy(orderId);
    try {
      const r = await fetch(`${API}/admin/refunds/${orderId}/retry`, { method: "POST", headers: H() }).then((x) => x.json());
      if (r.success) { toast("Pul qaytarıldı ✓", "success"); load(); }
      else toast(r.message || "Yenə alınmadı", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  const resolve = async (orderId: number) => {
    const note = prompt("Necə həll olundu? (məs. bankdan əl ilə köçürüldü, 12.03.2026)");
    if (!note?.trim()) return;
    setBusy(orderId);
    try {
      const r = await fetch(`${API}/admin/refunds/${orderId}/resolve`, { method: "POST", headers: H(), body: JSON.stringify({ note }) }).then((x) => x.json());
      if (r.success) { toast("Bağlandı ✓", "success"); load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">Qaytarılmalı pul</h1>
      <p className="text-muted text-sm mb-4">
        Sifariş ləğv olunanda alıcının pulu avtomatik qaytarılır. Şlüz sorğusu alınmayıbsa sətir burada qalır —
        <b> pul alıcıda deyil, bizdədir</b>. Sistem hər 10 dəqiqədə təkrar cəhd edir; 5 cəhddən sonra dayanır və əl ilə həll olunmalıdır.
      </p>

      {totals && totals.openCount > 0 && (
        <div className="surface p-3 mb-4 border-l-4 border-red-500">
          <p className="text-sm">
            <b className="text-red-500">{totals.openCount}</b> sifarişdə pul geri qaytarılmayıb —
            <b className="text-red-500"> {azn(totals.openAmount)} AZN</b>
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {[{ k: "OPEN", l: "Açıq" }, { k: "DONE", l: "Bitmiş" }, { k: "ALL", l: "Hamısı" }].map((s) => (
          <button key={s.k} onClick={() => setStatus(s.k)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold ${status === s.k ? "bg-orange-500 text-white" : "bg-input-bg border border-input-border text-muted"}`}>
            {s.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-muted text-sm py-10 text-center">
          {status === "OPEN" ? "✓ Qaytarılmamış pul yoxdur." : "Nəticə yoxdur."}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const st = ST[r.status] || ST.FAILED;
            const o = r.order;
            return (
              <div key={r.id} className="surface p-3.5">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-sm">Sifariş #{r.orderId}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                  <span className="text-[11px] text-muted">{REASON[r.reason] || r.reason}</span>
                  <span className="ml-auto text-lg font-extrabold">{azn(r.amount)} <span className="text-[10px] text-muted">₼</span></span>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-0.5 text-[11px] mb-2">
                  <span className="text-muted">
                    Alıcı:{" "}
                    {o?.buyer ? <Link href={`/seller/${o.buyer.id}`} target="_blank" className="font-semibold text-[var(--brand-to)] hover:underline">{o.buyer.name}</Link> : "—"}
                    {o?.buyer?.phone ? ` · ${o.buyer.phone}` : ""}
                  </span>
                  <span className="text-muted">Satıcı: <b className="text-foreground">{o?.seller?.name || "—"}</b></span>
                  <span className="text-muted">Şlüz: <b className="text-foreground">{r.provider || o?.gatewayProvider || "—"}</b>{o?.gatewayRef ? ` · ${o.gatewayRef}` : ""}</span>
                  <span className="text-muted">Cəhd: <b className="text-foreground">{r.attempts}</b> · son: {dt(r.updatedAt)}</span>
                </div>

                {r.lastError && r.status !== "DONE" && (
                  <p className="text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5 mb-2">
                    Səbəb: {r.lastError}
                  </p>
                )}
                {r.adminNote && <p className="text-[11px] text-muted mb-2">📝 {r.adminNote}</p>}

                {r.status !== "DONE" && (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => retry(r.orderId)} disabled={busy === r.orderId}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white cta-gradient disabled:opacity-50">
                      {busy === r.orderId ? "..." : "🔁 Yenidən cəhd et"}
                    </button>
                    <button onClick={() => resolve(r.orderId)} disabled={busy === r.orderId}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-card-border hover:bg-input-bg disabled:opacity-50">
                      ✓ Əl ilə həll etdim
                    </button>
                    <Link href={`/orders/${r.orderId}`} target="_blank"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-card-border hover:bg-input-bg">Sifariş ↗</Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
