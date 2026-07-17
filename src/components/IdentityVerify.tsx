"use client";
import { useState, useEffect } from "react";
import { API } from "@/lib/api";
import { useToast } from "@/components/Toast";

// Kimlik doğrulama — YALNIZ Veriff ilə.
// Sənəd (şəxsiyyət vəsiqəsi / sürücülük vəsiqəsi / pasport) + video-selfie Veriff-in
// təhlükəsiz pəncərəsində çəkilir; şəkillər bizim serverdə saxlanmır.
export default function IdentityVerify({ token, onDone }: { token: string | null; onDone?: () => void }) {
  const { toast } = useToast();
  const [veriffOn, setVeriffOn] = useState<boolean | null>(null); // null = yüklənir
  const [veriffBusy, setVeriffBusy] = useState(false);
  const [veriffStarted, setVeriffStarted] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/veriff/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => setVeriffOn(!!d.configured)).catch(() => setVeriffOn(false));
  }, [token]);

  const startVeriff = async () => {
    setVeriffBusy(true);
    try {
      const r = await fetch(`${API}/me/veriff/session`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      }).then((x) => x.json());
      if (r.success && r.url) {
        window.open(r.url, "_blank", "noopener");
        setVeriffStarted(true);
        toast("Veriff pəncərəsi açıldı — sənəd və selfieni orada çəkin", "success");
      } else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta baş verdi", "error"); } finally { setVeriffBusy(false); }
  };

  const checkVeriff = async () => {
    setVeriffBusy(true);
    try {
      const r = await fetch(`${API}/me/veriff/check`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      }).then((x) => x.json());
      if (!r.success) { toast(r.message || "Xəta", "error"); return; }
      if (r.status === "approved") { toast("Kimlik təsdiqləndi ✅", "success"); onDone?.(); }
      else if (r.status === "declined") { toast("Doğrulama rədd edildi — yenidən cəhd edin", "error"); setVeriffStarted(false); }
      else toast("Nəticə hələ hazır deyil — bir az sonra yenidən yoxlayın", "success");
    } catch { toast("Xəta baş verdi", "error"); } finally { setVeriffBusy(false); }
  };

  if (veriffOn === null) {
    return <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!veriffOn) {
    return (
      <div className="p-4 bg-input-bg border border-input-border rounded-xl text-sm text-muted">
        Kimlik doğrulama hazırda aktiv deyil. Zəhmət olmasa bir az sonra yenidən cəhd edin.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <p className="text-sm font-semibold mb-1">🛡️ Veriff ilə kimlik doğrulama</p>
        <p className="text-[11px] text-muted mb-3">
          Şəxsiyyət vəsiqəsi, sürücülük vəsiqəsi və ya pasport + video-selfie birbaşa Veriff-in təhlükəsiz
          pəncərəsində çəkilir — nəticə adətən 1-2 dəqiqəyə hazır olur. Şəkilləriniz bizim serverdə saxlanmır.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={startVeriff} disabled={veriffBusy}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
            {veriffBusy ? "..." : veriffStarted ? "Yenidən aç" : "Veriff ilə təsdiqlə"}
          </button>
          {veriffStarted && (
            <button type="button" onClick={checkVeriff} disabled={veriffBusy}
              className="px-4 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm font-medium disabled:opacity-50">
              Nəticəni yoxla
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
