import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import InquiryChatbot from "@/components/InquiryChatbot";
import Footer from "@/components/Footer";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AvtoBazar - Avtomobil Platformu",
  description: "Avtomobil sahibi, usta və ehtiyat hissə satıcıları üçün platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az" className={`${geist.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col">
        <Providers>
          <Navbar />
          <GlobalSearchBar />
          <main className="flex-1 pb-safe-nav md:pb-0">{children}</main>
          <Footer />
          <InquiryChatbot />
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
