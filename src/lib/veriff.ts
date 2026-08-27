import { API } from "@/lib/api";

/* ──────────────────────────────────────────────────────────────────────────
   Veriff kimlik doğrulaması — sadə iki addım.

   Saytda "gözləyir / yoxlanılır" vəziyyəti GÖSTƏRİLMİR: istifadəçi üçün
   yalnız iki hal var — profil təsdiqlənib, ya təsdiqlənməyib. Veriff nəticəni
   bir neçə saniyəyə qaytarır, ona görə pəncərədən qayıdanda nəticəni özümüz
   soruşuruq (istifadəçi heç nə basmır).
   ────────────────────────────────────────────────────────────────────────── */

/* Hansı kimlik axını işləyir?
   - "veriff": Veriff pəncərəsi açılır, nəticə birbaşa Veriff-dən gəlir.
   - "manual": Veriff söndürülüb (test mərhələsi) — istifadəçi vəsiqənin
     ön/arxa şəklini və selfie-ni göndərir, ADMİN gözlə baxıb təsdiqləyir.
   Açar admin paneldəki `veriff_enabled` tənzimləməsidir. */
export type IdentityMode = "veriff" | "manual";

export async function identityMode(token: string | null): Promise<IdentityMode> {
  try {
    const r = await fetch(`${API}/veriff/status`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((x) => x.json());
    return r?.mode === "veriff" ? "veriff" : "manual";
  } catch {
    // Şəbəkə xətasında əl ilə axına düşürük — istifadəçi heç olmasa göndərə bilsin.
    return "manual";
  }
}

// Veriff-ə keçid. `sameTab` → elə həmin tabda açılır (Veriff bitəndə özü
// /profile?veriff=done ünvanına qaytarır). Doldurulmamış forma olan səhifədə
// (məs. profili tamamlama) yeni tab işlədilir ki, yazılanlar itməsin.
export async function openVeriff(token: string | null, opts?: { sameTab?: boolean }): Promise<{ ok: boolean; message?: string }> {
  try {
    const r = await fetch(`${API}/me/veriff/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    }).then((x) => x.json());
    if (r?.success && r.url) {
      if (opts?.sameTab) window.location.href = r.url;
      else window.open(r.url, "_blank", "noopener");
      return { ok: true };
    }
    return { ok: false, message: r?.message };
  } catch {
    return { ok: false };
  }
}

// Nəticəni soruşur. "pending" = Veriff hələ cavab verməyib (istifadəçiyə
// göstərilmir, sadəcə bir az sonra yenidən soruşulur).
export async function checkVeriff(token: string | null): Promise<"approved" | "declined" | "pending" | "error"> {
  try {
    const r = await fetch(`${API}/me/veriff/check`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    }).then((x) => x.json());
    if (!r?.success) return "error";
    return r.status === "approved" ? "approved" : r.status === "declined" ? "declined" : "pending";
  } catch {
    return "error";
  }
}
