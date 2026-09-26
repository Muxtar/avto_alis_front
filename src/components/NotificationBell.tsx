'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { API } from '@/lib/api';
import { useLive } from '@/lib/live';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { token, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  /* TELEFONDA PANEL EKRANIN TAM ENİNDƏ AÇILIR.
     Əvvəl panel (320px) düymənin SAĞ kənarına yapışırdı (`absolute right-0`).
     375px-lik ekranda düymə ortada olduğu üçün panelin sol tərəfi ekrandan
     kənara çıxırdı — bildirişin başlığı və mətni kəsilirdi. Tam en üçün
     `fixed` lazımdır, o da düymənin altındakı yuxarı ofseti tələb edir. */
  const [panelTop, setPanelTop] = useState(0);
  const [narrow, setNarrow] = useState(false);

  const fetchNotifs = useCallback(() => {
    if (!token || !isLoggedIn) return;
    fetch(`${API}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setNotifs(d.notifications || []);
        setUnreadCount(d.unreadCount || 0);
      }).catch(() => {});
  }, [token, isLoggedIn]);

  useEffect(() => {
    fetchNotifs();
    const i = setInterval(fetchNotifs, 30000);
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => { clearInterval(i); document.removeEventListener('mousedown', handler); };
  }, [fetchNotifs]);

  // Server nəyisə dəyişdi (təsdiq, cavab, sifariş, bildiriş oxundu…) — sayğac gözləməsin.
  useLive('*', fetchNotifs);

  // BİLDİRİŞİN AİD OLDUĞU SƏHİFƏ AÇILANDA — o bildiriş(lər) dərhal oxunmuş sayılır.
  // Əvvəl istifadəçi mesajı oxuyub / sifarişə baxıb qayıdanda zəngdə «1» qalırdı,
  // yalnız səhifəni yeniləyəndə gedirdi. URL-in sorğu hissəsi (məs. ?id=, ?chat=)
  // də nəzərə alınır — ona görə pathname dəyişməsə belə kiçik gecikmə ilə yoxlanır.
  const pathname = usePathname();
  useEffect(() => {
    if (!token || !isLoggedIn) return;
    let last = '';
    const check = () => {
      const page = window.location.pathname + window.location.search;
      if (page === last) return;
      last = page;
      fetch(`${API}/notifications/read-by-path`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ path: page }),
      }).then((r) => r.json()).then((d) => { if (d?.count > 0) fetchNotifs(); }).catch(() => {});
    };
    const t0 = setTimeout(check, 300);
    // Səhifə daxilində ?id= / ?chat= dəyişəndə (router.replace) pathname dəyişmir.
    const iv = setInterval(check, 1500);
    return () => { clearTimeout(t0); clearInterval(iv); };
  }, [pathname, token, isLoggedIn, fetchNotifs]);

  const markAll = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch(`${API}/notifications/read-all`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  // Tək bildirişi oxunmuş et (klikləyəndə).
  const markRead = (id: number) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    fetch(`${API}/notifications/${id}/read`, {
      method: 'PUT', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  // Zəngi açanda: gətir və hamısını oxunmuş say (qırmızı badge dərhal gedir).
  const openBell = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      const isNarrow = window.innerWidth < 640;          // Tailwind `sm`
      setNarrow(isNarrow);
      if (isNarrow) setPanelTop((btnRef.current?.getBoundingClientRect().bottom ?? 56) + 8);
      fetchNotifs();
      if (unreadCount > 0) {
        setUnreadCount(0);
        fetch(`${API}/notifications/read-all`, {
          method: 'PUT', headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  };

  if (!isLoggedIn) return null;

  const iconFor = (type: string) => {
    switch (type) {
      case 'ORDER': return '📦';
      case 'MESSAGE': return '💬';
      case 'INQUIRY': return '🔍';
      case 'PROMO': return '🎁';
      case 'LISTING': return '📢';
      case 'BOOKING': return '📅';
      case 'REFERRAL': return '🤝';
      default: return '🔔';
    }
  };

  // Növə görə ikon çipinin rəngi (profil kartlarının palitrası).
  const toneFor = (type: string) => ({
    ORDER: "#6366f1", MESSAGE: "#0ea5e9", INQUIRY: "#8b5cf6", PROMO: "#f59e0b", SYSTEM: "#64748b",
    COMPLAINT: "#ef4444", BOOKING: "#14b8a6", REFERRAL: "#10b981",
  } as Record<string, string>)[type] || "#6366f1";
  // «5 dəq əvvəl», «Dünən», «12 sen» — qısa nisbi vaxt.
  const ago = (iso: string) => {
    const d = new Date(iso); const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "indicə";
    if (diff < 3600) return `${Math.floor(diff / 60)} dəq əvvəl`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat əvvəl`;
    if (diff < 172800) return "dünən";
    const M = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
    return `${d.getDate()} ${M[d.getMonth()]}`;
  };
  const shown = onlyUnread ? notifs.filter((n) => !n.read) : notifs;

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={openBell}
        className="nav-glass relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-white/90 hover:text-white"
        title={t('notifications')}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={
            /* `text-foreground` MÜTLƏQDİR: panel header-in içindədir və oradan
               AĞ mətn rəngini miras alırdı — ağ kartda bildiriş başlıqları
               işıqlı rejimdə ümumiyyətlə görünmürdü. */
            narrow
              ? 'umenu fixed left-3 right-3 max-h-[75vh] text-foreground z-50 flex flex-col'
              : 'umenu absolute right-0 mt-2.5 w-[360px] max-h-[540px] text-foreground z-50 flex flex-col'
          }
          style={narrow ? { top: panelTop } : undefined}
        >
          {/* Başlıq — profil kartlarının brend zolağı */}
          <div className="brand-band shrink-0 px-4 pt-3 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-white/20 ring-1 ring-white/30 flex items-center justify-center shrink-0">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="brand-band-kicker">tradixai · bildirişlər</p>
                <p className="font-bold text-[15px] leading-tight">{t('notifications')}{unreadCount > 0 ? <span className="ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-white/25 align-middle">{unreadCount} yeni</span> : null}</p>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAll} className="umenu-pill shrink-0 text-[11px] font-semibold px-2.5 py-1.5 bg-white/15 hover:bg-white/25 ring-1 ring-white/25 transition-colors">
                  ✓ {t('markAllRead')}
                </button>
              )}
            </div>
            <div className="mt-2.5 flex gap-1 p-1 rounded-full bg-white/12 ring-1 ring-white/15 w-fit">
              {([["all", "Hamısı"], ["unread", `Oxunmamış${unreadCount ? ` · ${unreadCount}` : ""}`]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setOnlyUnread(k === "unread")}
                  className={`umenu-pill text-[11.5px] font-semibold px-3 py-1 transition-colors ${(k === "unread") === onlyUnread ? "bg-white text-[var(--brand-to)]" : "text-white/85 hover:text-white"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto orders-scroll p-1.5">
            {shown.length === 0 ? (
              <div className="py-10 px-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-to)] flex items-center justify-center text-xl mb-2">🔔</div>
                <p className="text-sm font-semibold">{onlyUnread ? "Oxunmamış bildiriş yoxdur" : t('noNotifications')}</p>
                <p className="text-xs text-muted mt-0.5">Yeni hadisə olanda burada görünəcək.</p>
              </div>
            ) : (
              shown.map(n => (
                <Link
                  key={n.id}
                  href={n.link || '#'}
                  onClick={() => { if (!n.read) markRead(n.id); setOpen(false); }}
                  className={`umenu-notif group relative flex gap-3 p-2.5 ${!n.read ? 'is-unread' : ''}`}
                >
                  <span className="umenu-chip" style={{ ["--c" as any]: toneFor(n.type) }}>{iconFor(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className={`text-[13px] leading-snug flex-1 min-w-0 ${!n.read ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">{ago(n.createdAt)}</span>
                    </div>
                    {n.body && <p className="text-xs text-muted line-clamp-2 mt-0.5">{n.body}</p>}
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full shrink-0 mt-1.5 bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)]" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
