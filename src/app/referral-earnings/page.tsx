"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { useLive } from "@/lib/live";
import { API } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { fmtDate } from "@/lib/referral";

// Komissiyanın vəziyyəti — ledger yoxdursa sifariş hələ yoldadır.
function statusBadge(o: any): { label: string; cls: string } {
  if (o.referralVoided || o.status === "CANCELLED" || o.ledger?.status === "REVERSED") return { label: "Ləğv", cls: "bg-red-500/10 text-red-500" };
  const st = o.ledger?.status;
  if (st === "PAID_OUT") return { label: "Ödənildi", cls: "bg-green-500/10 text-green-600" };
  if (st === "AVAILABLE") return { label: "Ödənilə bilən", cls: "bg-orange-500/10 text-orange-600" };
  if (st === "PENDING") return { label: `Qaytarma müddəti${o.ledger.availableAt ? ` — ${fmtDate(o.ledger.availableAt)}` : ""}`, cls: "bg-amber-500/10 text-amber-600" };
  return { label: "Yolda", cls: "bg-blue-500/10 text-blue-500" };
}

const METHOD: Record<string, string> = { BANK: "Bank köçürməsi", IBAN: "Bank köçürməsi", CASH: "Nağd", CARD: "Kart" };

export default function ReferralEarningsPage() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [iban, setIban] = useState("");
  const [payee, setPayee] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) { setLoading(true); setError(false); }
    try {
      const r = await fetch(`${API}/me/referral-earnings`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d?.success === false) throw new Error();
      setData(d);
      if (!silent) { setIban(d.payoutInfo?.iban || ""); setPayee(d.payoutInfo?.payeeName || ""); }
    } catch { if (!silent) setError(true); } finally { setLoading(false); }
  }, [token]);

  useLive(["order", "payout"], () => load(true));

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    load();
  }, [isLoggedIn, authLoading, load, router]);

  const savePayout = async () => {
    const clean = iban.replace(/\s+/g, "").toUpperCase();
    if (clean && !/^AZ\d{2}[A-Z]{4}[A-Z0-9]{20}$/.test(clean)) { toast("IBAN düzgün deyil (AZ + 26 simvol)", "error"); return; }
    if (clean && !payee.trim()) { toast("Alıcının adını (hesab sahibi) yazın", "error"); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API}/me/referral-payout-info`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ iban: clean, payeeName: payee.trim() }),
      }).then((x) => x.json());
      if (r.success) {
        toast("Ödəniş məlumatı saxlanıldı ✓", "success");
        setIban(clean);
        setData((d: any) => ({ ...d, payoutInfo: { iban: clean, payeeName: payee.trim() } }));
      } else toast(r.message || "Xəta baş verdi", "error");
    } catch { toast("Xəta baş verdi", "error"); } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (error) return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <div className="surface p-8 text-center">
        <p className="text-sm text-muted mb-3">Qazanc məlumatı yüklənmədi. Yenidən cəhd edin.</p>
        <button onClick={() => load()} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold">Yenidən cəhd et</button>
      </div>
    </div>
  );

  const b = data?.balance || {};
  const orders: any[] = data?.orders || [];
  const payouts: any[] = data?.payouts || [];
  const savedIban = data?.payoutInfo?.iban || "";

  const cards = [
    { label: "Ödənilə bilən", v: b.available, cls: "text-orange-500", hint: "Növbəti ödənişdə köçürüləcək" },
    { label: "Gözləyən — qaytarma müddəti", v: b.pending, cls: "text-amber-500", hint: "Çatdırılıb, qaytarma müddəti gedir" },
    { label: "Sifarişlər yolda", v: b.inProgress, cls: "text-blue-500", hint: "Hələ çatdırılmayıb" },
    { label: "Ödənilib", v: b.paidOut, cls: "text-green-600", hint: "Hesabınıza köçürülüb" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold">💸 Referal qazancım</h1>
        <Link href="/referral" className="shrink-0 px-3.5 py-2 bg-input-bg border border-input-border rounded-xl text-sm font-medium hover:border-orange-500/50">🤝 Referal satış</Link>
      </div>
      <p className="text-sm text-muted mb-5">Linkləriniz üzərindən verilən sifarişlərdən komissiya. Çatdırılmadan və qaytarma müddəti bitəndən sonra ödənilə bilən olur, admin IBAN hesabınıza köçürür.</p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {cards.map((c) => (
          <div key={c.label} className="surface p-4">
            <p className="text-xs text-muted">{c.label}</p>
            <p className={`text-xl sm:text-2xl font-extrabold ${c.cls}`}>{formatPrice(c.v || 0)} <span className="text-sm">AZN</span></p>
            <p className="text-[10px] text-muted mt-0.5">{c.hint}</p>
          </div>
        ))}
      </div>

      {/* Ödəniş hesabı */}
      <div className="surface p-4 mb-6">
        <p className="font-semibold text-sm mb-1">🏦 Ödəniş hesabı (IBAN)</p>
        {(b.available || 0) > 0 && !savedIban && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs">
            ⚠ {formatPrice(b.available)} AZN ödənilə bilən komissiyanız var, amma IBAN daxil edilməyib — ödəniş almaq üçün hesabınızı əlavə edin.
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">IBAN</label>
            <input value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} placeholder="AZ00XXXX00000000000000000000" maxLength={34}
              className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Hesab sahibi (ad, soyad)</label>
            <input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Ad Soyad" maxLength={120}
              className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 mt-3">
          <p className="text-[11px] text-muted">Format: AZ + 26 simvol. Hesab sizin adınıza olmalıdır.</p>
          <button onClick={savePayout} disabled={saving} className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{saving ? "..." : "Saxla"}</button>
        </div>
      </div>

      {/* Sifarişlər */}
      <h2 className="font-bold text-base mb-2.5">🧾 Referal sifarişlər</h2>
      {orders.length === 0 ? (
        <div className="surface p-8 text-center text-sm text-muted mb-6">
          Hələ referal sifariş yoxdur. <Link href="/referral" className="text-orange-500 hover:underline">Link yaradıb paylaşın →</Link>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {orders.map((o) => {
            const st = statusBadge(o);
            const voided = st.label === "Ləğv";
            const amount = o.ledger?.amount ?? o.referralAmount ?? 0;
            return (
              <div key={o.id} className="surface p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">Sifariş #{o.id}{o.seller?.name ? ` · ${o.seller.name}` : ""}</p>
                  <p className="text-xs text-muted">{fmtDate(o.createdAt)} · {formatPrice(o.total || 0)} AZN · {o.referralPercent ?? "—"}%{o.deliveredAt ? ` · çatdırılıb ${fmtDate(o.deliveredAt)}` : ""}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>
                <span className={`text-sm font-bold shrink-0 ${voided ? "text-muted line-through" : "text-orange-500"}`}>+{formatPrice(amount)} AZN</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Ödənişlər */}
      <h2 className="font-bold text-base mb-2.5">🏦 Ödənişlər</h2>
      {payouts.length === 0 ? (
        <div className="surface p-6 text-center text-sm text-muted">Hələ ödəniş olmayıb.</div>
      ) : (
        <div className="space-y-2">
          {payouts.map((p) => (
            <div key={p.id} className="surface p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{fmtDate(p.createdAt)} · {METHOD[p.method] || p.method || "Köçürmə"}</p>
                <p className="text-xs text-muted truncate">{p.iban ? <span className="font-mono">{p.iban}</span> : null}{p.reference ? ` · Ref: ${p.reference}` : ""}</p>
              </div>
              <span className="text-sm font-bold text-green-600 shrink-0">{formatPrice(p.amount || 0)} AZN</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
