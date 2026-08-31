'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { API } from '@/lib/api';

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
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={openBell}
        className="relative p-1.5 rounded-md text-white/85 hover:text-white hover:ring-1 hover:ring-white/40 transition-colors"
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
        <div className="absolute right-0 mt-2 w-80 max-h-[500px] bg-card border border-card-border rounded-xl shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between p-3 border-b border-card-border">
            <span className="font-semibold text-sm">{t('notifications')}</span>
            {unreadCount > 0 && (
              <button onClick={markAll} className="text-xs text-orange-500 hover:text-orange-400">
                {t('markAllRead')}
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[420px]">
            {notifs.length === 0 ? (
              <div className="p-6 text-center text-muted text-sm">{t('noNotifications')}</div>
            ) : (
              notifs.map(n => (
                <Link
                  key={n.id}
                  href={n.link || '#'}
                  onClick={() => { if (!n.read) markRead(n.id); setOpen(false); }}
                  className={`flex gap-3 p-3 border-b border-card-border/50 hover:bg-input-bg transition-colors ${!n.read ? 'bg-orange-500/5' : ''}`}
                >
                  <span className="text-xl">{iconFor(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString('az-AZ')}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-2" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
