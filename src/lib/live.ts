"use client";
// ANLIQ YENİLƏNMƏ — admin (və ya qarşı tərəf) nəyisə dəyişəndə açıq səhifə
// özü yenilənsin, istifadəçi F5 basmasın.
//
// Server `live:update` hadisəsi göndərir (backend/src/services/live.ts).
// Hadisə məlumatın özünü DAŞIMIR, yalnız "bu növ dəyişdi" deyir — səhifə öz
// adi API sorğusunu yenidən göndərir. Beləliklə icazə yoxlaması həmişə API-də
// qalır və socket-dən başqasının məlumatı sızmır.
//
// İstifadə:
//   useLive(["listing"], () => fetchListings());
import { useEffect, useRef } from "react";
import { getSocket } from "@/lib/callSocket";
import { useAuth } from "@/lib/AuthContext";

export type LiveKind =
  | "listing" | "identity" | "seller" | "business" | "object" | "credential" | "social"
  | "account" | "complaint" | "support" | "return" | "order" | "payout"
  | "consultation" | "booking" | "notification";

export interface LiveEvent {
  kind: LiveKind;
  id?: number | string;
  status?: string | null;
  toast?: string;
  tone?: "success" | "error" | "info";
  at?: number;
}

/**
 * Göstərilən növlərdən biri dəyişəndə `onChange` çağırılır.
 *  - Ardıcıl gələn hadisələr birləşdirilir (toplu təsdiqdə 20 sorğu getməsin).
 *  - Socket qırılıb yenidən qoşulanda da çağırılır: arada buraxılmış hadisə
 *    ola bilər, məlumat köhnə qalmasın.
 *  - Səhifə gizli (başqa tab) olanda sorğu göndərilmir; tab-a qayıdanda bir dəfə
 *    yenilənir.
 */
export function useLive(kinds: LiveKind[] | "*", onChange: (e?: LiveEvent) => void) {
  const { token } = useAuth();
  // Callback-i ref-də saxlayırıq: hər render-də yenidən abunə olmayaq.
  const cbRef = useRef(onChange);
  useEffect(() => { cbRef.current = onChange; });
  const kindsKey = kinds === "*" ? "*" : [...kinds].sort().join(",");

  useEffect(() => {
    if (!token) return;
    const want = kindsKey === "*" ? null : new Set(kindsKey.split(","));
    const socket = getSocket(token);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let missed = false;          // gizli olanda gələn hadisə
    let last: LiveEvent | undefined;

    const fire = () => {
      timer = null;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") { missed = true; return; }
      try { cbRef.current(last); } catch { /* səhifənin öz xətası */ }
    };
    const schedule = (e?: LiveEvent) => {
      last = e;
      if (timer) clearTimeout(timer);
      timer = setTimeout(fire, 300);
    };

    const onLive = (e: LiveEvent) => {
      if (!e?.kind || (want && !want.has(e.kind))) return;
      schedule(e);
    };
    // Kuryer (Yango) statusu köhnə ayrıca hadisə ilə gəlir — sifariş kimi say.
    const onYango = () => { if (!want || want.has("order")) schedule({ kind: "order" }); };

    let wasDisconnected = false;
    const onDisconnect = () => { wasDisconnected = true; };
    const onConnect = () => { if (wasDisconnected) { wasDisconnected = false; schedule(); } };
    const onVisible = () => {
      if (document.visibilityState === "visible" && missed) { missed = false; schedule(); }
    };

    socket.on("live:update", onLive);
    socket.on("order:yango", onYango);
    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      socket.off("live:update", onLive);
      socket.off("order:yango", onYango);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, kindsKey]);
}

/* ── ADMİN PANELİ ──────────────────────────────────────────────────────────
   Panelin socket-i AdminShell-dədir (tək bağlantı). O, `admin:live` gələndə
   pəncərəyə eyni adlı hadisə yayır; səhifələr bu hook ilə tutur. */
export type AdminLiveKind =
  | "listing" | "identity" | "seller" | "business" | "object" | "credential" | "social"
  | "complaint" | "support" | "return" | "order" | "refund";

export function useAdminLive(kinds: AdminLiveKind[], onChange: (detail?: { kind: AdminLiveKind; id?: number | string }) => void) {
  const cbRef = useRef(onChange);
  useEffect(() => { cbRef.current = onChange; });
  const kindsKey = [...kinds].sort().join(",");

  useEffect(() => {
    const want = new Set(kindsKey.split(","));
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = (ev: Event) => {
      const d = (ev as CustomEvent).detail;
      if (!d?.kind || !want.has(d.kind)) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; try { cbRef.current(d); } catch { /* boş */ } }, 300);
    };
    window.addEventListener("admin:live", handler);
    return () => { if (timer) clearTimeout(timer); window.removeEventListener("admin:live", handler); };
  }, [kindsKey]);
}
