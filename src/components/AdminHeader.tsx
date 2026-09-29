"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { useToast } from "@/components/Toast";

// İrəli səviyyə admin nəzarət başlığı (navbar): qlobal axtarış, gözləyən işlər,
// sürətli əməliyyatlar, canlı statistika və çıxış.
type Overview = {
  stats: { users: number; blockedUsers: number; listings: number; orders: number; businesses: number; couriers: number; revenueTotal: number; revenueToday: number; ordersToday: number; newUsers7d: number; activeConsult: number };
  pending: { listings: number; businesses: number; sellerApps: number; credentials: number; socialLinks: number; complaints: number; returns: number; identity: number };
  pendingTotal: number;
};

const fmt = (n: number) => (n || 0).toLocaleString("de-DE");

const PENDING_LINKS: { key: keyof Overview["pending"]; label: string; href: string }[] = [
  { key: "listings", label: "Yeni elan təsdiqi", href: "/admin/listings" },
  { key: "businesses", label: "Biznes təsdiqi", href: "/admin/businesses" },
  { key: "sellerApps", label: "Satıcı KYC", href: "/admin/seller-applications" },
  { key: "identity", label: "Kimlik yoxlaması", href: "/admin/identity" },
  { key: "credentials", label: "Sənəd təsdiqi", href: "/admin/credentials" },
  { key: "socialLinks", label: "Sosial linklər", href: "/admin/social-links" },
  { key: "complaints", label: "Şikayətlər", href: "/admin/complaints" },
  { key: "returns", label: "Qaytarmalar", href: "/admin/returns" },
];

