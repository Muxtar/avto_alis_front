"use client";
// İXTİSAS ENDİRİMİ — «sizin üçün» qiyməti.
// Mağaza (obyekt) müəyyən ixtisas sahiblərinə endirim verir. Profilində həmin
// ixtisası olan alıcı məhsulu endirimli qiymətlə görməlidir: kartda, məhsul
// səhifəsində və səbətdə. Mənə şamil olunan qaydalar BİR sorğu ilə alınır və
// bütün kartlar üçün paylaşılır (hər kart ayrıca sorğu göndərmir).
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { API } from "@/lib/api";

export interface MyProRule { objectId: number; profession: string; percent: number; listingIds: number[] | null }

let cache: { token: string; at: number; p: Promise<MyProRule[]> } | null = null;
function fetchRules(token: string): Promise<MyProRule[]> {
  const now = Date.now();
  if (cache && cache.token === token && now - cache.at < 60000) return cache.p;
  const p = fetch(`${API}/me/pro-discounts`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.json()).then((d) => (d?.success ? (d.rules as MyProRule[]) : [])).catch(() => [] as MyProRule[]);
  cache = { token, at: now, p };
  return p;
}
/** İxtisas dəyişəndə (profil saxlananda) köhnə nəticə qalmasın. */
export function resetProDiscounts() { cache = null; }

export interface ProPrice { percent: number; profession: string; price: number }

/** Mənə şamil olunan ixtisas endirimləri. `forListing` — bu məhsulda ən yaxşı endirim (yoxdursa null). */
export function useMyProDiscounts() {
  const { token, user } = useAuth();
  const [rules, setRules] = useState<MyProRule[]>([]);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetchRules(token).then((r) => { if (alive) setRules(r); });
    return () => { alive = false; };
  }, [token]);
  const forListing = (l: { id: number; price: number; businessObjectId?: number | null; businessObject?: { id: number } | null; user?: { id?: number } | null }): ProPrice | null => {
    if (!token || !rules.length) return null;
    const objId = l.businessObjectId ?? l.businessObject?.id ?? null;
    if (!objId || (l.user?.id && l.user.id === user?.id)) return null;
    const best = rules
      .filter((r) => r.objectId === objId && (!r.listingIds || r.listingIds.includes(l.id)))
      .sort((a, b) => b.percent - a.percent)[0];
    if (!best || !(l.price > 0)) return null;
    return { percent: best.percent, profession: best.profession, price: Math.round(l.price * (1 - best.percent / 100) * 100) / 100 };
  };
  return { rules, forListing };
}
