// PAYLAŞIM ÖNİZLƏMƏSİ (Open Graph) — server tərəfi.
// Link WhatsApp / Telegram / Facebook-a atılanda şəkil, başlıq və qısa mətn
// görünsün ki, alan şəxs linkin nə olduğunu açmadan anlasın: məhsulun şəkli,
// profilin şəkli, birgə alışın məhsulu və s. Məlumat backend-in /og ünvanından
// gəlir; tapılmasa saytın ümumi önizləməsi (app/opengraph-image) qalır.
import type { Metadata } from "next";
import { API, imgUrl } from "@/lib/api";

export type OgKind = "listing" | "group" | "seller" | "object" | "shared" | "referral";

export async function ogMetadata(kind: OgKind, id: string): Promise<Metadata> {
  try {
    const res = await fetch(`${API}/og/${kind}/${encodeURIComponent(id)}`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return {};
    const d = await res.json();
    if (!d?.success) return {};
    // Öz şəkli yoxdursa saytın ümumi şəkli (app/opengraph-image) — önizləmə şəkilsiz qalmasın.
    const image = d.image ? imgUrl(d.image) : "/opengraph-image";
    return {
      title: `${d.title} — tradixai`,
      description: d.description,
      openGraph: {
        title: d.title, description: d.description, siteName: "tradixai", type: "website", locale: "az_AZ",
        ...(image ? { images: [{ url: image, alt: d.title }] } : {}),
      },
      twitter: { card: image ? "summary_large_image" : "summary", title: d.title, description: d.description, ...(image ? { images: [image] } : {}) },
    };
  } catch {
    return {};   // önizləmə alınmasa səhifə adi başlıqla açılır
  }
}
