"use client";
import { useEffect, useState } from "react";
import { API } from "@/lib/api";

/**
 * HÜQUQİ SƏNƏDİN GÖSTƏRİLMƏSİ.
 *
 * Mətn bazadan olduğu kimi gəlir və `whitespace-pre-wrap` ilə göstərilir —
 * sətir sonları, siyahılar və boşluqlar orijinaldakı kimi qalır. Mətni HTML-ə
 * çevirmirik: hüquqi sənəddə hər hansı avtomatik yenidənformatlama məzmunu
 * təhrif edə bilər.
 */
export default function LegalDocPage({ slug }: { slug: string }) {
  const [doc, setDoc] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/legal/${slug}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setDoc(d.document); else setErr(d.message || "Sənəd tapılmadı"); })
      .catch(() => setErr("Şəbəkə xətası"));
  }, [slug]);

  if (err) return <div className="page-wrap py-16 text-center text-muted">{err}</div>;
  if (!doc) {
    return <div className="page-wrap py-20 flex justify-center"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="page-wrap py-6 sm:py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">{doc.title}</h1>
        <p className="text-muted text-xs mb-6">
          Versiya {doc.version} · dərc: {new Date(doc.publishedAt).toLocaleDateString("az-AZ")}
        </p>
        <article className="surface p-5 sm:p-7">
          <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed text-foreground">
            {doc.body}
          </pre>
        </article>
      </div>
    </div>
  );
}
