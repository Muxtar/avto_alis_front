"use client";
// ÇEK — e-kassa çeki (pulsuz OCR ilə oxunub): məhsullar, ştrix-kodlar, yekun məbləğ və
// hər məhsulun saytdakı (barkodla dəqiq / adla təxmini) və digər mağazalardakı qiyməti.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import IdCard, { IdField } from "@/components/IdCard";

const ago = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  return d <= 0 ? "bu gün" : d === 1 ? "dünən" : `${d} gün əvvəl`;
};

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

  const tot = r.totals || { paid: r.total, found: 0, siteTotal: 0, saving: 0 };
  const isPortal = !String(r.fiscalId).startsWith("photo-");
  const mismatches = r.items.filter((i: any) => i.check === "mismatch").length;
  return (
    <div className="modern-page max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <Link href="/receipts" className="text-xs text-muted hover:text-foreground">← Çeklərim</Link>

      <IdCard icon="🧾" title={r.store?.objectName || "Satış çeki"} tone="brand" className="mt-2"
        stamp={r.checks?.totalMatches === false || mismatches ? "pending" : "ok"} stampText={{ ok: "Yoxlanıldı", pending: "Yoxlayın" }}
        summary={`${r.date ? new Date(r.date).toLocaleDateString("az-AZ") : ""}${r.time ? ` · ${r.time.slice(0, 5)}` : ""} · ${r.items.length} məhsul · ${r.source === "ai" ? "AI" : "OCR"}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <IdField label="Vergi ödəyicisi" value={r.store?.taxpayer} />
          <IdField label="VÖEN" value={r.store?.voen} mono />
          <IdField label="Çek №" value={r.receiptNo} mono />
          <IdField label="Ünvan" value={r.store?.address} />
          <IdField label="Kassir" value={r.cashier} />
          <IdField label="Ödəniş" value={r.payment?.cashless ? "Nağdsız (kart)" : r.payment?.cash ? "Nağd" : null} />
        </div>

        {/* ── YEKUN ── */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl bg-input-bg p-2.5"><p className="id-field-label">Çekdə ödənilən</p><p className="text-lg font-extrabold tabular-nums">{formatPrice(tot.paid ?? r.total ?? 0)} ₼</p></div>
          <div className="rounded-xl bg-input-bg p-2.5"><p className="id-field-label">ƏDV</p><p className="text-lg font-extrabold tabular-nums">{r.vatTotal != null ? `${formatPrice(r.vatTotal)} ₼` : "—"}</p></div>
          <div className="rounded-xl bg-[var(--brand-soft)] p-2.5"><p className="id-field-label">Saytda tapıldı</p><p className="text-lg font-extrabold tabular-nums">{tot.found}/{r.items.length}{tot.found ? <span className="text-xs font-semibold text-muted"> · {formatPrice(tot.siteTotal)} ₼</span> : null}</p></div>
          <div className={`rounded-xl p-2.5 ${tot.saving > 0 ? "bg-emerald-500/10" : tot.saving < 0 ? "bg-red-500/10" : "bg-input-bg"}`}>
            <p className="id-field-label">{tot.saving >= 0 ? "Saytda qənaət" : "Saytda baha"}</p>
            <p className={`text-lg font-extrabold tabular-nums ${tot.saving > 0 ? "text-emerald-700" : tot.saving < 0 ? "text-red-600" : ""}`}>{tot.found ? `${formatPrice(Math.abs(tot.saving))} ₼` : "—"}</p>
          </div>
        </div>
        {(r.checks && !r.checks.totalMatches) || mismatches ? (
          <p className="mt-3 text-[12px] rounded-xl px-3 py-2 bg-amber-500/10 text-amber-800 border border-amber-500/25">
            ⚠ Oxunan rəqəmlərdə uyğunsuzluq var{r.checks && !r.checks.totalMatches ? ` (sətirlərin cəmi ${formatPrice(r.checks.itemsSum)} ₼, çekdə ${formatPrice(r.total)} ₼)` : ""} — «yoxlayın» işarəli məhsullar qiymət bazasına yazılmır.
          </p>
        ) : null}
        {isPortal && (
          <a href={`https://monitoring.e-kassa.gov.az/#/index?doc=${r.fiscalId}`} target="_blank" rel="noreferrer" className="inline-block mt-3 text-xs font-semibold text-[var(--brand-to)] hover:underline">Çekin orijinalı (e-kassa) ↗</a>
        )}
      </IdCard>

      <h2 className="font-bold text-lg mt-6 mb-2">Məhsullar</h2>
      <div className="space-y-3">
        {r.items.map((it: any, i: number) => {
          const best = [...(it.matches || [])].sort((a: any, b: any) => a.price - b.price)[0];
          return (
            <div key={i} className="lst-row" style={{ ["--row-c" as any]: best && best.price < it.price ? "#10b981" : best ? "var(--brand-to)" : "#94a3b8" }}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{it.name}</p>
                  <p className="text-[11px] text-muted">
                    {it.qty} {it.unit || "əd."} × {formatPrice(it.price)} ₼{it.vatPercent != null ? ` · ƏDV ${it.vatPercent}%` : ""}
                    {it.barcode && <> · <span className="font-mono">▮▯▮ {it.barcode}</span></>}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {it.matchType === "barcode" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700">✓ Eyni barkod</span>}
                    {it.matchType === "name" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700">≈ Oxşar ad (təxmini)</span>}
                    {it.restricted && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-input-bg text-muted" title="Çəki ilə satılan / mağazanın daxili kodu">⚖ Daxili kod</span>}
                    {it.check === "mismatch" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-600">⚠ yoxlayın</span>}
                  </div>
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
                        {m.diffTotal !== 0 && (
                          <span className={`block text-[10px] font-bold ${m.diffTotal > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {m.diffTotal > 0 ? `−${formatPrice(m.diffTotal)} ₼ ucuz` : `+${formatPrice(-m.diffTotal)} ₼ baha`}
                          </span>
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-[11.5px] text-muted">
                  Saytda hələ yoxdur. <Link href={`/elanlar?search=${encodeURIComponent(it.barcode || it.name)}`} className="text-[var(--brand-to)] font-semibold">Axtarışda bax →</Link>
                </p>
              )}

              {it.otherStores?.length > 0 && (
                <div className="mt-2 text-[11.5px] rounded-xl px-3 py-2 bg-input-bg">
                  <span className="font-semibold">🏪 Digər mağazalarda{it.otherStores[0].exact ? "" : " (oxşar ad)"}:</span>{" "}
                  {it.otherStores.map((o: any, k: number) => (
                    <span key={k} className="whitespace-nowrap">
                      {k > 0 && " · "}{o.store || "?"} <b className="tabular-nums">{formatPrice(o.price)} ₼</b>
                      <span className={o.diff > 0 ? "text-emerald-600" : o.diff < 0 ? "text-red-500" : "text-muted"}> ({o.diff > 0 ? `−${formatPrice(o.diff)}` : o.diff < 0 ? `+${formatPrice(-o.diff)}` : "eyni"})</span>
                      <span className="text-muted"> {ago(o.observedAt)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-[11px] text-muted">Çek pulsuz OCR ilə oxunub. Mağaza qiymətləri istifadəçilərin oxutduğu çeklərdən anonim toplanır (son 90 gün).</p>
      <button onClick={remove} className="mt-4 text-xs text-red-500 hover:underline">Çeki siyahıdan sil</button>
    </div>
  );
}
