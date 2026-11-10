"use client";
// Qapı QR kodu — fərdi (VÖEN-siz) satıcı üçün.
// Satıcı ev ünvanını yazır, QR-ı çap edib evinin qapısına yapışdırır.
// Keçən şəxs QR-ı skan edəndə /seller/:id?ev=1 açılır: ünvan + satıcının
// fərdi elanları görünür. Ünvan yalnız satıcı aktivləşdirəndə ictimaidir.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeCanvas } from "qrcode.react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";

type HomeQr = { homeQrEnabled: boolean; homeQrAddress: string | null; homeQrLat: number | null; homeQrLng: number | null; individualCount?: number };

export default function HomeQrCard({ userId, userName, className, children }: {
  userId: number;
  userName: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<HomeQr | null>(null);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const qrWrap = useRef<HTMLDivElement>(null);

  const path = `/seller/${userId}?ev=1`;
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    fetch(`${API}/user/home-qr`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.success) return;
        setData(d);
        setAddress(d.homeQrAddress || "");
        setCoords(d.homeQrLat != null && d.homeQrLng != null ? { lat: d.homeQrLat, lng: d.homeQrLng } : null);
      })
      .catch(() => toast("Məlumat yüklənmədi", "error"))
      .finally(() => setLoading(false));
  }, [open, token, toast]);

  const save = async (enabled: boolean) => {
    if (enabled && address.trim().length < 5) { toast("Ev ünvanını yazın", "error"); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API}/user/home-qr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled, address: address.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null }),
      });
      const d = await r.json();
      if (!r.ok || !d.success) { toast(d.message || "Yadda saxlanmadı", "error"); return; }
      setData((p) => ({ ...(p || {}), ...d }));
      toast(enabled ? "Qapı QR kodu aktivdir ✓" : "Qapı QR kodu söndürüldü", "success");
    } catch { toast("Yadda saxlanmadı", "error"); }
    finally { setSaving(false); }
  };

  const locate = () => {
    if (!navigator.geolocation) { toast("Cihaz konumu dəstəklənmir", "error"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }); setLocating(false); },
      () => { toast("Konum alınmadı — icazə verin", "error"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const qrDataUrl = () => qrWrap.current?.querySelector("canvas")?.toDataURL("image/png") || "";

  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  // A5 ölçülü çap vərəqi — qapıya yapışdırmaq üçün.
  const print = () => {
    const img = qrDataUrl();
    if (!img) return;
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) { toast("Çap pəncərəsi açılmadı — pop-up icazəsi verin", "error"); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Qapı QR kodu</title>
<style>@page{size:A5;margin:12mm}body{font-family:system-ui,-apple-system,sans-serif;text-align:center;color:#0f172a;margin:0}
.card{border:3px solid #6d28d9;border-radius:24px;padding:28px 24px}
.k{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#6d28d9;font-weight:700}
h1{font-size:26px;margin:10px 0 4px}.a{font-size:15px;color:#334155;margin:0 0 18px}
img{width:300px;height:300px}.s{font-size:18px;font-weight:700;margin:16px 0 4px}.u{font-size:11px;color:#64748b;word-break:break-all}</style></head>
<body><div class="card"><div class="k">tradixai · evdə satılır</div><h1>${esc(userName)}</h1>
<p class="a">🏠 ${esc(address.trim())}</p><img src="${img}" alt="QR"/>
<p class="s">📷 Skan edin — bu evdə satılan məhsullara baxın</p><p class="u">${esc(url)}</p></div>
<script>window.onload=function(){setTimeout(function(){window.print()},200)}<\/script></body></html>`);
    w.document.close();
  };

  const download = () => {
    const img = qrDataUrl();
    if (!img) return;
    const a = document.createElement("a");
    a.href = img; a.download = `tradixai-qapi-qr-${userId}.png`; a.click();
  };

  const active = !!data?.homeQrEnabled;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} title="Qapı QR kodu — evdə satılan məhsullar">
        {children ?? "🏠 Qapı QR"}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-card text-foreground border border-card-border rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-card-border">
              <p className="font-bold">🏠 Qapı QR kodu</p>
              <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-foreground" aria-label="Bağla">✕</button>
            </div>
            {loading ? (
              <div className="py-12 flex justify-center"><span className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="p-5 space-y-4">
                <p className="text-xs text-muted">
                  QR-ı çap edib evinizin qapısına yapışdırın. Skan edən şəxs ünvanınızı və <b>fərdi elanlarınızı</b> görəcək.
                  {typeof data?.individualCount === "number" && <> Hazırda fərdi elan sayı: <b>{data.individualCount}</b>.</>}
                </p>
                <div>
                  <label className="text-xs font-semibold text-muted">Ev ünvanı</label>
                  <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={200}
                    placeholder="Məs. Bakı, Nəsimi r., Səməd Vurğun 12, mənzil 5"
                    className="mt-1 w-full px-3 py-2 rounded-xl bg-input-bg border border-input-border text-sm focus:outline-none focus:border-orange-500" />
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <button type="button" onClick={locate} disabled={locating}
                      className="text-xs px-2.5 py-1 rounded-lg bg-input-bg border border-input-border hover:border-orange-500/50 disabled:opacity-60">
                      {locating ? "Konum alınır..." : "📍 Xəritə nöqtəsi üçün konumumu götür"}
                    </button>
                    {coords && (
                      <span className="text-[11px] text-muted">
                        {coords.lat}, {coords.lng} · <button type="button" onClick={() => setCoords(null)} className="underline">sil</button>
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                  ⚠️ Aktiv edəndə bu ünvan QR-ı skan edən hər kəsə görünəcək. İstədiyiniz vaxt söndürə bilərsiniz.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => save(true)} disabled={saving}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-[var(--brand-from)] to-[var(--brand-to)] disabled:opacity-60">
                    {active ? "Yadda saxla" : "Aktiv et"}
                  </button>
                  {active && (
                    <button type="button" onClick={() => save(false)} disabled={saving}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-input-bg border border-input-border hover:border-red-500/50 hover:text-red-500 disabled:opacity-60">
                      Söndür
                    </button>
                  )}
                </div>

                {active && (
                  <div className="border-t border-card-border pt-4 text-center">
                    <div ref={qrWrap} className="inline-block p-3 bg-white rounded-xl">
                      <QRCodeCanvas value={url} size={220} level="M" marginSize={1} />
                    </div>
                    <p className="text-sm font-semibold mt-2">{userName}</p>
                    <p className="text-xs text-muted">🏠 {data?.homeQrAddress}</p>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <button type="button" onClick={print} className="py-2 rounded-xl bg-input-bg border border-input-border text-xs font-semibold hover:border-orange-500/50">🖨 Çap et</button>
                      <button type="button" onClick={download} className="py-2 rounded-xl bg-input-bg border border-input-border text-xs font-semibold hover:border-orange-500/50">⬇️ PNG</button>
                      <a href={path} target="_blank" rel="noopener noreferrer" className="py-2 rounded-xl bg-input-bg border border-input-border text-xs font-semibold hover:border-orange-500/50">👁 Bax</a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
