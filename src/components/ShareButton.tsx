"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/AuthContext";
import { API } from "@/lib/api";

// Modalı <body>-yə render et — heç bir overlay-in altında qalmasın.
function Portal({ children }: { children: React.ReactNode }) {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  if (!m || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

const initials = (n?: string) => (n || "?").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();

// Paylaşma düyməsi — TƏTBİQDƏ (mesaj/kontakt) və ya XARİCDƏ (yerli paylaşım/kopyala).
export default function ShareButton({
  title,
  text,
  path,
  className,
  compact,
  listingId,
  beforeShare,
  disabled,
}: {
  title?: string;
  text?: string;
  path?: string; // verilməzsə cari səhifə URL-i istifadə olunur
  className?: string;
  compact?: boolean; // yalnız ikon
  listingId?: number; // məhsul paylaşımında — qarşı tərəf çat-da klikləyə bilən kart görünür
  beforeShare?: () => Promise<string | null>; // menyu açılmadan əvvəl linki yarat, path qaytar (null=xəta)
  disabled?: boolean;
}) {
  const { toast } = useToast();
  const { token, isLoggedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recipients, setRecipients] = useState<{ id: number; name: string }[]>([]);
  const [loadingR, setLoadingR] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const effPath = resolvedPath ?? path;
  const url = () => (typeof window === "undefined" ? "" : effPath ? `${window.location.origin}${effPath}` : window.location.href);

  // Əsas düymə — lazımsa əvvəlcə linki yarat, sonra menyunu aç.
  const onMainClick = async () => {
    if (menuOpen) { setMenuOpen(false); return; }
    if (beforeShare) {
      setPreparing(true);
      try {
        const p = await beforeShare();
        if (!p) return; // xəta beforeShare-də göstərilib
        setResolvedPath(p);
      } finally { setPreparing(false); }
    }
    setMenuOpen(true);
  };
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  // XARİCDƏ paylaş — yerli paylaşım pəncərəsi, dəstəklənmirsə kopyala.
  const shareExternal = async () => {
    setMenuOpen(false);
    const u = url();
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: title || document.title, text: text || title || "", url: u }); } catch { /* ləğv */ }
      return;
    }
    try { await navigator.clipboard.writeText(u); toast("Link kopyalandı ✓", "success"); }
    catch { toast("Linki kopyalamaq mümkün olmadı", "error"); }
  };

  // TƏTBİQDƏ paylaş — söhbətlərim + kontaktlarım (qeydiyyatlı) siyahısı.
  const openPicker = async () => {
    setMenuOpen(false);
    if (!isLoggedIn) { toast("Əvvəlcə daxil olun", "error"); return; }
    setPickerOpen(true); setLoadingR(true); setQ("");
    try {
      const [convs, contacts] = await Promise.all([
        fetch(`${API}/messages/conversations`, { headers }).then((r) => r.json()).catch(() => ({})),
        fetch(`${API}/me/contacts`, { headers }).then((r) => r.json()).catch(() => ({})),
      ]);
      const map = new Map<number, { id: number; name: string }>();
      (convs.conversations || []).forEach((c: any) => { if (c.partner?.id) map.set(c.partner.id, { id: c.partner.id, name: c.partner.name }); });
      (contacts.contacts || []).forEach((c: any) => { if (c.user?.id && !map.has(c.user.id)) map.set(c.user.id, { id: c.user.id, name: c.name || c.user.name }); });
      setRecipients(Array.from(map.values()));
    } catch { toast("Siyahı yüklənmədi", "error"); } finally { setLoadingR(false); }
  };

  const sendTo = async (rid: number) => {
    setSendingId(rid);
    try {
      const content = `${title ? title + "\n" : ""}${url()}`;
      const res = await fetch(`${API}/messages`, { method: "POST", headers, body: JSON.stringify({ receiverId: rid, content, ...(listingId ? { listingId } : {}) }) });
      const d = await res.json();
      if (res.ok && d.success) { toast("Paylaşıldı ✓", "success"); setPickerOpen(false); }
      else toast(d.message || "Göndərilmədi", "error");
    } catch { toast("Göndərilmədi", "error"); } finally { setSendingId(null); }
  };

  const filtered = recipients.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <button
        type="button"
        onClick={onMainClick}
        disabled={disabled || preparing}
        title="Paylaş"
        aria-label="Paylaş"
        className={`${className || "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-input-bg border border-input-border text-foreground hover:border-orange-500/50 transition-all text-sm font-medium"} ${(disabled || preparing) ? "opacity-50 pointer-events-none" : ""}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        {!compact && <span>Paylaş</span>}
      </button>

      {/* Seçim menyusu — tətbiqdə / xaricdə */}
      {menuOpen && (
        <Portal>
          <div className="fixed inset-0 z-[95]" onClick={() => setMenuOpen(false)}>
            <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 bg-card border border-card-border rounded-t-2xl sm:rounded-2xl p-2 shadow-xl sm:w-72" onClick={(e) => e.stopPropagation()}>
              <button onClick={openPicker} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-input-bg text-left">
                <span className="text-xl">📲</span><span className="text-sm font-medium">Tətbiqdə paylaş<span className="block text-[11px] text-muted">Mesaj / kontakt</span></span>
              </button>
              <button onClick={shareExternal} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-input-bg text-left">
                <span className="text-xl">🔗</span><span className="text-sm font-medium">Xaricdə paylaş<span className="block text-[11px] text-muted">Link / digər tətbiqlər</span></span>
              </button>
              <button onClick={() => setMenuOpen(false)} className="w-full px-3 py-2 text-sm text-muted hover:text-foreground">Bağla</button>
            </div>
          </div>
        </Portal>
      )}

      {/* Tətbiqdə paylaş — alıcı seçici */}
      {pickerOpen && (
        <Portal>
          <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/40" onClick={() => setPickerOpen(false)}>
            <div className="bg-card border border-card-border rounded-t-2xl sm:rounded-2xl w-full sm:w-96 max-h-[75vh] flex flex-col p-3" onClick={(e) => e.stopPropagation()}>
              <p className="font-semibold mb-2">Kimə göndərilsin?</p>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Axtar..." className="mb-2 px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
              <div className="flex-1 overflow-y-auto -mx-1 px-1">
                {loadingR ? (
                  <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : filtered.length === 0 ? (
                  <p className="text-muted text-sm text-center py-6">Söhbət və ya qeydiyyatlı kontakt yoxdur</p>
                ) : filtered.map((r) => (
                  <button key={r.id} onClick={() => sendTo(r.id)} disabled={sendingId === r.id} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-input-bg text-left disabled:opacity-50">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{initials(r.name)}</div>
                    <span className="text-sm flex-1 truncate">{r.name}</span>
                    {sendingId === r.id ? <span className="text-xs text-muted">Göndərilir…</span> : <span className="text-orange-500 text-xs">göndər</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => setPickerOpen(false)} className="mt-2 w-full py-2 text-sm text-muted hover:text-foreground">Bağla</button>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
