// Referal satış — ümumi köməkçilər (link URL-i, kopyala, paylaş, tarix).

/** Saytın referal link formatı: `${origin}/r/<token>`. */
export function referralUrl(token: string): string {
  if (typeof window === "undefined") return `/r/${token}`;
  return `${window.location.origin}/r/${token}`;
}

/** «25.09.2026» — qısa tarix (az-AZ). */
export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "—";
  return `${String(x.getDate()).padStart(2, "0")}.${String(x.getMonth() + 1).padStart(2, "0")}.${x.getFullYear()}`;
}

/** Mətni buferə köçürür; alınmasa false qaytarır. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* köhnə üsula keç */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/**
 * Sistem paylaşım pəncərəsi (telefonda WhatsApp, Telegram və s.).
 * Dəstəklənmirsə linki kopyalayır. Nəticə: "shared" | "copied" | "failed" | "cancelled".
 */
export async function shareLink(url: string, title?: string): Promise<"shared" | "copied" | "failed" | "cancelled"> {
  if (canNativeShare()) {
    try { await navigator.share({ title: title || "Referal link", text: title || undefined, url }); return "shared"; }
    catch (e: any) { if (e?.name === "AbortError") return "cancelled"; }
  }
  return (await copyText(url)) ? "copied" : "failed";
}

/** Mağaza / satıcı səhifəsinin yolu. */
export function storeHref(s: { objectId?: number | null; sellerId?: number | null }): string {
  return s.objectId ? `/object/${s.objectId}` : `/seller/${s.sellerId}`;
}

export const AUDIENCE_LABEL: Record<string, string> = {
  ALL: "Hər kəs sata bilər",
  PROFESSION: "İxtisas üzrə",
  INVITED: "Yalnız dəvətli / təsdiqli",
};
