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
  pending: { listings: number; businesses: number; sellerApps: number; credentials: number; socialLinks: number; complaints: number; returns: number };
  pendingTotal: number;
};

const fmt = (n: number) => (n || 0).toLocaleString("de-DE");

const PENDING_LINKS: { key: keyof Overview["pending"]; label: string; href: string }[] = [
  { key: "listings", label: "Yeni elan təsdiqi", href: "/admin/listings" },
  { key: "businesses", label: "Biznes təsdiqi", href: "/admin/businesses" },
  { key: "sellerApps", label: "Satıcı KYC", href: "/admin/seller-applications" },
  { key: "credentials", label: "Sənəd təsdiqi", href: "/admin/credentials" },
  { key: "socialLinks", label: "Sosial linklər", href: "/admin/social-links" },
  { key: "complaints", label: "Şikayətlər", href: "/admin/complaints" },
  { key: "returns", label: "Qaytarmalar", href: "/admin/returns" },
];

export default function AdminHeader({ overview, adminName, onRefresh, onLogout }: {
  overview: Overview | null;
  adminName: string;
  onRefresh: () => void;
  onLogout: () => void;
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
  return (
    <header className="shrink-0 z-30 bg-card border-b border-card-border">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5">
        {/* Qlobal axtarış */}
        <div className="relative flex-1 max-w-xl">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" /></svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Axtar: istifadəçi, elan, biznes, sifariş №..."
            className="w-full pl-9 pr-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 placeholder-muted-foreground text-foreground"
          />
          {q.trim() && (
            <>
              <div className="fixed inset-0 z-[39]" onClick={() => setQ("")} />
              <div className="absolute z-[40] mt-1 left-0 right-0 bg-card border border-card-border rounded-xl shadow-xl max-h-[70vh] overflow-y-auto p-1.5">
                {searching && !results ? (
                  <p className="text-xs text-muted text-center py-4">Axtarılır…</p>
                ) : results && (results.users.length + results.listings.length + results.businesses.length + results.orders.length) === 0 ? (
                  <p className="text-xs text-muted text-center py-4">Nəticə yoxdur</p>
                ) : results ? (
                  <div className="space-y-1 text-sm">
                    {results.users.map((u: any) => (
                      <Link key={`u${u.id}`} href="/admin/users" onClick={() => setQ("")} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-input-bg">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 shrink-0">İstifadəçi</span>
                        <span className="truncate flex-1">{u.name} <span className="text-muted text-xs">· {u.phone}</span></span>
                        {u.isBlocked && <span className="text-[10px] text-red-500 shrink-0">bloklu</span>}
                        <span className="text-[10px] text-muted shrink-0">№{u.id}</span>
                      </Link>
                    ))}
                    {results.listings.map((l: any) => (
                      <Link key={`l${l.id}`} href="/admin/listings" onClick={() => setQ("")} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-input-bg">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600 shrink-0">Elan</span>
                        <span className="truncate flex-1">{l.title}</span>
                        <span className="text-[10px] text-muted shrink-0">{fmt(l.price)} AZN · №{l.id}</span>
                      </Link>
                    ))}
                    {results.businesses.map((b: any) => (
                      <Link key={`b${b.id}`} href="/admin/businesses" onClick={() => setQ("")} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-input-bg">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-500 shrink-0">Biznes</span>
                        <span className="truncate flex-1">{b.name} <span className="text-muted text-xs">· VÖEN {b.voen}</span></span>
                        <span className="text-[10px] text-muted shrink-0">{b.status}</span>
                      </Link>
                    ))}
                    {results.orders.map((o: any) => (
                      <Link key={`o${o.id}`} href="/admin/orders" onClick={() => setQ("")} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-input-bg">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 shrink-0">Sifariş</span>
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
          <div className="hidden xl:flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1.5 rounded-lg bg-input-bg border border-input-border" title="Bugünkü gəlir">💰 {fmt(s.revenueToday)} AZN</span>
            <span className="px-2.5 py-1.5 rounded-lg bg-input-bg border border-input-border" title="Bugünkü sifarişlər">🧾 {s.ordersToday}</span>
            <span className="px-2.5 py-1.5 rounded-lg bg-input-bg border border-input-border" title="7 gündə yeni istifadəçi">👥 +{s.newUsers7d}</span>
          </div>
        )}

        {/* Gözləyən işlər */}
        <div className="relative shrink-0">
          <button onClick={() => { setPendingOpen((v) => !v); setActionsOpen(false); }} title="Gözləyən işlər" className="relative w-10 h-10 rounded-xl bg-input-bg border border-input-border flex items-center justify-center hover:border-teal-500/50 transition-colors">
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
            {totalPending > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{totalPending}</span>}
          </button>
          {pendingOpen && (
            <>
              <div className="fixed inset-0 z-[39]" onClick={() => setPendingOpen(false)} />
              <div className="absolute right-0 mt-1 z-[40] w-64 bg-card border border-card-border rounded-xl shadow-xl p-2">
                <p className="text-xs font-semibold px-2 py-1.5 text-muted">Gözləyən işlər</p>
                {PENDING_LINKS.map((p) => (
                  <Link key={p.key} href={p.href} onClick={() => setPendingOpen(false)} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-input-bg text-sm">
                    <span>{p.label}</span>
                    <span className={`min-w-[20px] text-center text-[11px] font-bold px-1.5 py-0.5 rounded-full ${overview?.pending[p.key] ? "bg-red-500 text-white" : "bg-input-bg text-muted"}`}>{overview?.pending[p.key] ?? 0}</span>
                  </Link>
                ))}
                {totalPending === 0 && <p className="text-xs text-green-500 text-center py-2">✓ Gözləyən iş yoxdur</p>}
              </div>
            </>
          )}
        </div>

        {/* Sürətli əməliyyatlar */}
        <div className="relative shrink-0">
          <button onClick={() => { setActionsOpen((v) => !v); setPendingOpen(false); }} title="Sürətli əməliyyatlar" className="w-10 h-10 rounded-xl bg-input-bg border border-input-border flex items-center justify-center hover:border-teal-500/50 transition-colors text-lg">⚡</button>
          {actionsOpen && (
            <>
              <div className="fixed inset-0 z-[39]" onClick={() => setActionsOpen(false)} />
              <div className="absolute right-0 mt-1 z-[40] w-56 bg-card border border-card-border rounded-xl shadow-xl p-1.5 text-sm">
                <button onClick={() => { setActionsOpen(false); router.push("/admin/broadcast"); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-input-bg">📢 Bildiriş göndər</button>
                <button onClick={reactivateExpired} className="w-full text-left px-3 py-2 rounded-lg hover:bg-input-bg">♻️ Vaxtı bitmiş elanları uzat</button>
                <button onClick={() => { setActionsOpen(false); router.push("/admin/promo"); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-input-bg">🎟️ Promo kodları</button>
                <button onClick={() => { setActionsOpen(false); onRefresh(); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-input-bg">🔄 Yenilə</button>
              </div>
            </>
          )}
        </div>

        {/* Satış sayta keçid — admin işləyərkən saytın özünə baxa bilsin.
            adminToken localStorage-da qaldığı üçün saytda "Admin panel"
            düyməsi görünəcək və bir kliklə geri qayıda biləcək. */}
        <Link href="/elanlar" title="Satış səhifəsinə keç"
          className="shrink-0 flex items-center gap-1.5 h-10 px-3 rounded-xl bg-input-bg border border-input-border text-sm font-semibold hover:border-[var(--brand-to)] hover:text-[var(--brand-to)] transition-colors">
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
          <span className="hidden md:inline">Sayta bax</span>
        </Link>

        {/* Admin + çıxış */}
        <div className="hidden sm:flex items-center gap-2 shrink-0 pl-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">{(adminName || "A").slice(0, 2).toUpperCase()}</div>
          <span className="text-sm font-medium max-w-[120px] truncate">{adminName}</span>
        </div>
        <button onClick={onLogout} title="Çıxış" className="shrink-0 w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
        </button>
      </div>
    </header>
  );
}
