import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";

// Yalnız paylaşım önizləməsi (şəkil, başlıq) üçün — səhifənin özü client komponentdir.
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  return ogMetadata("shared", token);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
