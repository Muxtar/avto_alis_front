"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useLive } from "@/lib/live";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

interface Scope { businessId: number; objectId: number | null; label: string; owned: boolean }
const STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
// Götürmədə «göndərmək» yoxdur — satıcı mağazada təhvil verir, alıcı təsdiqləyir.
const statusAz = (s: string, pickup: boolean) => ({
  PENDING: "Gözləyir", CONFIRMED: pickup ? "Qəbul edildi — hazırdır" : "Qəbul edildi",
  SHIPPED: pickup ? "Mağazada təhvil verdim" : "Göndərildi", DELIVERED: pickup ? "Götürüldü" : "Çatdırıldı", CANCELLED: "Ləğv edildi",
} as Record<string, string>)[s] || s;

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
  // İŞ BÖLGÜSÜ: sifarişi kim görür. `staff` — bu mağazada sifariş icazəli şəxslər.
  const [staff, setStaff] = useState<{ isOwner: boolean; me: number | null; staff: { id: number; name: string; owner: boolean }[] }>({ isOwner: false, me: null, staff: [] });
  const [who, setWho] = useState<"all" | "mine" | "free">("all");

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
      fetch(`${API}/me/businesses/${s.businessId}/order-staff${q}`, { headers: authH }).then((r) => r.json())
        .then((d) => { if (d?.success) setStaff({ isOwner: !!d.isOwner, me: d.me ?? null, staff: d.staff || [] }); }).catch(() => {});
    } catch { toast(t("error"), "error"); } finally { setOrdersLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    loadScopes();
  }, [authLoading, isLoggedIn, loadScopes, router]);

  useEffect(() => { if (active) loadOrders(active); }, [active, loadOrders]);

  // ANLIQ: yeni sifariş / status dəyişikliyi seçilmiş obyektin siyahısına düşsün.
  useLive(["order", "return"], () => { if (active) loadOrders(active); });
  useLive(["business", "object"], () => { loadScopes(); });

  const changeStatus = async (orderId: number, status: string, code?: string): Promise<void> => {
    try {
      // Eyni ünvan satıcı, biznes sahibi və səlahiyyətli işçi üçündür: ləğvdə
      // ödəniş qaytarılır, kuryer ləğv olunur, hər iki tərəfə bildiriş gedir.
      const res = await fetch(`${API}/orders/${orderId}/status`, { method: "PUT", headers: { ...authH, "Content-Type": "application/json" }, body: JSON.stringify(code ? { status, code } : { status }) });
      const data = await res.json();
      if (res.ok && data.success) {
        toast(data.refundPending ? (data.message || "Sifariş ləğv edildi, ödənişin qaytarılması emal olunur")
          : status === "CANCELLED" ? "Sifariş ləğv edildi — alıcıya bildiriş göndərildi"
          : (t("adminStatusUpdated") || "Status yeniləndi"), data.refundPending ? "info" : "success");
        if (active) loadOrders(active);
        return;
      }
      // Təhvil kodu tələb olunur (mağazadan götürmə / özü çatdırma) — alıcıdan soruşulur.
      if (status === "DELIVERED" && !code && /kod/i.test(data.message || "")) {
        const entered = prompt("Alıcının təhvil kodunu yazın:");
        if (entered?.trim()) return changeStatus(orderId, status, entered.trim());
        return;
      }
      toast(data.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };

  // Sifarişi işçiyə təyin et / üzərinə götür / burax. userId = null → təyinat silinir.
  const assign = async (orderId: number, userId: number | null) => {
    try {
      const res = await fetch(`${API}/orders/${orderId}/assign`, { method: "PUT", headers: { ...authH, "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
      const d = await res.json();
      if (res.ok && d.success) {
        setOrders((list) => list.map((o) => (o.id === orderId ? { ...o, assignedStaffId: d.order.assignedStaffId, assignedStaffName: d.order.assignedStaffName } : o)));
        toast(userId ? "Sifariş təyin olundu ✓" : "Təyinat silindi", "success");
      } else toast(d.message || t("error"), "error");
    } catch { toast(t("error"), "error"); }
  };
  const shown = orders.filter((o) => (who === "mine" ? o.assignedStaffId === staff.me : who === "free" ? !o.assignedStaffId : true));

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
              {/* İş bölgüsü süzgəci */}
              <div className="flex gap-1.5 flex-wrap">
                {([["all", "Hamısı", orders.length], ["mine", "Mənim", orders.filter((o) => o.assignedStaffId === staff.me).length], ["free", "Təyin olunmayan", orders.filter((o) => !o.assignedStaffId).length]] as const).map(([k, l, n]) => (
                  <button key={k} onClick={() => setWho(k)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${who === k ? "bg-teal-500 text-white border-teal-500" : "bg-input-bg border-input-border text-muted"}`}>{l} ({n})</button>
                ))}
              </div>
              {shown.length === 0 && <div className="bg-card border border-card-border rounded-xl p-6 text-center text-muted text-sm">Bu süzgəcdə sifariş yoxdur</div>}
              {shown.map((o) => (
                <div key={o.id} className="bg-card border border-card-border rounded-xl p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-sm">{t("orderNumber") || "Sifariş"} #{o.id}</p>
                      <p className="text-xs text-muted">{o.buyer?.name} · {o.buyer?.phone} · {new Date(o.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-500 font-bold text-sm">{o.total?.toFixed(2)} AZN</p>
                      <p className={`text-xs font-medium ${statusColor(o.status)}`}>{statusAz(o.status, o.deliveryType === "PICKUP")}</p>
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
                  {/* Kim məşğul olur — sahib istənilən işçiyə təyin edir, işçi özü götürə bilər */}
                  <div className="flex items-center gap-2 flex-wrap border-t border-card-border pt-2 mb-2">
                    <span className="text-xs text-muted">👤 Məşğul olan:</span>
                    {staff.isOwner ? (
                      <select value={o.assignedStaffId || ""} onChange={(e) => assign(o.id, e.target.value ? Number(e.target.value) : null)}
                        className="px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs">
                        <option value="">Təyin olunmayıb</option>
                        {staff.staff.map((u) => <option key={u.id} value={u.id}>{u.name}{u.owner ? " (sahib)" : ""}</option>)}
                      </select>
                    ) : (
                      <>
                        <span className={`text-xs font-semibold ${o.assignedStaffId ? "" : "text-muted"}`}>{o.assignedStaffId ? (o.assignedStaffId === staff.me ? "Siz" : o.assignedStaffName) : "heç kim"}</span>
                        {!o.assignedStaffId && <button onClick={() => assign(o.id, staff.me)} className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 text-xs font-semibold">Üzərimə götürürəm</button>}
                        {o.assignedStaffId === staff.me && <button onClick={() => assign(o.id, null)} className="px-2.5 py-1 rounded-lg bg-input-bg border border-input-border text-xs">Burax</button>}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted">{t("adminChangeStatus") || "Status"}:</span>
                    <select value={o.status} onChange={(e) => { const v = e.target.value; if (v === "CANCELLED" && !confirm(`Sifariş #${o.id} ləğv edilsin? Alıcıya xəbər gedəcək${o.paymentStatus === "PAID" && o.paymentMethod !== "CASH" ? " və ödənişi geri qaytarılacaq" : ""}.`)) return; changeStatus(o.id, v); }} className="px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs">
                      {STATUSES.map((s) => <option key={s} value={s}>{statusAz(s, o.deliveryType === "PICKUP")}</option>)}
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
