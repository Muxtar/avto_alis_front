"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/lib/LanguageContext";
import { API, UPLOADS } from "@/lib/api";

interface Application {
  id: number;
  userId: number;
  idImageFront: string;
  idImageBack?: string | null;
  taxId: string;
  iban?: string | null;
  businessName?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  user: { id: number; name: string; phone: string; type: string };
}

export default function AdminSellerApplicationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [busy, setBusy] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const adminToken = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;

  useEffect(() => {
    if (!adminToken) { router.push("/admin/login"); return; }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const refresh = async () => {
    setLoading(true);
    try {
      const url = filter === "ALL"
        ? `${API}/admin/seller-applications`
        : `${API}/admin/seller-applications?status=${filter}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await res.json();
      setItems(data.applications || []);
    } catch {
      toast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id: number) => {
    setBusy(id);
    try {
      const res = await fetch(`${API}/admin/seller-applications/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      if (!data.success) { toast(data.message || t("error"), "error"); return; }
      toast("Təsdiqləndi", "success");
      refresh();
    } finally { setBusy(null); }
  };

  const reject = async (id: number) => {
    const reason = (rejectReason[id] || "").trim();
    if (!reason) { toast("Səbəb tələb olunur", "error"); return; }
    setBusy(id);
    try {
      const res = await fetch(`${API}/admin/seller-applications/${id}/reject`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      const data = await res.json();
      if (!data.success) { toast(data.message || t("error"), "error"); return; }
      toast("Rədd edildi", "success");
      setRejectReason((p) => ({ ...p, [id]: "" }));
      refresh();
    } finally { setBusy(null); }
  };

  const statusBadge = (s: Application["status"]) => {
    const cls = s === "APPROVED" ? "bg-green-500/20 text-green-500"
      : s === "REJECTED" ? "bg-red-500/20 text-red-500"
      : "bg-yellow-500/20 text-yellow-500";
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{s}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">KYC müraciətləri</h1>
          <p className="text-muted text-sm">Satıcı identifikasiya təsdiqi</p>
        </div>
        <button onClick={refresh} className="btn-outline">
          {loading ? "..." : "Yenilə"}
        </button>
      </div>

      <div className="segmented mb-5">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={filter === s ? "active" : ""}>
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="surface text-center py-16 text-muted">
          Heç bir müraciət yoxdur
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <div key={a.id} className="surface p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <strong className="text-base">{a.user?.name}</strong>
                    {statusBadge(a.status)}
                    <span className="text-xs text-muted">{a.user?.type}</span>
                  </div>
                  <p className="text-sm text-muted">{a.user?.phone}</p>
                  <p className="text-xs text-muted mt-1">
                    Müraciət: {new Date(a.submittedAt).toLocaleString("az-AZ")}
                    {a.reviewedAt && ` • Yoxlanılıb: ${new Date(a.reviewedAt).toLocaleString("az-AZ")}`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
                <div>
                  <p className="text-xs text-muted mb-0.5">VÖEN</p>
                  <p className="font-medium">{a.taxId}</p>
                </div>
                {a.iban && (
                  <div>
                    <p className="text-xs text-muted mb-0.5">IBAN</p>
                    <p className="font-medium">{a.iban}</p>
                  </div>
                )}
                {a.businessName && (
                  <div>
                    <p className="text-xs text-muted mb-0.5">Biznes adı</p>
                    <p className="font-medium">{a.businessName}</p>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setPreviewImg(`${UPLOADS}/${a.idImageFront}`)}
                  className="aspect-video bg-input-bg border border-input-border rounded-lg overflow-hidden hover:border-orange-500 transition-all"
                >
                  <img src={`${UPLOADS}/${a.idImageFront}`} alt="ID front" className="w-full h-full object-cover" />
                </button>
                {a.idImageBack && (
                  <button
                    type="button"
                    onClick={() => setPreviewImg(`${UPLOADS}/${a.idImageBack}`)}
                    className="aspect-video bg-input-bg border border-input-border rounded-lg overflow-hidden hover:border-orange-500 transition-all"
                  >
                    <img src={`${UPLOADS}/${a.idImageBack}`} alt="ID back" className="w-full h-full object-cover" />
                  </button>
                )}
              </div>

              {a.rejectionReason && (
                <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  Rədd səbəbi: {a.rejectionReason}
                </div>
              )}

              {a.status === "PENDING" && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => approve(a.id)}
                    disabled={busy === a.id}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    ✓ Təsdiqlə
                  </button>
                  <input
                    type="text"
                    placeholder="Rədd səbəbi"
                    value={rejectReason[a.id] || ""}
                    onChange={(e) => setRejectReason((p) => ({ ...p, [a.id]: e.target.value }))}
                    className="flex-1 input-base px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => reject(a.id)}
                    disabled={busy === a.id}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    ✕ Rədd et
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {previewImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <img src={previewImg} alt="preview" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
