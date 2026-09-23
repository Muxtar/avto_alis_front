"use client";
// ELAN KARTLARI ÜÇÜN BİRGƏ ALIŞ MƏLUMATI
//
// Siyahıda 20-30 kart olur; hər kart ayrıca sorğu göndərsə şəbəkə boğulardı.
// Ona görə burada kiçik bir TOPLAYICI var: kartlar id-lərini yazır, 60 ms
// gözlənilir və hamısı ÜÇÜN BİR sorğu gedir (/group-buys/active?ids=...).
// Cavab qısa müddət (20 san) yaddaşda saxlanılır — eyni kart yenidən
// render olunanda təkrar sorğu getmir.
import { useEffect, useState } from "react";
import { API } from "@/lib/api";

export interface CardGroupBuy {
  code: string;
  expiresAt: string;
  windowDays: number;
  totalQty: number;
  unitPrice: number;
  discountPercent: number;
}

const CACHE_MS = 20000;
const cache = new Map<number, { at: number; value: CardGroupBuy | null }>();
const waiting = new Map<number, ((v: CardGroupBuy | null) => void)[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const ids = [...waiting.keys()];
  if (!ids.length) return;
  const resolvers = new Map(waiting);
  waiting.clear();
  let groups: Record<string, CardGroupBuy> = {};
  try {
    const r = await fetch(`${API}/group-buys/active?ids=${ids.join(",")}`).then((x) => x.json());
    if (r?.success) groups = r.groups || {};
  } catch { /* şəbəkə — kart sadəcə zolaqsız göstərilir */ }
  const now = Date.now();
  for (const [id, list] of resolvers) {
    const value = groups[String(id)] || null;
    cache.set(id, { at: now, value });
    list.forEach((fn) => fn(value));
  }
}

function load(listingId: number): Promise<CardGroupBuy | null> {
  const hit = cache.get(listingId);
  if (hit && Date.now() - hit.at < CACHE_MS) return Promise.resolve(hit.value);
  return new Promise((resolve) => {
    const list = waiting.get(listingId) || [];
    list.push(resolve);
    waiting.set(listingId, list);
    if (!timer) timer = setTimeout(flush, 60);
  });
}

/**
 * Kartda göstəriləcək birgə alış məlumatı + saniyəlik geri sayım.
 * Pəncərə yoxdursa `group` null olur və kart heç nə göstərmir.
 */
export function useCardGroupBuy(listingId: number, enabled = true) {
  const [group, setGroup] = useState<CardGroupBuy | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !listingId) return;
    let alive = true;
    load(listingId).then((g) => { if (alive) setGroup(g); });
    return () => { alive = false; };
  }, [listingId, enabled]);

  // Geri sayım yalnız açıq pəncərə olanda işləyir.
  useEffect(() => {
    if (!group) return;
    const iv = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [group?.code]);

  const msLeft = group ? new Date(group.expiresAt).getTime() - nowTs : 0;
  return { group: msLeft > 0 ? group : null, left: countdown(msLeft, true) };
}

/**
 * «2 gün 04:12:33» / «04:12:33».
 * `compact` (kart üçün): günlər varsa saniyə göstərilmir — «2g 04:12»;
 * son gündə saniyə qalır ki, bitməyə az qaldığı hiss olunsun.
 */
export function countdown(ms: number, compact = false): string {
  if (ms <= 0) return "bitdi";
  const t = Math.floor(ms / 1000);
  const d = Math.floor(t / 86400);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hh = pad(Math.floor((t % 86400) / 3600));
  const mm = pad(Math.floor((t % 3600) / 60));
  const ss = pad(t % 60);
  if (d > 0) return compact ? `${d}g ${hh}:${mm}` : `${d} gün ${hh}:${mm}:${ss}`;
  return `${hh}:${mm}:${ss}`;
}
