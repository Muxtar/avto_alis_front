"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { Locale } from "@/lib/translations";
import { API, imgUrl } from "@/lib/api";
import { formatPriceShort } from "@/lib/format";
import { useToast } from "@/components/Toast";
import { getSocket } from "@/lib/callSocket";
import { yangoLabel } from "@/lib/yangoStatus";
import NotificationBell from "@/components/NotificationBell";
import { CATEGORIES, slugify } from "@/lib/categories";
import CategoryIcon, { SubCategoryIcon } from "@/components/CategoryIcon";

const languages: { code: Locale; label: string; flag: string }[] = [
  { code: "az", label: "AZ", flag: "🇦🇿" },
  { code: "ru", label: "RU", flag: "🇷🇺" },
  { code: "en", label: "EN", flag: "🇬🇧" },
];

// ── Axtarış avtomatik-tamamlama (Google kimi) ──
// Statik kateqoriya/alt-kateqoriya indeksi — ani, şəbəkəsiz təkliflər.
type Suggest = { kind: "recent" | "cat" | "text"; label: string; context?: string; href?: string };
const CAT_SUGGEST: { label: string; context: string; href: string }[] = [];
for (const c of CATEGORIES) {
  CAT_SUGGEST.push({ label: c.name, context: "Kateqoriya", href: `/elanlar/${slugify(c.name)}` });
  for (const su of c.subs) {
    CAT_SUGGEST.push({ label: su.name, context: c.name, href: `/elanlar/${slugify(c.name)}/${slugify(su.name)}` });
  }
}
// Aksent-həssas olmayan uyğunlaşma üçün (ə→e, ş→s ...). slugify boşluğu "-" edir.
const normQ = (s: string) => slugify(s);
function getRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem("recentSearches") || "[]"); } catch { return []; }
}
function addRecentSearch(q: string) {
  const t = q.trim();
  if (!t) return;
  try {
    const list = getRecentSearches().filter((x) => x.toLowerCase() !== t.toLowerCase());
    list.unshift(t);
    localStorage.setItem("recentSearches", JSON.stringify(list.slice(0, 8)));
  } catch { /* localStorage yoxdursa keç */ }
}

// Vahid brend rəngi (globals.css orange-* remap ilə eyni — logo mavisi (#2f6bff)).
const PINK = "#4348f8";           // əsas vurğu (istifadəçi seçimi)
const NAV_DARK = "var(--nav-dark)";   // başlıq — tünd (globals.css-də təyin olunub)
const NAV_DARK2 = "var(--nav-dark2)"; // alt naviqasiya sətri

