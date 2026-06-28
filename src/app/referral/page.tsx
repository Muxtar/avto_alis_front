"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { API } from "@/lib/api";

const DOC_LABEL: Record<string, string> = { NONE: "Sənəd tələb olunmur", DIPLOMA: "Diplom tələb olunur", CV: "CV tələb olunur", ANY: "Diplom və ya CV tələb olunur" };

export default function ReferralStoresPage() {
  const { token, isLoggedIn, authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    fetch(`${API}/referral/stores`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [isLoggedIn, authLoading]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  const stores = data?.stores || [];
  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-1 flex items-center gap-2">🤝 Referal mağazalar</h1>
      <p className="text-sm text-muted mb-5">
        {data?.profession
          ? <>«<b className="text-foreground">{data.profession}</b>» ixtisası üzrə komissiya verən mağazalar. Məhsul seçib link yaradın, alıcıya göndərin — sifarişdən komissiya qazanın.</>
          : "Referal mağazaları görmək üçün profildə ixtisasınızı seçin."}
      </p>

      {!data?.profession ? (
        <div className="surface p-8 text-center">
          <p className="text-muted text-sm mb-3">İxtisasınız təyin olunmayıb.</p>
          <Link href="/profile" className="inline-block px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold">Profilə keç → İxtisas seç</Link>
        </div>
      ) : stores.length === 0 ? (
        <div className="surface p-8 text-center text-muted">İxtisasınıza uyğun referal mağaza hələ yoxdur.</div>
      ) : (
        <div className="space-y-2.5">
          {stores.map((s: any) => (
            <Link key={s.objectId} href={`/object/${s.objectId}`} className="surface card-hover p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-2xl shrink-0">🏪</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{s.name}</p>
                <p className="text-xs text-muted truncate">{s.businessName}{s.city ? ` · ${s.city}` : ""} · {s.listingCount} məhsul</p>
                <p className="text-[11px] mt-0.5 text-muted">{DOC_LABEL[s.requiredDoc]}{!s.eligible ? " · ⚠ sənəd çatışmır" : ""}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-extrabold text-orange-500">{s.commissionPercent}%</p>
                <p className="text-[10px] text-muted">komissiya</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
