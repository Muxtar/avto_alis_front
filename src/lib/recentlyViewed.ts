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
