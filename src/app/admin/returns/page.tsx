"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

export default function AdminReturnsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [adminNotes, setAdminNotes] = useState<{ [key: number]: string }>({});
  const [refundAmounts, setRefundAmounts] = useState<{ [key: number]: string }>({});

  const headers: any = {
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`,
    "Content-Type": "application/json",
  };

  const fetchReturns = () => {
    setLoading(true);
    fetch(`${API}/admin/returns?status=${statusFilter}&page=${page}`, { headers })
      .then((r) => r.json())
      .then((d) => { setReturns(d.returns || []); setTotalPages(d.totalPages || 1); })
      .catch(() => { toast(t('error'), 'error'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReturns(); }, [statusFilter, page]);

  const override = async (returnId: number, status: string) => {
    await fetch(`${API}/admin/returns/${returnId}/override`, {
      method: "PUT", headers,
      body: JSON.stringify({ status, adminNote: adminNotes[returnId] || null, refundAmount: refundAmounts[returnId] || undefined }),
    });
    fetchReturns();
  };

  const returnStatusColor = (status: string) => {
    switch (status) {
      case "REQUESTED": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "APPROVED": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "REJECTED": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "RETURN_SHIPPED": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "RETURN_RECEIVED": return "bg-teal-500/10 text-teal-500 border-teal-500/20";
      case "REFUNDED": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "CANCELLED": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const returnStatusLabel = (status: string) => {
    switch (status) {
      case "REQUESTED": return t("returnRequested");
      case "APPROVED": return t("returnApproved");
      case "REJECTED": return t("returnRejected");
      case "RETURN_SHIPPED": return t("returnShipped");
      case "RETURN_RECEIVED": return t("returnReceived");
      case "REFUNDED": return t("returnRefunded");
      case "CANCELLED": return t("returnCancelled");
      default: return status;
    }
  };

  const returnReasonLabel = (reason: string) => {
    switch (reason) {
      case "DEFECTIVE": return t("returnReasonDefective");
      case "WRONG_ITEM": return t("returnReasonWrongItem");
      case "NOT_AS_DESCRIBED": return t("returnReasonNotAsDescribed");
      case "CHANGED_MIND": return t("returnReasonChangedMind");
      case "OTHER": return t("returnReasonOther");
      default: return reason;
    }
  };

  const statuses = ["all", "REQUESTED", "APPROVED", "REJECTED", "RETURN_SHIPPED", "RETURN_RECEIVED", "REFUNDED", "CANCELLED"];
  const inputCls = "w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm";

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-6">{t("adminReturns")}</h1>

      {/* Status Filter */}
      <div className="flex gap-1 flex-wrap bg-input-bg border border-input-border rounded-xl p-1 mb-6 w-fit">
        {statuses.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${statusFilter === s ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>
            {s === "all" ? t("all") : returnStatusLabel(s)}
          </button>
        ))}
      </div>

      {returns.length === 0 ? (
        <div className="text-center py-16 bg-card border border-card-border rounded-2xl text-muted">
          <p>{t("noReturns")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((ret) => (
            <div key={ret.id} className="bg-card border border-card-border rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-card-border flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold text-sm">{t("returnRequest")} #{ret.id} - {t("orderNumber")} {ret.orderId}</p>
                  <p className="text-muted text-xs">{new Date(ret.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${returnStatusColor(ret.status)}`}>
                    {returnStatusLabel(ret.status)}
                  </span>
                  {ret.refundAmount && <span className="text-orange-500 font-bold text-sm">{ret.refundAmount.toFixed(2)} AZN</span>}
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-2 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-muted text-xs">{t("courierBuyer")}</p>
                    <p className="font-medium">{ret.buyer.name}</p>
                    <p className="text-muted text-xs">{ret.buyer.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">{t("courierSeller")}</p>
                    <p className="font-medium">{ret.seller.name}</p>
                    <p className="text-muted text-xs">{ret.seller.phone}</p>
                  </div>
                  <div>
                    <p className="text-muted text-xs">{t("returnReason")}</p>
                    <p className="font-medium">{returnReasonLabel(ret.reason)}</p>
                    {ret.reasonText && <p className="text-muted text-xs">{ret.reasonText}</p>}
                  </div>
                </div>
                {ret.orderItem && (
                  <p className="text-xs text-muted">{ret.orderItem.title} x{ret.quantity}</p>
                )}
                {ret.sellerNote && <p className="text-xs text-red-400">{t("sellerNote")}: {ret.sellerNote}</p>}
                {ret.adminNote && <p className="text-xs text-blue-400">{t("adminNote")}: {ret.adminNote}</p>}
              </div>

              {/* Admin Override Actions */}
              {!['REFUNDED', 'CANCELLED'].includes(ret.status) && (
                <div className="p-4 border-t border-card-border space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted">{t("adminNote")}</label>
                      <input value={adminNotes[ret.id] ?? ""}
                        onChange={(e) => setAdminNotes({ ...adminNotes, [ret.id]: e.target.value })}
                        className={inputCls} placeholder="..." />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted">{t("refundAmount")}</label>
                      <input type="number" step="0.01" value={refundAmounts[ret.id] ?? ret.refundAmount?.toFixed(2) ?? ""}
                        onChange={(e) => setRefundAmounts({ ...refundAmounts, [ret.id]: e.target.value })}
                        className={inputCls} />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => override(ret.id, "APPROVED")}
                      className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-500/20">
                      {t("forceApprove")}
                    </button>
                    <button onClick={() => override(ret.id, "REJECTED")}
                      className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20">
                      {t("forceReject")}
                    </button>
                    <button onClick={() => override(ret.id, "REFUNDED")}
                      className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20">
                      {t("forceRefund")}
                    </button>
                  </div>
                </div>
              )}
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
