// Şikayət kateqoriyaları — şikayət satıcının etibarlılıq reytinqinə təsir edir (pul qaytarılmır).
export const COMPLAINT_CATEGORIES: { value: string; label: string }[] = [
  { value: "NOT_AS_DESCRIBED", label: "Məhsul/xidmət təsvirə uyğun deyildi" },
  { value: "POOR_QUALITY", label: "Keyfiyyətsiz məhsul/xidmət" },
  { value: "DEFECTIVE", label: "Qüsurlu məhsul" },
  { value: "DAMAGED", label: "Zədəli gəldi" },
  { value: "WRONG_ITEM", label: "Səhv məhsul göndərdi" },
  { value: "LATE", label: "Gecikdirdi / vaxtında göndərmədi" },
  { value: "NO_RESPONSE", label: "Cavab vermir / əlaqə saxlamır" },
  { value: "RUDE", label: "Kobud davranış" },
  { value: "RETURN_REJECTED", label: "İadəni əsassız rədd etdi" },
  { value: "RETURN_IGNORED", label: "İadə sorğusuna cavab vermədi" },
  { value: "PICKUP_NOT_RECEIVED", label: "Mağazada məhsulu vermədi" },
  { value: "FAKE_INFO", label: "Yalan məlumat" },
  { value: "FRAUD", label: "Fırıldaq şübhəsi" },
  { value: "TIME_WASTED", label: "Vaxtımı boşa xərclədi" },
  { value: "OTHER", label: "Digər" },
];

export const COMPLAINT_CAT_LABEL: Record<string, string> = {
  ...Object.fromEntries(COMPLAINT_CATEGORIES.map((c) => [c.value, c.label])),
  // köhnə (legacy) dəyərlər
  CHANGED_MIND: "Bəyənmədim",
  RETURN_NOT_RECEIVED: "Satıcı qaytarılan məhsulu təsdiqləmir",
  RETURN_DAMAGED: "Qaytarılan məhsul zədəli/fərqlidir",
};

const pick = (vals: string[]) => vals.map((v) => COMPLAINT_CATEGORIES.find((c) => c.value === v)!).filter(Boolean);
export const PERSON_COMPLAINT_CATEGORIES = pick(["RUDE", "FRAUD", "FAKE_INFO", "NO_RESPONSE", "TIME_WASTED", "OTHER"]);
export const CONSULTATION_COMPLAINT_CATEGORIES = pick(["TIME_WASTED", "RUDE", "FRAUD", "FAKE_INFO", "OTHER"]);

// Şikayətin statusu + nəticəsi → etiket.
export function complaintStatusLabel(c: { status: string; resolution?: string | null }, against = false): { label: string; cls: string } {
  if (c.status === "RESOLVED" && c.resolution === "WITHDRAWN") return { label: "Bağlandı — həll olundu", cls: "bg-green-500/10 text-green-600" };
  if (c.status === "RESOLVED" && c.resolution === "UPHELD") return { label: "Əsaslı sayıldı", cls: "bg-red-500/10 text-red-500" };
  if (c.status === "REJECTED" || c.resolution === "UNFOUNDED") return { label: "Əsassız sayıldı", cls: "bg-gray-500/10 text-gray-500" };
  switch (c.status) {
    case "AWAITING_SELLER":
    case "OPEN":
      return { label: against ? "Cavabınız gözlənilir" : "Satıcının cavabı gözlənilir", cls: "bg-purple-500/10 text-purple-600" };
    case "REVIEWING":
      return { label: "Satıcı cavab verdi", cls: "bg-blue-500/10 text-blue-600" };
    case "EVIDENCE_REQUESTED":
      return { label: "Sübut istənilir", cls: "bg-amber-500/10 text-amber-600" };
    case "RESOLVED":
      return { label: "Bağlandı", cls: "bg-green-500/10 text-green-600" };
    default:
      return { label: c.status, cls: "bg-gray-500/10 text-gray-500" };
  }
}

export function isComplaintClosed(c: { status: string }) {
  return c.status === "RESOLVED" || c.status === "REJECTED";
}
