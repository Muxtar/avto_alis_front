"use client";
import { useState, useEffect, useCallback } from "react";
import { API } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/Toast";

// Yenidən istifadə olunan rəy bölməsi — obyekt (/objects/:id) və ixtisas profili (/professionals/:id).
// Faiz (məmnunluq), 5 ulduz, bir dəfə, redaktə/sil. Gating serverdə yoxlanır (403 mesajı göstərilir).
function Stars({ value, onPick }: { value: number; onPick?: (n: number) => void }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onPick} onClick={() => onPick?.(n)} className={`text-lg leading-none ${onPick ? "cursor-pointer" : "cursor-default"}`}>
          <span className={n <= value ? "text-orange-500" : "text-muted/40"}>★</span>
        </button>
      ))}
    </span>
  );
}

export default function ReviewsSection({ base, title = "Rəylər" }: { base: string; title?: string }) {
  const { user, token, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ percent: null, count: 0 });
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editRating, setEditRating] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`${API}${base}/reviews`).then((r) => r.json()).then((d) => { setComments(d.comments || []); setStats(d.stats || { percent: null, count: 0 }); }).catch(() => {});
  }, [base]);
  useEffect(() => { load(); }, [load]);

  const mine = isLoggedIn && comments.find((c) => c.user?.id === user?.id);

  const add = async () => {
    if (!text.trim() || !token) return;
    setSending(true);
    try {
      const res = await fetch(`${API}${base}/comments`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ content: text, rating: rating || undefined }) });
      const d = await res.json();
      if (res.ok && d.success) { setText(""); setRating(0); load(); }
      else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setSending(false); }
  };
  const saveEdit = async (id: number) => {
    if (!editText.trim() || !token) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/comments/${id}`, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ content: editText, rating: editRating || undefined }) });
      const d = await res.json();
      if (res.ok && d.success) { setEditingId(null); load(); }
      else toast(d.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(false); }
  };
  const del = async (id: number) => {
    if (!token || !confirm("Rəyi silmək istəyirsiniz?")) return;
    setBusy(true);
    try { const res = await fetch(`${API}/comments/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); if (res.ok) load(); } catch { /* boş */ } finally { setBusy(false); }
  };

  return (
    <div className="bg-card border border-card-border rounded-2xl p-4 sm:p-6 mt-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2 flex-wrap">
        💬 {title} ({stats.count || comments.length})
        {stats.avg != null && <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-400/10 text-amber-600 font-semibold">★ {stats.avg}</span>}
        {stats.likePercent != null && <span className="text-xs px-2 py-0.5 rounded-lg bg-green-500/10 text-green-600 font-semibold">👍 {stats.likePercent}% müsbət</span>}
        {(stats.likes > 0 || stats.dislikes > 0) && <span className="text-xs text-muted">👍 {stats.likes} · 👎 {stats.dislikes}</span>}
      </h3>

      {!isLoggedIn ? (
        <p className="text-sm text-muted mb-3">Rəy yazmaq üçün daxil olun.</p>
      ) : mine ? (
        <p className="text-xs text-muted mb-3">Rəyinizi yazmısınız — aşağıdan dəyişə/silə bilərsiniz.</p>
      ) : (
        <div className="mb-4 space-y-2">
          <Stars value={rating} onPick={setRating} />
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Rəyinizi yazın..." className="flex-1 px-3 py-2.5 bg-input-bg border border-input-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder-muted-foreground" />
            <button onClick={add} disabled={sending || !text.trim()} className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white text-sm font-medium disabled:opacity-50">Göndər</button>
          </div>
        </div>
      )}

      {comments.length === 0 ? (
        <p className="text-muted text-sm text-center py-4">Hələ rəy yoxdur</p>
      ) : (
        <div className="space-y-2.5">
          {comments.map((c) => {
            const isMine = c.user?.id === user?.id;
            return (
              <div key={c.id} className={`flex gap-3 p-3.5 rounded-2xl border ${isMine ? "bg-orange-500/[0.04] border-orange-500/15" : "bg-input-bg/50 border-transparent"}`}>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {(c.user?.name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate">{c.user?.name}</span>
                    {c.rating ? <Stars value={c.rating} /> : null}
                    <span className="text-muted text-[11px] ml-auto shrink-0">{new Date(c.createdAt).toLocaleDateString("az-AZ", { day: "numeric", month: "short" })}</span>
                  </div>
                  {editingId === c.id ? (
                    <div className="mt-1.5 space-y-2">
                      <Stars value={editRating} onPick={setEditRating} />
                      <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} className="w-full px-3 py-2 bg-card border border-orange-500/40 rounded-xl text-sm resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(c.id)} disabled={busy || !editText.trim()} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50">Saxla</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-input-bg border border-input-border rounded-lg text-xs">İmtina</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm break-words">{c.content}</p>
                      {isMine && (
                        <div className="flex gap-3 mt-1">
                          <button onClick={() => { setEditingId(c.id); setEditText(c.content); setEditRating(c.rating || 0); }} className="text-[11px] text-orange-500">Dəyiş</button>
                          <button onClick={() => del(c.id)} className="text-[11px] text-red-500">Sil</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
