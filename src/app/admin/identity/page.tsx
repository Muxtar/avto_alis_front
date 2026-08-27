"use client";
/* ──────────────────────────────────────────────────────────────────────────
   KİMLİK YOXLAMASI (ƏL İLƏ) — admin növbəsi.

   Bu səhifə YALNIZ «Kimlik doğrulaması: Veriff (test)» açarı SÖNDÜRÜLƏNDƏ
   dolur: istifadəçi vəsiqənin ön/arxa şəklini və selfie-ni göndərir, biz
   burada şəkillərə gözlə baxıb təsdiqləyirik. Təsdiq edərkən vəsiqədəki
   məlumatlar (ad, FIN, doğum tarixi, cins) istifadəçinin hesabına yazılır.

   Veriff açıq olanda növbə boş qalır — nəticə birbaşa Veriff-dən gəlir.
   ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { API, imgUrl } from "@/lib/api";

interface IdentityUser {
  id: number;
  name: string | null;
  phone: string | null;
  type: string | null;
  createdAt: string;
  idVerifyStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  idNumber: string | null;
  birthDate: string | null;
  gender: string | null;
  idCardImage: string | null;
  idCardBackImage: string | null;
  selfieImage: string | null;
  selfieRightImage: string | null;
  selfieLeftImage: string | null;
  faceMatchScore: number | null;
  idAiNameMatch: boolean | null;
  idAiFaceMatch: boolean | null;
  idAiReason: string | null;
  veriffStatus: string | null;
}

/** Təsdiq formasının sahələri — vəsiqədən oxunub hesaba yazılır. */
interface Draft { name: string; idNumber: string; birthDate: string; gender: string }

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Yoxlanılır", APPROVED: "Təsdiqlənib", REJECTED: "Rədd edilib",
};

