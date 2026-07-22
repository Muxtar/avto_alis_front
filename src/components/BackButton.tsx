"use client";
import { usePathname, useRouter } from "next/navigation";

// Qlobal "Geri" düyməsi — dərin səhifələrdə (elan → obyekt → profil ...) bir
// addım geri qayıtmağa imkan verir. Tarixçə yoxdursa ana bazara yönləndirir.
// Yalnız üst səviyyə səhifələrdə gizlədilir.
const HIDDEN_PATHS = new Set(["/", "/elanlar", "/verify", "/messages"]);

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

  // Axını tutan zolaq — məzmunun üstündə, SAĞDA və kiçik (VÖEN ilə elan
  // yerləşdirmə sihirbazındakı "← Geri" kimi). Məzmun sahəsi ilə eyni
  // enlik/kənarda olsun deyə max-w-7xl + eyni px.
  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 flex justify-end">
      <button
        onClick={goBack}
        aria-label="Geri qayıt"
        title="Geri qayıt"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-orange-500 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Geri
      </button>
    </div>
  );
}
