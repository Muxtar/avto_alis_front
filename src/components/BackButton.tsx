"use client";
import { usePathname, useRouter } from "next/navigation";

// Qlobal "Geri" düyməsi — dərin səhifələrdə (elan → obyekt → profil ...) bir
// addım geri qayıtmağa imkan verir. Tarixçə yoxdursa ana bazara yönləndirir.
// Yalnız üst səviyyə səhifələrdə gizlədilir.
const HIDDEN_PATHS = new Set(["/", "/elanlar", "/verify"]);

export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || HIDDEN_PATHS.has(pathname)) return null;
  // Admin panelinin öz naviqasiyası var.
  if (pathname.startsWith("/admin")) return null;

  const goBack = () => {
    // Tarixçə varsa bir addım geri; birbaşa link ilə gəlinibsə ana bazara.
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/elanlar");
  };

  return (
    <button
      onClick={goBack}
      aria-label="Geri qayıt"
      title="Geri qayıt"
      className="fixed left-3 bottom-20 md:bottom-6 z-40 flex items-center gap-1.5 pl-2.5 pr-3.5 py-2.5 rounded-full bg-card/95 backdrop-blur border border-card-border shadow-lg text-sm font-medium text-foreground hover:border-orange-500/50 hover:text-orange-500 transition-all"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
      </svg>
      Geri
    </button>
  );
}
