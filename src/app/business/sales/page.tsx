"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

interface Scope { businessId: number; objectId: number | null; label: string; owned: boolean }
const STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

export default function BusinessSalesPage() {
  const router = useRouter();
  const { token, authLoading, isLoggedIn } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [active, setActive] = useState<Scope | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const authH: any = { Authorization: `Bearer ${token}` };

  const loadScopes = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, managed] = await Promise.all([
        fetch(`${API}/me/businesses`, { headers: authH }).then((r) => r.json()),
        fetch(`${API}/me/managed`, { headers: authH }).then((r) => r.json()),
      ]);
      const list: Scope[] = [];
      (mine.businesses || []).forEach((b: any) => {
        list.push({ businessId: b.id, objectId: null, label: `${b.name} — ${t("bizAll") || "hamısı"}`, owned: true });
        (b.objects || []).forEach((o: any) => list.push({ businessId: b.id, objectId: o.id, label: `${b.name} → ${o.name}`, owned: true }));
      });
      (managed.memberships || []).forEach((m: any) => {
        list.push({ businessId: m.business.id, objectId: m.object?.id ?? null, label: `${m.business.name}${m.object ? " → " + m.object.name : " — " + (t("bizAll") || "hamısı")} (${t("bizManaged") || "həvalə"})`, owned: false });
      });
      setScopes(list);
      // ?objectId= ilə birbaşa o obyektin sifarişlərinə keç (biznes səhifəsindən klik).
      const preObjId = new URLSearchParams(window.location.search).get("objectId");
      if (list.length > 0 && !active) {
        const pre = preObjId ? list.find((s) => String(s.objectId) === preObjId) : null;
        setActive(pre || list[0]);
      }
    } catch { toast(t("error"), "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadOrders = useCallback(async (s: Scope) => {
    setOrdersLoading(true);
    try {
      const q = s.objectId ? `?objectId=${s.objectId}` : "";
      const res = await fetch(`${API}/me/businesses/${s.businessId}/orders${q}`, { headers: authH });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch { toast(t("error"), "error"); } finally { setOrdersLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    loadScopes();
  }, [authLoading, isLoggedIn, loadScopes, router]);

  useEffect(() => { if (active) loadOrders(active); }, [active, loadOrders]);

  const changeStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`${API}/me/business-orders/${orderId}/status`, { method: "PUT", headers: { ...authH, "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await res.json();
      if (res.ok && data.success) { toast(t("adminStatusUpdated") || "Status yeniləndi", "success"); if (active) loadOrders(active); }
      else toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  const statusColor = (s: string) => s === "DELIVERED" ? "text-green-500" : s === "CANCELLED" ? "text-red-500" : s === "SHIPPED" ? "text-purple-500" : s === "CONFIRMED" ? "text-blue-500" : "text-yellow-600";

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-1">{t("bizSales") || "Satış pəncərəsi"}</h1>
      <p className="text-muted text-sm mb-5">{t("bizSalesDesc") || "Biznes və obyektlərinizə gələn sifarişləri idarə edin."}</p>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : scopes.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center text-muted">{t("bizNoSales") || "Sizə aid biznes/obyekt yoxdur"}</div>
      ) : (
        <>
          {/* Scope seçimi */}
          <div className="flex gap-2 flex-wrap mb-5">
            {scopes.map((s, i) => {
              const isActive = active?.businessId === s.businessId && active?.objectId === s.objectId;
              return (
                <button key={i} onClick={() => setActive(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${isActive ? "bg-orange-500 text-white border-orange-500" : "bg-input-bg border-input-border text-muted hover:text-foreground"}`}>{s.label}</button>
              );
            })}
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-12"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : orders.length === 0 ? (
            <div className="bg-card border border-card-border rounded-xl p-8 text-center text-muted">{t("adminNoData") || "Sifariş yoxdur"}</div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="bg-card border border-card-border rounded-xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm">{t("orderNumber") || "Sifariş"} #{o.id}</p>
                      <p className="text-xs text-muted">{o.buyer?.name} · {o.buyer?.phone} · {new Date(o.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-500 font-bold text-sm">{o.total?.toFixed(2)} AZN</p>
                      <p className={`text-xs font-medium ${statusColor(o.status)}`}>{o.status}</p>
                    </div>
                  </div>
                  <div className="text-sm space-y-0.5 mb-3">
                    {o.items?.map((it: any) => (
                      <div key={it.id} className="flex justify-between text-muted text-xs">
                        <span>{it.title} ×{it.quantity}</span>
                        <span>{(it.price * it.quantity).toFixed(2)} AZN</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap border-t border-card-border pt-2">
                    <span className="text-xs text-muted">{t("adminChangeStatus") || "Status"}:</span>
                    <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)} className="px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
