import type { Metadata } from "next";
import AdminShell from "./AdminShell";

// Admin paneli axtarış sistemlərinə DÜŞMƏMƏLİDİR.
// robots.txt-ə "Disallow: /admin" yazmaq əks effekt verir — o fayl açıqdır və
// yolu hamıya elan edir. Ona görə yalnız `noindex` meta etiketi qoyulur:
// indeksləmə dayanır, amma yol heç yerdə reklam olunmur.
export const metadata: Metadata = {
  title: "tradixai admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

// Panelin özü client komponentdir (auth, sidebar, marşrut vəziyyəti).
// Bu server layout yalnız metadata üçündür.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