export default function Navbar() {
  const { locale, setLocale, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, token, isLoggedIn, logout, unreadMessages } = useAuth();
  const { cartCount } = useCart();
  const { toast } = useToast();
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
  // Avtomatik-tamamlama (təkliflər)
  const [suggestions, setSuggestions] = useState<Suggest[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(-1);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // İnternet (Claude web search) nəticələri — axtarış sahəsinin altındakı pencere
  const [webOpen, setWebOpen] = useState(false);
  const [webLoading, setWebLoading] = useState(false);
  const [webQuery, setWebQuery] = useState("");
  const [webData, setWebData] = useState<{ mode?: "product" | "person"; summary: string; results: { title: string; url: string; snippet: string; price?: number | null; site?: string; kind?: "product" | "social"; platform?: string; seller?: string | null }[]; needLogin?: boolean; notRun?: boolean } | null>(null);
  // Sayt daxili (tradixai) nəticələr — internetdən ƏVVƏL göstərilir.
  // Məhsul: elanlar; şəxs: peşəkar profillər (ada görə).
  const [siteListings, setSiteListings] = useState<{ id: number; title: string; price: number; images?: string[]; user?: { name?: string } }[]>([]);
  const [sitePeople, setSitePeople] = useState<{ id: number; name: string; profession?: string | null; avatar?: string | null; publicId?: string | null }[]>([]);
  // unreadMessages artıq qlobal AuthContext-dən gəlir (real-time socket ilə).
  const [unreadInquiries, setUnreadInquiries] = useState(0);
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const catRef = useRef<HTMLDivElement>(null);
  // Alt-kateqoriya flyout-u siyahıdan çıxıb ayrıca render olunur (backdrop-blur +
  // overflow onu kəsməsin). Kursor siyahıdan flyout-a keçəndə bağlanmasın deyə
  // kiçik gecikmə ilə bağlanır (flyout-a girəndə ləğv olunur).
  const catCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotifications = useCallback(() => {
    if (!token || !isLoggedIn) return;
    fetch(`${API}/inquiries/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setUnreadInquiries(d.count || 0)).catch(() => {});
  }, [token, isLoggedIn]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Qlobal çatdırılma bildirişi — Yango status dəyişəndə (kuryer tapıldı / yolda /
  // çatdı) hansı səhifədə olsan da toast göstər.
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    const socket = getSocket(token);
    const onYango = (p: any) => {
      if (!p?.yangoStatus) return;
      const bad = p.yangoStatus === "failed" || String(p.yangoStatus).startsWith("cancelled");
      toast(`🛵 Sifariş #${p.orderId}: ${yangoLabel(p.yangoStatus)}`, bad ? "error" : "success");
    };
    socket.on("order:yango", onYango);
    return () => { socket.off("order:yango", onYango); };
  }, [isLoggedIn, token, toast]);

  const totalUnread = unreadMessages + unreadInquiries;

  useEffect(() => {
    setMounted(true);
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (catRef.current && !catRef.current.contains(e.target as Node)) { setCatOpen(false); setCatHover(null); }
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Axtarış: əvvəlcə sayt daxili. Saytda heç nə tapılmasa, Claude-un internet
  // axtarışı işə düşür və nəticələr axtarış sahəsinin altında açılır.
  const submitSearch = (e?: React.FormEvent) => { e?.preventDefault(); runSearch(search); };

  // Sorğu ad-soyada bənzəyirmi? (backend ilə eyni məntiq) — şəxs axtarışı üçün.
  const looksLikePerson = (q: string) => {
    if (/\d/.test(q)) return false;
    const w = q.trim().split(/\s+/).filter(Boolean);
    return w.length >= 2 && w.length <= 3 && w.every((x) => /^[a-zâçəğıöşüi̇'’-]{2,}$/i.test(x));
  };

  const runSearch = async (raw: string) => {
    const q = raw.trim();
    setSearchFocused(false);
    setWebOpen(false);
    setWebData(null);
    setSiteListings([]);
    setSitePeople([]);
    if (q) addRecentSearch(q);
    router.push(`/elanlar${q ? `?search=${encodeURIComponent(q)}` : ""}`);
    if (!q) return;

    const person = looksLikePerson(q);

    // ── 1) ƏVVƏLCƏ SAYTDAN (tradixai) ──
    // Elanlar həm başlıq, həm satıcı adı üzrə uyğunlaşır (şəxs adında da işləyir).
    // Şəxs sorğusunda əlavə olaraq peşəkar profilləri də çəkirik.
    let siteCount = 0;
    try {
      const reqs: Promise<Response>[] = [fetch(`${API}/listings?search=${encodeURIComponent(q)}&limit=6`)];
      if (person) reqs.push(fetch(`${API}/professionals?q=${encodeURIComponent(q)}`));
      const [lr, pr] = await Promise.all(reqs);
      const ld = await lr.json();
      const listings = Array.isArray(ld?.listings) ? ld.listings : [];
      setSiteListings(listings);
      siteCount = listings.length || ld?.total || 0;
      if (pr) {
        const pd = await pr.json().catch(() => null);
        setSitePeople(Array.isArray(pd?.professionals) ? pd.professionals.slice(0, 6) : []);
      }
    } catch {
      // Sayt axtarışı alınmadısa da internetə keçirik — istifadəçi nəticəsiz qalmasın.
    }

    // ── 2) SONRA İNTERNETDƏN ──
    // Şəxs axtarışında HƏMİŞƏ (sosial hesablar üçün); məhsulda saytda heç nəticə
    // olmadıqda avtomatik. Panel hər halda açılır ki, istifadəçi görsün.
    setWebQuery(q);
    setWebOpen(true);
    // İnternet axtarışı HƏMİŞƏ işə düşür — həm məhsul, həm şəxs üçün.
    // (Əvvəl yalnız saytda nəticə olmayanda işləyirdi; ona görə məhsul axtaranda
    // internet nəticələri — link/qiymət/satıcı — görünmürdü.)
    // Xərc üçün narahatlıq yoxdur: eyni sorğu 12 saat keşdə saxlanılır.
    await runWebSearch(q, person);
  };

  // İnternet axtarışını işə salır (avtomatik və ya "İnternetdə axtar" düyməsindən).
  const runWebSearch = async (q: string, person: boolean) => {
    setWebOpen(true);
    if (!isLoggedIn || !token) {
      setWebLoading(false);
      setWebData({ mode: person ? "person" : "product", summary: "", results: [], needLogin: true });
      return;
    }
    setWebLoading(true);
    try {
      const res = await fetch(`${API}/search/web`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) setWebData({ mode: data.mode || (person ? "person" : "product"), summary: data.message || "Uyğun nəticə tapılmadı.", results: [] });
      else setWebData({ mode: data.mode || (person ? "person" : "product"), summary: data.summary || "", results: data.results || [] });
    } catch {
      setWebData({ mode: person ? "person" : "product", summary: "İnternet axtarışı alınmadı.", results: [] });
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

  // İstifadəçi yazdıqca təkliflər: son axtarışlar + kateqoriyalar (ani) +
  // saytdakı elan başlıqları (300ms debounce ilə mövcud /listings-dən).
  useEffect(() => {
    const q = search.trim();
    if (q.length < 1) { setSuggestions([]); setSuggestIdx(-1); return; }
    const nq = normQ(q);
    const recent: Suggest[] = getRecentSearches()
      .filter((r) => normQ(r).includes(nq))
      .slice(0, 3)
      .map((r) => ({ kind: "recent", label: r }));
    const cats: Suggest[] = CAT_SUGGEST
      .filter((c) => normQ(c.label).includes(nq))
      .slice(0, 6)
      .map((c) => ({ kind: "cat", label: c.label, context: c.context, href: c.href }));
    setSuggestions([...recent, ...cats]);
    setSuggestIdx(-1);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/listings?search=${encodeURIComponent(q)}&limit=6`);
        const d = await r.json();
        const titles = Array.from(new Set((d?.listings || []).map((l: any) => l.title).filter(Boolean))).slice(0, 5);
        setSuggestions((prev) => {
          const base = prev.filter((p) => p.kind !== "text");
          const seen = new Set(base.map((b) => normQ(b.label)));
          const add: Suggest[] = (titles as string[])
            .filter((tt) => !seen.has(normQ(tt)))
            .map((tt) => ({ kind: "text", label: tt }));
          return [...base, ...add];
        });
      } catch { /* təklif alınmadısa səssiz keç */ }
    }, 300);
    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); };
  }, [search]);

  const pickSuggestion = (s: Suggest) => {
    setSearchFocused(false);
    setSuggestIdx(-1);
    if (s.kind === "cat" && s.href) { setSearch(""); router.push(s.href); return; }
    setSearch(s.label);
    runSearch(s.label);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!searchFocused || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSuggestIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSuggestIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter") { if (suggestIdx >= 0) { e.preventDefault(); pickSuggestion(suggestions[suggestIdx]); } }
    else if (e.key === "Escape") { setSearchFocused(false); }
  };

  const current = languages.find((l) => l.code === locale)!;

  return (
    <header className="sticky top-0 z-50">

      {/* ── Əsas başlıq (Amazon üslubu — tünd) ──
          z-30: Kataloq menyusu alt naviqasiya sətrinin (z-20) ÜSTÜNDƏ açılsın. */}
      <div className="relative z-30 text-white" style={{ background: NAV_DARK }}>
        <div className="w-full px-3 sm:px-5 lg:px-8">
          {/* Telefonda iki sətir (flex-wrap): üstdə logo/kataloq/ikonlar,
              altda tam enli axtarış (order-last + basis-full). Masaüstündə
              tək sətir (sm:flex-nowrap). */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-2.5 sm:gap-4 py-2.5 sm:py-0 sm:h-20">
            {/* Sol qrup (logo/şəhər/kataloq) — masaüstündə flex-1 (search-i
                MƏRKƏZDƏ tutmaq üçün sol və sağ qruplar bərabər çəkidir).
                Telefonda `display:contents` ilə şəffafdır → uşaqlar birbaşa
                əsas flex-in item-ıdır, order/wrap düzəni pozulmur. */}
            <div className="contents sm:flex sm:min-w-0 sm:items-center sm:gap-4">
            {/* Logo */}
            <Link href="/elanlar" className="order-1 flex items-center gap-2 shrink-0 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tradixai-icon.svg" alt="tradixai" className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0" />
              {/* Telefon ölçüsündə yalnız ikon — ana səhifəyə qayıtmaq üçün kifayətdir,
                  qalan yer axtarış sahəsinə verilir. */}
              <span className="hidden sm:inline text-2xl sm:text-3xl font-extrabold tracking-tight text-white">tradixai</span>
            </Link>

            {/* Şəhər — yalnız çox geniş ekranda; həm də search-ə minməsin deyə
                shrink oluna bilər (min-w-0), yer azalanda gizlənir. */}

            {/* Kataloq — kateqoriya menyusu (telefonda da görünür, kompakt) */}
            <div ref={catRef} className="order-2 relative shrink-0">
              {/* Amazon üslubu: şəffaf, ağ mətnli — açılanda vurğu rəngi ilə işıqlanır */}
              <button onClick={() => { setCatOpen((v) => !v); setCatHover(null); }}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 h-11 rounded-md text-white font-bold text-sm sm:text-[15px] ring-1 transition-colors ${catOpen ? "ring-white/60 bg-white/10" : "ring-transparent hover:ring-white/40"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                <span className="hidden xs:inline">{t("navCatalog")}</span>
                <svg className={`w-4 h-4 transition-transform ${catOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {catOpen && (
                <>
                <div className="absolute left-0 mt-1 w-72 bg-card border border-card-border shadow-2xl z-50 max-h-[72vh] overflow-y-auto"
                  onMouseLeave={() => { catCloseTimer.current = setTimeout(() => setCatHover(null), 180); }}>
                  {/* Başlıq zolağı — header ilə eyni tünd ton */}
                  <div className="sticky top-0 z-10 px-4 py-2.5 text-white text-[13px] font-bold tracking-wide" style={{ background: NAV_DARK }}>
                    {t("navCatalog")}
                  </div>
                  {CATEGORIES.map((c) => {
                    const hasSubs = c.subs && c.subs.length > 0;
                    return (
                      <Link key={c.name} href={`/elanlar/${slugify(c.name)}`} onClick={() => { setCatOpen(false); setCatHover(null); }}
                        onMouseEnter={(e) => {
                          if (catCloseTimer.current) clearTimeout(catCloseTimer.current);
                          if (!hasSubs) { setCatHover(null); return; }
                          const r = e.currentTarget.getBoundingClientRect();
                          const vh = window.innerHeight;
                          const est = Math.min((c.subs.length + 2) * 42, vh * 0.8);
                          const top = Math.max(8, Math.min(r.top, vh - est - 12));
                          setCatHover({ cat: c, top, left: r.right });
                        }}
                        className="group/cat flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--brand-soft)] transition-colors text-foreground">
                        <span className="w-8 h-8 rounded-lg bg-input-bg text-muted group-hover/cat:bg-[var(--brand-to)] group-hover/cat:text-white flex items-center justify-center shrink-0 transition-colors"><CategoryIcon name={c.name} className="w-[18px] h-[18px]" /></span>
                        <span className="truncate flex-1 font-medium group-hover/cat:text-[var(--brand-to)]">{c.name}</span>
                        {hasSubs && <svg className="w-4 h-4 text-muted shrink-0 group-hover/cat:text-[var(--brand-to)] group-hover/cat:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                      </Link>
                    );
                  })}
                  <Link href="/elanlar" onClick={() => { setCatOpen(false); setCatHover(null); }} className="flex items-center gap-2 px-4 py-3 text-sm font-bold border-t border-card-border hover:bg-[var(--brand-soft)] transition-colors" style={{ color: PINK }}>
                    Bütün kateqoriyalar →
                  </Link>
                </div>

                {/* Alt-kateqoriya flyout-u — siyahıdan AYRICA (backdrop-blur + overflow
                    kəsməsin). fixed koordinatlarla sağda açılır. */}
                {catHover && (
                  <div style={{ position: "fixed", top: catHover.top, left: catHover.left, maxHeight: `calc(100vh - ${catHover.top}px - 12px)` }}
                    onMouseEnter={() => { if (catCloseTimer.current) clearTimeout(catCloseTimer.current); }}
                    onMouseLeave={() => setCatHover(null)}
                    className="z-[60] w-72 overflow-y-auto bg-card border border-card-border border-l-0 shadow-2xl">
                    {/* Başlıq zolağı — ana menyu ilə eyni tünd ton (bitişik görünsün) */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2.5 text-white text-[13px] font-bold tracking-wide" style={{ background: NAV_DARK }}>
                      <CategoryIcon name={catHover.cat.name} className="w-[18px] h-[18px] shrink-0" />
                      <span className="truncate">{catHover.cat.name}</span>
                    </div>
                    <Link href={`/elanlar/${slugify(catHover.cat.name)}`} onClick={() => { setCatOpen(false); setCatHover(null); }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b border-card-border hover:bg-[var(--brand-soft)] transition-colors" style={{ color: PINK }}>
                      Hamısına bax →
                    </Link>
                    {catHover.cat.subs.map((s: any) => (
                      <Link key={s.name} href={`/elanlar/${slugify(catHover.cat.name)}/${slugify(s.name)}`} onClick={() => { setCatOpen(false); setCatHover(null); }}
                        className="group/sub flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-[var(--brand-soft)] transition-colors">
                        <span className="w-8 h-8 rounded-lg bg-input-bg text-muted group-hover/sub:bg-[var(--brand-to)] group-hover/sub:text-white flex items-center justify-center shrink-0 transition-colors">
                          <SubCategoryIcon name={s.name} parent={catHover.cat.name} className="w-[18px] h-[18px]" />
                        </span>
                        <span className="truncate flex-1 font-medium group-hover/sub:text-[var(--brand-to)]">{s.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
                </>
              )}
            </div>
            </div>{/* sol qrup sonu */}

            {/* Axtarış — telefonda tam enli alt sətirdə (order-last basis-full),
                masaüstündə flex-1 ilə BÖYÜYÜB boş yeri tutur (əvvəl sabit max-w
                ilə ortada kiçik qalıb ikonlardan uzaq idi). İncə kənar + bulanıq fon. */}
            <div ref={searchBoxRef} className="order-last basis-full w-full sm:order-none sm:basis-auto sm:flex-1 sm:w-auto relative min-w-0 sm:min-w-[160px]">
            <form onSubmit={submitSearch} className="w-full flex items-stretch h-11 sm:h-12 overflow-hidden rounded-lg bg-white shadow-sm focus-within:ring-2" style={{ boxShadow: "0 0 0 0px transparent" }}>
              {/* Kateqoriya seçici — Amazon üslubu "Hamısı" */}
              <button type="button" onClick={() => { setCatOpen((v) => !v); setCatHover(null); }}
                className="hidden sm:flex items-center gap-1 px-3 bg-[#eef0f5] text-[#0f172a] text-xs font-semibold border-r border-[#d5d9e0] hover:bg-[#e3e7ee] transition-colors shrink-0">
                Hamısı
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSearchFocused(true); }}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={onSearchKeyDown}
                autoComplete="off"
                placeholder="Məhsul, xidmət, ad-soyad, şirkət — hər şeyi axtar"
                className="flex-1 min-w-0 px-3.5 bg-white text-[#0f172a] text-sm sm:text-[15px] focus:outline-none placeholder-[#8a94a6]"
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
                className="px-3 flex items-center justify-center bg-white text-[#64748b] hover:text-[#0f172a] disabled:opacity-60 transition-colors border-l border-[#e2e6ee]"
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

            {/* Avtomatik-tamamlama təklifləri (Google kimi) — yazıldıqca açılır.
                İnternet nəticələri açıqdırsa göstərilmir. */}
            {searchFocused && !webOpen && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-card-border rounded-b-xl shadow-2xl max-h-[60vh] overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.kind}-${i}-${s.label}`}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
                    onMouseEnter={() => setSuggestIdx(i)}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm border-b border-card-border/40 last:border-0 transition-colors ${suggestIdx === i ? "bg-input-bg" : "hover:bg-input-bg"}`}
                  >
                    <span className="shrink-0 text-muted">{s.kind === "recent" ? "🕘" : s.kind === "cat" ? "📂" : "🔍"}</span>
                    <span className="min-w-0 truncate">{s.label}</span>
                    {s.context && <span className="ml-auto shrink-0 text-[11px] text-muted">{s.context}</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Axtarış nəticələri: ƏVVƏLCƏ saytdan (tradixai), SONRA internetdən */}
            {webOpen && (() => {
              const person = webData?.mode === "person";
              const hasSite = siteListings.length > 0 || sitePeople.length > 0;
              const platMeta: Record<string, { icon: string; label: string }> = {
                instagram: { icon: "📷", label: "Instagram" }, facebook: { icon: "📘", label: "Facebook" },
                linkedin: { icon: "💼", label: "LinkedIn" }, tiktok: { icon: "🎵", label: "TikTok" },
                youtube: { icon: "▶️", label: "YouTube" }, x: { icon: "𝕏", label: "X (Twitter)" },
                telegram: { icon: "✈️", label: "Telegram" },
              };
              return (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setWebOpen(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-card-border shadow-2xl max-h-[75vh] overflow-y-auto">
                  <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-card-border">
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{person ? "Şəxs axtarışı" : "Axtarış nəticələri"}</p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        «{webQuery}» — {person ? "əvvəl tradixai, sonra sosial media hesabları" : "əvvəl tradixai, sonra internet"}
                      </p>
                    </div>
                    <button onClick={() => setWebOpen(false)} aria-label="Bağla" className="shrink-0 p-1 text-muted hover:text-foreground transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  {/* ── SAYTDAN (tradixai) ── */}
                  {hasSite && (
                    <div className="border-b border-card-border">
                      <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-orange-500">tradixai · saytdan</p>
                      {sitePeople.map((u) => (
                        <Link key={`u${u.id}`} href={`/seller/${u.id}?from=ixtisas`} onClick={() => setWebOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-input-bg transition-colors">
                          {u.avatar ? <img src={imgUrl(u.avatar)} alt={u.name} className="w-9 h-9 rounded-full object-cover shrink-0" /> : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{(u.name || "?").slice(0, 1).toUpperCase()}</div>}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{u.name}</p>
                            {u.profession && <p className="text-xs text-muted truncate">{u.profession}</p>}
                          </div>
                          <span className="ml-auto text-[10px] text-teal-500 font-semibold shrink-0">Profil →</span>
                        </Link>
                      ))}
                      {siteListings.map((l) => (
                        <Link key={`l${l.id}`} href={`/marketplace/${l.id}`} onClick={() => setWebOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-input-bg transition-colors">
                          {l.images?.[0] ? <img src={imgUrl(l.images[0])} alt={l.title} className="w-11 h-11 rounded object-cover shrink-0" /> : <div className="w-11 h-11 rounded bg-input-bg shrink-0" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold line-clamp-1">{l.title}</p>
                            {l.user?.name && <p className="text-xs text-muted truncate">Satıcı: {l.user.name}</p>}
                          </div>
                          <span className="shrink-0 text-sm font-bold whitespace-nowrap">{formatPriceShort(l.price)} <span className="text-[10px] text-muted font-semibold">AZN</span></span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* ── İNTERNETDƏN ── */}
                  <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted">{person ? "sosial media" : "internetdən"}</p>
                  {webLoading ? (
                    <div className="flex items-center gap-3 px-4 py-6 text-sm text-muted">
                      <svg className="w-5 h-5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" /></svg>
                      {person ? "Sosial media hesabları axtarılır..." : "İnternetdə axtarılır..."}
                    </div>
                  ) : webData?.needLogin ? (
                    <div className="px-4 py-5">
                      <p className="text-sm text-foreground/90">İnternetdən axtarış üçün hesabınıza daxil olun.</p>
                      <Link href="/" onClick={() => setWebOpen(false)}
                        className="inline-block mt-3 px-4 py-2 text-white text-sm font-semibold" style={{ background: PINK }}>
                        Daxil ol
                      </Link>
                    </div>
                  ) : webData?.notRun ? (
                    <div className="px-4 py-4">
                      <button onClick={() => runWebSearch(webQuery, false)}
                        className="w-full px-4 py-2.5 rounded-lg bg-input-bg border border-input-border text-sm font-semibold hover:border-orange-500 transition-colors">
                        🌐 İnternetdə də axtar
                      </button>
                    </div>
                  ) : (
                    <>
                      {webData?.summary && (
                        <p className="px-4 py-2 text-sm text-foreground/90">{webData.summary}</p>
                      )}
                      {(webData?.results?.length ?? 0) === 0 ? (
                        <p className="px-4 py-5 text-sm text-muted">{person ? "Açıq sosial media hesabı tapılmadı." : "İnternetdə uyğun nəticə tapılmadı."}</p>
                      ) : person ? (
                        <ul className="grid grid-cols-2 gap-2 px-4 pb-4 pt-1">
                          {webData!.results.map((r) => {
                            const m = platMeta[r.platform || ""] || { icon: "🔗", label: r.site || "Profil" };
                            return (
                              <li key={r.url}>
                                <a href={r.url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-input-bg border border-input-border hover:border-orange-500 transition-colors">
                                  <span className="text-lg shrink-0">{m.icon}</span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{m.label}</p>
                                    <p className="text-[11px] text-muted truncate">{r.title}</p>
                                  </div>
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <ul className="divide-y divide-card-border">
                          {webData!.results.map((r) => {
                            let host = r.site || r.url;
                            try { if (!r.site) host = new URL(r.url).hostname.replace(/^www\./, ""); } catch { /* keç */ }
                            return (
                              <li key={r.url}>
                                <a href={r.url} target="_blank" rel="noopener noreferrer"
                                  className="block px-4 py-3 hover:bg-input-bg transition-colors">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm font-semibold text-primary line-clamp-2 min-w-0">{r.title}</p>
                                    {typeof r.price === "number" && (
                                      <span className="shrink-0 text-sm font-bold text-foreground whitespace-nowrap">
                                        {formatPriceShort(r.price)} <span className="text-[10px] text-muted font-semibold">AZN</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                                    <span className="inline-block px-1.5 py-0.5 bg-input-bg border border-input-border text-[10px] font-semibold text-muted">{host}</span>
                                    {r.seller && <span className="text-[11px] text-muted">Satıcı: <span className="font-semibold text-foreground">{r.seller}</span></span>}
                                  </div>
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
              );
            })()}
            </div>

            {/* Sağ: bildiriş / seçilmişlər / səbət / istifadəçi.
                Telefonda ml-auto ilə sağa yaslanır (axtarış alt sətrə düşür);
                masaüstündə şrink-0 (təbii en) — böyüyən axtarışın həmən sağında
                durur ki, bell/ikonlarla search arasında böyük boşluq qalmasın. */}
            <div className="order-3 ml-auto sm:ml-0 flex items-center justify-end gap-1.5 sm:gap-3 shrink-0">
              {isLoggedIn && <NotificationBell />}

              <Link href="/favorites" className="flex flex-col items-center text-white/85 hover:text-white transition-colors px-1.5 py-1 rounded-md hover:ring-1 hover:ring-white/40" title={t("favorites")}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                <span className="text-[10px] mt-0.5 hidden lg:inline">{t("favorites")}</span>
              </Link>

              {isLoggedIn && (
                <Link href="/cart" className="relative flex items-end gap-1 text-white/90 hover:text-white transition-colors px-1.5 py-1 rounded-md hover:ring-1 hover:ring-white/40" title={t("cart")}>
                  <span className="relative">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 min-w-[18px] h-[18px] px-1 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center" style={{ background: PINK }}>{cartCount}</span>
                  </span>
                  <span className="text-[13px] font-bold mb-0.5 hidden sm:inline">{t("cart")}</span>
                </Link>
              )}

              {/* İstifadəçi */}
              {isLoggedIn ? (
                <div ref={userRef} className="relative">
                  <button onClick={() => setUserOpen(!userOpen)}
                    className="relative flex items-center p-1.5 text-white/85 hover:text-white transition-colors" title={user?.name || "Profil"}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {totalUnread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse-soft">
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
                        {t("navProfile")}
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
                          <Link href="/earnings" onClick={() => setUserOpen(false)} className="flex items-center gap-2 pl-11 pr-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Qazancım
                          </Link>
                          <Link href="/support" onClick={() => setUserOpen(false)} className="flex items-center gap-2 pl-11 pr-4 py-2.5 text-sm hover:bg-input-bg transition-colors text-foreground">
                            <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                            Dəstək
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
      {/* ── Alt naviqasiya sətri (Amazon üslubu) ── */}
      <div className="hidden md:block relative z-20 text-white/90 shadow-sm" style={{ background: NAV_DARK2 }}>
        <div className="w-full px-3 sm:px-5 lg:px-8">
          <div className="flex items-center justify-between h-10 text-[13px]">
            <div className="flex items-center gap-4">
              <Link href="/locations" className="text-white/85 hover:text-white transition-colors">{t("browseByLocation")}</Link>
              {isLoggedIn && <Link href="/consultations" className="text-white/85 hover:text-white transition-colors">🗣️ Konsultasiya</Link>}
              {isLoggedIn && <button type="button" onClick={() => window.dispatchEvent(new Event("toggle-inquiry-chat"))} className="text-white/85 hover:text-white transition-colors font-medium">✨ AI Köməkçi</button>}
            </div>
            <div className="flex items-center gap-3">
              {/* Theme */}
              <button onClick={toggleTheme} suppressHydrationWarning className="text-white/85 hover:text-white transition-colors" title={mounted ? (theme === "dark" ? "Light" : "Dark") : ""}>
                {!mounted ? null : theme === "dark" ? (
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>
              {/* Language */}
              <div ref={langRef} className="relative">
                <button onClick={() => setLangOpen(!langOpen)} className="flex items-center gap-1.5 text-white/85 hover:text-white transition-colors">
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
    </header>
  );
}
