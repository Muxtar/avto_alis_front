"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { API } from "@/lib/api";

export default function CmsPage() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const [page, setPage] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/pages/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) { setPage(d.page); setState("ok"); } else setState("notfound"); })
      .catch(() => setState("notfound"));
  }, [slug]);

  if (state === "loading") return <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (state === "notfound") return <div className="max-w-3xl mx-auto p-8 text-center text-muted">Səhifə tapılmadı.</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4">{page.title}</h1>
      {/* Məzmun admin tərəfindən yazılır (etibarlı mənbə). */}
      <div className="prose prose-sm max-w-none text-foreground [&_a]:text-orange-500 [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1" dangerouslySetInnerHTML={{ __html: page.content || "" }} />
      <p className="text-[11px] text-muted mt-8">Yeniləndi: {new Date(page.updatedAt).toLocaleDateString("az-AZ")}</p>
    </div>
  );
}
