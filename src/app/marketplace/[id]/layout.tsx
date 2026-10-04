import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";

// Yalnız paylaşım önizləməsi (şəkil, başlıq) üçün — səhifənin özü client komponentdir.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return ogMetadata("listing", id);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
