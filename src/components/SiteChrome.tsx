"use client";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import InquiryChatbot from "@/components/InquiryChatbot";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";

// Sayt "chrome"-u (header/Navbar, üst zolaq, footer, mobil-nav, chatbot).
// Admin panelində GÖSTƏRİLMİR — admin sahəsinin öz header/sidebar-ı var,
// yalnız admin səhifəsi görünsün.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <BackButton />
      <main className="flex-1 pb-safe-nav md:pb-0">{children}</main>
      <Footer />
      <InquiryChatbot />
      <MobileBottomNav />
    </>
  );
}
