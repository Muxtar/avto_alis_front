"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

export default function ReferralLinkPage() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API}/referral/${params.token}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.token]);

  const order = async () => {
    if (!isLoggedIn) { router.push("/"); return; }
    if (!address.trim() || !phone.trim()) { toast("Ünvan və telefon tələb olunur", "error"); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/referral/${params.token}/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ address, phone }),
      }).then((x) => x.json());
      if (r.success) { toast("Sifariş verildi ✓", "success"); router.push("/orders?tab=buying"); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-muted">Link tapılmadı və ya bitib.</p></div>;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-6 py-6">
      <div className="surface p-4 mb-4">
        <p className="text-xs text-muted">Referal sifariş</p>
        <h1 className="text-lg font-bold">{data.store?.name}</h1>
        <p className="text-sm text-muted mt-0.5">
          <b className="text-foreground">{data.referrer?.name}</b>{data.referrer?.profession ? ` (${data.referrer.profession})` : ""} tövsiyəsi ilə
        </p>
      </div>

      <div className="surface p-4 mb-4 space-y-3">
        {data.items.map((i: any) => (
          <div key={i.listingId} className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-input-bg overflow-hidden shrink-0 flex items-center justify-center">
              {i.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${imgUrl(i.image)}`} alt={i.title} className="w-full h-full object-cover" />
              ) : <span className="text-muted">📦</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{i.title}</p>
              <p className="text-xs text-muted">{i.quantity} × {i.price} AZN</p>
            </div>
            <span className="text-sm font-semibold">{(i.price * i.quantity).toFixed(2)} AZN</span>
          </div>
        ))}
        <div className="border-t border-card-border pt-3 flex items-center justify-between font-bold">
          <span>Cəmi</span>
          <span className="text-orange-500">{data.total.toFixed(2)} AZN</span>
        </div>
      </div>

      <div className="surface p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Çatdırılma ünvanı</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ünvan" className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Telefon</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+994..." className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
        </div>
        <button onClick={order} disabled={busy || authLoading} className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold disabled:opacity-50">
          {busy ? "..." : `Sifariş ver — ${data.total.toFixed(2)} AZN (nağd)`}
        </button>
        {!isLoggedIn && <p className="text-[11px] text-muted text-center">Sifariş üçün əvvəlcə daxil olun.</p>}
      </div>
    </div>
  );
}
