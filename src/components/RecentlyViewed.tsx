"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { API, imgUrl } from "@/lib/api";
import { formatPrice, formatPriceShort } from "@/lib/format";
import { getRecentViews, pruneRecentViews, type RecentItem } from "@/lib/recentlyViewed";
import { useLanguage } from "@/lib/LanguageContext";

// "Əvvəl baxdıqlarınız" — son baxılan məhsullar, üfüqi scroll.
export default function RecentlyViewed({ excludeId }: { excludeId?: number }) {
  const { t } = useLanguage();
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const all = getRecentViews();
    if (all.length === 0) { setItems([]); return; }
    let cancelled = false;
    // Backend-də hələ mövcud (APPROVED) elanları yoxla — silinmiş/gizli olanları
    // həm göstərmə, həm də localStorage-dan təmizlə (klik 404 verməsin).
    const ids = all.map((x) => x.id).join(",");
    fetch(`${API}/listings/exist?ids=${ids}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const existing = new Set<number>(d.ids || []);
        pruneRecentViews(Array.from(existing));
        setItems(all.filter((x) => existing.has(x.id) && x.id !== excludeId));
      })
      .catch(() => { if (!cancelled) setItems(all.filter((x) => x.id !== excludeId)); });
    return () => { cancelled = true; };
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-3 px-1 text-base sm:text-lg font-bold text-foreground">əvvəl baxdıqlarınız</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x [scrollbar-width:thin]">
        {items.map((it) => (
          <Link key={it.id} href={`/marketplace/${it.id}`} className="snap-start shrink-0 w-36 sm:w-40 surface card-hover overflow-hidden">
            <div className="aspect-square bg-input-bg overflow-hidden">
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image.startsWith("http") ? it.image : imgUrl(it.image)} alt={it.title} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-xs line-clamp-2 mb-1 h-8">{it.title}</p>
              <p className="brand-text font-bold text-sm truncate" title={`${formatPrice(it.price)} ${t("azn")}`}>{formatPriceShort(it.price)} <span className="text-[10px] text-muted-foreground font-medium">{t("azn")}</span></p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
