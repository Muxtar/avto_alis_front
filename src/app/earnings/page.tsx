"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

const az = (n: number) => (n || 0).toLocaleString("az-AZ", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const LEDGER: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Gözləyir (çatdırılma)", cls: "text-amber-600" },
  AVAILABLE: { label: "Ödəniləcək", cls: "text-green-600" },
  PAID_OUT: { label: "Ödənilib", cls: "text-muted" },
  REVERSED: { label: "Geri alınıb", cls: "text-red-500" },
};

export default function EarningsPage() {
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/me/earnings`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json());
      if (r.success) setData(r);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
  }, [token, toast]);
  useEffect(() => { load(); }, [load]);

  if (!isLoggedIn) return <div className="max-w-2xl mx-auto p-6 text-muted">Qazancınızı görmək üçün daxil olun.</div>;
  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  const b = data?.balance || { available: 0, pending: 0, paidOut: 0, commissionDueCash: 0 };
  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl font-bold mb-1">Qazancım</h1>
      <p className="text-sm text-muted mb-4">Satışlarınızdan qazanc və ödənişlər. Platforma komissiyası çıxıldıqdan sonra net məbləğ.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <div className="surface p-3"><p className="text-[11px] text-muted">Ödəniləcək</p><p className="text-lg font-bold text-green-600">{az(b.available)} ₼</p></div>
        <div className="surface p-3"><p className="text-[11px] text-muted">Gözləyən</p><p className="text-lg font-bold text-amber-600">{az(b.pending)} ₼</p></div>
        <div className="surface p-3"><p className="text-[11px] text-muted">Ödənilmiş</p><p className="text-lg font-bold">{az(b.paidOut)} ₼</p></div>
        <div className="surface p-3"><p className="text-[11px] text-muted">Nağd komissiya borcu</p><p className="text-lg font-bold text-amber-600">{az(b.commissionDueCash)} ₼</p></div>
      </div>

      <h2 className="font-semibold mb-2 text-sm">Ödənişlər</h2>
      <div className="surface divide-y divide-card-border mb-5">
        {(data?.payouts || []).length === 0 ? <p className="text-muted text-sm p-3 text-center">Hələ ödəniş yoxdur.</p> : data.payouts.map((p: any) => (
          <div key={p.id} className="p-3 flex items-center justify-between text-sm">
            <span className="text-muted text-xs">{new Date(p.createdAt).toLocaleDateString("az-AZ")}{p.method ? ` · ${p.method}` : ""}</span>
            <span className="font-bold text-green-600">{az(p.amount)} ₼</span>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-2 text-sm">Son satışlar</h2>
      <div className="surface divide-y divide-card-border">
        {(data?.ledgers || []).length === 0 ? <p className="text-muted text-sm p-3 text-center">Hələ satış yoxdur.</p> : data.ledgers.map((l: any) => {
          const st = LEDGER[l.status] || LEDGER.PENDING;
          return (
            <div key={l.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">Sifariş #{l.orderId}</p>
                <p className="text-[11px] text-muted">Satış {az(l.grossAmount)} ₼ − komissiya {az(l.commission)} ₼ ({l.commissionRate}%) {l.heldByPlatform ? "" : "· nağd"}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{az(l.netAmount)} ₼</p>
                <p className={`text-[11px] font-semibold ${st.cls}`}>{st.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
