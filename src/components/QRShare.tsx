"use client";
import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/AuthContext";
import { API } from "@/lib/api";

// Hər profil / biznes / obyekt üçün unikal QR kod.
// QR-in içi həmin səhifənin tam linkidir — skan edən birbaşa o səhifəyə düşür.
//
// Üç imkan var:
//   • ÇATDA PAYLAŞ — QR ŞƏKLİ tətbiqdaxili mesaj kimi göndərilir (söhbətlərim
//     + kontaktlarım siyahısından seçilir). Əvvəl bu yox idi: QR yalnız
//     kopyalanır və ya xaricə paylaşılırdı, öz çatımıza göndərmək olmurdu.
//   • Paylaş — cihazın öz paylaşım pəncərəsi (dəstəklənməsə link kopyalanır).
//   • Şəkil yüklə — QR PNG kimi endirilir.
export default function QRShare({
  path,
  title,
  subtitle,
  buttonLabel,
  compact,
  className,
}: {
  path: string; // məs. "/seller/12" — QR bu linkə aparır
  title?: string; // modalda göstərilən ad (məs. obyekt adı)
  subtitle?: string; // ikinci sətir (məs. "Obyekt №12")
  buttonLabel?: string; // düymə mətni (compact deyilsə)
  compact?: boolean; // yalnız ikon
  className?: string;
}) {
  const { toast } = useToast();
  const { token, isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  // Çatda paylaşma — alıcı seçimi
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recipients, setRecipients] = useState<{ id: number; name: string }[]>([]);
  const [loadingR, setLoadingR] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setUrl(`${window.location.origin}${path}`);
  }, [path]);

  const getCanvas = (): HTMLCanvasElement | null =>
    wrapRef.current?.querySelector("canvas") || null;

  const download = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `tradixai-qr${path.replace(/\//g, "-")}.png`;
    a.click();
    toast("QR kod yükləndi ✓", "success");
  };

  const shareLink = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: title || "tradixai", text: subtitle || title || "", url });
        return;
      } catch {
        /* ləğv edildi */
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link kopyalandı ✓", "success");
    } catch {
      toast("Linki kopyalamaq mümkün olmadı", "error");
    }
  };

  // QR şəklini fayl kimi paylaş (dəstəklənən cihazlarda).
  const shareImage = async () => {
    const canvas = getCanvas();
    if (!canvas) return shareLink();
    canvas.toBlob(async (blob) => {
      if (!blob) return shareLink();
      const file = new File([blob], "tradixai-qr.png", { type: "image/png" });
      const nav = navigator as any;
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: title || "tradixai", text: subtitle || title || "" });
          return;
        } catch {
          return;
        }
      }
      // Fayl paylaşımı dəstəklənmir — linki paylaş.
      shareLink();
    }, "image/png");
  };

  // ── ÇATDA PAYLAŞ ──
  // Siyahı: mövcud söhbətlərim + qeydiyyatlı kontaktlarım (ShareButton ilə eyni).
  const openPicker = async () => {
    if (!isLoggedIn || !token) { toast("Çatda paylaşmaq üçün daxil olun", "error"); return; }
    setPickerOpen(true); setLoadingR(true); setQ("");
    const headers = { Authorization: `Bearer ${token}` };
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

  // QR ŞƏKLİNİ mesaj kimi göndər (altında ad + link yazılır).
  const sendQrTo = (rid: number) => {
    const canvas = getCanvas();
    if (!canvas || !token) return;
    setSendingId(rid);
    canvas.toBlob(async (blob) => {
      try {
        if (!blob) { toast("QR şəkli hazırlanmadı", "error"); return; }
        const fd = new FormData();
        fd.append("media", new File([blob], "tradixai-qr.png", { type: "image/png" }));
        fd.append("receiverId", String(rid));
        fd.append("type", "IMAGE");
        fd.append("caption", `${title ? title + "\n" : ""}${url}`);
        const r = await fetch(`${API}/messages/media`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
        }).then((x) => x.json());
        if (r?.success) { toast("QR kod çatda paylaşıldı ✓", "success"); setPickerOpen(false); setOpen(false); }
        else toast(r?.message || "Göndərilmədi", "error");
      } catch { toast("Göndərilmədi", "error"); } finally { setSendingId(null); }
    }, "image/png");
  };

  const filtered = recipients.filter((r) => (r.name || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="QR kod"
        aria-label="QR kod"
        className={
          className ||
          "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-input-bg border border-input-border text-foreground hover:border-orange-500/50 transition-all text-sm font-medium"
        }
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6.75 6.75h.008v.008H6.75V6.75zM6.75 16.5h.008v.008H6.75V16.5zM16.5 6.75h.008v.008H16.5V6.75zM13.5 13.5h.008v.008H13.5V13.5zM13.5 19.5h.008v.008H13.5V19.5zM19.5 13.5h.008v.008H19.5V13.5zM19.5 19.5h.008v.008H19.5V19.5zM16.5 16.5h.008v.008H16.5V16.5z" />
        </svg>
        {!compact && <span>{buttonLabel || "QR kod"}</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background border border-input-border rounded-2xl w-full max-w-xs p-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {title && <p className="font-semibold text-foreground truncate">{title}</p>}
            {subtitle && <p className="text-xs text-muted mb-1">{subtitle}</p>}
            <p className="text-[11px] text-muted mb-3">Skan edərək birbaşa səhifəyə keçin</p>

            <div ref={wrapRef} className="inline-flex p-3 bg-white rounded-xl">
              {url && (
                <QRCodeCanvas
                  value={url}
                  size={200}
                  level="M"
                  marginSize={2}
                  fgColor="#0f172a"
                  bgColor="#ffffff"
                />
              )}
            </div>

            <p className="text-[10px] text-muted mt-2 break-all">{url}</p>

            {/* Əsas əməliyyat — ÇATDA paylaşmaq (ən çox istənən). */}
            <button
              onClick={openPicker}
              className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              💬 Çatda paylaş
            </button>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={shareImage}
                className="py-2.5 rounded-xl bg-input-bg border border-input-border text-foreground text-sm font-medium hover:border-orange-500/50 transition-all"
              >
                Xaricdə paylaş
              </button>
              <button
                onClick={download}
                className="py-2.5 rounded-xl bg-input-bg border border-input-border text-foreground text-sm font-medium hover:border-orange-500/50 transition-all"
              >
                Şəkil yüklə
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full py-2 text-sm text-muted hover:text-foreground transition-colors"
            >
              Bağla
            </button>
          </div>
        </div>
      )}

      {/* ── Kimə göndərilsin? — söhbətlərim + kontaktlarım ── */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          onClick={() => setPickerOpen(false)}>
          <div className="bg-background border border-input-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-sm mb-1">QR kodu kimə göndərək?</p>
            <p className="text-[11px] text-muted mb-3">QR şəkli və link mesaj kimi göndərilir.</p>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad üzrə axtar…"
              className="w-full px-3 py-2 bg-input-bg border border-input-border rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-500/30" />
            <div className="max-h-[45vh] overflow-y-auto">
              {loadingR ? (
                <p className="text-xs text-muted py-3 text-center">yüklənir…</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-muted py-3 text-center">
                  {recipients.length === 0 ? "Hələ söhbət və ya kontaktınız yoxdur." : "Tapılmadı."}
                </p>
              ) : filtered.map((r) => (
                <button key={r.id} onClick={() => sendQrTo(r.id)} disabled={sendingId !== null}
                  className="w-full flex items-center gap-2.5 px-2 py-2.5 rounded-xl hover:bg-input-bg text-left transition-colors disabled:opacity-50">
                  <span className="w-8 h-8 rounded-full bg-input-bg flex items-center justify-center text-[11px] font-bold shrink-0">
                    {(r.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm font-medium truncate">{r.name}</span>
                  {sendingId === r.id && <span className="text-[11px] text-muted shrink-0">göndərilir…</span>}
                </button>
              ))}
            </div>
            <button onClick={() => setPickerOpen(false)}
              className="mt-2 w-full py-2 text-sm text-muted hover:text-foreground transition-colors">
              Bağla
            </button>
          </div>
        </div>
      )}
    </>
  );
}