export default function AdminHeader({ overview, adminName, onRefresh, onLogout, collapsed, onToggleSidebar }: {
  overview: Overview | null;
  adminName: string;
  onRefresh: () => void;
  onLogout: () => void;
  /** Sidebar dar rejimdədir (yalnız ikonlar). */
  collapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const debRef = useRef<any>(null);

  const headers = () => ({ Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`, "Content-Type": "application/json" });

  const runSearch = useCallback((term: string) => {
    if (!term.trim()) { setResults(null); return; }
    setSearching(true);
    fetch(`${API}/admin/search?q=${encodeURIComponent(term.trim())}`, { headers: headers() })
      .then((r) => r.json()).then((d) => setResults(d.results || null)).catch(() => {}).finally(() => setSearching(false));
  }, []);

  useEffect(() => {
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => runSearch(q), 250);
    return () => clearTimeout(debRef.current);
  }, [q, runSearch]);

  const reactivateExpired = async () => {
    setActionsOpen(false);
    try {
      const r = await fetch(`${API}/admin/listings/reactivate-expired`, { method: "POST", headers: headers() }).then((x) => x.json());
      toast(r.success ? "Vaxtı bitmiş elanlar uzadıldı ✓" : (r.message || "Xəta"), r.success ? "success" : "error");
      onRefresh();
    } catch { toast("Xəta", "error"); }
  };

  const totalPending = overview?.pendingTotal || 0;
  const s = overview?.stats;

  // Admin sahəsi dəqiq ekran hündürlüyündədir və daxildə sürüşür — başlıq
  // onsuz da yuxarıda qalır, sticky lazım deyil (sticky olanda yuxarıda
  // 64px boşluq qalıb məzmun oradan görünürdü).
  // Admin sahəsi dəqiq ekran hündürlüyündədir və daxildə sürüşür — başlıq
  // onsuz da yuxarıda qalır, sticky lazım deyil.
  // Dizayn: saytın header-i ilə eyni dil — tünd fon, brend parıltısı, şüşə düymələr.
  return (
    <header className="nav-modern relative isolate shrink-0 z-30 text-white">
      <div className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-2.5">
        {/* Sidebar düyməsi + loqo */}
        {onToggleSidebar && (
          <button onClick={onToggleSidebar} title={collapsed ? "Menyunu genişlət" : "Menyunu daralt"} aria-label="Menyu"
            className="nav-glass shrink-0 w-10 h-10 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6.75h16.5M3.75 12h10.5m-10.5 5.25h16.5" />}
            </svg>
          </button>
        )}
        <Link href="/admin" className="flex items-center gap-2 shrink-0 mr-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tradixai-icon.svg" alt="tradixai" className="w-9 h-9 rounded-xl shrink-0" />
          <span className="hidden md:flex flex-col leading-none">
            <span className="nav-wordmark text-xl font-extrabold tracking-tight">tradixai</span>
            <span className="text-[9px] font-bold tracking-[.2em] uppercase text-white/60 mt-0.5">admin panel</span>
          </span>
        </Link>

        {/* Qlobal axtarış */}
        <div className="relative flex-1 min-w-0 max-w-xl">
          <div className="nav-search relative bg-white rounded-2xl">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" /></svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Axtar: istifadəçi, elan, biznes, sifariş №..."
              className="w-full pl-9 pr-3 py-2.5 bg-transparent rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          {q.trim() && (
            <>
              <div className="fixed inset-0 z-[39]" onClick={() => setQ("")} />
              <div className="umenu absolute z-[40] mt-2 left-0 right-0 max-h-[70vh] overflow-y-auto p-1.5 text-foreground">
                {searching && !results ? (
                  <p className="text-xs text-muted text-center py-4">Axtarılır…</p>
                ) : results && (results.users.length + results.listings.length + results.businesses.length + results.orders.length) === 0 ? (
                  <p className="text-xs text-muted text-center py-4">Nəticə yoxdur</p>
                ) : results ? (
                  <div className="space-y-0.5 text-sm">
                    {results.users.map((u: any) => (
                      <Link key={`u${u.id}`} href="/admin/users" onClick={() => setQ("")} className="umenu-item">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 shrink-0 font-semibold">İstifadəçi</span>
                        <span className="truncate flex-1">{u.name} <span className="text-muted text-xs">· {u.phone}</span></span>
                        {u.isBlocked && <span className="text-[10px] text-red-500 shrink-0">bloklu</span>}
                        <span className="text-[10px] text-muted shrink-0">№{u.id}</span>
                      </Link>
                    ))}
                    {results.listings.map((l: any) => (
                      <Link key={`l${l.id}`} href="/admin/listings" onClick={() => setQ("")} className="umenu-item">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--brand-soft)] text-[var(--brand-to)] shrink-0 font-semibold">Elan</span>
                        <span className="truncate flex-1">{l.title}</span>
                        <span className="text-[10px] text-muted shrink-0">{fmt(l.price)} AZN · №{l.id}</span>
                      </Link>
                    ))}
                    {results.businesses.map((b: any) => (
                      <Link key={`b${b.id}`} href="/admin/businesses" onClick={() => setQ("")} className="umenu-item">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 shrink-0 font-semibold">Biznes</span>
                        <span className="truncate flex-1">{b.name} <span className="text-muted text-xs">· VÖEN {b.voen}</span></span>
                        <span className="text-[10px] text-muted shrink-0">{b.status}</span>
                      </Link>
                    ))}
                    {results.orders.map((o: any) => (
                      <Link key={`o${o.id}`} href="/admin/orders" onClick={() => setQ("")} className="umenu-item">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-500 shrink-0 font-semibold">Sifariş</span>
                        <span className="truncate flex-1">№{o.id} · {o.status}</span>
                        <span className="text-[10px] text-muted shrink-0">{fmt(o.total)} AZN · {o.paymentStatus}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Canlı statistika (geniş ekran) */}
        {s && (
          <div className="hidden xl:flex items-center gap-1.5 text-xs font-semibold">
            <span className="nav-glass rounded-xl px-2.5 py-2" title="Bugünkü gəlir">💰 {fmt(s.revenueToday)} AZN</span>
            <span className="nav-glass rounded-xl px-2.5 py-2" title="Bugünkü sifarişlər">🧾 {s.ordersToday}</span>
            <span className="nav-glass rounded-xl px-2.5 py-2" title="7 gündə yeni istifadəçi">👥 +{s.newUsers7d}</span>
          </div>
        )}

        {/* Gözləyən işlər */}
        <div className="relative shrink-0">
          <button onClick={() => { setPendingOpen((v) => !v); setActionsOpen(false); }} title="Gözləyən işlər" className={`nav-glass relative w-10 h-10 flex items-center justify-center ${pendingOpen ? "is-on" : ""}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
            {totalPending > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-[var(--nav-dark)]">{totalPending}</span>}
          </button>
          {pendingOpen && (
            <>
              <div className="fixed inset-0 z-[39]" onClick={() => setPendingOpen(false)} />
              <div className="umenu absolute right-0 mt-2 z-[40] w-72 max-sm:fixed max-sm:inset-x-2 max-sm:top-14 max-sm:w-auto max-sm:max-h-[70vh] max-sm:overflow-y-auto text-foreground pb-2">
                <div className="brand-band px-4 py-3 mb-1.5">
                  <p className="brand-band-kicker">tradixai · admin</p>
                  <p className="text-[14px] font-bold leading-tight">Gözləyən işlər <span className="opacity-80">· {totalPending}</span></p>
                </div>
                {PENDING_LINKS.map((p) => (
                  <Link key={p.key} href={p.href} onClick={() => setPendingOpen(false)} className="umenu-item justify-between">
                    <span>{p.label}</span>
                    <span className={`min-w-[22px] text-center text-[11px] font-bold px-1.5 py-0.5 rounded-full ${overview?.pending[p.key] ? "bg-rose-500 text-white" : "bg-input-bg text-muted"}`}>{overview?.pending[p.key] ?? 0}</span>
                  </Link>
                ))}
                {totalPending === 0 && <p className="text-xs text-emerald-600 text-center py-2">✓ Gözləyən iş yoxdur</p>}
              </div>
            </>
          )}
        </div>

        {/* Sürətli əməliyyatlar */}
        <div className="relative shrink-0">
          <button onClick={() => { setActionsOpen((v) => !v); setPendingOpen(false); }} title="Sürətli əməliyyatlar" className={`nav-glass w-10 h-10 flex items-center justify-center ${actionsOpen ? "is-on" : ""}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
          </button>
          {actionsOpen && (
            <>
              <div className="fixed inset-0 z-[39]" onClick={() => setActionsOpen(false)} />
              <div className="umenu absolute right-0 mt-2 z-[40] w-64 max-sm:fixed max-sm:inset-x-2 max-sm:top-14 max-sm:w-auto py-2 text-foreground">
                <p className="adm-group !pt-1">Sürətli əməliyyatlar</p>
                <button onClick={() => { setActionsOpen(false); router.push("/admin/broadcast"); }} className="umenu-item w-[calc(100%-16px)]"><span className="w-4">📢</span>Bildiriş göndər</button>
                <button onClick={reactivateExpired} className="umenu-item w-[calc(100%-16px)]"><span className="w-4">♻️</span>Vaxtı bitmiş elanları uzat</button>
                <button onClick={() => { setActionsOpen(false); router.push("/admin/promo"); }} className="umenu-item w-[calc(100%-16px)]"><span className="w-4">🎟️</span>Promo kodları</button>
                <button onClick={() => { setActionsOpen(false); onRefresh(); }} className="umenu-item w-[calc(100%-16px)]"><span className="w-4">🔄</span>Yenilə</button>
              </div>
            </>
          )}
        </div>

        {/* Satış sayta keçid — admin işləyərkən saytın özünə baxa bilsin. */}
        <Link href="/elanlar" title="Satış səhifəsinə keç"
          className="nav-glass shrink-0 hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-semibold">
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
          <span className="hidden md:inline">Sayta bax</span>
        </Link>

        {/* Admin */}
        <div className="hidden sm:flex items-center gap-2 shrink-0 pl-1" title={adminName}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] shadow-[0_6px_16px_-8px_var(--brand-to)] ring-1 ring-white/20">{(adminName || "A").slice(0, 2).toUpperCase()}</div>
          <span className="hidden lg:flex flex-col leading-tight">
            <span className="text-sm font-semibold max-w-[120px] truncate">{adminName}</span>
            <span className="text-[10px] text-white/60">administrator</span>
          </span>
        </div>
        <button onClick={onLogout} title="Çıxış" className="nav-glass shrink-0 w-10 h-10 hidden sm:flex items-center justify-center !text-rose-300 hover:!text-white hover:!bg-rose-500/80">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
        </button>
      </div>
    </header>
  );
}
