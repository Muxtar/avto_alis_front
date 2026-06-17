"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";

// Kassa SQL installer-ləri GitHub Releases-də (repo/tag dəyişsə bu sətri yenilə).
const KASSA_RELEASE = "https://github.com/Muxtar/kassa_sql/releases/download/kassa-v0.1.0";

/**
 * Bottom navigation bar shown only on mobile (< md):
 * Əsas · ＋(menu) · AI Söhbət (mərkəzi böyük) · Mesajlarım · Profil.
 *  - "＋" düyməsi 3 seçimli menyu açır: Fərdi elan / Excel ilə əlavə / Kassa SQL yüklə.
 *  - Mərkəzi düymə qlobal InquiryChatbot-u açır.
 * Hidden on desktop (md+) so the existing top navbar remains primary.
 */
export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const [plusOpen, setPlusOpen] = useState(false);
  const [kassaOpen, setKassaOpen] = useState(false);

  // Hide on auth screens to avoid clutter while typing.
  if (pathname === "/" || pathname === "/verify" || pathname?.startsWith("/admin/login")) return null;

  const openChat = () => window.dispatchEvent(new Event("toggle-inquiry-chat"));
  const closeMenu = () => { setPlusOpen(false); setKassaOpen(false); };

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname?.startsWith(href));

  const HomeIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 21h18M3 7l9-4 9 4M5 21V11m14 10V11M9 21v-6h6v6" />
    </svg>
  );
  const ChatIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  );
  const MsgIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
  const ProfileIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );

  const menuItem = "flex items-center gap-3 px-4 py-3 text-sm hover:bg-orange-500/10 transition-colors w-full text-left";

  return (
    <>
      {/* ＋ menyu və backdrop */}
      {plusOpen && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={closeMenu} />
          <div className="fixed bottom-20 left-3 z-50 w-64 bg-card border border-card-border rounded-2xl shadow-2xl overflow-hidden md:hidden">
            <Link href={isLoggedIn ? "/account?new=1" : "/"} onClick={closeMenu} className={menuItem}>
              <span className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" /></svg>
              </span>
              <span className="font-medium">{t("addSingleListing")}</span>
            </Link>

            <Link href={isLoggedIn ? "/account/import" : "/"} onClick={closeMenu} className={`${menuItem} border-t border-card-border`}>
              <span className="w-9 h-9 rounded-xl bg-green-500/15 text-green-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3.75 9.75h16.5m-16.5 4.5h16.5m-13.5-9v13.5m-3.75 0h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" /></svg>
              </span>
              <span className="font-medium">{t("excelAddListing")}</span>
            </Link>

            {/* Kassa SQL — alt menyu (win/linux/mac) */}
            <button type="button" onClick={() => setKassaOpen((v) => !v)} className={`${menuItem} border-t border-card-border`}>
              <span className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              </span>
              <span className="font-medium flex-1">{t("downloadKassa")}</span>
              <svg className={`w-4 h-4 text-muted transition-transform ${kassaOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {kassaOpen && (
              <div className="bg-input-bg/40">
                <a href={`${KASSA_RELEASE}/AvtoBazar-Kassa-0.1.0-mac.dmg`} onClick={closeMenu} className="flex items-center gap-2 pl-16 pr-4 py-2.5 text-sm hover:bg-orange-500/10">
                  <span></span><span className="font-medium">{t("downloadForMac")}</span><span className="ml-auto text-[10px] text-muted">.dmg</span>
                </a>
                <a href={`${KASSA_RELEASE}/AvtoBazar-Kassa-0.1.0-win.exe`} onClick={closeMenu} className="flex items-center gap-2 pl-16 pr-4 py-2.5 text-sm hover:bg-orange-500/10">
                  <span>🪟</span><span className="font-medium">{t("downloadForWin")}</span><span className="ml-auto text-[10px] text-muted">.exe</span>
                </a>
                <a href={`${KASSA_RELEASE}/AvtoBazar-Kassa-0.1.0-linux.AppImage`} onClick={closeMenu} className="flex items-center gap-2 pl-16 pr-4 py-2.5 text-sm hover:bg-orange-500/10">
                  <span>🐧</span><span className="font-medium">{t("downloadForLinux")}</span><span className="ml-auto text-[10px] text-muted">.AppImage</span>
                </a>
              </div>
            )}
          </div>
        </>
      )}

      <nav className="bottom-nav md:hidden" aria-label="bottom-nav">
        <Link href="/elanlar" className={isActive("/elanlar") || isActive("/marketplace") ? "active" : ""}>
          <span className="relative">{HomeIcon}</span>
          <span>{t("homeNav") || "Əsas"}</span>
        </Link>

        {/* ＋ menyu trigger */}
        <button
          type="button"
          onClick={() => setPlusOpen((v) => !v)}
          className={plusOpen ? "active" : ""}
          aria-label={t("addListing") || "Əlavə et"}
        >
          <span className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" /></svg>
          </span>
          <span>{t("addListing") || "Əlavə"}</span>
        </button>

        {/* AI Söhbət — mərkəzi böyük */}
        <button type="button" onClick={openChat} className="flex flex-col items-center justify-center" aria-label={t("aiChatNav") || "AI Söhbət"}>
          <span className="-mt-5 w-12 h-12 brand-gradient rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            {ChatIcon}
          </span>
          <span className="text-[10px] mt-0.5 text-muted">{t("aiChatNav") || "AI Söhbət"}</span>
        </button>

        <Link href={isLoggedIn ? "/messages" : "/"} className={isActive("/messages") ? "active" : ""}>
          <span className="relative">{MsgIcon}</span>
          <span>{t("myMessages") || "Mesajlarım"}</span>
        </Link>

        <Link href={isLoggedIn ? "/profile" : "/"} className={isActive("/profile") ? "active" : ""}>
          <span className="relative">{ProfileIcon}</span>
          <span>{t("profile") || "Profil"}</span>
        </Link>
      </nav>
    </>
  );
}
