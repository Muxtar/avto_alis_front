"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useCart } from "@/lib/CartContext";

/**
 * Bottom navigation bar shown only on mobile (< md). Provides one-tap
 * access to the most-used flows — search, favorites, post, cart, profile.
 * Hidden on desktop (md+) so the existing top navbar remains primary.
 */
export default function MobileBottomNav() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const { cartCount } = useCart();

  // Hide on auth screens to avoid clutter while typing.
  if (pathname === "/" || pathname === "/verify" || pathname?.startsWith("/admin/login")) return null;

  const items = [
    {
      href: "/marketplace",
      label: t("marketplace") || "Bazar",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 21h18M3 7l9-4 9 4M5 21V11m14 10V11M9 21v-6h6v6" />
        </svg>
      ),
    },
    {
      href: "/favorites",
      label: t("favorites") || "Sevimlilər",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
    {
      href: isLoggedIn ? "/account" : "/",
      label: t("addListing") || "Əlavə",
      isPrimary: true,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      href: "/cart",
      label: t("cart") || "Səbət",
      badge: cartCount > 0 ? cartCount : undefined,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
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
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
        if (item.isPrimary) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center"
            >
              <span className="-mt-5 w-12 h-12 brand-gradient rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
                {item.icon}
              </span>
              <span className="text-[10px] mt-0.5 text-muted">{item.label}</span>
            </Link>
          );
        }
        return (
          <Link key={item.href} href={item.href} className={active ? "active" : ""}>
            <span className="relative">
              {item.icon}
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
