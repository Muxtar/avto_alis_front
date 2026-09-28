"use client";
// ÇEKLƏRİM — QR ilə oxudulan e-kassa çekləri.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { API } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import PageHero, { heroBtnPrimary } from "@/components/PageHero";
import ReceiptScanner from "@/components/ReceiptScanner";

export default function ReceiptsPage() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const [list, setList] = useState<any[] | null>(null);
  const [scan, setScan] = useState(false);
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/me/receipts`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then((d) => setList(d.receipts || [])).catch(() => setList([]));
  }, [token]);
  if (authLoading) return null;
  if (!isLoggedIn) return <p className="text-center py-20 text-muted">Çeklərinizi görmək üçün daxil olun.</p>;
  const total = (list || []).reduce((s, r) => s + (r.total || 0), 0);
  return (
    <div className="modern-page max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <PageHero icon="🧾" kicker="tradixai · e-kassa" title="Çeklərim"
        subtitle="Mağazadan aldığınız çekin QR kodunu oxudun — məhsullar saytda axtarılır, daha ucuzu göstərilir."
        stats={list ? [{ label: "Çek", value: list.length }, { label: "Cəmi xərc", value: `${formatPrice(Math.round(total * 100) / 100)} ₼` }] : undefined}
        actions={<button onClick={() => setScan(true)} className={heroBtnPrimary}>📷 QR oxut</button>} />
      {list === null ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[var(--brand-to)] border-t-transparent rounded-full animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="wiz-card text-center py-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center text-2xl mb-2">🧾</div>
          <p className="font-semibold">Hələ çek oxutmamısınız</p>
          <p className="text-xs text-muted mt-1">Çekin altındakı QR kodu kamera ilə oxudun.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map((r) => (
            <Link key={r.id} href={`/receipts/${r.id}`} className="lst-row flex items-center gap-3" style={{ ["--row-c" as any]: "var(--brand-to)" }}>
              <span className="w-11 h-11 rounded-xl bg-[var(--brand-soft)] flex items-center justify-center text-xl shrink-0">🧾</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{r.storeName || "Çek"}</p>
                <p className="text-xs text-muted">{r.issuedAt ? new Date(r.issuedAt).toLocaleDateString("az-AZ") : "—"} · {r.itemCount} məhsul</p>
              </div>
              <span className="brand-text font-extrabold tabular-nums">{r.total != null ? `${formatPrice(r.total)} ₼` : ""}</span>
            </Link>
          ))}
        </div>
      )}
      {scan && <ReceiptScanner onClose={() => setScan(false)} />}
    </div>
  );
}
