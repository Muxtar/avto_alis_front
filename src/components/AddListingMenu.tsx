"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";

/**
 * Desktop "Yeni elan yerləşdir" düyməsi — mobil footer "+" menyusunun
 * desktop qarşılığı. 3 seçim: Fərdi elan / Excel ilə əlavə / Kassa SQL Yüklə.
 *
 * Dropdown PORTAL ilə birbaşa document.body-yə (position: fixed) render olunur ki,
 * heç bir ana elementin stacking-context / overflow-hidden məhdudiyyəti onu
 * kəsməsin (alt-menyu elan kartlarının altında qalmasın). Yalnız md+ ekranda.
 */
export default function AddListingMenu() {
  const { isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const updatePos = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
  };

  const toggle = () => {
    if (!open) updatePos();
    setOpen((v) => !v);
  };

  const close = () => { setOpen(false); };

  useEffect(() => {
    if (!open) return;
    updatePos();
    const reposition = () => updatePos();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      close();
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const menu = (
    <div
      ref={menuRef}
      style={{ position: "fixed", top: pos?.top ?? 0, right: pos?.right ?? 0, zIndex: 1000 }}
      className="umenu w-[290px] max-h-[calc(100vh-5rem)] overflow-y-auto text-foreground"
    >
      <div className="brand-band px-4 py-3">
        <p className="brand-band-kicker">tradixai · yeni elan</p>
        <p className="font-bold text-[14.5px] leading-tight">Necə satacaqsınız?</p>
      </div>
      <div className="p-2 space-y-1.5">
        {/* VÖEN ilə (biznes) */}
        <Link href={isLoggedIn ? "/account?new=1&mode=voen" : "/"} onClick={close} className="wiz-opt-sm group">
          <span className="wiz-ico !mb-0 !w-10 !h-10 !text-lg">🏢</span>
          <span className="flex-1 min-w-0">
            <span className="font-bold text-sm block">VÖEN ilə (biznes)</span>
            <span className="text-[11px] text-muted">Kartla ödəniş, sifariş saytdan</span>
          </span>
          <span className="text-muted group-hover:text-[var(--brand-to)]">›</span>
        </Link>
        {/* VÖEN-siz (fərdi) */}
        <Link href={isLoggedIn ? "/account?new=1&mode=novoen" : "/"} onClick={close} className="wiz-opt-sm group">
          <span className="wiz-ico !mb-0 !w-10 !h-10 !text-lg">👤</span>
          <span className="flex-1 min-w-0">
            <span className="font-bold text-sm block">VÖEN-siz (fərdi)</span>
            <span className="text-[11px] text-muted">Alıcı ilə birbaşa əlaqə</span>
          </span>
          <span className="text-muted group-hover:text-[var(--brand-to)]">›</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="hidden lg:block">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        style={{ boxShadow: "0 10px 22px -12px var(--brand-to)" }}
        className="add-listing-btn inline-flex shrink-0 items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] hover:brightness-110 transition-all whitespace-nowrap"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        {t("postNewListing")}
        <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {mounted && open && createPortal(menu, document.body)}
    </div>
  );
}
