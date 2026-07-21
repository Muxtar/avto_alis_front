"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { Locale } from "@/lib/translations";
import { API } from "@/lib/api";
import NotificationBell from "@/components/NotificationBell";
import { CATEGORIES, slugify } from "@/lib/categories";
import CategoryIcon, { SubCategoryIcon } from "@/components/CategoryIcon";

const languages: { code: Locale; label: string; flag: string }[] = [
  { code: "az", label: "AZ", flag: "🇦🇿" },
  { code: "ru", label: "RU", flag: "🇷🇺" },
  { code: "en", label: "EN", flag: "🇬🇧" },
];

// Vahid brend rəngi (globals.css orange-* remap ilə eyni — logo mavisi (#2f6bff)).
const PINK = "#2f6bff";

export default function Navbar() {
  const { locale, setLocale, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, token, isLoggedIn, logout } = useAuth();
  const { cartCount } = useCart();
  const router = useRouter();
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false); // Məndən gedənlər (alışlar)
  const [inOpen, setInOpen] = useState(false);   // Məndən gələnlər (satışlar)
  const [catOpen, setCatOpen] = useState(false);
  const [catHover, setCatHover] = useState<{ cat: any; top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [imgBusy, setImgBusy] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  // İnternet (Claude web search) nəticələri — axtarış sahəsinin altındakı pencere
  const [webOpen, setWebOpen] = useState(false);
  const [webLoading, setWebLoading] = useState(false);
  const [webQuery, setWebQuery] = useState("");
  const [webData, setWebData] = useState<{ summary: string; results: { title: string; url: string; snippet: string }[] } | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadInquiries, setUnreadInquiries] = useState(0);
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(() => {
    if (!token || !isLoggedIn) return;
    fetch(`${API}/messages-unread`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUnreadMessages(d.count || 0)).catch(() => {});
    fetch(`${API}/inquiries/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUnreadInquiries(d.count || 0)).catch(() => {});
  }, [token, isLoggedIn]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const totalUnread = unreadMessages + unreadInquiries;

  useEffect(() => {
    setMounted(true);
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (catRef.current && !catRef.current.contains(e.target as Node)) { setCatOpen(false); setCatHover(null); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Axtarış: əvvəlcə sayt daxili. Saytda heç nə tapılmasa, Claude-un internet
  // axtarışı işə düşür və nəticələr axtarış sahəsinin altında açılır.
  const submitSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = search.trim();
    setWebOpen(false);
    setWebData(null);
    router.push(`/elanlar${q ? `?search=${encodeURIComponent(q)}` : ""}`);
    if (!q) return;

    try {
      const r = await fetch(`${API}/listings?search=${encodeURIComponent(q)}&limit=1`);
      const d = await r.json();
      const found = (d?.listings?.length ?? 0) > 0 || (d?.total ?? 0) > 0;
      if (found) return;
    } catch {
      return; // sayt axtarışı alınmadısa internetə keçmirik
    }

    if (!isLoggedIn || !token) return; // internet axtarışı yalnız daxil olanlar üçün
    setWebOpen(true);
    setWebLoading(true);
    setWebQuery(q);
    try {
      const res = await fetch(`${API}/search/web`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) setWebData({ summary: data.message || "İnternetdə də nəticə tapılmadı.", results: [] });
      else setWebData({ summary: data.summary || "", results: data.results || [] });
    } catch {
      setWebData({ summary: "İnternet axtarışı alınmadı.", results: [] });
    } finally {
      setWebLoading(false);
    }
  };

  // Şəkillə axtarış — şəkil serverə göndərilir, AI məhsulu tanıyır və
  // qaytardığı sorğu ilə birbaşa elanlar səhifəsinə keçirik.
  const searchByImage = async (file: File) => {
    if (!isLoggedIn || !token) {
      alert("Şəkillə axtarış üçün hesabınıza daxil olun.");
      return;
    }
    if (!/^image\//.test(file.type)) return;
    setImgBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API}/search/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.searchQuery) {
        alert(data.message || "Şəkil tanınmadı. Yenidən cəhd edin.");
        return;
      }
      setSearch(data.searchQuery);
      router.push(`/elanlar?search=${encodeURIComponent(data.searchQuery)}`);
    } catch {
      alert("Şəkilli axtarış alınmadı. İnternet bağlantınızı yoxlayın.");
    } finally {
      setImgBusy(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  };

  const current = languages.find((l) => l.code === locale)!;

  return (
    <header className="sticky top-0 z-50">
      {/* ── Yuxarı utility bar ── */}
      <div className="hidden md:block relative z-20 bg-input-bg/80 backdrop-blur border-b border-card-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9 text-xs">
            <div className="flex items-center gap-4">
              <Link href="/elanlar" className="text-muted hover:text-foreground transition-colors">{t("marketplace")}</Link>
              <Link href="/locations" className="text-muted hover:text-foreground transition-colors">{t("browseByLocation")}</Link>
              {isLoggedIn && <Link href="/consultations" className="text-muted hover:text-foreground transition-colors">🗣️ Konsultasiya</Link>}
              <Link href={isLoggedIn ? "/account?new=1" : "/"} className="px-2.5 py-1 rounded-md text-white font-semibold hover:opacity-90 transition-opacity" style={{ background: PINK }}>tradixai-də sat</Link>
            </div>
            <div className="flex items-center gap-3">
              {/* Theme */}
              <button onClick={toggleTheme} suppressHydrationWarning className="text-muted hover:text-foreground transition-colors" title={mounted ? (theme === "dark" ? "Light" : "Dark") : ""}>
                {!mounted ? null : theme === "dark" ? (
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>
              {/* Language */}
              <div ref={langRef} className="relative">
                <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1.5 text-muted hover:text-foreground transition-colors">
                  <span>{current.flag}</span><span className="font-medium">{current.label}</span>
                  <svg className={`w-3 h-3 transition-transform ${langOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-card border border-card-border rounded-xl shadow-xl overflow-hidden z-50">
                    {languages.map((lang) => (
                      <button key={lang.code} onClick={() => { setLocale(lang.code); setLangOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${locale === lang.code ? "bg-input-bg text-foreground" : "hover:bg-input-bg text-foreground"}`}>
                        <span>{lang.flag}</span><span className="font-medium">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Əsas başlıq ── */}
      <div className="relative z-10 bg-card border-b border-card-border">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-4 h-[68px] sm:h-20">
            {/* Logo */}
            <Link href="/elanlar" className="flex items-center gap-2 shrink-0 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tradixai-icon.svg" alt="tradixai" className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0" />
              {/* Telefon ölçüsündə yalnız ikon — ana səhifəyə qayıtmaq üçün kifayətdir,
                  qalan yer axtarış sahəsinə verilir. */}
              <span className="hidden sm:inline text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: PINK }}>tradixai</span>
            </Link>

            {/* Şəhər */}
            <Link href="/locations" className="hidden lg:flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors shrink-0">
              <svg className="w-4 h-4" style={{ color: PINK }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
              <span>Şəhər: <b className="text-foreground">Bakı</b></span>
            </Link>

            {/* Kataloq — kateqoriya menyusu */}
            <div ref={catRef} className="relative hidden sm:block shrink-0">
              <button onClick={() => { setCatOpen((v) => !v); setCatHover(null); }} className="flex items-center gap-2 px-5 h-13 rounded-xl text-white font-semibold text-[15px] hover:opacity-90 transition-opacity" style={{ background: PINK }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                {t("navCatalog")}
                <svg className={`w-4 h-4 transition-transform ${catOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {catOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-card border border-card-border rounded-xl shadow-xl z-50 py-1 max-h-[70vh] overflow-y-auto" onMouseLeave={() => setCatHover(null)}>
                  {CATEGORIES.map((c) => {
                    const hasSubs = c.subs && c.subs.length > 0;
                    return (
                      <Link key={c.name} href={`/elanlar/${slugify(c.name)}`} onClick={() => { setCatOpen(false); setCatHover(null); }}
                        onMouseEnter={(e) => {
                          if (!hasSubs) { setCatHover(null); return; }
                          const r = e.currentTarget.getBoundingClientRect();
                          const vh = window.innerHeight;
                          const est = Math.min((c.subs.length + 2) * 38, vh * 0.7);
                          const top = Math.max(8, Math.min(r.top, vh - est - 8));
                          setCatHover({ cat: c, top, left: r.right });
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                        <span className="w-8 h-8 rounded-lg bg-input-bg text-muted flex items-center justify-center shrink-0"><CategoryIcon name={c.name} className="w-[18px] h-[18px]" /></span>
                        <span className="truncate flex-1">{c.name}</span>
                        {hasSubs && <svg className="w-4 h-4 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                      </Link>
                    );
                  })}
                  <Link href="/elanlar" onClick={() => { setCatOpen(false); setCatHover(null); }} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-t border-card-border mt-1" style={{ color: PINK }}>
                    Bütün kateqoriyalar →
                  </Link>

                  {/* Alt-kateqoriya flyout-u — fixed (klamplanmış, ekrandan çıxmır) */}
                  {catHover && (
                    <div style={{ position: "fixed", top: catHover.top, left: catHover.left }}
                      className="z-[60] w-64 max-h-[70vh] overflow-y-auto bg-card border border-card-border rounded-xl shadow-2xl p-1.5">
                      <Link href={`/elanlar/${slugify(catHover.cat.name)}`} onClick={() => { setCatOpen(false); setCatHover(null); }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-input-bg" style={{ color: PINK }}>
                        <CategoryIcon name={catHover.cat.name} className="w-[18px] h-[18px]" /> {catHover.cat.name} — hamısı
                      </Link>
                      <div className="border-t border-card-border my-1" />
                      {catHover.cat.subs.map((s: any) => (
                        <Link key={s.name} href={`/elanlar/${slugify(catHover.cat.name)}/${slugify(s.name)}`} onClick={() => { setCatOpen(false); setCatHover(null); }}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-input-bg transition-colors">
                          <SubCategoryIcon name={s.name} parent={catHover.cat.name} className="w-[18px] h-[18px] text-muted-foreground shrink-0" />
                          <span className="truncate">{s.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Axtarış */}
            <div className="relative flex-1 min-w-[160px]">
            <form onSubmit={submitSearch} className="w-full flex items-stretch h-13 overflow-hidden border-2 transition-colors" style={{ borderColor: PINK }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Məhsul, xidmət, ad-soyad, şirkət — hər şeyi axtar"
                className="flex-1 min-w-0 px-4 bg-card text-foreground text-[15px] focus:outline-none placeholder-muted-foreground"
              />

              {/* Şəkillə axtarış — axtarış sahəsinin içində */}
              <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) searchByImage(f); }} />
              <button
                type="button"
                onClick={() => imgInputRef.current?.click()}
                disabled={imgBusy}
                title="Şəkil ilə axtar"
                aria-label="Şəkil ilə axtar"
                className="px-3 flex items-center justify-center text-muted hover:text-foreground disabled:opacity-60 transition-colors border-l border-card-border"
              >
                {imgBusy ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                )}
              </button>

              <button type="submit" className="px-5 sm:px-7 text-white font-semibold text-[15px] flex items-center gap-1.5 hover:opacity-90 transition-opacity" style={{ background: PINK }}>
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                <span className="hidden sm:inline">Axtar</span>
              </button>
            </form>

            {/* Saytda tapılmadı → internet nəticələri (Claude web search) */}
            {webOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setWebOpen(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-card-border shadow-2xl max-h-[70vh] overflow-y-auto">
                  <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-card-border">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">İnternet nəticələri</p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        «{webQuery}» saytda tapılmadı — internetdən axtarıldı
                      </p>
                    </div>
                    <button onClick={() => setWebOpen(false)} aria-label="Bağla" className="shrink-0 p-1 text-muted hover:text-foreground transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  {webLoading ? (
                    <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted">
                      <svg className="w-5 h-5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" /></svg>
                      İnternetdə axtarılır...
                    </div>
                  ) : (
                    <>
                      {webData?.summary && (
                        <p className="px-4 py-3 text-sm text-foreground/90 border-b border-card-border">{webData.summary}</p>
                      )}
                      {(webData?.results?.length ?? 0) === 0 ? (
                        <p className="px-4 py-6 text-sm text-muted">Nəticə tapılmadı.</p>
                      ) : (
                        <ul className="divide-y divide-card-border">
                          {webData!.results.map((r) => {
                            let host = r.url;
                            try { host = new URL(r.url).hostname.replace(/^www\./, ""); } catch { /* keç */ }
                            return (
                              <li key={r.url}>
                                <a href={r.url} target="_blank" rel="noopener noreferrer"
                                  className="block px-4 py-3 hover:bg-input-bg transition-colors">
                                  <p className="text-sm font-semibold text-primary line-clamp-2">{r.title}</p>
                                  <p className="text-[11px] text-muted mt-0.5 truncate">{host}</p>
                                  {r.snippet && <p className="text-xs text-muted mt-1 line-clamp-2">{r.snippet}</p>}
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
            </div>

            {/* Sağ: bildiriş / seçilmişlər / səbət / istifadəçi */}
            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              {isLoggedIn && <div className="hidden sm:block"><NotificationBell /></div>}

              <Link href="/favorites" className="hidden lg:flex flex-col items-center text-muted hover:text-foreground transition-colors" title={t("favorites")}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                <span className="text-[10px] mt-0.5">{t("favorites")}</span>
              </Link>

              {isLoggedIn && (
                <Link href="/cart" className="relative flex flex-col items-center text-muted hover:text-foreground transition-colors" title={t("cart")}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                  <span className="text-[10px] mt-0.5 hidden sm:inline">{t("cart")}</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 right-1 sm:right-2 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center" style={{ background: PINK }}>{cartCount}</span>
                  )}
                </Link>
              )}

              {/* İstifadəçi */}
              {isLoggedIn ? (
                <div ref={userRef} className="relative">
                  <button onClick={() => setUserOpen(!userOpen)}
                    className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-white text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity" style={{ background: PINK }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
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
                      <Link href="/messages" onClick={() => setUserOpen(false)} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                          {t("messages")}
                        </span>
                        {unreadMessages > 0 && <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: PINK }}>{unreadMessages}</span>}
                      </Link>

                      {/* 📤 Məndən gedənlər (alışlar) */}
                      <button onClick={() => setOutOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 7.5L12 3m0 0L7.5 7.5M12 3v13.5" /></svg>
                          {t("navOutgoing")}
                        </span>
                        <span className="flex items-center gap-2">
                          {unreadInquiries > 0 && <span className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">{unreadInquiries}</span>}
                          <svg className={`w-4 h-4 text-muted transition-transform ${outOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </span>
                      </button>
                      {outOpen && (
                        <div className="bg-input-bg/40">
                          <Link href="/orders?tab=buying" onClick={() => setUserOpen(false)} className="flex items-center gap-2 pl-11 pr-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                            Alışlarım
                          </Link>
                          <Link href="/inquiries" onClick={() => setUserOpen(false)} className="flex items-center justify-between pl-11 pr-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                            <span className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                              Göndərdiyim sorğular
                            </span>
                            {unreadInquiries > 0 && <span className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">{unreadInquiries}</span>}
                          </Link>
                          <Link href="/cart" onClick={() => setUserOpen(false)} className="flex items-center gap-2 pl-11 pr-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                            {t("cart")}
                          </Link>
                          <Link href="/favorites" onClick={() => setUserOpen(false)} className="flex items-center gap-2 pl-11 pr-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                            {t("favorites")}
                          </Link>
                        </div>
                      )}

                      {/* 📥 Məndən gələnlər (satışlar) */}
                      <button onClick={() => setInOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12L12 16.5m0 0l4.5-4.5M12 16.5V3" /></svg>
                          {t("navIncoming")}
                        </span>
                        <svg className={`w-4 h-4 text-muted transition-transform ${inOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {inOpen && (
                        <div className="bg-input-bg/40">
                          <Link href="/orders?tab=selling" onClick={() => setUserOpen(false)} className="flex items-center gap-2 pl-11 pr-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Satışlarım
                          </Link>
                          <Link href="/account" onClick={() => setUserOpen(false)} className="flex items-center gap-2 pl-11 pr-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                            {t("myListings")}
                          </Link>
                        </div>
                      )}

                      {/* Müstəqil: Rəy konsultasiyaları + Biznes */}
                      <Link href="/consultations" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                        <span className="w-4 h-4 text-muted flex items-center justify-center">🗣️</span>
                        {t("navConsultations")}
                      </Link>
                      <Link href="/business" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                        {t("bizMenu") || "Biznes"}
                      </Link>
                      <Link href="/referral" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                        <span className="w-4 h-4 text-muted flex items-center justify-center">🤝</span>
                        {t("navReferralStores")}
                      </Link>
                      <Link href="/referral-earnings" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                        <span className="w-4 h-4 text-muted flex items-center justify-center">💸</span>
                        {t("navReferralEarnings")}
                      </Link>
                      <Link href="/bookings" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                        <span className="w-4 h-4 text-muted flex items-center justify-center">📅</span>
                        {t("navBookings")}
                      </Link>

                      {(user?.type === "MECHANIC" || user?.type === "PARTS_SELLER") && !user?.sellerVerified && (
                        <Link href="/seller/apply" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-amber-500 font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          {t("becomeSeller")}
                        </Link>
                      )}
                      <Link href="/addresses" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                        {t("myAddresses")}
                      </Link>
                      {user?.role === "ADMIN" && (
                        <Link href="/admin" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-input-bg transition-colors font-medium" style={{ color: PINK }}>
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
                <Link href="/" className="px-3 sm:px-4 py-2 rounded-xl text-white text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap" style={{ background: PINK }}>
                  {t("loginRequired")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
