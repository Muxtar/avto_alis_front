"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";

/**
 * Desktop "Yeni elan yerləşdir" düyməsi — mobil footer "+" menyusunun
 * desktop qarşılığı. 3 seçim: Fərdi elan / Excel ilə əlavə / Kassa SQL Yüklə.
 * Yalnız md+ ekranda görünür (mobil-də MobileBottomNav işini görür).
 */
export default function AddListingMenu() {
  const { isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [kassaOpen, setKassaOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setKassaOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const close = () => { setOpen(false); setKassaOpen(false); };

  return (
    <div className="hidden md:block relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 brand-gradient rounded-xl text-white text-sm font-semibold hover:brightness-110 transition-all shadow-md shadow-orange-500/25 whitespace-nowrap"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        {t("postNewListing")}
        <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-card-border rounded-xl shadow-xl overflow-hidden z-50">
          {/* Fərdi elan */}
          <Link href={isLoggedIn ? "/account?new=1" : "/"} onClick={close} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-orange-500/10 transition-colors text-foreground">
            <span className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" /></svg>
            </span>
            <span className="font-medium">{t("addSingleListing")}</span>
          </Link>

          {/* Excel ilə elan əlavə et */}
          <Link href={isLoggedIn ? "/account/import" : "/"} onClick={close} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-orange-500/10 transition-colors text-foreground border-t border-card-border">
            <span className="w-8 h-8 rounded-lg bg-green-500/15 text-green-500 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3.75 9.75h16.5m-16.5 4.5h16.5m-13.5-9v13.5m-3.75 0h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /></svg>
            </span>
            <span className="font-medium">{t("excelAddListing")}</span>
          </Link>

          {/* Kassa SQL Yüklə — alt-menyu */}
          <button type="button" onClick={() => setKassaOpen((v) => !v)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-orange-500/10 transition-colors text-foreground border-t border-card-border">
            <span className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            </span>
            <span className="font-medium flex-1 text-left">{t("downloadKassa")}</span>
            <svg className={`w-4 h-4 text-muted transition-transform ${kassaOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {kassaOpen && (
            <div className="bg-input-bg/40">
              <a href="/downloads/AvtoBazar-Kassa-mac.dmg" download onClick={close} className="flex items-center gap-2 pl-14 pr-3 py-2.5 text-sm hover:bg-orange-500/10 text-foreground">
                <span></span><span className="font-medium">{t("downloadForMac")}</span><span className="ml-auto text-[10px] text-muted">.dmg</span>
              </a>
              <div className="flex items-center gap-2 pl-14 pr-3 py-2.5 text-sm opacity-50 cursor-not-allowed">
                <span>🪟</span><span className="font-medium">{t("downloadForWin")}</span><span className="ml-auto text-[10px] text-muted">{t("comingSoon")}</span>
              </div>
              <div className="flex items-center gap-2 pl-14 pr-3 py-2.5 text-sm opacity-50 cursor-not-allowed">
                <span>🐧</span><span className="font-medium">{t("downloadForLinux")}</span><span className="ml-auto text-[10px] text-muted">{t("comingSoon")}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
