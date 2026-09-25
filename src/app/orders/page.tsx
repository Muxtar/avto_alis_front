"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useLive } from "@/lib/live";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import Link from "next/link";
import OrderMap from "@/components/OrderMapWrapper";
import { yangoDead, yangoReturning, yangoLabel as yangoStatusAz, YANGO_STATUS_AZ } from "@/lib/yangoStatus";

export default function OrdersPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { token, isLoggedIn, authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"buying" | "selling">("buying");
  const [buyingOrders, setBuyingOrders] = useState<any[]>([]);
  // Alıcının yazdığı məhsul rəyləri (listingId üzrə) — «Rəy yaz» / «Rəyi dəyiş».
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [sellingOrders, setSellingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Return form state
  const [returnModal, setReturnModal] = useState<number | null>(null); // orderId
  const [returnItemId, setReturnItemId] = useState<string>("");
  const [returnReason, setReturnReason] = useState("DEFECTIVE");
  const [returnReasonText, setReturnReasonText] = useState("");
  const [returnQuantity, setReturnQuantity] = useState("1");
  const [returnLoading, setReturnLoading] = useState(false);
  // İadə fotoları (maks. 6) — qüsur/yanlış məhsul iddiasını sübut edir.
  const [returnFiles, setReturnFiles] = useState<File[]>([]);
  const previewCache = useRef(new WeakMap<File, string>());
  const returnPreviews = useMemo(() => returnFiles.map((f) => {
    let u = previewCache.current.get(f);
    if (!u) { u = URL.createObjectURL(f); previewCache.current.set(f, u); }
    return u;
  }), [returnFiles]);
  const addReturnFiles = (files: FileList | null) => {
    const list = Array.from(files || []).filter((f) => /^image\//.test(f.type) && f.size < 8 * 1024 * 1024);
    if (!list.length) return;
    setReturnFiles((prev) => [...prev, ...list].slice(0, 6));
  };
  // Satıcı rədd edəndə səbəb məcburidir (min 10 simvol).
  const [rejectFor, setRejectFor] = useState<number | null>(null);

  // Seller refund amount
  const [refundInput, setRefundInput] = useState<{ [key: number]: string }>({});
  const [sellerNoteInput, setSellerNoteInput] = useState<{ [key: number]: string }>({});

  const headers: any = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) { router.push("/"); return; }
    fetchOrders();
  }, [isLoggedIn, authLoading]);

  // ?tab=selling/buying → uyğun tab açılsın (menyudan deep-link).
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "selling" || tab === "buying") setActiveTab(tab);
  }, []);

  // Bank ödənişindən qayıdış nəticəsini göstər (?payment=success|failed|error).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("payment");
    if (!p) return;
    if (p === "success") toast(t("paymentSuccess") || "Ödəniş uğurlu oldu ✓", "success");
    else if (p === "failed") toast(t("paymentFailed") || "Ödəniş uğursuz oldu", "error");
    else toast(t("paymentError") || "Ödənişdə xəta baş verdi", "error");
    // URL-i təmizlə
    window.history.replaceState({}, "", "/orders");
  }, []);

  // `silent` — anlıq yeniləmədə spinner göstərmə, siyahı yerində dəyişsin.
  const fetchOrders = (silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([
      fetch(`${API}/orders/buying`, { headers }).then((r) => r.json()),
      fetch(`${API}/orders/selling`, { headers }).then((r) => r.json()),
    ]).then(([b, s]) => {
      setBuyingOrders(b.orders || []);
      setSellingOrders(s.orders || []);
      setMyReviews(b.myReviews || []);
    }).catch(() => { if (!silent) toast(t('error'), 'error'); }).finally(() => setLoading(false));
  };

  // ANLIQ: yeni sifariş, qarşı tərəfin təsdiqi/ləğvi, iadə, admin dəyişikliyi,
  // kuryer statusu — siyahı səhifə yenilənmədən dəyişir.
  useLive(["order", "return"], () => fetchOrders(true));

  /* ── MƏHSULA RƏY ──
     Əvvəl «Rəy yaz» düyməsi elan səhifəsinə aparırdı. Elan vaxtı bitəndə və
     ya satıcı onu gizlədəndə həmin səhifə açılmırdı və alıcı aldığı məhsula
     rəy yaza bilmirdi. İndi rəy elə burada, sifarişin içində yazılır. */
  const [reviewFor, setReviewFor] = useState<{ listingId: number; title: string; commentId?: number } | null>(null);
  const [revText, setRevText] = useState("");
  const [revStars, setRevStars] = useState(0);
  const [revBusy, setRevBusy] = useState(false);
  const myReviewOf = (listingId: number) => myReviews.find((r) => r.listingId === listingId);
  const openReview = (listingId: number, title: string) => {
    const mine = myReviewOf(listingId);
    setRevText(mine?.content || "");
    setRevStars(mine?.rating || 0);
    setReviewFor({ listingId, title, commentId: mine?.id });
  };
  const sendReview = async () => {
    if (!reviewFor || !revText.trim()) { toast("Rəy mətnini yazın", "error"); return; }
    setRevBusy(true);
    const body = JSON.stringify({ content: revText.trim(), rating: revStars || undefined });
    const r = await fetch(
      reviewFor.commentId ? `${API}/comments/${reviewFor.commentId}` : `${API}/listings/${reviewFor.listingId}/comments`,
      { method: reviewFor.commentId ? "PUT" : "POST", headers, body },
    ).then((x) => x.json()).catch(() => null);
    setRevBusy(false);
    if (!r || r.success === false) { toast(r?.message || t("error"), "error"); return; }
    toast(reviewFor.commentId ? "Rəyiniz yeniləndi ✓" : "Rəyiniz yazıldı ✓", "success");
    setReviewFor(null);
    fetchOrders(true);
  };

  // Satıcıya qiymət (sifariş üzrə, bir dəfə).
  const [rateOrder, setRateOrder] = useState<any>(null);
  const [rateStars, setRateStars] = useState(0);
  const [rateText, setRateText] = useState("");
  const [rateBusy, setRateBusy] = useState(false);
  const sendSellerRating = async () => {
    if (!rateOrder || rateStars < 1) { toast("Ulduz seçin", "error"); return; }
    setRateBusy(true);
    const r = await fetch(`${API}/orders/${rateOrder.id}/rating`, {
      method: "POST", headers, body: JSON.stringify({ rating: rateStars, comment: rateText.trim() || undefined }),
    }).then((x) => x.json()).catch(() => null);
    setRateBusy(false);
    if (!r || r.success === false) { toast(r?.message || t("error"), "error"); return; }
    toast("Satıcıya qiymətiniz göndərildi ✓", "success");
    setRateOrder(null); setRateStars(0); setRateText("");
    fetchOrders(true);
  };

  const updateStatus = async (orderId: number, status: string, code?: string): Promise<boolean> => {
    const r = await fetch(`${API}/orders/${orderId}/status`, {
      method: "PUT", headers,
      body: JSON.stringify(code ? { status, code } : { status }),
    }).then((x) => x.json()).catch(() => null);
    if (!r || r.success === false) { toast(r?.message || t("error"), "error"); return false; }
    fetchOrders();
    // Təsdiqdə Yango avtomatik çağırılır (backend, fon) — nəticəni (kuryer/xəta) göstərmək üçün bir az sonra yenilə.
    if (status === "CONFIRMED") setTimeout(fetchOrders, 3500);
    return true;
  };

  // Sifarişi öz siyahından sil (yalnız tamamlanmış/ləğv olunmuş).
  const deleteOrder = async (orderId: number) => {
    if (!confirm("Bu sifarişi siyahınızdan silmək istəyirsiniz?")) return;
    const r = await fetch(`${API}/orders/${orderId}`, { method: "DELETE", headers }).then((x) => x.json()).catch(() => null);
    if (!r || r.success === false) { toast(r?.message || t("error"), "error"); return; }
    toast("Sifariş silindi ✓", "success");
    fetchOrders();
  };

  // Təhvil (DELIVERED) modalı — satıcı alıcının kodunu daxil edir.
  const [deliverModal, setDeliverModal] = useState<number | null>(null);
  const [deliverCode, setDeliverCode] = useState("");
  const [deliverBusy, setDeliverBusy] = useState(false);
  const confirmDeliver = async () => {
    if (deliverModal == null) return;
    if (!deliverCode.trim()) { toast("Təhvil kodunu daxil edin", "error"); return; }
    setDeliverBusy(true);
    const ok = await updateStatus(deliverModal, "DELIVERED", deliverCode.trim());
    setDeliverBusy(false);
    if (ok) { toast("Təhvil təsdiqləndi ✓", "success"); setDeliverModal(null); setDeliverCode(""); }
  };

  // Yango (kuryer) inteqrasiyası
  const [yangoBusy, setYangoBusy] = useState<number | null>(null);
  const [yangoInfo, setYangoInfo] = useState<Record<number, any>>({});
  const [courierPhone, setCourierPhone] = useState<Record<number, { phone: string; ext?: string | null }>>({});
  // Kuryerə zəng — Yango müvəqqəti proksi nömrə qaytarır (gizlilik). ext varsa əl ilə daxil edilir.
  const callCourier = async (orderId: number) => {
    setYangoBusy(orderId);
    const r = await fetch(`${API}/orders/${orderId}/yango/call`, { method: "POST", headers }).then((x) => x.json()).catch(() => null);
    setYangoBusy(null);
    // `pending` — xəta deyil, sadəcə kuryer hələ təyin olunmayıb.
    if (r?.pending) { toast(r.message, "info"); return; }
    if (!r || r.success === false) { toast(r?.message || t("error"), "error"); return; }
    setCourierPhone((p) => ({ ...p, [orderId]: { phone: r.phone, ext: r.ext } }));
    if (typeof window !== "undefined") window.location.href = `tel:${r.phone}${r.ext ? "," + r.ext : ""}`;
  };

  // Wolt-tipli avtomatik canlı yeniləmə — aktiv Yango sifarişləri üçün.
  //
  // Əvvəl ilk sorğu yalnız 30 saniyə SONRA gedirdi, üstəlik hər cavabda
  // (yangoInfo dəyişəndə) effekt yenidən qurulub taymer sıfırlanırdı. Səhifə
  // açılanda kuryer kodu, kuryerin adı və s. yarım dəqiqə görünmürdü — kuryer
  // mağazada kod soruşanda satıcı boş ekrana baxırdı. İndi: açılan kimi bir
  // dəfə, sonra hər 15 saniyədə; effekt yalnız aktiv sifariş siyahısı
  // dəyişəndə yenidən qurulur.
  const yangoListRef = useRef<any[]>([]);
  // Bitmiş claim üçün sorğu göndərmirik. "Ölü" statuslar ortaq siyahıdan gəlir.
  const isYangoDone = (s?: string) => !!s && (yangoDead(s) || ["delivered", "delivered_finish"].includes(s));
  const yangoList = activeTab === "buying" ? buyingOrders : sellingOrders;
  const activeYangoKey = yangoList
    .filter((o: any) => o.yangoClaimId && !isYangoDone(o.yangoStatus))
    .map((o: any) => o.id).join(",");
  useEffect(() => { yangoListRef.current = yangoList; });
  useEffect(() => {
    const activeIds = activeYangoKey ? activeYangoKey.split(",").map(Number) : [];
    if (!token || activeIds.length === 0) return;
    const poll = () => activeIds.forEach((id: number) => {
      fetch(`${API}/orders/${id}/yango/status`, { headers }).then((x) => x.json()).then((r) => {
        if (!r || r.success === false) return;
        setYangoInfo((p) => ({ ...p, [id]: r }));
        // Sifarişin öz statusunu da yenilə — timeline canlı qalsın. YALNIZ
        // dəyişəndə: hər sorğuda massivi əvəz etsək bu effekt yenidən qurulub
        // taymeri sıfırlayardı.
        const cur = yangoListRef.current.find((o: any) => o.id === id);
        if (r.status && cur && cur.yangoStatus !== r.status) {
          const apply = (l: any[]) => l.map((o) => (o.id === id ? { ...o, yangoStatus: r.status } : o));
          setBuyingOrders(apply); setSellingOrders(apply);
        }
      }).catch(() => {});
    });
    poll();                                   // dərhal — gözləmədən
    const t = setInterval(poll, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYangoKey, token]);
  const dispatchYango = async (orderId: number) => {
    setYangoBusy(orderId);
    const r = await fetch(`${API}/orders/${orderId}/yango/dispatch`, { method: "POST", headers }).then((x) => x.json()).catch(() => null);
    setYangoBusy(null);
    if (!r || r.success === false) { toast(r?.message || t("error"), "error"); return; }
    toast("Yango kuryeri çağırıldı ✓", "success");
    // Yalnız bu sətri yenilə (siyahı sıçramasın). Köhnə claim-in izləmə
    // məlumatı silinir — yeni claim üçün sıfırdan yüklənsin.
    patchOrder(orderId, { yangoClaimId: r.claimId, yangoStatus: r.status || "new", yangoError: null, courierLat: null, courierLng: null });
    setYangoInfo((p) => { const n = { ...p }; delete n[orderId]; return n; });
  };
  // Yalnız BİR sifarişin Yango sahələrini yerində yeniləyir.
  //
  // Əvvəl `fetchOrders()` çağırılırdı — bütün siyahı yenidən çəkilib sıfırdan
  // render olunurdu: səhifə "yenilənmiş" kimi sıçrayır, açıq kartlar bağlanır,
  // sürüşmə yuxarı qayıdırdı. İndi yalnız həmin sətir yamanır.
  const patchOrder = (orderId: number, patch: any) => {
    const apply = (list: any[]) => list.map((o) => (o.id === orderId ? { ...o, ...patch } : o));
    setBuyingOrders(apply);
    setSellingOrders(apply);
  };

  const refreshYango = async (orderId: number) => {
    setYangoBusy(orderId);
    const r = await fetch(`${API}/orders/${orderId}/yango/status`, { headers }).then((x) => x.json()).catch(() => null);
    setYangoBusy(null);
    if (!r || r.success === false) { toast(r?.message || t("error"), "error"); return; }
    setYangoInfo((p) => ({ ...p, [orderId]: r }));
    patchOrder(orderId, {
      yangoStatus: r.status ?? undefined,
      ...(r.courierPosition ? { courierLat: r.courierPosition.lat, courierLng: r.courierPosition.lon } : {}),
    });
  };
  const cancelYango = async (orderId: number) => {
    setYangoBusy(orderId);
    const r = await fetch(`${API}/orders/${orderId}/yango/cancel`, { method: "POST", headers }).then((x) => x.json()).catch(() => null);
    setYangoBusy(null);
    if (!r || r.success === false) { toast(r?.message || t("error"), "error"); return; }
    toast("Çatdırılma ləğv edildi — yeni kuryer çağıra bilərsiniz", "success");
    // Sifarişin ÖZ statusuna toxunulmur — yalnız kuryer ləğv olundu.
    patchOrder(orderId, {
      yangoStatus: r.status || "cancelled", courierLat: null, courierLng: null,
      yangoError: "Çatdırılma ləğv edildi — yeni kuryer çağıra bilərsiniz",
    });
    setYangoInfo((p) => { const n = { ...p }; delete n[orderId]; return n; });
  };
  /* Etiketlər ORTAQ mənbədən (lib/yangoStatus) gəlir. Əvvəl bu səhifənin öz
     siyahısı vardı və orada `performer_not_found` (kuryer tapılmadı) YOX idi —
     Yango axtarışı dayandırsa belə ekranda «kuryer axtarılır» qalırdı. */
  const YANGO_LABEL: Record<string, string> = {
    ...YANGO_STATUS_AZ,
    estimating: "qiymət hesablanır",
    estimating_failed: "qiymətləndirilmədi",
    ready_for_approval: "təsdiq gözləyir",
    accepted: "qəbul edildi",
    performer_lookup: "kuryer axtarılır",
    pay_waiting: "ödəniş gözlənilir",
    returned: "geri qaytarılır",
    returned_finish: "geri qaytarıldı",
    cancelled_with_items_on_hands: "ləğv edildi (məhsul kuryerdə)",
  };
  const yangoLabel = (s?: string) => (s ? (YANGO_LABEL[s] || yangoStatusAz(s)) : "");
  // Kuryer çağırıla bilərmi: heç göndərilməyib, YA DA əvvəlki cəhd ölüb.
  const canDispatch = (o: any) =>
    o.deliveryType !== "PICKUP" && o.deliveryMethod === "COURIER" &&
    (o.status === "CONFIRMED" || o.status === "SHIPPED") &&
    (!o.yangoClaimId || yangoDead(o.yangoStatus));
  // Çatdırılma dağılıb, sifariş isə SHIPPED-də ilişib qalıb.
  //
  // SHIPPED statusunu Yango `pickuped` siqnalı avtomatik qoyur. Kuryer sonra
  // ləğv olsa (satıcı ləğv etdi / kuryer imtina etdi / mal geri qayıtdı)
  // sifariş SHIPPED qalır və normal qaydada yalnız "Təhvil aldım" mümkündür —
  // halbuki çatdıran yoxdur. Belə halda alıcı da sifarişi ləğv edib pulunu
  // geri ala bilməlidir (bildiriş də ona məhz bunu vəd edir).
  const deliveryCollapsed = (o: any) =>
    o.status === "SHIPPED" && !!o.yangoClaimId && yangoDead(o.yangoStatus);

  // Wolt-tipli izləmə addımları (0-4).
  const YANGO_STEPS = ["Kuryer axtarılır", "Kuryer mağazaya gedir", "Mağazada", "Sizə gəlir", "Çatdırıldı"];
  const yangoStep = (s?: string): number => {
    // ÖLÜ statuslar (kuryer tapılmadı, ləğv, uğursuz) -1 qaytarır. Əvvəl burada
    // yalnız üç status sayılırdı: `performer_not_found` default-a düşüb 0 verirdi,
    // yəni Yango axtarışı DAYANDIRSA da ekranda «Kuryer axtarılır» yanırdı və
    // satıcı saatlarla gözləyirdi. İndi ortaq YANGO_DEAD siyahısı işlədilir.
    if (yangoDead(s)) return -1;
    // Geri qaytarma — ayrıca göstərilir (-2). Əvvəl default-a düşüb
    // «Kuryer axtarılır» yanırdı.
    if (yangoReturning(s)) return -2;
    switch (s) {
      case "performer_found": return 1;
      case "pickup_arrived": case "ready_for_pickup_confirmation": return 2;
      case "pickuped": case "delivery_arrived": case "ready_for_delivery_confirmation": return 3;
      case "delivered": case "delivered_finish": return 4;
      default: return 0;
    }
  };
  const etaText = (sec?: number | null) => (sec != null && sec > 0 ? (sec < 90 ? "~1 dəq" : `~${Math.round(sec / 60)} dəq`) : null);

  // Sifarişin tam yol xəritəsi (hər iki tərəf üçün detallı vəziyyət).
  type JStep = { label: string; state: "done" | "current" | "pending" | "error"; detail?: string };
  const journeySteps = (order: any, yi: any): JStep[] => {
    const S: JStep[] = [{ label: "Sifariş verildi", state: "done" }];
    const st = order.status;
    const isCourier = order.deliveryType !== "PICKUP" && order.deliveryMethod === "COURIER";
    if (st === "PENDING") {
      const paid = order.paymentStatus === "PAID";
      const dl = order.confirmDeadline ? new Date(order.confirmDeadline) : null;
      const detail = paid
        ? `Ödəniş alındı. Satıcı ${dl ? dl.toLocaleString("az-AZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + "-ə qədər" : "vaxtında"} təsdiqləməzsə pul avtomatik geri qaytarılır.`
        : undefined;
      S.push({ label: "Satıcının təsdiqi gözlənilir", state: "current", detail });
      S.push({ label: "Çatdırıldı", state: "pending" });
      return S;
    }
    if (st === "CANCELLED") { S.push({ label: "Rədd / ləğv edildi", state: "error", detail: order.yangoError || undefined }); return S; }
    S.push({ label: "Satıcı qəbul etdi", state: "done" });
    if (isCourier) {
      if (!order.yangoClaimId) {
        {/* Claim ümumiyyətlə yaranmayıbsa «kuryer tapılmadı» yanlış olur —
            sifariş Yango-ya çatmayıb. Səbəb `detail`-də göstərilir. */}
        S.push({
          label: order.yangoError ? "Yango: sifariş göndərilmədi" : "Yango-ya göndərilir…",
          state: order.yangoError ? "error" : "current",
          detail: order.yangoError ? `${order.yangoError} — düzəldib «Yango təkrar cəhd» edin` : undefined,
        });
      } else {
        const step = yangoStep(yi.status || order.yangoStatus);
        S.push({ label: "Yango qəbul etdi", state: "done" });
        // Alıcı qəbul etmədi — mal geri gedir. Normal addımlar əvəzinə bunu göstər.
        if (step === -2) {
          S.push({ label: "Kuryer məhsulu götürdü", state: "done" });
          S.push({ label: "↩️ Məhsul satıcıya qaytarılır", state: "error", detail: "Məhsul satıcıya çatan kimi sifariş avtomatik ləğv olunacaq." });
          return S;
        }
        S.push({ label: "Kuryer tapıldı" + (yi.performer?.courier_name ? ` — ${yi.performer.courier_name}` : ""), state: step >= 1 ? "done" : "current" });
        S.push({ label: "Kuryer məhsulu götürdü", state: step >= 3 ? "done" : (step >= 2 ? "current" : "pending") });
        S.push({ label: "Yolda sizə" + (etaText(yi.etaSeconds) ? ` · ${etaText(yi.etaSeconds)}` : ""), state: step >= 4 ? "done" : (step >= 3 ? "current" : "pending") });
      }
    } else {
      S.push({ label: "Satıcı göndərdi", state: ["SHIPPED", "DELIVERED"].includes(st) ? "done" : "current" });
    }
    S.push({ label: "Çatdırıldı", state: st === "DELIVERED" ? "done" : "pending" });
    return S;
  };

  // Return actions
  const submitReturn = async (orderId: number) => {
    setReturnLoading(true);
    try {
      if (returnReasonText.trim().length < 5) { toast("Səbəbi ətraflı yazın (ən azı 5 simvol)", "error"); return; }
      // Multipart — fotolarla birlikdə. Content-Type-ı brauzer özü qoyur.
      const fd = new FormData();
      fd.append("orderId", String(orderId));
      fd.append("reason", returnReason);
      fd.append("reasonText", returnReasonText.trim());
      fd.append("quantity", returnQuantity);
      if (returnItemId) fd.append("orderItemId", returnItemId);
      returnFiles.forEach((f) => fd.append("images", f));
      // Cavab OXUNUR: əvvəl «müddət bitib», «miqdar çoxdur» kimi xətalar
      // səssizcə udulurdu və pəncərə uğur kimi bağlanırdı.
      const r = await fetch(`${API}/returns`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }).then((x) => x.json());
      if (!r?.success) { toast(r?.message || t('error'), 'error'); return; }
      toast("İadə sorğusu göndərildi ✓ Vəziyyəti «İadələr» bölməsində izləyə bilərsiniz", "success");
      setReturnModal(null);
      setReturnItemId(""); setReturnReason("DEFECTIVE"); setReturnReasonText(""); setReturnQuantity("1"); setReturnFiles([]);
      fetchOrders();
    } catch { toast(t('error'), 'error'); } finally { setReturnLoading(false); }
  };

  const returnAction = async (returnId: number, action: string, body?: any) => {
    // Rədd — backend səbəbi (sellerNote, min 10) multipart kimi tələb edir.
    const isReject = action === "reject";
    if (isReject && String(body?.sellerNote || "").trim().length < 10) {
      toast("Rədd səbəbini yazın (ən azı 10 simvol)", "error");
      return;
    }
    let init: RequestInit;
    if (isReject) {
      const fd = new FormData();
      fd.append("sellerNote", String(body.sellerNote).trim());
      init = { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: fd };
    } else {
      init = { method: "PUT", headers, body: body ? JSON.stringify(body) : undefined };
    }
    // Bank xətası (502) və digər rədd cavabları istifadəçiyə göstərilir.
    const r = await fetch(`${API}/returns/${returnId}/${action}`, init)
      .then((x) => x.json()).catch(() => null);
    if (!r?.success) toast(r?.message || t('error'), 'error');
    else if (isReject) { setRejectFor(null); setSellerNoteInput((p) => ({ ...p, [returnId]: "" })); }
    fetchOrders();
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

  const returnStatusColor = (status: string) => {
    switch (status) {
      case "REQUESTED": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "APPROVED": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "REJECTED": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "RETURN_SHIPPED": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "RETURN_RECEIVED": return "bg-teal-500/10 text-teal-500 border-teal-500/20";
      case "REFUNDED": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "CANCELLED": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "DISPUTED": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
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

  const returnStatusLabel = (status: string) => {
    switch (status) {
      case "REQUESTED": return t("returnRequested");
      case "APPROVED": return t("returnApproved");
      case "REJECTED": return t("returnRejected");
      case "RETURN_SHIPPED": return t("returnShipped");
      case "RETURN_RECEIVED": return t("returnReceived");
      case "REFUNDED": return t("returnRefunded");
      case "CANCELLED": return t("returnCancelled");
      case "DISPUTED": return "Mübahisə — sistem baxır";
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

  const inputCls = "w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm";

  if (authLoading || loading) {
    return <div className="min-h-[calc(100vh-64px)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const orders = activeTab === "buying" ? buyingOrders : sellingOrders;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-6">{t("orders")}</h1>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-input-bg border border-input-border rounded-xl p-1 mb-6 w-full sm:w-fit">
        <button onClick={() => setActiveTab("buying")}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === "buying" ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>
          {t("buyingOrders")} ({buyingOrders.length})
        </button>
        <button onClick={() => setActiveTab("selling")}
          className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === "selling" ? "bg-orange-500 text-white" : "text-muted hover:text-foreground"}`}>
          {t("sellingOrders")} ({sellingOrders.length})
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 surface text-muted">
          <svg className="w-16 h-16 text-muted-foreground/20 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p>{t("adminNoData")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const counterparty = activeTab === "buying" ? order.seller : order.buyer;
            const hasActiveReturn = order.returnRequests?.some((r: any) => !['CANCELLED', 'REJECTED', 'REFUNDED'].includes(r.status));
            // Yango sifarişi: kod YOXDUR (kod xüsusiyyəti ləğv edilib).
            const isYangoOrder = order.deliveryType !== "PICKUP" && order.deliveryMethod === "COURIER" && !order.courierId;
            return (
              <div key={order.id} className="surface overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-card-border flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <Link href={`/orders/${order.id}`} className="font-semibold text-sm hover:text-orange-500">
                      {t("orderNumber")} {order.id}
                    </Link>
                    <p className="text-muted text-xs">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${statusColor(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                    <span className="text-orange-500 font-bold text-sm">{order.total.toFixed(2)} AZN</span>
                    {(order.status === 'SHIPPED' || order.status === 'CONFIRMED') && (
                      <Link href={`/orders/${order.id}`} className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
                        📍 {t("liveTracking")}
                      </Link>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="p-4 space-y-2">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-sm gap-2">
                      <div className="flex-1 min-w-0">
                        <Link href={`/marketplace/${item.listingId}`} className="font-medium truncate block hover:text-orange-500 transition-colors">{item.title}</Link>
                        <p className="text-muted text-xs">x{item.quantity} · <Link href={`/marketplace/${item.listingId}`} className="text-orange-500 hover:underline">məhsula bax →</Link></p>
                      </div>
                      <span className="text-muted shrink-0">{(item.price * item.quantity).toFixed(2)} AZN</span>
                    </div>
                  ))}
                </div>

                {/* Counterparty info */}
                <div className="p-4 border-t border-card-border bg-input-bg/30 text-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-muted text-xs">{activeTab === "buying" ? t("sellerInfo") : t("courierBuyer")}</p>
                      <p className="font-medium">{counterparty.name} · {counterparty.phone}</p>
                      {order.buyerObject && (
                        <p className="text-[11px] mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 font-medium">
                          🏢 Biznes alışı: {order.buyerObject.name}
                        </p>
                      )}
                      {activeTab === "selling" && order.referrer && (
                        <p className="text-[11px] mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-500 font-medium">
                          🤝 Referal: {order.referrer.name}{order.referrer.profession ? ` (${order.referrer.profession})` : ""} · komissiya {(order.referralAmount || 0).toFixed(2)} AZN {order.referralVoided ? "(ləğv)" : ""}
                        </p>
                      )}
                    </div>
                    {order.address && (
                      <div className="text-right">
                        <p className="text-muted text-xs">{t("deliveryAddress")}</p>
                        <p className="font-medium text-xs">{order.address}</p>
                      </div>
                    )}
                  </div>
                  {order.note && <p className="text-muted text-xs mt-2">{order.note}</p>}
                  {/* Çatdırılma tipi/metodu */}
                  <p className="text-[11px] text-muted mt-2">
                    {order.deliveryType === "PICKUP"
                      ? "🏪 Mağazadan özü götürmə"
                      : `🚚 Çatdırılma · ${order.deliveryMethod === "SELF" ? "satıcı özü çatdırır" : "kuryer (Yango)"}`}
                  </p>
                </div>

                {/* Detallı sifariş vəziyyəti — hər iki tərəf (satıcı qəbul → Yango → kuryer → çatdırıldı) */}
                {(() => {
                  const steps = journeySteps(order, yangoInfo[order.id] || {});
                  return (
                    <div className="p-4 border-t border-card-border">
                      <p className="text-xs font-semibold text-muted mb-2">📋 Sifariş vəziyyəti</p>
                      <div className="space-y-1.5">
                        {steps.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className={`mt-0.5 w-4 shrink-0 text-center ${s.state === "done" ? "text-green-500" : s.state === "current" ? "text-blue-500 animate-pulse" : s.state === "error" ? "text-red-500" : "text-muted/40"}`}>
                              {s.state === "done" ? "✓" : s.state === "error" ? "⚠️" : s.state === "current" ? "●" : "○"}
                            </span>
                            <div className="min-w-0">
                              <span className={s.state === "current" ? "font-semibold text-blue-500" : s.state === "error" ? "text-red-500 font-medium" : s.state === "done" ? "text-foreground" : "text-muted"}>{s.label}</span>
                              {s.detail && activeTab === "selling" && <span className="block text-[11px] text-red-500">{s.detail}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Təhvil kodu — YALNIZ alıcıya görünür (satıcı/kuryer alıcıdan soruşur).
                    Yango kuryeri ilə gedən sifarişdə GÖSTƏRİLMİR: Yango öz rəqəmli
                    kodunu istəyir (aşağıdakı kuryer blokunda çıxır). Bizim «TX-…»
                    kodumuzu kuryerə deyəndə tətbiq «kod yalnız rəqəmlərdən ibarət
                    olmalıdır» deyib rədd edirdi. */}
                {activeTab === "buying" && order.pickupCode && order.status !== "CANCELLED" && !isYangoOrder && (
                  <div className="p-4 border-t border-card-border">
                    <div className="flex items-center gap-3 bg-orange-500/5 border border-orange-500/20 rounded-xl p-3">
                      <span className="text-2xl">🔐</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-muted">Təhvil kodu — {order.deliveryType === "PICKUP" ? "mağazadan götürərkən" : "məhsulu alarkən"} bunu satıcıya/kuryerə deyin</p>
                        <p className="text-lg font-extrabold tracking-[0.2em] text-orange-500">{order.pickupCode}</p>
                      </div>
                      {order.status === "DELIVERED" && <span className="text-green-500 text-xs font-semibold shrink-0">✓ təhvil verildi</span>}
                    </div>
                  </div>
                )}

                {/* Return Requests Display */}
                {order.returnRequests?.length > 0 && (
                  <div className="p-4 border-t border-card-border space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">{t("returnRequest")}</p>
                      <Link href={activeTab === "selling" ? "/iadeler?tab=selling" : "/iadeler"} className="text-xs text-muted hover:text-orange-500">Bütün iadələr →</Link>
                    </div>
                    {order.returnRequests.map((ret: any) => (
                      <div key={ret.id} className="bg-input-bg/50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${returnStatusColor(ret.status)}`}>
                              {returnStatusLabel(ret.status)}
                            </span>
                            <span className="text-xs text-muted">{returnReasonLabel(ret.reason)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {ret.refundAmount && (
                              <span className="text-sm font-bold text-orange-500">{ret.refundAmount.toFixed(2)} AZN</span>
                            )}
                            <Link href={`/iadeler?id=${ret.id}${activeTab === "selling" ? "&tab=selling" : ""}`}
                              className="text-xs font-semibold text-orange-500 hover:underline">İzlə →</Link>
                          </div>
                        </div>
                        {ret.reasonText && <p className="text-xs text-muted">{ret.reasonText}</p>}
                        {ret.orderItem && <p className="text-xs text-muted">{ret.orderItem.title} x{ret.quantity}</p>}
                        {ret.sellerNote && <p className="text-xs text-red-400">{t("sellerNote")}: {ret.sellerNote}</p>}

                        {/* BUYER actions */}
                        {activeTab === "buying" && (
                          <div className="flex gap-2 flex-wrap pt-1">
                            {ret.status === "REQUESTED" && (
                              <button onClick={() => returnAction(ret.id, "cancel")}
                                className="px-3 py-1.5 bg-gray-500/10 text-gray-500 rounded-lg text-xs font-medium hover:bg-gray-500/20">
                                {t("cancelReturn")}
                              </button>
                            )}
                            {ret.status === "APPROVED" && (
                              <button onClick={() => returnAction(ret.id, "ship")}
                                className="px-3 py-1.5 bg-purple-500/10 text-purple-500 rounded-lg text-xs font-medium hover:bg-purple-500/20">
                                {t("markReturnShipped")}
                              </button>
                            )}
                            {ret.status === "RETURN_SHIPPED" && (
                              <p className="text-xs text-muted italic">{t("waitingSellerConfirm")}</p>
                            )}
                            {ret.status === "REFUNDED" && (
                              ret.cashRefund ? (
                                <p className="text-xs text-amber-600 font-medium">
                                  {ret.refundAmount?.toFixed(2)} AZN — nağd ödəniş olduğu üçün pulu satıcı nağd qaytarır
                                </p>
                              ) : (
                                <p className="text-xs text-green-500 font-medium">{ret.refundAmount?.toFixed(2)} AZN {t("returnRefunded")}</p>
                              )
                            )}
                          </div>
                        )}

                        {/* SELLER actions */}
                        {activeTab === "selling" && (
                          <div className="flex gap-2 flex-wrap pt-1 items-end">
                            {ret.status === "REQUESTED" && (
                              <>
                                <div className="flex-1 min-w-[120px]">
                                  <label className="text-[10px] text-muted">{t("refundAmount")}</label>
                                  <input type="number" step="0.01" value={refundInput[ret.id] ?? ret.refundAmount?.toFixed(2) ?? ""}
                                    onChange={(e) => setRefundInput({ ...refundInput, [ret.id]: e.target.value })}
                                    className={inputCls + " !py-1.5"} />
                                </div>
                                <button onClick={() => returnAction(ret.id, "approve", { refundAmount: refundInput[ret.id] || ret.refundAmount })}
                                  className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20">
                                  {t("approveReturn")}
                                </button>
                                {rejectFor === ret.id ? (
                                  <div className="w-full space-y-1.5">
                                    <label className="text-[10px] text-muted">Rədd səbəbi (məcburi, ən azı 10 simvol) — alıcı bununla mübahisə aça bilər</label>
                                    <textarea value={sellerNoteInput[ret.id] ?? ""} rows={2}
                                      onChange={(e) => setSellerNoteInput({ ...sellerNoteInput, [ret.id]: e.target.value })}
                                      className={inputCls + " !py-1.5 resize-none"} placeholder="Məs: məhsul işlək vəziyyətdə göndərilib, zədə alıcıda yaranıb..." />
                                    <div className="flex gap-2">
                                      <button onClick={() => returnAction(ret.id, "reject", { sellerNote: sellerNoteInput[ret.id] || "" })}
                                        disabled={(sellerNoteInput[ret.id] || "").trim().length < 10}
                                        className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 disabled:opacity-50">
                                        {t("rejectReturn")}
                                      </button>
                                      <button onClick={() => setRejectFor(null)} className="px-3 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs">{t("adminCancel")}</button>
                                      <Link href={`/iadeler?id=${ret.id}&tab=selling`} className="px-3 py-1.5 text-xs text-muted hover:text-foreground">Foto ilə rədd →</Link>
                                    </div>
                                  </div>
                                ) : (
                                  <button onClick={() => setRejectFor(ret.id)}
                                    className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20">
                                    {t("rejectReturn")}
                                  </button>
                                )}
                              </>
                            )}
                            {ret.status === "APPROVED" && (
                              <p className="text-xs text-muted italic">{t("waitingBuyerShip")}</p>
                            )}
                            {ret.status === "RETURN_SHIPPED" && (
                              <button onClick={() => returnAction(ret.id, "receive")}
                                className="px-3 py-1.5 bg-teal-500/10 text-teal-500 rounded-lg text-xs font-medium hover:bg-teal-500/20">
                                {t("confirmReturnReceipt")}
                              </button>
                            )}
                            {ret.status === "RETURN_RECEIVED" && (
                              <button onClick={() => returnAction(ret.id, "refund")}
                                className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20">
                                {t("issueRefund")} ({ret.refundAmount?.toFixed(2)} AZN)
                              </button>
                            )}
                            {ret.status === "REFUNDED" && (
                              ret.cashRefund ? (
                                <p className="text-xs text-amber-600 font-medium">
                                  {ret.refundAmount?.toFixed(2)} AZN — alıcıya NAĞD qaytarmalısınız
                                </p>
                              ) : (
                                <p className="text-xs text-green-500 font-medium">{ret.refundAmount?.toFixed(2)} AZN {t("returnRefunded")}</p>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Buyer: Request Return button for DELIVERED orders */}
                {activeTab === "buying" && order.status === "DELIVERED" && !hasActiveReturn && (
                  <div className="p-3 border-t border-card-border">
                    {returnModal === order.id ? (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold">{t("requestReturn")}</p>
                        <div>
                          <label className="text-xs text-muted">{t("returnReasonText")}</label>
                          <select value={returnItemId} onChange={(e) => setReturnItemId(e.target.value)} className={inputCls}>
                            <option value="">{t("fullRefund")}</option>
                            {order.items.map((item: any) => (
                              <option key={item.id} value={item.id}>{item.title} (x{item.quantity})</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted">{t("returnReason")}</label>
                            <select value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className={inputCls}>
                              <option value="DEFECTIVE">{t("returnReasonDefective")}</option>
                              <option value="WRONG_ITEM">{t("returnReasonWrongItem")}</option>
                              <option value="NOT_AS_DESCRIBED">{t("returnReasonNotAsDescribed")}</option>
                              <option value="CHANGED_MIND">{t("returnReasonChangedMind")}</option>
                              <option value="OTHER">{t("returnReasonOther")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted">{t("returnQuantity")}</label>
                            <input type="number" min="1" value={returnQuantity} onChange={(e) => setReturnQuantity(e.target.value)} className={inputCls} />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted">{t("returnReasonText")} <span className="text-red-500">*</span></label>
                          <textarea value={returnReasonText} onChange={(e) => setReturnReasonText(e.target.value)} rows={3}
                            className={inputCls + " resize-none"} placeholder="Problemi ətraflı yazın (ən azı 5 simvol)..." />
                          {returnReasonText.trim().length > 0 && returnReasonText.trim().length < 5 && (
                            <p className="text-[11px] text-red-500 mt-0.5">Ən azı 5 simvol yazın</p>
                          )}
                        </div>
                        <div>
                          <label className="text-xs text-muted">Fotolar ({returnFiles.length}/6)</label>
                          {["DEFECTIVE", "WRONG_ITEM", "NOT_AS_DESCRIBED"].includes(returnReason) && (
                            <p className="text-[11px] text-amber-600 bg-amber-500/10 rounded-lg px-2.5 py-1.5 my-1">
                              📷 Qüsurun / fərqin aydın fotolarını əlavə edin — mübahisə olarsa, sistem qərarı əsasən fotolara görə verir.
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-1">
                            {returnPreviews.map((u, i) => (
                              <div key={u} className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={u} alt="" className="w-16 h-16 rounded-lg object-cover border border-input-border" />
                                <button type="button" onClick={() => setReturnFiles((p) => p.filter((_, j) => j !== i))}
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] leading-none">✕</button>
                              </div>
                            ))}
                            {returnFiles.length < 6 && (
                              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-input-border flex items-center justify-center text-muted text-xl cursor-pointer hover:border-orange-500">
                                +
                                <input type="file" accept="image/*" multiple className="hidden"
                                  onChange={(e) => { addReturnFiles(e.target.files); e.target.value = ""; }} />
                              </label>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => submitReturn(order.id)} disabled={returnLoading || returnReasonText.trim().length < 5}
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white text-xs font-medium disabled:opacity-50">
                            {returnLoading ? "..." : t("submitReturn")}
                          </button>
                          <button onClick={() => setReturnModal(null)}
                            className="px-4 py-2 bg-input-bg border border-input-border rounded-xl text-xs">{t("adminCancel")}</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setReturnModal(order.id)}
                        className="px-4 py-2 bg-amber-500/10 text-amber-500 rounded-lg text-xs font-medium hover:bg-amber-500/20 flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                        {t("requestReturn")}
                      </button>
                    )}
                  </div>
                )}

                {/* Yango kuryer izləmə — Wolt üslubu (timeline, ETA, zəng, canlı izlə) */}
                {order.yangoClaimId && (() => {
                  const yi = yangoInfo[order.id] || {};
                  const step = yangoStep(order.yangoStatus);
                  const active = step >= 0 && step < 4;
                  const eta = etaText(yi.etaSeconds);
                  const cp = courierPhone[order.id];
                  return (
                  <div className="p-4 border-t border-card-border">
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold">🛵 Yango kuryer</p>
                        <button onClick={() => refreshYango(order.id)} disabled={yangoBusy === order.id} className="text-xs text-blue-500 hover:underline disabled:opacity-50">{yangoBusy === order.id ? "..." : "↻ Yenilə"}</button>
                      </div>

                      {/* Timeline — 5 addım */}
                      {step === -2 ? (
                        <div className="mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                          <p className="text-sm font-semibold text-amber-600">↩️ Məhsul satıcıya qaytarılır</p>
                          <p className="text-[11px] text-muted mt-0.5">
                            Alıcı məhsulu qəbul etmədi və ya ünvanda tapılmadı. Məhsul satıcıya çatan kimi sifariş avtomatik ləğv olunacaq{order.paymentStatus === "PAID" ? " və ödəniş alıcıya qaytarılacaq" : ""}.
                          </p>
                        </div>
                      ) : step >= 0 ? (
                        <div className="mb-2">
                          <div className="flex items-center gap-1">
                            {YANGO_STEPS.map((lbl, i) => (
                              <div key={i} className="flex-1 flex flex-col items-center">
                                <div className={`w-full h-1.5 rounded-full ${i <= step ? "bg-blue-500" : "bg-input-border"}`} />
                                <span className={`mt-1 text-[9px] text-center leading-tight ${i === step ? "text-blue-500 font-semibold" : "text-muted"}`}>{lbl}</span>
                              </div>
                            ))}
                          </div>
                          {/* Həqiqi Yango statusu — mərhələ göstəricisi ümumidir,
                              problemi tapmaq üçün xam status lazım olur. */}
                          <p className="text-[10px] text-muted mt-1.5 text-center">
                            Yango: {yangoLabel(yi.status || order.yangoStatus) || "—"}
                          </p>
                        </div>
                      ) : (
                        // Ölü claim — satıcıya dərhal çıxış yolu göstərilir,
                        // əks halda ekranda yalnız "ləğv edildi" qalıb heç nə
                        // edilə bilmirdi.
                        <div className="mb-1">
                          {/* Səbəbi konkret yazırıq — «kuryer tapılmadı» ilə
                              «ləğv edildi» satıcı üçün fərqli hallardır. */}
                          <p className="text-sm text-red-500">
                            {(yi.status || order.yangoStatus) === "performer_not_found"
                              ? "Kuryer tapılmadı — Yango axtarışı dayandırdı"
                              : (yi.status || order.yangoStatus) === "estimating_failed"
                                ? "Yango qiymətləndirə bilmədi (ünvan və ya çəki uyğun deyil)"
                                : "Çatdırılma ləğv edildi / uğursuz oldu"}
                          </p>
                          {activeTab === "selling" && canDispatch(order) && (
                            <button onClick={() => dispatchYango(order.id)} disabled={yangoBusy === order.id}
                              className="mt-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-semibold hover:bg-blue-500/20 disabled:opacity-50">
                              {yangoBusy === order.id ? "..." : "🛵 Yenidən kuryer çağır"}
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-blue-500 font-medium">{yangoLabel(order.yangoStatus)}</span>
                        {eta && <span className="px-2 py-0.5 rounded-lg bg-green-500/10 text-green-600 font-semibold">⏱ {eta}</span>}
                        {order.yangoPrice != null && <span className="text-muted">· {order.yangoPrice.toFixed(2)} {order.yangoCurrency || "AZN"}</span>}
                      </div>

                      {yi.performer && (
                        <p className="text-xs text-muted mt-1.5">👤 <b className="text-foreground">{yi.performer.courier_name}</b>{yi.performer.car_model ? ` · ${yi.performer.car_model} ${yi.performer.car_number || ""}` : ""}</p>
                      )}


                      {/* Əməllər — zəng, canlı izlə */}
                      {active && (
                        <div className="flex items-center gap-2 flex-wrap mt-2.5">
                          {/* Zəng YALNIZ kuryer təyin olunandan sonra mümkündür —
                              əvvəl Yango proksi nömrə vermir. Düymə həmişə aktiv
                              idi və basanda xəta qaytarırdı. */}
                          {yi.performer ? (
                            <button onClick={() => callCourier(order.id)} disabled={yangoBusy === order.id} className="px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg text-xs font-semibold hover:bg-green-500/20 disabled:opacity-50">📞 Kuryerə zəng</button>
                          ) : (
                            <span className="px-3 py-1.5 bg-input-bg text-muted rounded-lg text-xs font-semibold" title="Kuryer tapılandan sonra aktiv olur">📞 Kuryer gözlənilir…</span>
                          )}
                          {yi.trackingUrl && (
                            <a href={yi.trackingUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-semibold hover:bg-blue-500/20">🗺 Canlı izlə (xəritə)</a>
                          )}
                          {cp && <span className="text-[11px] text-muted">☎️ {cp.phone}{cp.ext ? ` (daxili: ${cp.ext})` : ""}</span>}
                        </div>
                      )}

                      {/* App-daxili canlı xəritə — kuryer + təhvil ünvanı (xarici Yango səhifəsinə ehtiyac yox) */}
                      {(() => {
                        const cLat = yi.courierPosition?.lat ?? order.courierLat;
                        const cLng = yi.courierPosition?.lon ?? order.courierLng;
                        if (cLat == null || cLng == null) return null;
                        return (
                          <div className="mt-2.5 rounded-lg overflow-hidden border border-card-border">
                            <OrderMap courierLat={cLat} courierLng={cLng} buyerLat={order.latitude} buyerLng={order.longitude} courierLabel="Kuryer" buyerLabel="Çatdırılma ünvanı" height="200px" />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  );
                })()}

                {/* Alıcı: kuryer hələ təyin olunmayıb — status + Yoxla (Yango cavabını götürür) */}
                {activeTab === "buying" && !order.yangoClaimId && order.deliveryType !== "PICKUP" && order.deliveryMethod === "COURIER" && order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                  <div className="p-3 border-t border-card-border flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-medium">🛵 Yango kuryer:</span>
                    <span className="text-muted">kuryer təyin olunur…</span>
                    <button onClick={() => refreshYango(order.id)} disabled={yangoBusy === order.id} className="text-blue-500 hover:underline disabled:opacity-50">{yangoBusy === order.id ? "..." : "↻ Yoxla"}</button>
                  </div>
                )}

                {/* Seller actions */}
                {activeTab === "selling" && order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                  <div className="p-3 border-t border-card-border flex gap-2 flex-wrap">
                    {/* Yango avtomatik dispatch uğursuz olubsa — səbəbi göstər (kuryer tapılmadı, koordinat yox və s.) */}
                    {order.yangoError && !order.yangoClaimId && order.deliveryMethod === "COURIER" && (
                      <p className="w-full text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">⚠️ Yango: {order.yangoError}</p>
                    )}
                    {order.status === "PENDING" && (
                      <>
                        <button onClick={() => updateStatus(order.id, "CONFIRMED")} className="px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg text-xs font-semibold hover:bg-green-500/20">✓ Qəbul et</button>
                        <button onClick={() => { if (confirm("Sifarişi rədd etmək istəyirsiniz?")) updateStatus(order.id, "CANCELLED"); }} className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-semibold hover:bg-red-500/20">✕ Rədd et</button>
                      </>
                    )}
                    {order.status === "CONFIRMED" && (
                      <button onClick={() => updateStatus(order.id, "SHIPPED")} className="px-3 py-1.5 bg-purple-500/10 text-purple-500 rounded-lg text-xs font-medium hover:bg-purple-500/20">📦 Göndərildi olaraq işarələ</button>
                    )}
                    {/* Yango təsdiqdə avtomatik çağırılır. Claim yaranmayıbsa —
                        və ya əvvəlki claim ləğv/uğursuz olubsa — satıcı yenidən
                        çağıra bilər. Əvvəl yalnız `!yangoClaimId` şərti vardı:
                        ləğvdən sonra düymə heç vaxt görünmürdü. */}
                    {canDispatch(order) && (
                      <button onClick={() => dispatchYango(order.id)} disabled={yangoBusy === order.id} className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-semibold hover:bg-blue-500/20 disabled:opacity-50">
                        {yangoBusy === order.id ? "..." : yangoDead(order.yangoStatus) ? "🛵 Yenidən kuryer çağır" : order.yangoError ? "🔁 Yango təkrar cəhd" : "🛵 Kuryer çağır (Yango)"}
                      </button>
                    )}
                    {order.yangoClaimId && !yangoDead(order.yangoStatus) && !["delivered", "delivered_finish"].includes(order.yangoStatus) && (
                      <button onClick={() => cancelYango(order.id)} disabled={yangoBusy === order.id} className="px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-lg text-xs font-medium hover:bg-amber-500/20 disabled:opacity-50">Yango ləğv</button>
                    )}
                    {order.status === "SHIPPED" && (
                      <button
                        onClick={() => {
                          // Yango sifarişində kod istənilmir — yalnız təsdiq.
                          if (isYangoOrder) { if (confirm("Sifariş alıcıya təhvil verilib? Çatdırıldı olaraq işarələnsin?")) updateStatus(order.id, "DELIVERED"); return; }
                          setDeliverCode(""); setDeliverModal(order.id);
                        }}
                        className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20"
                      >✓ Çatdırıldı olaraq işarələ</button>
                    )}
                    {/* Ləğv — yalnız qəbul edilmiş/göndərilmiş sifariş üçün (PENDING-də 'Rədd et' var) */}
                    {(order.status === "CONFIRMED" || order.status === "SHIPPED") && (
                      <button onClick={() => { if (confirm("Sifarişi ləğv etmək istəyirsiniz?")) updateStatus(order.id, "CANCELLED"); }} className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 ml-auto">Ləğv et</button>
                    )}
                  </div>
                )}

                {/* Satıcı: tamamlanmış/ləğv sifarişi siyahıdan sil */}
                {activeTab === "selling" && (order.status === "DELIVERED" || order.status === "CANCELLED") && (
                  <div className="p-3 border-t border-card-border flex gap-2 flex-wrap">
                    <button onClick={() => deleteOrder(order.id)} className="px-3 py-1.5 bg-input-bg border border-input-border text-muted rounded-lg text-xs font-medium hover:text-red-500 hover:border-red-500/40">🗑 Sil</button>
                  </div>
                )}

                {/* Alıcı əməlləri — izləmə, ləğv, təhvil təsdiqi, rəy, sil */}
                {activeTab === "buying" && (
                  <div className="p-3 border-t border-card-border flex gap-2 flex-wrap items-center">
                    {order.yangoClaimId && !["delivered", "delivered_finish", "cancelled"].includes(order.yangoStatus) && (
                      <button onClick={() => refreshYango(order.id)} disabled={yangoBusy === order.id} className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-lg text-xs font-medium hover:bg-blue-500/20 disabled:opacity-50">{yangoBusy === order.id ? "..." : "🛵 Kuryeri izlə"}</button>
                    )}
                    {/* Alıcı: gözləyən və ya təsdiqlənib GÖNDƏRİLMƏMİŞ sifarişi ləğv edə bilər. Ödənilibsə pul geri qaytarılır. */}
                    {(order.status === "PENDING" || order.status === "CONFIRMED" || deliveryCollapsed(order)) && (
                      <button onClick={() => { if (confirm(order.paymentStatus === "PAID" ? "Sifarişi ləğv edib pulu geri almaq istəyirsiniz?" : "Sifarişi ləğv etmək istəyirsiniz?")) updateStatus(order.id, "CANCELLED"); }} className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20">{order.paymentStatus === "PAID" ? "Ləğv et və geri al" : "Ləğv et"}</button>
                    )}
                    {order.status === "SHIPPED" && (
                      <button onClick={() => { if (confirm("Məhsulu təhvil aldığınızı təsdiqləyirsiniz?")) updateStatus(order.id, "DELIVERED"); }} className="px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg text-xs font-semibold hover:bg-green-500/20">✓ Təhvil aldım</button>
                    )}
                    {/* Təhvil alındıqdan sonra məhsula rəy/5 ulduz (like/dislike) — hər məhsul üçün */}
                    {order.status === "DELIVERED" && (order.items || []).map((it: any) => {
                      const mine = myReviewOf(it.listingId);
                      return (
                        <button key={it.id} onClick={() => openReview(it.listingId, it.title)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${mine ? "bg-input-bg border border-input-border text-muted hover:text-foreground" : "bg-amber-400/10 text-amber-600 hover:bg-amber-400/20"}`}>
                          {mine ? "✎ Rəyi dəyiş" : "⭐ Rəy yaz"}{(order.items || []).length > 1 ? `: ${String(it.title).slice(0, 14)}` : ""}
                        </button>
                      );
                    })}
                    {order.status === "DELIVERED" && (
                      order.sellerRating ? (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-input-bg border border-input-border text-muted">
                          Satıcıya qiymətiniz: {"★".repeat(order.sellerRating.rating)}
                        </span>
                      ) : (
                        <button onClick={() => { setRateOrder(order); setRateStars(0); setRateText(""); }}
                          className="px-3 py-1.5 bg-amber-400/10 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-400/20">⭐ Satıcıya qiymət ver</button>
                      )
                    )}
                    {(order.status === "DELIVERED" || order.status === "CANCELLED") && (
                      <button onClick={() => deleteOrder(order.id)} className="px-3 py-1.5 bg-input-bg border border-input-border text-muted rounded-lg text-xs font-medium hover:text-red-500 hover:border-red-500/40 ml-auto">🗑 Sil</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Məhsula rəy modalı (alıcı) ── */}
      {reviewFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setReviewFor(null)}>
          <div className="surface w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">⭐ Məhsula rəy</h3>
            <p className="text-xs text-muted mb-3 line-clamp-2">{reviewFor.title}</p>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRevStars(n)} className="text-2xl leading-none">
                  <span className={n <= revStars ? "text-amber-400" : "text-muted/40"}>★</span>
                </button>
              ))}
            </div>
            <textarea value={revText} onChange={(e) => setRevText(e.target.value)} rows={4} maxLength={1000}
              placeholder="Məhsul haqqında təcrübənizi yazın — digər alıcılara kömək edir"
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setReviewFor(null)} className="flex-1 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-medium">Bağla</button>
              <button onClick={sendReview} disabled={revBusy || !revText.trim()} className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {revBusy ? "..." : reviewFor.commentId ? "Yadda saxla" : "Göndər"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Satıcıya qiymət modalı (alıcı, sifariş üzrə) ── */}
      {rateOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setRateOrder(null)}>
          <div className="surface w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">⭐ Satıcıya qiymət</h3>
            <p className="text-xs text-muted mb-3">Sifariş №{rateOrder.id} · {rateOrder.seller?.name}</p>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRateStars(n)} className="text-2xl leading-none">
                  <span className={n <= rateStars ? "text-amber-400" : "text-muted/40"}>★</span>
                </button>
              ))}
            </div>
            <textarea value={rateText} onChange={(e) => setRateText(e.target.value)} rows={3} maxLength={1000}
              placeholder="Satıcı ilə təcrübəniz (istəyə bağlı)"
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setRateOrder(null)} className="flex-1 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-medium">Bağla</button>
              <button onClick={sendSellerRating} disabled={rateBusy || rateStars < 1} className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {rateBusy ? "..." : "Göndər"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Təhvil kodu modalı (satıcı) ── */}
      {deliverModal != null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDeliverModal(null)}>
          <div className="bg-card border border-card-border w-full max-w-sm rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">🔐 Təhvil kodunu daxil edin</h3>
            <p className="text-xs text-muted mb-4">Məhsulu təhvil verərkən alıcıdan kodu soruşun və bura yazın. Yalnız kod düzgün olduqda “çatdırıldı” olur — bu, səhv adama təhvilin qarşısını alır.</p>
            <input
              value={deliverCode}
              onChange={(e) => setDeliverCode(e.target.value.toUpperCase())}
              placeholder="TX-XXXXXX"
              autoFocus
              className="w-full px-4 py-3 bg-input-bg border border-input-border rounded-xl text-center text-lg font-bold tracking-[0.2em] mb-4 outline-none focus:ring-2 focus:ring-orange-500/40"
            />
            <div className="flex gap-2">
              <button onClick={() => setDeliverModal(null)} className="flex-1 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-medium">Ləğv</button>
              <button onClick={confirmDeliver} disabled={deliverBusy} className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{deliverBusy ? "..." : "Təsdiqlə"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
