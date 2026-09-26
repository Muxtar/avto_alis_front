"use client";
// Məhsul səhifəsində mağazanın İXTİSAS ENDİRİMLƏRİ və baxanın statusu:
//   • təsdiqli ixtisası uyğundur → «Sizə −10% (Həkim)» — səbətdə avtomatik;
//   • profildə yazıb, sənədi yoxdur → «Sənədinizi təsdiqlədin» linki;
//   • digərləri → hansı peşə sahiblərinə endirim olduğu.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { API } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export default function ProDiscountInfo({ listingId, price }: { listingId: number; price: number }) {
  const { token } = useAuth();
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${API}/listings/${listingId}/pro-discount`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json()).then((x) => { if (alive && x?.success) setD(x); }).catch(() => {});
    return () => { alive = false; };
  }, [listingId, token]);
  if (!d || !d.rules?.length) return null;

  if (d.mine) {
    const after = Math.round(price * (1 - d.mine.percent / 100) * 100) / 100;
    return (
      <div className="mb-3 rounded-2xl p-3 border border-emerald-500/30 bg-emerald-500/10">
        <p className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">🎓 Sizə −{d.mine.percent}% ixtisas endirimi</p>
        <p className="text-xs text-emerald-700/90 mt-0.5">
          «{d.mine.profession}» ixtisasınız sənədlə təsdiqlidir — səbətdə avtomatik tətbiq olunur: <b>{formatPrice(after)} ₼</b> / ədəd
        </p>
      </div>
    );
  }
  return (
    <div className="mb-3 rounded-2xl p-3 border border-[var(--brand-to)]/25 bg-[var(--brand-soft)]">
      <p className="text-xs font-bold text-[var(--brand-to)] mb-1.5">🎓 Bu mağazada ixtisas endirimi</p>
      <div className="flex flex-wrap gap-1.5">
        {d.rules.slice(0, 6).map((r: any) => (
          <span key={r.profession} className="text-[11px] px-2 py-0.5 rounded-full bg-card border border-card-border font-semibold">{r.profession} −{r.percent}%</span>
        ))}
        {d.rules.length > 6 && <span className="text-[11px] text-muted">+{d.rules.length - 6}</span>}
      </div>
      {d.missingDoc?.length > 0 ? (
        <p className="text-[11px] mt-2 text-amber-700">
          Siz «{d.missingDoc[0]}» ixtisasındasınız, amma sənədiniz təsdiqlənməyib.{" "}
          <Link href="/profile" className="font-semibold underline">Diplom/lisenziyanı yükləyin →</Link>
        </p>
      ) : (
        <p className="text-[11px] mt-2 text-muted">Endirim ixtisasını sənədlə təsdiqləmiş alıcılara tətbiq olunur.</p>
      )}
    </div>
  );
}
