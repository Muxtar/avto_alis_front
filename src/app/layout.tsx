import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import SiteChrome from "@/components/SiteChrome";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "tradixai — Onlayn Ticarət Platforması",
  description: "Hər şeyin alınıb-satıldığı onlayn ticarət platforması",
};

// Klaviatura açılanda layout-un resize olması üçün (mobil chat üçün vacib).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  // viewport-fit=cover OLMADAN `env(safe-area-inset-*)` HƏMİŞƏ 0 qaytarır.
  // Kodda bu dəyər onsuz da bir neçə yerdə işlədilir (alt naviqasiya paddingi,
  // chat qutusunun hündürlüyü, AI panelinin giriş sətri) — yəni onlar iPhone-da
  // sükutla işləmirdi. Bu sətir onların hamısını işə salır: alt "home indicator"
  // zolağının altında qalan düymələr yuxarı qalxır.
  viewportFit: "cover",
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
          <SiteChrome>{children}</SiteChrome>
        </Providers>
      </body>
    </html>
  );
}