export default function AdminIdentityPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<IdentityUser[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("PENDING");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [veriffOn, setVeriffOn] = useState<boolean | null>(null);
  // Yeni müraciət gələndə sətri qısa müddət işıqlandırırıq (gözə çarpsın).
  const [flash, setFlash] = useState<number | null>(null);

  const adminToken = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const headers = { Authorization: `Bearer ${adminToken}` };

  useEffect(() => {
    if (!adminToken) { router.push("/admin/login"); return; }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  /* ANLIQ YENİLƏNMƏ — səhifə yenilənmədən yeni müraciət görünür.
     Soketi AdminShell saxlayır (bütün panel üçün bir bağlantı) və hadisə
     gələndə `admin:identity-new` yayımlayır; burada onu tuturuq. */
  useEffect(() => {
    const onNew = (e: Event) => {
      const p = (e as CustomEvent).detail as { userId?: number; name?: string } | undefined;
      toast(`Yeni kimlik müraciəti: ${p?.name || `#${p?.userId ?? ""}`}`, "info");
      if (p?.userId) {
        setFlash(p.userId);
        setTimeout(() => setFlash(null), 6000);
      }
      // «Yoxlanılır» siyahısında deyiliksə ora keçirik — status dəyişimi
      // onsuz da siyahını yenidən çəkir (aşağıdakı effekt), ona görə iki dəfə
      // sorğu göndərmirik.
      setStatus((cur) => {
        if (cur !== "PENDING") return "PENDING";
        refresh();
        return cur;
      });
    };
    window.addEventListener("admin:identity-new", onNew);
    return () => window.removeEventListener("admin:identity-new", onNew);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Veriff açıqdırsa bu növbə istifadə olunmur — admini xəbərdar edirik.
  useEffect(() => {
    fetch(`${API}/veriff/status`, { headers })
      .then((r) => r.json())
      .then((d) => setVeriffOn(!!d?.enabled))
      .catch(() => setVeriffOn(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const url = `${API}/admin/identity?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const d = await fetch(url, { headers }).then((r) => r.json());
      const users: IdentityUser[] = d.users || [];
      setItems(users);
      setCounts(d.counts || {});
      // Formaları istifadəçinin mövcud (AI oxumuşsa — onun doldurduğu) dəyəri ilə aç.
      setDrafts(Object.fromEntries(users.map((u) => [u.id, {
        name: u.name || "",
        idNumber: u.idNumber || "",
        birthDate: u.birthDate ? String(u.birthDate).slice(0, 10) : "",
        gender: u.gender || "",
      }])));
    } catch {
      toast("Xəta", "error");
    } finally {
      setLoading(false);
    }
  };

  const setDraft = (id: number, patch: Partial<Draft>) =>
    setDrafts((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const approve = async (u: IdentityUser) => {
    const d = drafts[u.id];
    if (!d?.name.trim()) { toast("Ad-soyadı yazın (vəsiqədəki kimi)", "error"); return; }
    setBusy(u.id);
    try {
      const r = await fetch(`${API}/admin/identity/${u.id}/approve`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(d),
      }).then((x) => x.json());
      if (r.success) { toast("Kimlik təsdiqləndi ✓", "success"); refresh(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  const reject = async (u: IdentityUser) => {
    setBusy(u.id);
    try {
      const r = await fetch(`${API}/admin/identity/${u.id}/reject`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reasons[u.id] || "" }),
      }).then((x) => x.json());
      if (r.success) { toast("Rədd edildi", "success"); refresh(); }
      else toast(r.message || "Xəta", "error");
    } catch { toast("Xəta", "error"); } finally { setBusy(null); }
  };

  const inputCls = "w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40";

  const shot = (file: string | null, label: string) =>
    file ? (
      <button onClick={() => setPreview(imgUrl(file) || null)} className="group text-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgUrl(file)} alt={label}
             className="w-full h-28 object-cover rounded-lg border border-input-border group-hover:border-orange-500/60 transition-colors" />
        <p className="text-[10px] text-muted mt-1">{label}</p>
      </button>
    ) : (
      <div className="w-full h-28 rounded-lg border border-dashed border-input-border flex items-center justify-center">
        <span className="text-[10px] text-muted">{label} — yoxdur</span>
      </div>
    );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-xl sm:text-2xl font-bold">🪪 Kimlik yoxlaması</h1>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") refresh(); }}
                 placeholder="Ad, telefon və ya FIN…" className={inputCls + " w-56"} />
          <button onClick={refresh} className="px-4 py-2 rounded-lg bg-input-bg border border-input-border text-sm">Axtar</button>
        </div>
      </div>

      {/* Veriff açıqdırsa bu növbəyə yeni müraciət düşmür. */}
      {veriffOn === true && (
        <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[13px]">
          ℹ️ <b>Veriff aktivdir</b> — kimliklər avtomatik təsdiqlənir və bu növbəyə yeni müraciət düşmür.
          Əl ilə yoxlamaya keçmək üçün <a href="/admin/settings" className="text-orange-500 font-medium">Tənzimləmələr</a> →
          «Kimlik doğrulaması: Veriff (test)» açarını söndürün.
        </div>
      )}
      {veriffOn === false && (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[13px]">
          ⚙️ <b>Veriff söndürülüb (test rejimi)</b> — istifadəçilər vəsiqə və selfie göndərir, təsdiqi siz verirsiniz.
        </div>
      )}

      {/* Status süzgəcləri */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    status === s ? "bg-orange-500 text-white" : "bg-input-bg border border-input-border"}`}>
            {STATUS_LABEL[s]}{counts[s] ? ` (${counts[s]})` : ""}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-muted text-sm">Bu bölmədə müraciət yoxdur.</div>
      ) : (
        <div className="space-y-4">
          {items.map((u) => (
            <div key={u.id}
                 className={`bg-card border rounded-2xl p-4 sm:p-5 transition-colors ${
                   flash === u.id ? "border-orange-500 ring-2 ring-orange-500/30" : "border-card-border"}`}>
              <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                <div>
                  <p className="font-semibold">{u.name || "Ad yoxdur"} <span className="text-xs text-muted font-normal">#{u.id}</span></p>
                  <p className="text-xs text-muted">{u.phone}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  u.idVerifyStatus === "APPROVED" ? "bg-green-500/15 text-green-600"
                  : u.idVerifyStatus === "REJECTED" ? "bg-red-500/15 text-red-500"
                  : "bg-amber-500/15 text-amber-600"}`}>
                  {STATUS_LABEL[u.idVerifyStatus || "PENDING"]}
                </span>
              </div>

              {/* Şəkillər — Veriff-in istədiyi üçlük */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {shot(u.idCardImage, "Vəsiqə — ön")}
                {shot(u.idCardBackImage, "Vəsiqə — arxa")}
                {shot(u.selfieImage, "Selfie")}
              </div>

              {/* AI ipucu (açıqdırsa) — qərar yenə admindədir */}
              {(u.idAiReason || u.faceMatchScore !== null) && (
                <div className="mb-4 p-3 rounded-xl bg-input-bg border border-input-border text-[12px] leading-relaxed">
                  <p className="font-semibold text-muted mb-1">AI ipucu (məsləhət xarakterli)</p>
                  {u.faceMatchScore !== null && <p>Üz uyğunluğu: <b>{Math.round((u.faceMatchScore || 0) * 100)}%</b></p>}
                  {u.idAiNameMatch !== null && <p>Ad uyğunluğu: <b>{u.idAiNameMatch ? "uyğundur" : "uyğun deyil"}</b></p>}
                  {u.idAiReason && <p className="text-muted mt-1">{u.idAiReason}</p>}
                </div>
              )}

              {/* Vəsiqədəki məlumatlar — admin yazır, təsdiqdə hesaba köçürülür */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] text-muted mb-1">Ad Soyad (vəsiqədəki)</label>
                  <input value={drafts[u.id]?.name || ""} onChange={(e) => setDraft(u.id, { name: e.target.value })}
                         placeholder="ƏLİYEV ELVIN" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">FIN</label>
                  <input value={drafts[u.id]?.idNumber || ""} onChange={(e) => setDraft(u.id, { idNumber: e.target.value.toUpperCase() })}
                         placeholder="1A2B3C4" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">Doğum tarixi</label>
                  <input type="date" value={drafts[u.id]?.birthDate || ""} onChange={(e) => setDraft(u.id, { birthDate: e.target.value })}
                         className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] text-muted mb-1">Cins</label>
                  <select value={drafts[u.id]?.gender || ""} onChange={(e) => setDraft(u.id, { gender: e.target.value })} className={inputCls}>
                    <option value="">—</option>
                    <option value="Kişi">Kişi</option>
                    <option value="Qadın">Qadın</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-muted mb-3">Boş buraxılan sahə dəyişmir — istifadəçinin mövcud dəyəri qalır.</p>

              {/* Qərar */}
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => approve(u)} disabled={busy === u.id}
                        className="px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
                  {busy === u.id ? "…" : "✓ Təsdiqlə"}
                </button>
                <input value={reasons[u.id] || ""} onChange={(e) => setReasons((p) => ({ ...p, [u.id]: e.target.value }))}
                       placeholder="Rədd səbəbi (istifadəçiyə gedir)" className={inputCls + " flex-1 min-w-[200px]"} />
                <button onClick={() => reject(u)} disabled={busy === u.id}
                        className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm font-semibold disabled:opacity-50">
                  ✕ Rədd et
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Şəkil böyüdücü */}
      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
