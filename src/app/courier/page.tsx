"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

export default function CourierDashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, token, isLoggedIn, authLoading, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [courier, setCourier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sharing, setSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn || user?.type !== "COURIER") { router.push("/"); return; }

    Promise.all([
      fetch(`${API}/courier/profile`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch(`${API}/courier/orders`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }).then((r) => r.json()),
    ]).then(([p, o]) => {
      setCourier(p.courier);
      setOrders(o.orders || []);
    }).catch(() => {
      router.push("/");
    }).finally(() => setLoading(false));
  }, [isLoggedIn, authLoading]);

  const fetchOrders = (filter?: string) => {
    const f = filter ?? statusFilter;
    fetch(`${API}/courier/orders?status=${f}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => { toast(t('error'), 'error'); });
  };

  const updateStatus = async (orderId: number, status: string) => {
    await fetch(`${API}/courier/orders/${orderId}/status`, {
      method: "PUT", headers: getHeaders(), body: JSON.stringify({ status }),
    });
    fetchOrders();
  };

  // Aktif siparislere konum gonder (SHIPPED durumundakilere)
  const sendLocationToOrders = async (lat: number, lng: number) => {
    const activeOrders = orders.filter(o => o.status === 'SHIPPED' || o.status === 'CONFIRMED');
    for (const o of activeOrders) {
      fetch(`${API}/orders/${o.id}/courier-location`, {
        method: 'PUT', headers: getHeaders(), body: JSON.stringify({ lat, lng }),
      }).catch(() => {});
    }
  };

  // Canli konum paylas/durdur
  const toggleLocationSharing = () => {
    if (sharing) {
      setSharing(false);
      return;
    }
    if (!navigator.geolocation) {
      toast('Brauzer konum xidmətini dəstəkləmir', 'error');
      return;
    }
    setSharing(true);
    toast(t('locationSharingStarted'), 'success');
  };

  // watchPosition ile canli konum
  useEffect(() => {
    if (!sharing) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        sendLocationToOrders(latitude, longitude);
      },
      (err) => {
        console.error('Geolocation error:', err.message);
        toast(t('locationError'), 'error');
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [sharing, orders]);

  const handleFilterChange = (s: string) => {
    setStatusFilter(s);
    fetchOrders(s);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "CONFIRMED": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "SHIPPED": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "DELIVERED": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "CANCELLED": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return t("orderPending");
      case "CONFIRMED": return t("orderConfirmed");
      case "SHIPPED": return t("orderShipped");
      case "DELIVERED": return t("orderDelivered");
      case "CANCELLED": return t("orderCancelled");
      default: return status;
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const statuses = ["all", "CONFIRMED", "SHIPPED", "DELIVERED"];

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            {courier?.name?.charAt(0) || "K"}
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("courierDashboard")}</h1>
            <p className="text-muted text-sm">{courier?.name} - {courier?.phone}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleLocationSharing}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              sharing
                ? 'bg-green-500 text-white animate-pulse'
                : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
            }`}
          >
            {sharing ? `🟢 ${t("locationSharing")}` : `📍 ${t("shareLocation")}`}
          </button>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm font-medium hover:bg-red-500/20">
            {t("logout")}
          </button>
        </div>
      </div>

      {sharing && currentLocation && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-500">
          📡 {t("locationBroadcast")}: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card border border-card-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{orders.length}</p>
          <p className="text-xs text-muted">{t("courierTotalOrders")}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-500">{orders.filter((o) => o.status === "SHIPPED").length}</p>
          <p className="text-xs text-muted">{t("courierInTransit")}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{orders.filter((o) => o.status === "DELIVERED").length}</p>
          <p className="text-xs text-muted">{t("courierDelivered")}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap bg-input-bg border border-input-border rounded-xl p-1 mb-6 w-fit">
        {statuses.map((s) => (
          <button key={s} onClick={() => handleFilterChange(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>
            {s === "all" ? t("all") : statusLabel(s)}
          </button>
        ))}
      </div>

      {/* Orders */}
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-card border border-card-border rounded-2xl text-muted">
          <svg className="w-16 h-16 text-muted-foreground/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          <p>{t("courierNoOrders")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-card border border-card-border rounded-2xl overflow-hidden">
              {/* Order Header */}
              <div className="p-4 border-b border-card-border flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-sm">{t("orderNumber")} {order.id}</p>
                  <p className="text-muted text-xs">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${statusColor(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                  <span className="text-orange-500 font-bold text-sm">{order.total.toFixed(2)} AZN</span>
                </div>
              </div>

              {/* Items */}
              <div className="p-4 space-y-2">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{t("courierProducts")}</p>
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm bg-input-bg/50 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-muted text-xs">x{item.quantity} - {item.price.toFixed(2)} AZN</p>
                    </div>
                    <span className="font-semibold text-sm">{(item.price * item.quantity).toFixed(2)} AZN</span>
                  </div>
                ))}
              </div>

              {/* Delivery Info */}
              <div className="p-4 border-t border-card-border bg-input-bg/30">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pickup from Seller */}
                  <div className="bg-card border border-card-border rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                      </div>
                      <p className="text-xs font-semibold text-blue-500 uppercase">{t("courierPickup")}</p>
                    </div>
                    <p className="font-medium text-sm">{order.seller.name}</p>
                    <p className="text-muted text-xs flex items-center gap-1 mt-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                      {order.seller.phone}
                    </p>
                  </div>

                  {/* Deliver to Buyer */}
                  <div className="bg-card border border-card-border rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      </div>
                      <p className="text-xs font-semibold text-green-500 uppercase">{t("courierDeliver")}</p>
                    </div>
                    <p className="font-medium text-sm">{order.buyer.name}</p>
                    <p className="text-muted text-xs flex items-center gap-1 mt-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                      {order.buyer.phone}
                    </p>
                    {order.address && (
                      <p className="text-muted text-xs flex items-center gap-1 mt-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                        {order.address}
                      </p>
                    )}
                    {order.phone && (
                      <p className="text-muted text-xs flex items-center gap-1 mt-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                        {order.phone}
                      </p>
                    )}
                  </div>
                </div>
                {order.note && (
                  <div className="mt-3 px-3 py-2 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                    <p className="text-xs text-yellow-600">{t("orderNote")}: {order.note}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                <div className="p-3 border-t border-card-border flex gap-2 flex-wrap">
                  {(order.status === "CONFIRMED") && (
                    <button onClick={() => updateStatus(order.id, "SHIPPED")}
                      className="px-4 py-2 bg-purple-500/10 text-purple-500 rounded-lg text-xs font-medium hover:bg-purple-500/20 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
                      {t("courierMarkShipped")}
                    </button>
                  )}
                  {order.status === "SHIPPED" && (
                    <button onClick={() => updateStatus(order.id, "DELIVERED")}
                      className="px-4 py-2 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20 flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {t("courierMarkDelivered")}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
