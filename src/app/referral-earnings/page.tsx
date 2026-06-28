"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { API } from "@/lib/api";

const STATUS: Record<string, string> = { PENDING: "Gözləyir", CONFIRMED: "Təsdiqlənib", SHIPPED: "Göndərilib", DELIVERED: "Çatdırılıb", CANCELLED: "Ləğv" };

export default function ReferralEarningsPage() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true); setError(false);
    fetch(`${API}/me/referral-earnings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (d?.success === false) throw new Error(); setData(d); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    load();
    // eslint-disable-next-line
  }, [isLoggedIn, authLoading]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (error) return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <div className="surface p-8 text-center">
        <p className="text-sm text-muted mb-3">Qazanc məlumatı yüklənmədi. Yenidən cəhd edin.</p>
        <button onClick={load} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold">Yenidən cəhd et</button>
      </div>
    </div>
  );

  const orders = data?.orders || [];
  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">💸 Referal qazancım</h1>
      <p className="text-sm text-muted mb-5">Sizin link üzərindən verilən sifarişlərdən komissiya. Çatdırılan sifarişlər qətiləşir.</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="surface p-4">
          <p className="text-xs text-muted">Qazanılmış (çatdırılıb)</p>
          <p className="text-2xl font-extrabold text-orange-500">{(data?.confirmedTotal || 0).toFixed(2)} <span className="text-sm">AZN</span></p>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-muted">Gözləyən</p>
          <p className="text-2xl font-extrabold text-muted">{(data?.pendingTotal || 0).toFixed(2)} <span className="text-sm">AZN</span></p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="surface p-8 text-center text-muted">Hələ referal sifariş yoxdur. Mağazadan referal səbət yaradıb linki paylaşın.</div>
      ) : (
        <div className="space-y-2">
          {orders.map((o: any) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="surface p-3.5 flex items-center justify-between hover:border-orange-500/40 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium">Sifariş #{o.id} · {o.seller?.name}</p>
                <p className="text-xs text-muted">{o.total?.toFixed(2)} AZN · {o.referralPercent}% · {o.referralVoided ? "Qaytarıldı (ləğv)" : (STATUS[o.status] || o.status)}</p>
              </div>
              <span className={`text-sm font-bold ${o.referralVoided ? "text-muted line-through" : o.status === "DELIVERED" ? "text-orange-500" : "text-muted"}`}>+{(o.referralAmount || 0).toFixed(2)} AZN</span>
            </Link>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted mt-4">ℹ️ Komissiya ödənişi hələlik mağaza ilə birbaşa razılaşma əsasındadır; platforma yalnız hesablamanı izləyir.</p>
    </div>
  );
}
