"use client";
import { usePathname, useRouter } from "next/navigation";

// Qlobal "Geri" düyməsi — dərin səhifələrdə (elan → obyekt → profil ...) bir
// addım geri qayıtmağa imkan verir. Tarixçə yoxdursa ana bazara yönləndirir.
// Yalnız üst səviyyə səhifələrdə gizlədilir.
const HIDDEN_PATHS = new Set(["/", "/elanlar", "/verify"]);

// Səhifənin ÖZ geri naviqasiyası olan yerlərdə qlobal düymə göstərilmir —
// əks halda ekranda iki "Geri" olurdu:
//  • /elanlar/... — sol filtr panelində "‹ Bütün kateqoriyalar" var
//  • /account     — yeni elan sihirbazında kartın içində "← Geri" var
const HIDDEN_PREFIXES = ["/elanlar/", "/account"];

export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || HIDDEN_PATHS.has(pathname)) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  // Admin panelinin öz naviqasiyası var.
  if (pathname.startsWith("/admin")) return null;

  const goBack = () => {
    // Tarixçə varsa bir addım geri; birbaşa link ilə gəlinibsə ana bazara.
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/elanlar");
  };

  // Axını (flow) tutan sticky zolaq — məzmunun üstünə minmir, üstündə durur
  // və scroll zamanı başlığın altında yapışıq qalır.
  return (
    <div className="sticky top-[68px] md:top-[118px] z-40 flex justify-center py-2">
      <button
        onClick={goBack}
        aria-label="Geri qayıt"
        title="Geri qayıt"
        className="flex items-center gap-1.5 pl-3 pr-4 py-2 rounded-full bg-card/95 backdrop-blur border border-card-border shadow-lg text-sm font-medium text-foreground hover:border-orange-500/50 hover:text-orange-500 transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
        </svg>
        Geri
      </button>
    </div>
  );
}
