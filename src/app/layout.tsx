import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import InquiryChatbot from "@/components/InquiryChatbot";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "tradixai — Onlayn Bazar",
  description: "Hər şeyin alınıb-satıldığı onlayn bazar platforması",
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
            __html: `(function(){try{var t=localStorage.getItem('theme')||'light';document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('light');}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1 pb-safe-nav md:pb-0">{children}</main>
          <Footer />
          <BackButton />
          <InquiryChatbot />
          <MobileBottomNav />
        </Providers>
      </body>
    </html>
  );
}
