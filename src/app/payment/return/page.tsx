"use client";
import { useEffect } from "react";

// Bank ödənişdən sonra (iframe-in içində) bura yönəldir.
// İşi: iframe-dən parent-ə xəbər vermək (postMessage) və ya tam səhifədirsə
// birbaşa /orders-ə keçmək.
export default function PaymentReturnPage() {
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status") || "error";
    const inIframe = window.top !== window.self;
    if (inIframe) {
      // Modaldakı parent dinləyir → modalı bağlayıb /orders-ə yönəldəcək.
      window.parent.postMessage({ type: "kapital-payment", status }, window.location.origin);
      return;
    }
    // "Paylaş — başqası ödəsin": ödəyən qonaq ola bilər, onun /orders səhifəsi yoxdur.
    // Ödənişə getməzdən əvvəl paylaşım tokeni sessionStorage-a yazılır — nəticəni
    // həmin paylaşım səhifəsində göstəririk.
    // Biznes yaratma haqqı — bu ödənişin /orders ilə heç bir əlaqəsi yoxdur.
    // Şlüz iframe-dən çıxıb tam səhifəyə keçsə istifadəçi biznes kabinetinə qayıtsın.
    try {
      if (sessionStorage.getItem("bizFeePay")) {
        sessionStorage.removeItem("bizFeePay");
        window.location.replace(`/business?fee=${status}`);
        return;
      }
    } catch { /* sessionStorage bloklanıb */ }

    let shared: string | null = null;
    try { shared = sessionStorage.getItem("sharedPayToken"); sessionStorage.removeItem("sharedPayToken"); } catch { /* bloklanıb */ }
    if (shared) {
      window.location.replace(`/shared/${encodeURIComponent(shared)}?paid=${status}`);
      return;
    }
    // Tam səhifə (redirect fallback) — birbaşa sifarişlərə.
    window.location.replace(`/orders?payment=${status}`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-muted text-sm">Ödəniş yekunlaşdırılır...</p>
      </div>
    </div>
  );
}
