"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

export default function AdminOrdersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
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
    fetch(`${API}/admin/orders?status=${statusFilter}&page=${page}`, { headers })
      .then((r) => r.json())
      .then((o) => {
        setOrders(o.orders || []);
        setTotalPages(o.totalPages || 1);
      }).catch(() => { toast(t('error'), 'error'); }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter, page]);

  const changeStatus = async (orderId: number, status: string) => {
    // Ləğv = alıcıya pulun qaytarılması. Admin bunu bilərək təsdiqləsin.
    if (status === "CANCELLED" && !confirm(`Sifariş #${orderId} ləğv edilsin?\n\nKartla ödənilibsə pul avtomatik alıcıya qaytarılacaq və satıcının qazanc qeydi geri alınacaq.`)) return;
    try {
      const res = await fetch(`${API}/admin/orders/${orderId}/status`, {
        method: "PUT", headers, body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Pul qaytarılmasa admin dərhal bilməlidir (fon işi təkrar cəhd edir).
        if (data.refundPending) toast(data.message || "Ləğv edildi, lakin qaytarma alınmadı — təkrar cəhd ediləcək", "error");
        else toast(status === "CANCELLED" ? "Ləğv edildi — ödəniş qaytarıldı" : (t("adminStatusUpdated") || "Status yeniləndi"), "success");
        fetchData();
      }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  const refundOrder = async (orderId: number, total: number) => {
    if (!confirm(`${t("adminRefundConfirm") || "Bu sifariş kartına geri qaytarılsın?"} (${total.toFixed(2)} AZN)`)) return;
    try {
      const res = await fetch(`${API}/payment/refund/${orderId}`, { method: "POST", headers, body: JSON.stringify({}) });
      const data = await res.json();
      if (res.ok && data.success) { toast(t("adminRefunded") || "İadə edildi ✓", "success"); fetchData(); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  // Tək sifarişi sil. Server ödənilmiş sifarişi rədd edir (maliyyə sənədidir) —
  // burada da eyni şərti göstərib admini boş yerə klikləməyə məcbur etmirik.
  const deleteOrder = async (order: any) => {
    if (!confirm(
      `Sifariş #${order.id} HƏMİŞƏLİK silinsin?\n\n` +
      `Məhsul sətirləri, qaytarma sorğusu və satıcı hesablaşma qeydi də silinir. ` +
      `Bu əməliyyat geri qaytarıla bilmir.`
    )) return;
    try {
      const res = await fetch(`${API}/admin/orders/${order.id}`, { method: "DELETE", headers });
      const data = await res.json();
      if (!res.ok || !data.success) { toast(data.message || t("error"), "error"); return; }
      toast(`Sifariş #${order.id} silindi`, "success");
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch { toast(t("error"), "error"); }
  };

  // Toplu təmizlik — ödənilməmiş, ləğv olunmuş köhnə sifarişlər.
  // Əvvəlcə dryRun ilə neçə sətir gedəcəyini soruşuruq: admin rəqəmi görmədən
  // toplu silməyə razılıq verməməlidir.
  const [cleaning, setCleaning] = useState(false);
  const cleanupOrders = async () => {
    const ans = prompt("Neçə gündən köhnə, ödənilməmiş və ləğv olunmuş sifarişlər silinsin?\n(gün sayı — 0 yazsanız hamısı)", "30");
    if (ans === null) return;
    const days = parseInt(ans);
    if (!Number.isFinite(days) || days < 0) { toast("Yanlış gün sayı", "error"); return; }
    setCleaning(true);
    try {
      const probe = await fetch(`${API}/admin/orders/cleanup`, {
        method: "POST", headers, body: JSON.stringify({ days, dryRun: true }),
      }).then((r) => r.json());
      if (!probe.success) { toast(probe.message || t("error"), "error"); return; }
      if (!probe.count) { toast("Silinəcək sifariş yoxdur", "success"); return; }
      if (!confirm(
        `${probe.count} sifariş silinəcək (${days} gündən köhnə, ödənilməmiş və ləğv olunmuş).\n\n` +
        `Ödənilmiş və iadə edilmiş sifarişlərə TOXUNULMUR.\n\nDavam edilsin?`
      )) return;
      const res = await fetch(`${API}/admin/orders/cleanup`, {
        method: "POST", headers, body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { toast(data.message || t("error"), "error"); return; }
      toast(`${data.deleted} sifariş silindi ✓`, "success");
      fetchData();
    } catch { toast(t("error"), "error"); }
    finally { setCleaning(false); }
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
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">{t("adminOrders")}</h1>
        <button onClick={cleanupOrders} disabled={cleaning}
          title="Ödənilməmiş, ləğv olunmuş köhnə sifarişləri toplu sil"
          className="px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-semibold hover:bg-red-500/20 disabled:opacity-50">
          {cleaning ? "..." : "🧹 Köhnələri təmizlə"}
        </button>
      </div>

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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${statusColor(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                  {/* Ödəniş statusu */}
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-medium border ${
                    order.paymentStatus === "PAID" ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : order.paymentStatus === "REFUNDED" ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                    : order.paymentStatus === "FAILED" ? "bg-red-500/10 text-red-500 border-red-500/20"
                    : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                  }`}>
                    {order.paymentMethod === "CARD" ? "💳" : order.paymentMethod === "WALLET" ? "👝" : "💵"} {order.paymentStatus}
                  </span>
                  <span className="text-orange-500 font-bold text-sm">{order.total.toFixed(2)} AZN</span>
                  {/* İadə et — yalnız kartla ödənilmiş sifarişlər üçün */}
                  {order.gatewayOrderId && order.paymentStatus === "PAID" && (
                    <button onClick={() => refundOrder(order.id, order.total)}
                      className="px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-medium hover:bg-red-500/20">
                      {t("adminRefund") || "İadə et"}
                    </button>
                  )}
                  {/* Sil — yalnız pul sistemə girməmiş sifarişlər.
                      Ödənilmiş sifariş maliyyə sənədidir: əvvəlcə iadə. */}
                  {order.paymentStatus !== "PAID" && (
                    <button onClick={() => deleteOrder(order)}
                      title="Sifarişi həmişəlik sil"
                      className="px-2.5 py-1 bg-input-bg border border-input-border text-muted rounded-lg text-xs font-medium hover:text-red-500 hover:border-red-500/40">
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {/* NİYƏ BU SİFARİŞ «YOXDUR» — server izahı.
                  Panel bütün sətirləri göstərir, tərəflərin siyahısı isə yox:
                  ödənilməmiş kart sifarişi, uğursuz ödəniş və ya tərəfin
                  gizlətdiyi sifariş admin üçün «xəyal» kimi görünürdü. */}
              {Array.isArray(order.adminNotes) && order.adminNotes.length > 0 && (
                <div className="px-4 pt-3 flex flex-col gap-1">
                  {order.adminNotes.map((n: string, i: number) => (
                    <p key={i} className="text-[11px] text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                      ⚠️ {n}
                    </p>
                  ))}
                </div>
              )}

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

              {/* Status dəyişdir */}
              <div className="p-4 border-t border-card-border flex items-center gap-3 flex-wrap">
                <p className="text-sm font-medium">{t("adminChangeStatus") || "Status"}:</p>
                <select
                  value={order.status}
                  onChange={(e) => changeStatus(order.id, e.target.value)}
                  className="px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  {["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
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
