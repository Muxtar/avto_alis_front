// Əvvəl baxılan məhsullar — brauzerdə (localStorage) saxlanır, server lazım deyil.
export type RecentItem = { id: number; title: string; price: number; image?: string | null; type?: string };
const KEY = "recentlyViewed";
const MAX = 20;

export function recordView(item: RecentItem) {
  if (typeof window === "undefined") return;
  try {
    const list: RecentItem[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const next = [item, ...list.filter((x) => x.id !== item.id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* keç */ }
}

export function getRecentViews(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

// Yalnız verilmiş id-ləri saxla — silinmiş/gizli elanları localStorage-dan təmizlə.
export function pruneRecentViews(keepIds: number[]) {
  if (typeof window === "undefined") return;
  try {
    const keep = new Set(keepIds);
    const list: RecentItem[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    localStorage.setItem(KEY, JSON.stringify(list.filter((x) => keep.has(x.id))));
  } catch { /* keç */ }
}
