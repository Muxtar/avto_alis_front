'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { useToast } from '@/components/Toast';
import { API, imgUrl } from '@/lib/api';
import OrderMap from '@/components/OrderMapWrapper';
import { yangoLabel } from '@/lib/yangoStatus';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, isLoggedIn, authLoading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [hasRated, setHasRated] = useState(false);
  const [yango, setYango] = useState<any>(null); // /yango/status cavabı: performer, status, courierPosition
  const [redispatching, setRedispatching] = useState(false);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  // Qeyd: status dəyişimi toast-ı qlobal olaraq Navbar-da (socket "order:yango")
  // göstərilir — burada təkrar etmirik ki, dublikat olmasın.

  // Satıcı: göndərmə uğursuz olubsa yenidən Yango-ya göndər.
  const redispatch = async () => {
    setRedispatching(true);
    try {
      const r = await fetch(`${API}/orders/${params.id}/yango/dispatch`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json());
      if (r?.success) { toast("Kuryerə göndərildi ✓", "success"); fetchOrder(true); }
      else toast(r?.message || "Göndərilə bilmədi", "error");
    } catch { toast(t("error"), "error"); } finally { setRedispatching(false); }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push('/'); return; }
    fetchOrder();

    // SHIPPED ise her 10 saniyede bir refresh et (canli konum)
    refreshTimer.current = setInterval(() => {
      fetchOrder(true);
    }, 10000);

    return () => { if (refreshTimer.current) clearInterval(refreshTimer.current); };
  }, [isLoggedIn, authLoading, params.id]);

  const fetchOrder = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API}/orders/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.order) setOrder(data.order);
    } catch { if (!silent) toast(t('error'), 'error'); }
    if (!silent) setLoading(false);
  };

  // Yango canlı izləmə — kuryer aktiv ikən hər 12 saniyədə mövqeyi yenilə.
  useEffect(() => {
    if (!order?.yangoClaimId) return;
    const done = ['delivered', 'delivered_finish', 'cancelled', 'cancelled_by_taxi', 'failed'];
    // Kuryer məlumatı + statusu çək (performer, courierPosition) və yadda saxla.
    const pull = async () => {
      try {
        const r = await fetch(`${API}/orders/${params.id}/yango/status`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json());
        if (r?.success) setYango(r);
      } catch { /* yum */ }
      fetchOrder(true);
    };
    pull(); // dərhal bir dəfə (12s gözləmədən)
    if (done.includes(order.yangoStatus)) return;
    const id = setInterval(pull, 12000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [order?.yangoClaimId, order?.yangoStatus, params.id]);

  const submitRating = async () => {
    if (ratingValue < 1) { toast('Rating seçin', 'error'); return; }
    setSubmittingRating(true);
    try {
      const res = await fetch(`${API}/orders/${params.id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: ratingValue, comment: ratingComment }),
      });
      const data = await res.json();
      if (data.success) {
        toast(t('ratingSubmitted'), 'success');
        setHasRated(true);
      } else toast(data.message, 'error');
    } catch { toast(t('error'), 'error'); }
    setSubmittingRating(false);
  };

  if (authLoading || loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!order) {
    return <div className="max-w-4xl mx-auto p-6 text-center text-muted">Sifariş tapılmadı</div>;
  }

  const workplace = order.seller?.workplaces?.[0];
  const sellerLat = workplace?.latitude;
  const sellerLng = workplace?.longitude;
  const showMap = order.status !== 'PENDING' && order.status !== 'CANCELLED';

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400',
    CONFIRMED: 'bg-blue-500/20 text-blue-400',
    SHIPPED: 'bg-purple-500/20 text-purple-400',
    DELIVERED: 'bg-green-500/20 text-green-400',
    CANCELLED: 'bg-red-500/20 text-red-400',
  };

  const statusLabels: Record<string, string> = {
    PENDING: t('orderPending'),
    CONFIRMED: t('orderConfirmed'),
    SHIPPED: t('orderShipped'),
    DELIVERED: t('orderDelivered'),
    CANCELLED: t('orderCancelled'),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <Link href="/orders" className="text-muted text-sm hover:text-foreground inline-flex items-center gap-1">
        ← {t('orders')}
      </Link>

      {/* Header */}
      <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{t('orderNumber')}{order.id}</h1>
            <p className="text-xs text-muted mt-1">{new Date(order.createdAt).toLocaleString('az-AZ')}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
            {statusLabels[order.status]}
          </span>
        </div>

        {/* Canlı Yango alt-statusu (kuryer axtarılır / yolda / ünvanınızda …) */}
        {yango?.dispatched && yango.status && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="font-medium">🛵 {yangoLabel(yango.status)}</span>
          </div>
        )}

        {/* Göndərmə uğursuz olub (kuryer tapılmadı / ünvan yoxdur) — satıcıya təkrar düyməsi */}
        {order.deliveryMethod === 'COURIER' && !order.yangoClaimId && order.yangoError && ['CONFIRMED', 'SHIPPED'].includes(order.status) && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm">
            <p className="text-red-500 font-medium">⚠️ Kuryerə göndərilmədi</p>
            <p className="text-xs text-muted mt-0.5">{order.yangoError}</p>
            {user?.id === order.sellerId && (
              <button onClick={redispatch} disabled={redispatching} className="mt-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                {redispatching ? '...' : '🔄 Yenidən göndər'}
              </button>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-card-border grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted">{t('buyer')}</p>
            <p>{order.buyer?.name}</p>
            {order.buyer?.phone && <a href={`tel:${order.buyer.phone}`} className="block text-xs text-orange-500 hover:underline">📞 {order.buyer.phone}</a>}
            {/* Sifariş yazışması İŞ axınına gedir — şəxsi söhbətlə qarışmasın. */}
            {user?.id !== order.buyerId && order.buyerId && (
              <Link href={`/messages?chat=${order.buyerId}&seg=BUSINESS&name=${encodeURIComponent(order.buyer?.name || '')}`} className="block text-xs text-orange-500 hover:underline mt-0.5">💬 Mesaj yaz</Link>
            )}
          </div>
          <div>
            <p className="text-xs text-muted">{t('courierSeller')}</p>
            <p>{order.seller?.name}</p>
            {order.seller?.phone && <a href={`tel:${order.seller.phone}`} className="block text-xs text-orange-500 hover:underline">📞 {order.seller.phone}</a>}
            {user?.id !== order.sellerId && order.sellerId && (
              <Link href={`/messages?chat=${order.sellerId}&seg=BUSINESS&name=${encodeURIComponent(order.seller?.name || '')}`} className="block text-xs text-orange-500 hover:underline mt-0.5">💬 Mesaj yaz</Link>
            )}
          </div>
          {/* Yango kuryeri — təyin olunanda ad + maşın. Kuryer alıcıya ÖZÜ zəng edir
              (telefon ona ötürülüb); Yango kuryerin nömrəsini məxfilik üçün vermir. */}
          {yango?.performer && (
            <div className="col-span-2 pt-2 border-t border-card-border/50">
              <p className="text-xs text-muted">🛵 Yango kuryeri</p>
              <p className="font-medium">
                {yango.performer.courier_name || 'Kuryer'}
                {yango.performer.car_model ? <span className="text-muted font-normal"> · {yango.performer.car_model} {yango.performer.car_number || ''}</span> : null}
              </p>
              <p className="text-[11px] text-muted mt-0.5">Kuryer çatanda sizə zəng edəcək — telefonunuz ona ötürülüb.</p>
            </div>
          )}
        </div>
      </div>

      {/* Map - canli takip */}
      {showMap && (sellerLat || order.latitude || order.courierLat) && (
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-card-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">📍 {t('liveTracking')}{order.yangoClaimId ? ' · 🛵 Yango' : ''}</h2>
            {order.courierLat && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {t('liveLocationActive')}
              </span>
            )}
          </div>
          <OrderMap
            courierLat={order.courierLat}
            courierLng={order.courierLng}
            buyerLat={order.latitude}
            buyerLng={order.longitude}
            sellerLat={sellerLat}
            sellerLng={sellerLng}
            courierLabel={order.courier?.name || 'Kuryer'}
            buyerLabel={order.buyer?.name}
            sellerLabel={order.seller?.name}
            height="400px"
          />
          {!order.courierLat && order.status === 'SHIPPED' && (
            <div className="p-3 text-center text-xs text-muted">{t('courierNotSharingYet')}</div>
          )}
        </div>
      )}

      {/* Address */}
      {order.address && (
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <p className="text-xs text-muted mb-1">{t('deliveryAddress')}</p>
          <p className="text-sm">{order.address}</p>
          {order.phone && <p className="text-xs text-muted mt-1">{order.phone}</p>}
        </div>
      )}

      {/* Items */}
      <div className="bg-card border border-card-border rounded-2xl p-4">
        <h2 className="font-semibold text-sm mb-3">{t('courierProducts')}</h2>
        <div className="space-y-2">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 p-2 border border-card-border/50 rounded-lg">
              {item.listing?.images?.[0] && (
                <img src={item.listing.images[0].startsWith('http') ? item.listing.images[0] : `${imgUrl(item.listing.images[0])}`} alt="" className="w-12 h-12 object-cover rounded" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted">{item.quantity} × {item.price} AZN</p>
              </div>
              <p className="text-sm font-bold text-orange-500">{(item.quantity * item.price).toFixed(2)} AZN</p>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t border-card-border space-y-1 text-sm">
          {order.subtotal !== null && order.subtotal !== undefined && (
            <div className="flex justify-between text-muted">
              <span>Ara toplam</span>
              <span>{Number(order.subtotal).toFixed(2)} AZN</span>
            </div>
          )}
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-green-500">
              <span>{t('promoDiscount')}</span>
              <span>−{Number(order.discountAmount).toFixed(2)} AZN</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-1">
            <span>{t('cartTotal')}</span>
            <span className="text-orange-500">{Number(order.total).toFixed(2)} AZN</span>
          </div>
          {order.pointsEarned > 0 && (
            <div className="text-xs text-blue-500 text-right">+{order.pointsEarned} {t('points')}</div>
          )}
        </div>
      </div>

      {/* Rating (only for DELIVERED orders, only the buyer can rate) */}
      {order.status === 'DELIVERED' && user?.id === order.buyerId && !hasRated && (
        <div className="bg-card border border-card-border rounded-2xl p-4">
          <h2 className="font-semibold text-sm mb-3">⭐ {t('rateSeller')}</h2>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRatingValue(n)} className="text-2xl">
                <span className={n <= ratingValue ? 'text-amber-400' : 'text-muted-foreground/30'}>★</span>
              </button>
            ))}
          </div>
          <textarea
            value={ratingComment}
            onChange={e => setRatingComment(e.target.value)}
            placeholder={t('commentPlaceholder')}
            rows={2}
            className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm resize-none mb-3"
          />
          <button
            onClick={submitRating}
            disabled={submittingRating || ratingValue < 1}
            className="w-full py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {submittingRating ? '...' : t('writeReview')}
          </button>
        </div>
      )}
    </div>
  );
}
