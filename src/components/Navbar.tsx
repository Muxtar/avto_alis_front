"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { Locale } from "@/lib/translations";
import { API } from "@/lib/api";
import NotificationBell from "@/components/NotificationBell";

const languages: { code: Locale; label: string; flag: string }[] = [
  { code: "az", label: "AZ", flag: "🇦🇿" },
  { code: "ru", label: "RU", flag: "🇷🇺" },
  { code: "en", label: "EN", flag: "🇬🇧" },
];

export default function Navbar() {
  const { locale, setLocale, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, token, isLoggedIn, logout } = useAuth();
  const { cartCount } = useCart();
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadInquiries, setUnreadInquiries] = useState(0);
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(() => {
    if (!token || !isLoggedIn) return;
    fetch(`${API}/messages-unread`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUnreadMessages(d.count || 0)).catch(() => {});
    fetch(`${API}/inquiries/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUnreadInquiries(d.count || 0)).catch(() => {});
  }, [token, isLoggedIn]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000); // hər 8 saniyə (real-time hissi)
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const totalUnread = unreadMessages + unreadInquiries;

  useEffect(() => {
    setMounted(true);
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = languages.find((l) => l.code === locale)!;

  return (
    <nav className="border-b border-card-border glass sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          <a href="/marketplace" className="flex items-center gap-2 shrink-0 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 brand-gradient rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm text-white shadow-md shadow-orange-500/30 group-hover:scale-105 transition-transform">
              AB
            </div>
            <span className="text-lg sm:text-xl font-bold brand-text tracking-tight hidden xs:inline">
              AvtoBazar
            </span>
          </a>

          <div className="hidden sm:flex items-center gap-1 px-2 sm:px-4">
            <Link href="/marketplace" className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-muted hover:text-foreground hover:bg-input-bg transition-all whitespace-nowrap">
              {t("marketplace")}
            </Link>
            <Link
              href="/locations"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-muted hover:text-foreground hover:bg-input-bg transition-all whitespace-nowrap"
              title={t('locationsTitle')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {t('browseByLocation')}
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Theme */}
            <button onClick={toggleTheme} suppressHydrationWarning className="p-2 sm:p-2.5 bg-input-bg border border-input-border rounded-lg sm:rounded-xl hover:opacity-80 transition-all" title={mounted ? (theme === "dark" ? "Light" : "Dark") : ""}>
              {!mounted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : theme === "dark" ? (
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>

            {/* Language */}
            <div ref={langRef} className="relative">
              <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 bg-input-bg border border-input-border rounded-lg sm:rounded-xl hover:opacity-80 transition-all text-sm">
                <span className="text-sm">{current.flag}</span>
                <span className="font-medium text-xs sm:text-sm">{current.label}</span>
                <svg className={`w-3 h-3 text-muted transition-transform ${langOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-2 w-32 sm:w-36 max-w-[calc(100vw-1.5rem)] bg-card border border-card-border rounded-xl shadow-xl overflow-hidden z-50">
                  {languages.map((lang) => (
                    <button key={lang.code} onClick={() => { setLocale(lang.code); setLangOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 text-sm transition-colors ${locale === lang.code ? "bg-orange-500/10 text-orange-500" : "hover:bg-input-bg text-foreground"}`}>
                      <span>{lang.flag}</span><span className="font-medium">{lang.label}</span>
                      {locale === lang.code && <svg className="w-4 h-4 ml-auto text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            {isLoggedIn && <NotificationBell />}

            {/* Cart Icon */}
            {isLoggedIn && (
              <Link href="/cart" className="relative p-2 sm:p-2.5 bg-input-bg border border-input-border rounded-lg sm:rounded-xl hover:opacity-80 transition-all" title={t("cart")}>
                <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* User Menu */}
            {isLoggedIn ? (
              <div ref={userRef} className="relative">
                <button onClick={() => setUserOpen(!userOpen)}
                  className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 brand-gradient rounded-lg sm:rounded-xl text-white text-xs sm:text-sm font-medium hover:brightness-110 transition-all shadow-md shadow-orange-500/20">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  <span className="hidden sm:inline max-w-[80px] truncate">{user?.name}</span>
                  {totalUnread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 ring-2 ring-card text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse-soft">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                </button>
                {userOpen && (
                  <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-card border border-card-border rounded-xl shadow-xl overflow-hidden z-50 max-h-[calc(100vh-5rem)] overflow-y-auto">
                    <div className="px-4 py-3 border-b border-card-border">
                      <p className="font-medium text-sm truncate">{user?.name}</p>
                      <p className="text-muted text-xs">{user?.phone}</p>
                    </div>
                    <Link href="/profile" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                      <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      {t("profile")}
                    </Link>
                    <Link href="/account" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                      <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                      {t("myListings")}
                    </Link>
                    {(user?.type === "MECHANIC" || user?.type === "PARTS_SELLER") && !user?.sellerVerified && (
                      <Link href="/seller/apply" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-amber-500 font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        {t("becomeSeller")}
                      </Link>
                    )}
                    <Link href="/messages" onClick={() => setUserOpen(false)} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                        {t("messages")}
                      </span>
                      {unreadMessages > 0 && <span className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">{unreadMessages}</span>}
                    </Link>
                    <Link href="/cart" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                      <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                      {t("cart")}
                    </Link>
                    <Link href="/favorites" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                      <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                      {t("favorites")}
                    </Link>
                    <Link href="/addresses" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                      <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                      {t("myAddresses")}
                    </Link>
                    <Link href="/orders" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                      <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      {t("orders")}
                    </Link>
                    <Link href="/inquiries" onClick={() => setUserOpen(false)} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                        {t("inquiries")}
                      </span>
                      {unreadInquiries > 0 && <span className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">{unreadInquiries}</span>}
                    </Link>
                    {user?.role === "ADMIN" && (
                      <Link href="/admin" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-orange-500 font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                        {t("adminPanel")}
                      </Link>
                    )}
                    <button onClick={() => { logout(); setUserOpen(false); }} className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors w-full">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                      {t("logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/" className="px-3 sm:px-4 py-1.5 sm:py-2 brand-gradient rounded-lg sm:rounded-xl text-white text-xs sm:text-sm font-medium hover:brightness-110 transition-all shadow-md shadow-orange-500/20 whitespace-nowrap">
                {t("loginRequired")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
