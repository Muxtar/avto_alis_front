// Yango çatdırılma alt-statuslarının Azərbaycanca etiketləri (ortaq).
export const YANGO_STATUS_AZ: Record<string, string> = {
  new: "yaradıldı",
  performer_search: "kuryer axtarılır",
  performer_draft: "kuryer təyin olunur",
  performer_found: "kuryer tapıldı",
  performer_not_found: "kuryer tapılmadı",
  pickup_arrived: "kuryer mağazada",
  ready_for_pickup_confirmation: "götürməyə hazır",
  pickuped: "götürüldü, yolda",
  delivery_arrived: "kuryer ünvanınızda",
  ready_for_delivery_confirmation: "təhvilə hazır",
  delivered: "çatdırıldı",
  delivered_finish: "tamamlandı",
  cancelled: "ləğv edildi",
  cancelled_by_taxi: "kuryer ləğv etdi",
  cancelled_with_payment: "ləğv edildi",
  failed: "uğursuz",
};

export const yangoLabel = (s?: string | null): string => (s ? (YANGO_STATUS_AZ[s] || s) : "");
