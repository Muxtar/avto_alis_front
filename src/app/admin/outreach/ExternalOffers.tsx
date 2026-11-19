"use client";
// KƏNAR ELAN TƏKLİFLƏRİ (admin) — istifadəçi internet axtarışında tapdığı elana
// (tap.az, turbo.az, bina.az, lalafo.az) təklif göndərib. Adminin işi:
//   1) nömrə yoxdursa — elanı açıb «Nömrəni göstər»dən nömrəni götürüb bura yazmaq
//      (turbo.az / lalafo.az-da nömrə çox vaxt avtomatik gəlir);
//   2) satıcıya BİR dəfə xəbər vermək: WhatsApp (hazır mətnlə açılır) və ya SMS;
//   3) «Göndərildi» işarələmək. Satıcı həmin nömrə ilə qeydiyyatdan keçəndə təklifi görür.
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";
import { useAdminLive } from "@/lib/live";

interface Item {
  id: number; listingUrl: string; listingSite: string; listingTitle: string;
  listingPrice: number | null; listingCurrency: string | null;
  offerPrice: number; note: string | null;
  phone: string | null; phoneSource: string | null;
  status: "PENDING" | "SENT" | "REJECTED"; sentVia: string | null;
  adminNote: string | null; sentByName: string | null; sentAt: string | null; createdAt: string;
  buyer: { id: number; name: string; phone: string } | null;
  text: string; waLink: string | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Xəbər veriləcək", cls: "bg-amber-500/10 text-amber-600" },
  SENT: { label: "Xəbər verildi", cls: "bg-green-500/10 text-green-600" },
  REJECTED: { label: "Bağlandı", cls: "bg-red-500/10 text-red-500" },
};
const VIA: Record<string, string> = { whatsapp: "WhatsApp", sms: "SMS", other: "başqa yolla", site: "satıcı saytdadır — özü gördü", covered: "bu elan üçün artıq yazılıb" };

