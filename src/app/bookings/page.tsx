"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Gözləyir", cls: "bg-amber-500/10 text-amber-500" },
  CONFIRMED: { label: "Təsdiqlənib", cls: "bg-green-500/10 text-green-500" },
  REJECTED: { label: "Rədd edilib", cls: "bg-red-500/10 text-red-500" },
  CANCELLED: { label: "Ləğv edilib", cls: "bg-muted/10 text-muted" },
  COMPLETED: { label: "Tamamlanıb", cls: "bg-blue-500/10 text-blue-500" },
};

function fmtDate(d?: string) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("az-AZ", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
}

export default function BookingsPage() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<"host" | "guest">("host");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    setLoading(true); setError(false);
    fetch(`${API}/me/bookings`, { headers: { Authorization: `Bearer ${token}` } })
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

  const setStatus = async (id: number, status: string) => {
    setBusyId(id);
    try {
      const r = await fetch(`${API}/bookings/${id}/status`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((x) => x.json());
      if (r.success) { toast("Yeniləndi ✓", "success"); load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta baş verdi", "error"); } finally { setBusyId(null); }
  };

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (error) return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <div className="surface p-8 text-center">
        <p className="text-sm text-muted mb-3">Bronlar yüklənmədi. Yenidən cəhd edin.</p>
        <button onClick={load} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold">Yenidən cəhd et</button>
      </div>
    </div>
  );

  const list: any[] = tab === "host" ? (data?.asHost || []) : (data?.asGuest || []);

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">📅 Bronlar</h1>
      <p className="text-sm text-muted mb-4">Restoran, otel və məkan bron sorğularınız.</p>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setTab("host")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "host" ? "bg-orange-500 text-white" : "bg-input-bg text-foreground border border-input-border"}`}>
          Mənə gələn bronlar{data?.asHost?.length ? ` (${data.asHost.length})` : ""}
        </button>
        <button onClick={() => setTab("guest")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === "guest" ? "bg-orange-500 text-white" : "bg-input-bg text-foreground border border-input-border"}`}>
          Bronlarım{data?.asGuest?.length ? ` (${data.asGuest.length})` : ""}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="surface p-8 text-center text-muted">{tab === "host" ? "Sizə hələ bron sorğusu gəlməyib." : "Hələ bron etməmisiniz. Bron edilə bilən elan tapın və tarix seçin."}</div>
      ) : (
        <div className="space-y-3">
          {list.map((b) => {
            const st = STATUS[b.status] || { label: b.status, cls: "bg-muted/10 text-muted" };
            const isStay = b.type === "STAY";
            const img = b.listing?.images?.[0];
            const other = tab === "host" ? b.guest : b.host;
            return (
              <div key={b.id} className="surface p-4">
                <div className="flex items-start gap-3">
                  <Link href={`/marketplace/${b.listing?.id}`} className="w-14 h-14 rounded-xl bg-input-bg overflow-hidden shrink-0 flex items-center justify-center">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`${imgUrl(img)}`} alt={b.listing?.title} className="w-full h-full object-cover" />
                    ) : <span className="text-xl">{isStay ? "🏨" : "🍽️"}</span>}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/marketplace/${b.listing?.id}`} className="font-semibold text-sm truncate hover:text-orange-500">{b.listing?.title}</Link>
                      <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0 ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {isStay
                        ? `${fmtDate(b.checkIn)} → ${fmtDate(b.checkOut)} · ${b.nights || 0} gecə · ${b.guests} qonaq${b.rooms ? ` · ${b.rooms} otaq` : ""}`
                        : `${fmtDate(b.date)}${b.time ? ` · ${b.time}` : ""} · ${b.guests} nəfər`}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {tab === "host" ? "Bron edən" : "Sahib"}: <b className="text-foreground">{other?.name || "—"}</b>
                      {tab === "host" && b.contactPhone ? ` · 📞 ${b.contactPhone}` : ""}
                    </p>
                    {b.note && <p className="text-xs text-muted mt-1 italic">“{b.note}”</p>}
                    {b.totalPrice != null && <p className="text-sm font-bold text-orange-500 mt-1">≈ {b.totalPrice.toFixed(2)} AZN</p>}

                    {/* Əməliyyatlar */}
                    <div className="flex gap-2 mt-2.5 flex-wrap">
                      {tab === "host" && b.status === "PENDING" && (
                        <>
                          <button disabled={busyId === b.id} onClick={() => setStatus(b.id, "CONFIRMED")} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50">Təsdiqlə</button>
                          <button disabled={busyId === b.id} onClick={() => setStatus(b.id, "REJECTED")} className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg text-xs font-semibold disabled:opacity-50">Rədd et</button>
                        </>
                      )}
                      {tab === "host" && b.status === "CONFIRMED" && (
                        <>
                          <button disabled={busyId === b.id} onClick={() => setStatus(b.id, "COMPLETED")} className="px-3 py-1.5 bg-blue-500/10 text-blue-500 border border-blue-500/30 rounded-lg text-xs font-semibold disabled:opacity-50">Tamamlandı</button>
                          <button disabled={busyId === b.id} onClick={() => setStatus(b.id, "CANCELLED")} className="px-3 py-1.5 bg-muted/10 text-muted border border-input-border rounded-lg text-xs font-semibold disabled:opacity-50">Ləğv et</button>
                        </>
                      )}
                      {tab === "guest" && (b.status === "PENDING" || b.status === "CONFIRMED") && (
                        <button disabled={busyId === b.id} onClick={() => setStatus(b.id, "CANCELLED")} className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg text-xs font-semibold disabled:opacity-50">Bronu ləğv et</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
