"use client";
// ÇEK — e-kassa çekinin strukturlaşdırılmış görünüşü + hər məhsulun saytdakı qarşılıqları.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import IdCard, { IdField } from "@/components/IdCard";

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { token, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [r, setR] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/me/receipts/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json())
      .then((d) => (d?.success ? setR(d.receipt) : setErr(d?.message || "Çek tapılmadı"))).catch(() => setErr("Şəbəkə xətası"));
  }, [token, id]);
  const remove = async () => {
    if (!confirm("Çek siyahınızdan silinsin?")) return;
    await fetch(`${API}/me/receipts/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    toast("Çek silindi", "success"); router.push("/receipts");
  };
  if (authLoading || (!r && !err)) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--brand-to)] border-t-transparent rounded-full animate-spin" /></div>;
  if (err) return <p className="text-center py-20 text-muted">{err} · <Link href="/receipts" className="text-[var(--brand-to)] font-semibold">Çeklərim</Link></p>;

  const found = r.items.filter((i: any) => i.matches?.length).length;
  const saving = r.items.reduce((s: number, i: any) => {
    const best = (i.matches || []).filter((m: any) => m.price < i.price).sort((a: any, b: any) => a.price - b.price)[0];
    return s + (best ? (i.price - best.price) * i.qty : 0);
  }, 0);
  const isPortal = !String(r.fiscalId).startsWith("photo-");
  return (
    <div className="modern-page max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <Link href="/receipts" className="text-xs text-muted hover:text-foreground">← Çeklərim</Link>

      <IdCard icon="🧾" title={r.store?.objectName || "Satış çeki"} tone="brand" className="mt-2"
        stamp={isPortal ? "ok" : "pending"} stampText={{ ok: "e-kassa", pending: "Fotodan" }}
        summary={`${r.date ? new Date(r.date).toLocaleDateString("az-AZ") : ""}${r.time ? ` · ${r.time.slice(0, 5)}` : ""} · ${r.items.length} məhsul`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <IdField label="Vergi ödəyicisi" value={r.store?.taxpayer} />
          <IdField label="VÖEN" value={r.store?.voen} mono />
          <IdField label="Çek №" value={r.receiptNo} mono />
          <IdField label="Ünvan" value={r.store?.address} />
          <IdField label="Kassir" value={r.cashier} />
          <IdField label="Ödəniş" value={r.payment?.cashless ? "Nağdsız (kart)" : r.payment?.cash ? "Nağd" : null} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-input-bg p-2.5"><p className="id-field-label">Cəmi</p><p className="text-lg font-extrabold tabular-nums">{r.total != null ? `${formatPrice(r.total)} ₼` : "—"}</p></div>
          <div className="rounded-xl bg-input-bg p-2.5"><p className="id-field-label">ƏDV</p><p className="text-lg font-extrabold tabular-nums">{r.vatTotal != null ? `${formatPrice(r.vatTotal)} ₼` : "—"}</p></div>
          <div className="rounded-xl bg-emerald-500/10 p-2.5"><p className="id-field-label">Saytda qənaət</p><p className="text-lg font-extrabold tabular-nums text-emerald-700">{saving > 0 ? `${formatPrice(Math.round(saving * 100) / 100)} ₼` : "—"}</p></div>
        </div>
        {isPortal && (
          <a href={`https://monitoring.e-kassa.gov.az/#/index?doc=${r.fiscalId}`} target="_blank" rel="noreferrer" className="inline-block mt-3 text-xs font-semibold text-[var(--brand-to)] hover:underline">Çekin orijinalı (e-kassa) ↗</a>
        )}
      </IdCard>

      <h2 className="font-bold text-lg mt-6 mb-2">Məhsullar <span className="text-sm text-muted font-normal">· {found}/{r.items.length} saytda tapıldı</span></h2>
      <div className="space-y-3">
        {r.items.map((it: any, i: number) => (
          <div key={i} className="lst-row" style={{ ["--row-c" as any]: it.matches?.some((m: any) => m.cheaperBy > 0) ? "#10b981" : it.matches?.length ? "var(--brand-to)" : "#94a3b8" }}>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{it.searchQuery || it.name}</p>
                <p className="text-[11px] text-muted">Çekdə: {it.name} · {it.qty} {it.unit || "əd."} × {formatPrice(it.price)} ₼{it.vatPercent != null ? ` · ƏDV ${it.vatPercent}%` : ""}</p>
              </div>
              <span className="font-extrabold tabular-nums shrink-0">{formatPrice(it.total)} ₼</span>
            </div>
            {it.matches?.length ? (
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {it.matches.map((m: any) => (
                  <Link key={m.id} href={`/marketplace/${m.id}`} className="flex items-center gap-2.5 p-2 rounded-xl border border-card-border hover:border-[var(--brand-to)]/50 hover:bg-[var(--brand-soft)] transition-colors">
                    <span className="w-10 h-10 rounded-lg bg-input-bg overflow-hidden shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {m.image && <img src={imgUrl(m.image)} alt="" className="w-full h-full object-cover" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12.5px] font-semibold truncate">{m.title}</span>
                      <span className="block text-[10.5px] text-muted truncate">{m.seller}{m.city ? ` · ${m.city}` : ""}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block font-extrabold text-sm tabular-nums">{formatPrice(m.price)} ₼</span>
                      {m.cheaperBy > 0 && <span className="block text-[10px] font-bold text-emerald-600">−{m.cheaperBy}% ucuz</span>}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[11.5px] text-muted">
                Saytda hələ tapılmadı. <Link href={`/elanlar?search=${encodeURIComponent(it.searchQuery || it.name)}`} className="text-[var(--brand-to)] font-semibold">Axtarışda bax →</Link>
              </p>
            )}
          </div>
        ))}
      </div>
      <button onClick={remove} className="mt-6 text-xs text-red-500 hover:underline">Çeki siyahıdan sil</button>
    </div>
  );
}
