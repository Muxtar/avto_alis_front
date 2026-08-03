"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

const CAT_LABEL: Record<string, string> = {
  TIME_WASTED: "Vaxtı boşa xərclədi", FRAUD: "Fırıldaq", RUDE: "Kobud davranış", FAKE_INFO: "Saxta məlumat", OTHER: "Başqa",
  DEFECTIVE: "Qüsurlu / işləmir", DAMAGED: "Zədəli gəldi", NOT_AS_DESCRIBED: "Təsvirə uyğun deyil", WRONG_ITEM: "Yanlış məhsul",
};
const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Açıq", cls: "bg-blue-500/10 text-blue-600" },
  REVIEWING: { label: "Baxılır", cls: "bg-amber-500/10 text-amber-600" },
  EVIDENCE_REQUESTED: { label: "Sübut istənilir", cls: "bg-red-500/10 text-red-500" },
  RESOLVED: { label: "Həll olundu", cls: "bg-green-500/10 text-green-600" },
  REJECTED: { label: "Rədd edildi", cls: "bg-gray-500/10 text-gray-500" },
};

export default function MyComplaintsPage() {
  const { token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/me/complaints`, { headers: { Authorization: `Bearer ${token}` } }).then((x) => x.json());
      setItems(r.complaints || []);
    } catch { toast("Xəta", "error"); } finally { setLoading(false); }
  }, [token, toast]);
  useEffect(() => { load(); }, [load]);

  const addEvidence = async (id: number, files: FileList | null) => {
    const list = Array.from(files || []).filter((f) => /^image\//.test(f.type) && f.size < 8 * 1024 * 1024);
    if (!list.length) return;
    setBusy(id);
    try {
      const fd = new FormData();
      list.forEach((f) => fd.append("images", f));
      const r = await fetch(`${API}/complaints/${id}/evidence`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }).then((x) => x.json());
      if (r.success) { toast("Şəkillər əlavə olundu ✓", "success"); await load(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  if (!isLoggedIn) return <div className="max-w-2xl mx-auto p-6 text-muted">Şikayətlərinizi görmək üçün daxil olun.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl font-bold mb-1">Şikayətlərim</h1>
      <p className="text-sm text-muted mb-5">Göndərdiyiniz şikayətlərin vəziyyəti. Admin əlavə sübut istəyibsə, foto əlavə edə bilərsiniz.</p>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-muted text-sm py-10 text-center">Hələ şikayət göndərməmisiniz.</p>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const st = STATUS[c.status] || STATUS.OPEN;
            const canAdd = c.status === "EVIDENCE_REQUESTED" || c.status === "OPEN" || c.status === "REVIEWING";
            return (
              <div key={c.id} className="surface p-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold">{c.target?.name || "—"}</span>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-red-500/10 text-red-500">{CAT_LABEL[c.category] || c.category}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>
                <p className="text-sm text-muted mb-2">{c.description}</p>

                {c.images?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {c.images.map((img: string, i: number) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={imgUrl(img)} alt="" className="w-16 h-16 rounded-lg object-cover border border-input-border" />
                    ))}
                  </div>
                )}

                {c.status === "EVIDENCE_REQUESTED" && (
                  <p className="text-xs text-red-500 bg-red-500/10 rounded-lg px-2.5 py-1.5 mb-2">
                    Admin əlavə foto/sübut istəyir{c.adminNote ? `: ${c.adminNote}` : ""}. Zəhmət olmasa qüsurun aydın şəkillərini əlavə edin.
                  </p>
                )}

                {canAdd && (
                  <>
                    <input ref={(el) => { fileRefs.current[c.id] = el; }} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addEvidence(c.id, e.target.files); e.target.value = ""; }} />
                    <button onClick={() => fileRefs.current[c.id]?.click()} disabled={busy === c.id}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-input-bg border border-input-border hover:border-orange-500 disabled:opacity-50">
                      {busy === c.id ? "Yüklənir..." : "📷 Foto/sübut əlavə et"}
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
