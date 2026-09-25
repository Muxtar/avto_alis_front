"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useLive } from "@/lib/live";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";
import SellerReply, { chatLink, fmtReviewDate } from "@/components/SellerReply";

// ALDIĞIM RƏYLƏR — elanlarım, obyektlərim və peşəkar profilimə yazılmış rəylər.
// Mənfi (1-2★) rəylər qırmızı ilə vurğulanır: satıcı əvvəlcə müştəri ilə şəxsi
// əlaqə saxlayıb problemi həll edir, sonra ictimai cavab yazır.

type Filter = "" | "negative" | "unanswered";
const TABS: { key: Filter; label: string }[] = [
  { key: "", label: "Hamısı" },
  { key: "negative", label: "Mənfi (1-2★)" },
  { key: "unanswered", label: "Cavabsız" },
];
const NEGATIVE_MAX = 2;

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`text-sm leading-none ${n <= value ? (value <= NEGATIVE_MAX ? "text-red-500" : "text-amber-400") : "text-muted/40"}`}>★</span>
      ))}
    </span>
  );
}

function ReviewsInner() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("filter");
  const [filter, setFilter] = useState<Filter>(initial === "negative" || initial === "unanswered" ? initial : "");
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.replace("/");
  }, [authLoading, isLoggedIn, router]);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`${API}/me/reviews-received${filter ? `?filter=${filter}` : ""}`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json());
      if (r.success) { setReviews(r.reviews || []); setStats(r.stats || null); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
  }, [token, filter, toast]);
  useEffect(() => { load(); }, [load]);
  // Yeni rəy / rəy dəyişdi bildirişi gələndə siyahı yenilənsin.
  useLive(["notification"], () => load(true));

  const pickFilter = (f: Filter) => {
    setFilter(f);
    router.replace(f ? `/reviews?filter=${f}` : "/reviews", { scroll: false });
  };

  if (authLoading || !isLoggedIn) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl font-bold mb-1">Aldığım rəylər</h1>
      <p className="text-sm text-muted mb-4">Elanlarınıza, obyektlərinizə və profilinizə yazılmış rəylər. Mənfi rəylərə cavab verin və müştəri ilə əlaqə saxlayın.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <div className="surface p-3"><p className="text-[11px] text-muted">Ümumi rəy</p><p className="text-lg font-bold">{stats?.total ?? 0}</p></div>
        <div className="surface p-3"><p className="text-[11px] text-muted">Orta reytinq</p><p className="text-lg font-bold text-amber-500">{stats?.avg != null ? `★ ${stats.avg}` : "—"}</p></div>
        <div className="surface p-3"><p className="text-[11px] text-muted">Mənfi (👎)</p><p className="text-lg font-bold text-red-500">{stats?.negative ?? 0}</p></div>
        <div className={`surface p-3 ${stats?.unansweredNegative ? "ring-1 ring-red-500/40" : ""}`}><p className="text-[11px] text-muted">Cavabsız mənfi</p><p className={`text-lg font-bold ${stats?.unansweredNegative ? "text-red-500" : ""}`}>{stats?.unansweredNegative ?? 0}</p></div>
      </div>

      <div className="flex gap-1 bg-input-bg border border-input-border rounded-xl p-1 mb-4 w-fit max-w-full overflow-x-auto">
        {TABS.map((tb) => (
          <button key={tb.key || "all"} onClick={() => pickFilter(tb.key)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filter === tb.key ? "bg-card shadow-sm text-orange-500" : "text-muted hover:text-foreground"}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="surface p-8 text-center">
          <span className="text-3xl block mb-2">{filter === "negative" ? "🎉" : "💬"}</span>
          <p className="text-muted text-sm">{filter === "negative" ? "Mənfi rəy yoxdur" : filter === "unanswered" ? "Cavabsız rəy yoxdur" : "Hələ rəy almamısınız"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((c) => {
            const negative = c.rating != null && c.rating <= NEGATIVE_MAX;
            const img = c.listing?.images?.[0];
            return (
              <div key={c.id} className={`surface p-4 ${negative ? "border-2 !border-red-500/50 bg-red-500/[0.03]" : ""}`}>
                <div className="flex gap-3">
                  {c.user?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${imgUrl(c.user.avatar)}`} alt={c.user?.name || ""} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {(c.user?.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{c.user?.name}</span>
                      {c.rating ? <Stars value={c.rating} /> : null}
                      {negative && <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 text-[10px] font-bold">👎 Mənfi rəy</span>}
                      {!c.sellerReply && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px] font-semibold">Cavabsız</span>}
                      <span className="text-muted text-[11px] ml-auto shrink-0">{fmtReviewDate(c.createdAt)}</span>
                    </div>
                    <div className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5 min-w-0">
                      {c.listing ? (
                        <>
                          {img && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img.startsWith("http") ? img : imgUrl(img)} alt="" className="w-5 h-5 rounded object-cover shrink-0" />
                          )}
                          <Link href={`/marketplace/${c.listing.id}`} className="truncate hover:text-orange-500">📦 {c.listing.title}</Link>
                        </>
                      ) : c.object ? (
                        <Link href={`/object/${c.object.id}`} className="truncate hover:text-orange-500">🏪 {c.object.name}</Link>
                      ) : (
                        <span>👤 Profiliniz</span>
                      )}
                    </div>
                    <p className="text-sm mt-1.5 break-words whitespace-pre-line">{c.content}</p>

                    {negative && !c.sellerReply && (
                      <div className="mt-2 text-[11px] text-red-700 dark:text-red-300 bg-red-500/[0.06] border border-red-500/20 rounded-lg px-2.5 py-1.5">
                        💡 Əvvəlcə müştəri ilə şəxsi əlaqə saxlayıb problemi həll edin, sonra ictimai cavab yazın. Problem həll olunarsa müştəri rəyini dəyişə bilər.
                      </div>
                    )}

                    <SellerReply comment={c} canReply showContact={false} onChange={() => load(true)} />

                    <div className="flex flex-wrap gap-2 mt-2.5">
                      {c.user?.id && (
                        <Link href={chatLink(c.user.id, c.user.name)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600">
                          💬 Müştəri ilə əlaqə
                        </Link>
                      )}
                      {c.relatedOrder && (
                        <Link href={`/orders/${c.relatedOrder.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-input-bg border border-input-border hover:border-orange-500/50">
                          Sifariş #{c.relatedOrder.id}
                        </Link>
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

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ReviewsInner />
    </Suspense>
  );
}
