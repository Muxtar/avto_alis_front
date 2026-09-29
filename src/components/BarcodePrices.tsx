"use client";
// Elan səhifəsi: ştrix-kod + eyni barkodlu məhsulun mağazalardakı qiyməti (istifadəçi çeklərindən, son 90 gün).
import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export default function BarcodePrices({ barcode, price }: { barcode: string; price: number }) {
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    fetch(`${API}/barcodes/${encodeURIComponent(barcode)}`).then((r) => r.json()).then((x) => x?.success && setD(x)).catch(() => {});
  }, [barcode]);
  const stores: any[] = d?.stores || [];
  return (
    <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-5 mt-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">Ştrix-kod</h3>
        <span className="font-mono text-xs px-2 py-1 rounded bg-input-bg">▮▯▮ {barcode}</span>
      </div>
      {d?.restricted ? (
        <p className="mt-2 text-[11.5px] text-muted">Mağazanın daxili / çəki kodu — başqa mağazalarla müqayisə olunmur.</p>
      ) : stores.length ? (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Mağazalarda qiymət (çeklərdən)</p>
          {stores.slice(0, 6).map((s, i) => {
            const diff = Math.round((s.price - price) * 100) / 100;
            return (
              <div key={i} className="flex items-center justify-between text-[13px]">
                <span className="truncate">🏪 {s.store || "Mağaza"} <span className="text-[10.5px] text-muted">{new Date(s.observedAt).toLocaleDateString("az-AZ")}</span></span>
                <span className="shrink-0 tabular-nums">
                  <b>{formatPrice(s.price)} ₼</b>
                  {diff !== 0 && <span className={`ml-1.5 text-[11px] font-bold ${diff > 0 ? "text-emerald-600" : "text-red-500"}`}>{diff > 0 ? `burada ${formatPrice(diff)} ₼ ucuz` : `burada ${formatPrice(-diff)} ₼ baha`}</span>}
                </span>
              </div>
            );
          })}
        </div>
      ) : d ? (
        <p className="mt-2 text-[11.5px] text-muted">Bu barkod üzrə hələ mağaza çeki oxudulmayıb.</p>
      ) : null}
    </div>
  );
}
