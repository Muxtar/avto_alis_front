'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/Toast';
import { API, imgUrl } from '@/lib/api';
import Link from 'next/link';

export default function FavoritesPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token, isLoggedIn, authLoading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push('/'); return; }
    fetchData();
  }, [isLoggedIn, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/favorites`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFavorites(data.favorites || []);
    } catch { toast(t('error'), 'error'); }
    setLoading(false);
  };

  const remove = async (listingId: number) => {
    try {
      await fetch(`${API}/favorites/${listingId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites(prev => prev.filter(f => f.listingId !== listingId));
      toast(t('removedFromFavorites'), 'success');
    } catch { toast(t('error'), 'error'); }
  };

  if (authLoading || !isLoggedIn) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="page-wrap py-4 sm:py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{t('favorites')}</h1>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
          <p>{t('noFavorites')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {favorites.map(fav => (
            <div key={fav.id} className="surface overflow-hidden group relative">
              <Link href={`/marketplace/${fav.listingId}`}>
                <div className="aspect-[4/3] bg-input-bg overflow-hidden">
                  {fav.listing.images?.[0] ? (
                    <img src={fav.listing.images[0].startsWith('http') ? fav.listing.images[0] : `${imgUrl(fav.listing.images[0])}`} alt={fav.listing.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm line-clamp-2">{fav.listing.title}</p>
                  <p className="text-orange-500 font-bold text-sm mt-1">{fav.listing.price} AZN</p>
                  <p className="text-muted text-xs mt-1">{fav.listing.user?.name}</p>
                </div>
              </Link>
              <button onClick={() => remove(fav.listingId)} className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full text-white hover:bg-red-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
