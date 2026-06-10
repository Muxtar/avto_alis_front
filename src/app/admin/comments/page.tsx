"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { useToast } from "@/components/Toast";
import { API } from "@/lib/api";

interface AdminComment {
  id: number;
  content: string;
  rating: number | null;
  createdAt: string;
  user: { id: number; name: string; phone: string };
  listing: { id: number; title: string } | null;
}

export default function AdminCommentsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const adminToken = localStorage.getItem("adminToken");
      const res = await fetch(`${API}/admin/comments?page=${page}&limit=20`, { headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await res.json();
      setComments(data.comments || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  }, [page, t, toast]);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: number) => {
    if (busyId || !confirm(t("adminCommentDeleteConfirm"))) return;
    setBusyId(id);
    try {
      const adminToken = localStorage.getItem("adminToken");
      const res = await fetch(`${API}/admin/comments/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminToken}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        setComments((prev) => prev.filter((c) => c.id !== id));
        toast(t("adminDeleted") || "Silindi", "success");
      } else {
        toast(data.message || t("error"), "error");
      }
    } catch {
      toast(t("error"), "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-1">{t("adminComments")}</h1>
      <p className="text-muted text-sm mb-6">{t("adminCommentsDesc")}</p>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : comments.length === 0 ? (
        <div className="bg-card border border-card-border rounded-xl p-8 text-center text-muted">{t("adminNoData")}</div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-card border border-card-border rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-sm">{c.user?.name}</span>
                  <span className="text-muted text-xs">{c.user?.phone}</span>
                  {c.rating != null && <span className="text-amber-500 text-xs">★ {c.rating}</span>}
                  <span className="text-muted text-xs">{new Date(c.createdAt).toLocaleDateString("az-AZ")}</span>
                </div>
                <p className="text-sm">{c.content}</p>
                {c.listing && (
                  <Link href={`/marketplace/${c.listing.id}`} className="text-xs text-orange-500 hover:underline">
                    → {c.listing.title}
                  </Link>
                )}
              </div>
              <button onClick={() => remove(c.id)} disabled={busyId === c.id} className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg">
                {t("delete")}
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-lg text-sm font-medium ${p === page ? "bg-orange-500 text-white" : "bg-input-bg text-muted hover:text-foreground"}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
