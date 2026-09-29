// Platformada OLMAYAN şəxslə söhbət (nömrə və ya internetdə tapılan sosial profil).
// Çatda adi söhbət kimi görünür; yazılanlar serverdə gözləyir və şəxs qoşulanda çatır.
export type InviteTarget =
  | { kind: "phone"; phone: string; name: string }
  | { kind: "social"; platform: string; url: string; name: string; avatar?: string | null; handle?: string | null };

const ALIAS: Record<string, string> = { x: "twitter", fb: "facebook", ig: "instagram" };

/** Serverdəki açarın eynisi: nömrə → son 9 rəqəm, profil → «facebook:ad». */
export function inviteKey(t: InviteTarget): string {
  if (t.kind === "phone") return t.phone.replace(/\D/g, "").slice(-9);
  const p = ALIAS[t.platform.toLowerCase()] || t.platform.toLowerCase();
  try {
    const u = new URL(t.url);
    const parts = u.pathname.split("/").filter(Boolean);
    let h = decodeURIComponent(parts[0] || "");
    if (["in", "company", "c", "channel", "user"].includes(h) && parts[1]) h = decodeURIComponent(parts[1]);
    return `${p}:${h.replace(/^@/, "").toLowerCase()}`;
  } catch { return `${p}:${(t.handle || "").toLowerCase()}`; }
}

/** Serverə göndəriləcək hədəf. */
export const inviteBody = (t: InviteTarget) => t.kind === "phone"
  ? { phone: t.phone }
  : { social: { platform: t.platform, url: t.url, name: t.name, avatar: t.avatar || null } };

/** Gözləyən element → çat mesajı (mənfi id — server mesajı deyil). */
export function inviteToMsg(i: any, meId?: number) {
  const p = i.payload && typeof i.payload === "object" ? i.payload : {};
  return {
    id: -i.id, inviteId: i.id, pending: true, senderId: meId, receiverId: null, read: false, deliveredAt: null,
    createdAt: i.createdAt, type: p.type || "TEXT", ...p,
    content: i.kind === "CONSULTATION"
      ? `🗣️ Rəy sorğusu · ${i.durationMinutes} dəq${i.content ? `\n${i.content}` : ""}`
      : i.content,
  };
}

export const PLATFORM_LABEL: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", twitter: "X", x: "X", tiktok: "TikTok", youtube: "YouTube", telegram: "Telegram" };
