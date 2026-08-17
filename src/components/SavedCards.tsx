"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

/**
 * SAXLANMIŞ KARTLAR — əlavə et / sil / əsas et.
 *
 * Kart məlumatı bizdə saxlanmır: YIĞIM kartı öz tərəfində saxlayır, biz yalnız
 * maskalanmış nömrəni və bitmə tarixini göstəririk. Ödənişi icra edən `token`
 * SERVERDƏN ÇIXMIR — bu komponent onu heç vaxt görmür.
 *
 * Kart əlavə edərkən kartın işlək olduğunu yoxlamaq üçün kiçik məbləğ (adətən
 * 5 qəpik) BLOKLANIR və dərhal geri açılır — pul çəkilmir.
 */

const BRAND: Record<string, string> = { Visa: "VISA", MasterCard: "MC", Maestro: "Maestro" };

export default function SavedCards() {
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const H = useCallback(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/me/cards`, { headers: H() }).then((x) => x.json());
      if (r.success) setCards(r.cards || []);
    } catch { /* şəbəkə */ } finally { setLoading(false); }
  }, [H]);

  useEffect(() => { if (isLoggedIn && token) load(); }, [isLoggedIn, token, load]);

  // Banka qayıdandan sonra nəticəni soruş — callback serverə bir az gec çata bilər.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (!sp.get("card")) return;
    window.history.replaceState({}, "", window.location.pathname);
    let stop = false;
    (async () => {
      for (let i = 0; i < 10 && !stop; i++) {
        const r = await fetch(`${API}/me/cards/last`, { headers: H() }).then((x) => x.json()).catch(() => null);
        if (r?.card?.status === "ACTIVE") { toast("Kart əlavə olundu ✓", "success"); load(); return; }
        if (r?.card?.status === "FAILED") { toast("Kart əlavə olunmadı", "error"); return; }
        await new Promise((res) => setTimeout(res, 1500));
      }
    })();
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCard = async () => {
    setAdding(true);
    try {
      const r = await fetch(`${API}/me/cards/init`, { method: "POST", headers: H() }).then((x) => x.json());
      if (r.success && r.url) { window.location.href = r.url; return; }
      toast(r.message || "Kart səhifəsi açılmadı", "error");
    } catch { toast("Xəta", "error"); } finally { setAdding(false); }
  };

  const remove = async (id: number) => {
    if (!confirm("Bu kart silinsin?")) return;
    setBusy(id);
    try {
      const r = await fetch(`${API}/me/cards/${id}`, { method: "DELETE", headers: H() }).then((x) => x.json());
      if (r.success) { toast("Silindi", "success"); load(); } else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  const makeDefault = async (id: number) => {
    setBusy(id);
    try {
      const r = await fetch(`${API}/me/cards/${id}/default`, { method: "PATCH", headers: H() }).then((x) => x.json());
      if (r.success) load(); else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="surface p-4">
      <div className="flex items-center gap-3 mb-1">
        <h2 className="font-bold text-base flex-1">Kartlarım</h2>
        <button onClick={addCard} disabled={adding}
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white cta-gradient disabled:opacity-50">
          {adding ? "..." : "+ Kart əlavə et"}
        </button>
      </div>
      <p className="text-[11px] text-muted mb-3">
        Kart məlumatı saytda saxlanmır — bankın ödəniş sistemi saxlayır, biz yalnız son 4 rəqəmi görürük.
        Əlavə edərkən kartın işlək olduğunu yoxlamaq üçün cüzi məbləğ bloklanır və <b>dərhal geri açılır</b>.
      </p>

      {loading ? (
        <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : cards.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">Saxlanmış kart yoxdur.</p>
      ) : (
        <div className="space-y-2">
          {cards.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-card-border">
              <span className="w-11 h-7 rounded-md bg-input-bg flex items-center justify-center text-[10px] font-extrabold text-muted shrink-0">
                {BRAND[c.brand] || (c.brand ? c.brand.slice(0, 4).toUpperCase() : "KART")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">···· {(c.maskedPan || "").slice(-4)}</p>
                <p className="text-[11px] text-muted">
                  {c.expiry ? `${c.expiry.slice(0, 2)}/${c.expiry.slice(2)}` : "—"}
                  {c.issuer ? ` · ${c.issuer}` : ""}
                </p>
              </div>
              {c.isDefault ? (
                <span className="px-2 py-1 rounded-lg bg-[var(--brand-soft)] text-[var(--brand-to)] text-[10px] font-bold shrink-0">əsas</span>
              ) : (
                <button onClick={() => makeDefault(c.id)} disabled={busy === c.id}
                  className="px-2 py-1 rounded-lg border border-card-border text-[10px] font-semibold hover:bg-input-bg shrink-0 disabled:opacity-50">
                  əsas et
                </button>
              )}
              <button onClick={() => remove(c.id)} disabled={busy === c.id}
                title="Sil" className="w-8 h-8 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center shrink-0 disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-.9 13a2 2 0 0 1-2 1.9H7.9a2 2 0 0 1-2-1.9L5 6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