export default function ExternalOffers() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [phone, setPhone] = useState<Record<number, string>>({});
  const [smsOk, setSmsOk] = useState(false);

  const H = () => ({ Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("adminToken") : ""}`, "Content-Type": "application/json" });

  const load = useCallback(async (silent?: unknown) => {
    if (silent !== true) setLoading(true);
    try {
      const r = await fetch(`${API}/admin/external-offers?status=${filter}`, { headers: H() }).then((x) => x.json());
      if (r.success) { setItems(r.items || []); setSmsOk(!!r.smsConfigured); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  useEffect(() => { load(); }, [load]);
  useAdminLive("*", () => load(true));

  const call = async (id: number, path: string, method: string, body?: unknown, okMsg?: string) => {
    setBusy(id);
    try {
      const r = await fetch(`${API}/admin/external-offers/${path}`, { method, headers: H(), body: body ? JSON.stringify(body) : undefined }).then((x) => x.json());
      if (!r.success) { toast(r.message || "Xəta", "error"); return false; }
      if (okMsg) toast(okMsg, "success");
      window.dispatchEvent(new CustomEvent("admin:counts-changed"));
      await load(true);
      return true;
    } catch { toast("Xəta", "error"); return false; } finally { setBusy(null); }
  };

  const savePhone = (it: Item) => call(it.id, `${it.id}/phone`, "PUT", { phone: phone[it.id] || "" }, "Nömrə yadda saxlanıldı");
  const reject = (it: Item) => {
    const note = prompt("Bağlama səbəbi (alıcıya göstəriləcək):", "Satıcının nömrəsi tapılmadı");
    if (note === null) return;
    call(it.id, `${it.id}/reject`, "POST", { adminNote: note }, "Təklif bağlandı");
  };
  const optOut = (it: Item) => {
    if (!it.phone) return;
    if (!confirm(`${it.phone} nömrəsi «bir daha yazmayın» siyahısına əlavə olunsun? Bu nömrəyə gələcək təkliflər qəbul edilməyəcək.`)) return;
    call(it.id, "optout", "POST", { phone: it.phone }, "Nömrə imtina siyahısına əlavə olundu");
  };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); toast("Mətn kopyalandı", "success"); } catch { toast("Kopyalanmadı", "error"); } };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {(["PENDING", "SENT", "REJECTED"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter === s ? "bg-orange-500 border-orange-500 text-white" : "bg-input-bg border-input-border"}`}>
            {STATUS[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center bg-card border border-card-border rounded-xl">Bu bölmədə təklif yoxdur.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <div key={it.id} className="bg-card border border-card-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <a href={it.listingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm hover:underline break-words">{it.listingTitle} ↗</a>
                  <p className="text-xs text-muted mt-0.5">
                    {it.listingSite}{it.listingPrice != null ? ` · elan qiyməti ${it.listingPrice} ${it.listingCurrency || "AZN"}` : ""} · {new Date(it.createdAt).toLocaleString("az-AZ")}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[11px] font-bold ${STATUS[it.status].cls}`}>{STATUS[it.status].label}</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <p><span className="text-muted">Təklif:</span> <b className="text-orange-600">{it.offerPrice} AZN</b>{it.note ? <span className="text-muted"> — «{it.note}»</span> : null}</p>
                <p><span className="text-muted">Alıcı:</span> {it.buyer?.name || "—"} <span className="text-muted text-xs">{it.buyer?.phone}</span></p>
              </div>

              {it.status === "PENDING" ? (
                <>
                  {/* Satıcının nömrəsi */}
                  <div className="rounded-xl bg-input-bg/60 border border-card-border p-3 space-y-2">
                    {it.phone ? (
                      <p className="text-sm">📞 Satıcı: <b>{it.phone}</b> <span className="text-[11px] text-muted">({it.phoneSource === "auto" ? "elan səhifəsindən" : "admin daxil edib"})</span></p>
                    ) : (
                      <p className="text-xs text-amber-600">Nömrə avtomatik tapılmadı. Elanı açın → «Nömrəni göstər» → nömrəni bura yazın.</p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <input value={phone[it.id] ?? ""} onChange={(e) => setPhone({ ...phone, [it.id]: e.target.value })}
                        placeholder={it.phone ? "Nömrəni düzəlt" : "050 123 45 67"} aria-label="Satıcının nömrəsi" inputMode="tel"
                        className="flex-1 min-w-[160px] px-3 py-2 bg-card border border-input-border rounded-lg text-sm" />
                      <button onClick={() => savePhone(it)} disabled={busy === it.id || !(phone[it.id] || "").trim()}
                        className="px-3 py-2 rounded-lg bg-input-bg border border-input-border text-xs font-semibold disabled:opacity-50">Yadda saxla</button>
                    </div>
                  </div>

                  {/* Göndəriləcək mətn */}
                  <div>
                    <p className="text-[11px] text-muted mb-1">Satıcıya gedəcək mətn:</p>
                    <pre className="text-xs whitespace-pre-wrap bg-input-bg/60 border border-card-border rounded-xl p-3 font-sans">{it.text}</pre>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {it.waLink && (
                      <a href={it.waLink} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700">WhatsApp-da aç</a>
                    )}
                    <button onClick={() => copy(it.text)} className="px-3 py-2 rounded-lg bg-input-bg border border-input-border text-xs font-semibold">Mətni kopyala</button>
                    {it.phone && smsOk && (
                      <button onClick={() => { if (confirm(`${it.phone} nömrəsinə SMS göndərilsin?`)) call(it.id, `${it.id}/sms`, "POST", undefined, "SMS göndərildi"); }} disabled={busy === it.id}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50">SMS göndər</button>
                    )}
                    {it.phone && (
                      <button onClick={() => call(it.id, `${it.id}/sent`, "POST", { via: "whatsapp" }, "Göndərildi kimi işarələndi")} disabled={busy === it.id}
                        className="px-3 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50">✓ WhatsApp ilə göndərdim</button>
                    )}
                    <button onClick={() => reject(it)} disabled={busy === it.id} className="px-3 py-2 rounded-lg bg-red-500/10 text-red-500 text-xs font-semibold disabled:opacity-50">Bağla</button>
                    {it.phone && <button onClick={() => optOut(it)} disabled={busy === it.id} className="px-3 py-2 rounded-lg text-xs text-muted underline disabled:opacity-50">«Bir daha yazmayın» dedi</button>}
                  </div>
                  {it.phone && !smsOk && <p className="text-[11px] text-muted">SMS xidməti qoşulmayıb — yalnız WhatsApp / əl ilə.</p>}
                </>
              ) : (
                <p className="text-xs text-muted">
                  {it.phone ? `${it.phone} · ` : ""}{it.sentVia ? `${VIA[it.sentVia] || it.sentVia} · ` : ""}
                  {it.sentByName ? `${it.sentByName} · ` : ""}{it.sentAt ? new Date(it.sentAt).toLocaleString("az-AZ") : ""}
                  {it.adminNote ? ` · ${it.adminNote}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
