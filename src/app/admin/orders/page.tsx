"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

export default function AdminOrdersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const headers: any = {
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`,
    "Content-Type": "application/json",
  };

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/admin/orders?status=${statusFilter}&page=${page}`, { headers }).then((r) => r.json()),
      fetch(`${API}/admin/couriers`, { headers }).then((r) => r.json()),
    ]).then(([o, c]) => {
      setOrders(o.orders || []);
      setTotalPages(o.totalPages || 1);
      setCouriers(c.couriers || []);
    }).catch(() => { toast(t('error'), 'error'); }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter, page]);

  const assignCourier = async (orderId: number, courierId: string) => {
    await fetch(`${API}/admin/orders/${orderId}/assign-courier`, {
      method: "PUT", headers, body: JSON.stringify({ courierId: courierId || null }),
    });
    fetchData();
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

  const statuses = ["all", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-6">{t("adminOrders")}</h1>

      {/* Status Filter */}
      <div className="flex gap-1.5 flex-wrap bg-input-bg border border-input-border rounded-xl p-1 mb-6 w-fit">
        {statuses.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>
            {s === "all" ? t("all") : statusLabel(s)}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 bg-card border border-card-border rounded-2xl text-muted">
          <p>{t("adminNoData")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-card border border-card-border rounded-2xl overflow-hidden">
              {/* Header */}
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
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-muted text-xs">x{item.quantity}</p>
                    </div>
                    <span className="text-muted">{(item.price * item.quantity).toFixed(2)} AZN</span>
                  </div>
                ))}
              </div>

              {/* Buyer / Seller / Address */}
              <div className="p-4 border-t border-card-border bg-input-bg/30 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-muted text-xs">{t("courierBuyer")}</p>
                    <p className="font-medium">{order.buyer.name}</p>
                    <p className="text-muted text-xs">{order.buyer.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">{t("courierSeller")}</p>
                    <p className="font-medium">{order.seller.name}</p>
                    <p className="text-muted text-xs">{order.seller.phone}</p>
                  </div>
                  {order.address && (
                    <div>
                      <p className="text-muted text-xs">{t("deliveryAddress")}</p>
                      <p className="font-medium text-xs">{order.address}</p>
                    </div>
                  )}
                </div>
                {order.note && <p className="text-muted text-xs mt-2">{order.note}</p>}
              </div>

              {/* Courier Assignment */}
              <div className="p-4 border-t border-card-border flex items-center gap-3 flex-wrap">
                <p className="text-sm font-medium">{t("courierAssign")}:</p>
                <select
                  value={order.courier?.id || ""}
                  onChange={(e) => assignCourier(order.id, e.target.value)}
                  className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  <option value="">{t("courierNone")}</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
                {order.courier && (
                  <span className="px-2.5 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg text-xs font-medium">
                    {order.courier.name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium ${page === p ? "bg-orange-500 text-white" : "bg-input-bg border border-input-border text-muted hover:text-foreground"}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
