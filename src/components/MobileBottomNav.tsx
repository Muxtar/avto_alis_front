"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";

/**
 * Bottom navigation bar shown only on mobile (< md):
 * Əsas · Seçilmişlər · AI Chat (mərkəzi böyük) · Mesajlarım · Profil.
 * Mərkəzi düymə qlobal InquiryChatbot-u açır (səhifə deyil).
 * Hidden on desktop (md+) so the existing top navbar remains primary.
 */
export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const { t } = useLanguage();

  // Hide on auth screens to avoid clutter while typing.
  if (pathname === "/" || pathname === "/verify" || pathname?.startsWith("/admin/login")) return null;

  const openChat = () => window.dispatchEvent(new Event("toggle-inquiry-chat"));

  const items = [
    {
      href: "/marketplace",
      label: t("homeNav") || "Əsas",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 21h18M3 7l9-4 9 4M5 21V11m14 10V11M9 21v-6h6v6" />
        </svg>
      ),
    },
    {
      href: "/favorites",
      label: t("favorites") || "Seçilmişlər",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
    {
      // AI Chat — mərkəzi böyük düymə; səhifə açmır, chatbot-u açır.
      action: openChat,
      label: t("aiChatNav") || "AI Söhbət",
      isPrimary: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      href: isLoggedIn ? "/messages" : "/",
      label: t("myMessages") || "Mesajlarım",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      ),
    },
    {
      href: isLoggedIn ? "/profile" : "/",
      label: t("profile") || "Profil",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bottom-nav md:hidden" aria-label="bottom-nav">
      {items.map((item, idx) => {
        const active = item.href ? (pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))) : false;

        if (item.isPrimary) {
          return (
            <button
              key={idx}
              type="button"
              onClick={item.action}
              className="flex flex-col items-center justify-center"
              aria-label={item.label}
            >
              <span className="-mt-5 w-12 h-12 brand-gradient rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                {item.icon}
              </span>
              <span className="text-[10px] mt-0.5 text-muted">{item.label}</span>
            </button>
          );
        }

        return (
          <Link key={idx} href={item.href!} className={active ? "active" : ""}>
            <span className="relative">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
