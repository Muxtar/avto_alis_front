import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";

// Yalnız paylaşım önizləməsi (şəkil, başlıq) üçün — səhifənin özü client komponentdir.
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  return ogMetadata("group", code);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
