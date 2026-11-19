"use client";
// KƏNAR ELAN TƏKLİFLƏRİ («Təkliflər» səhifəsində):
//  • Mənə gələnlər — başqa saytlardakı (tap.az, turbo.az…) elanlarıma saytımız
//    üzərindən göndərilmiş təkliflər. Nömrəmə bağlıdır: qeydiyyatdan ƏVVƏL
//    göndərilənlər də buradadır.
//  • Göndərdiklərim — internet axtarışında tapdığım elanlara verdiyim təkliflər.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { API, imgUrl } from "@/lib/api";

interface Row {
  id: number; listingUrl: string; listingSite: string; listingTitle: string; listingImage: string | null;
  listingPrice: number | null; listingCurrency: string | null; offerPrice: number; note: string | null;
  status: "PENDING" | "SENT" | "REJECTED"; sentVia: string | null; createdAt: string;
  buyer?: { id: number; name: string; avatar: string | null };
}

const sentLabel = (r: Row) =>
  r.status === "REJECTED" ? { t: "Çatdırılmadı", c: "bg-red-500/10 text-red-500" }
    : r.status === "SENT" ? { t: r.sentVia === "site" ? "Satıcı saytdadır — gördü" : "Satıcıya xəbər verildi", c: "bg-green-500/10 text-green-600" }
    : { t: "Satıcıya xəbər verilir", c: "bg-amber-500/10 text-amber-600" };

export default function ExternalOffersSection() {
  const { token, isLoggedIn } = useAuth();
  const [sent, setSent] = useState<Row[]>([]);
  const [received, setReceived] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    fetch(`${API}/me/external-offers`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d?.success) { setSent(d.sent || []); setReceived(d.received || []); } })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [isLoggedIn, token]);

  // Bildirişdən gələndə (?tab=external) bölməyə sürüş.
  useEffect(() => {
    if (!loaded) return;
    if (new URLSearchParams(window.location.search).get("tab") === "external") document.getElementById("external-offers")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loaded]);

  if (!loaded || (sent.length === 0 && received.length === 0)) return null;

  const card = (r: Row, mine: boolean) => {
    const st = sentLabel(r);
    return (
      <div key={r.id} className="border border-card-border rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <a href={r.listingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold hover:underline line-clamp-2">{r.listingTitle} ↗</a>
            <p className="text-[11px] text-muted mt-0.5">
              {r.listingSite}{r.listingPrice != null ? ` · elan qiyməti ${r.listingPrice} ${r.listingCurrency || "AZN"}` : ""} · {new Date(r.createdAt).toLocaleDateString("az-AZ")}
            </p>
          </div>
          <p className="shrink-0 text-base font-extrabold text-orange-600 tabular-nums">{r.offerPrice} <span className="text-[10px] text-muted font-bold">AZN</span></p>
        </div>
        {r.note && <p className="text-xs rounded-lg px-3 py-2 bg-input-bg border border-card-border">💬 {r.note}</p>}
        {mine ? (
          <span className={`self-start px-2 py-1 rounded-lg text-[11px] font-bold ${st.c}`}>{st.t}</span>
        ) : (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2 text-xs text-muted min-w-0">
              {r.buyer?.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={imgUrl(r.buyer.avatar)} alt="" className="w-6 h-6 rounded-full object-cover" />
                : <span className="w-6 h-6 rounded-full bg-input-bg flex items-center justify-center text-[11px]">👤</span>}
              <span className="truncate">Alıcı: <b className="text-foreground">{r.buyer?.name || "İstifadəçi"}</b></span>
            </span>
            {r.buyer && (
              <Link href={`/messages?chat=${r.buyer.id}&name=${encodeURIComponent(r.buyer.name || "")}`}
                className="px-3 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600">Cavab yaz</Link>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="external-offers" className="surface sm:rounded-2xl rounded-none mt-4 p-3 sm:p-4 space-y-4 scroll-mt-32">
      <div>
        <p className="font-bold text-base">🌐 Kənar saytlardakı elanlar üzrə təkliflər</p>
        <p className="text-xs text-muted mt-0.5">tap.az, turbo.az, bina.az və lalafo.az elanlarına saytımız üzərindən göndərilən təkliflər.</p>
      </div>
      {received.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Elanlarınıza gələn təkliflər · {received.length}</p>
          {received.map((r) => card(r, false))}
        </div>
      )}
      {sent.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Göndərdiyiniz təkliflər · {sent.length}</p>
          {sent.map((r) => card(r, true))}
        </div>
      )}
    </div>
  );
}
