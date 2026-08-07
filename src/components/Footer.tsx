'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/LanguageContext';
import { COMPANY } from '@/lib/company';

export default function Footer() {
  const pathname = usePathname();
  const { t, locale } = useLanguage();
  const year = new Date().getFullYear();
  // Admin paneli tam ekran işləyir — footer səhifəni uzadıb sidebar-ın
  // yapışıq qalmasına mane olurdu.
  const isAdmin = pathname?.startsWith('/admin');
  const lbl: any = {
    about: { az: 'Haqqımızda', en: 'About Us', ru: 'О нас' },
    contact: { az: 'Əlaqə', en: 'Contact', ru: 'Контакты' },
    voen: { az: 'VÖEN', en: 'VÖEN', ru: 'VÖEN' },
    returns: { az: 'Qaytarılma', en: 'Returns', ru: 'Возврат' },
    cancellation: { az: 'Ləğv və ödəmə', en: 'Cancellation', ru: 'Отмена' },
  };
  const pick = (k: string) => (lbl[k]?.[locale] || lbl[k]?.az);

  if (isAdmin) return null;

  return (
    <footer className="border-t border-card-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center mb-4">
              <div className="px-3 h-9 brand-gradient rounded-xl flex items-center justify-center font-bold text-base text-white shadow-md shadow-orange-500/25 tracking-tight">
                tradixai
              </div>
            </div>
            <p className="text-muted text-sm leading-relaxed max-w-xs">
              {t('footerDesc')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-foreground">{t('footerPlatform')}</h3>
            <div className="flex flex-col gap-2.5">
              <Link href="/elanlar" className="text-muted text-sm hover:text-orange-500 transition-colors">{t('marketplace')}</Link>
              <Link href="/inquiries" className="text-muted text-sm hover:text-orange-500 transition-colors">{t('inquiries')}</Link>
              <Link href="/orders" className="text-muted text-sm hover:text-orange-500 transition-colors">{t('orders')}</Link>
              <Link href="/messages" className="text-muted text-sm hover:text-orange-500 transition-colors">{t('messages')}</Link>
            </div>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-foreground">{t('footerAccount')}</h3>
            <div className="flex flex-col gap-2.5">
              <Link href="/" className="text-muted text-sm hover:text-orange-500 transition-colors">{t('register')}</Link>
              <Link href="/profile" className="text-muted text-sm hover:text-orange-500 transition-colors">{t('profile')}</Link>
              <Link href="/account" className="text-muted text-sm hover:text-orange-500 transition-colors">{t('myListings')}</Link>
              <Link href="/cart" className="text-muted text-sm hover:text-orange-500 transition-colors">{t('cart')}</Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-foreground">{t('footerContact')}</h3>
            <div className="flex flex-col gap-2.5">
              <Link href="/about" className="text-muted text-sm hover:text-orange-500 transition-colors">{pick('about')}</Link>
              <Link href="/contact" className="text-muted text-sm hover:text-orange-500 transition-colors">{pick('contact')}</Link>
              <a href={`mailto:${COMPANY.email}`} className="text-muted text-sm hover:text-orange-500 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {COMPANY.email}
              </a>
              <a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} className="text-muted text-sm hover:text-orange-500 transition-colors flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.5 4.49a1 1 0 01-.5 1.21l-2.26 1.13a11 11 0 005.52 5.52l1.13-2.26a1 1 0 011.21-.5l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" /></svg>
                {COMPANY.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        {/* Hüquqi məlumat — bank tələbi (fərdi sahibkar/hüquqi şəxsin adı + VÖEN) */}
        <p className="text-muted text-[11px] mt-8 sm:mt-10">{(locale === 'en' ? COMPANY.legalNameEn : COMPANY.legalName)} · {pick('voen')}: {COMPANY.voen}</p>
        <div className="border-t border-card-border mt-3 pt-5 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-muted text-xs">&copy; {year} {COMPANY.brand}. {t('footerRights')}</p>
          <div className="flex gap-4 flex-wrap justify-center">
            <Link href="/about" className="text-muted text-xs hover:text-orange-500 cursor-pointer transition-colors">{pick('about')}</Link>
            <Link href="/contact" className="text-muted text-xs hover:text-orange-500 cursor-pointer transition-colors">{pick('contact')}</Link>
            <Link href="/privacy" className="text-muted text-xs hover:text-orange-500 cursor-pointer transition-colors">{t('footerPrivacy')}</Link>
            <Link href="/terms" className="text-muted text-xs hover:text-orange-500 cursor-pointer transition-colors">{t('footerTerms')}</Link>
            <Link href="/returns" className="text-muted text-xs hover:text-orange-500 cursor-pointer transition-colors">{pick('returns')}</Link>
            <Link href="/cancellation" className="text-muted text-xs hover:text-orange-500 cursor-pointer transition-colors">{pick('cancellation')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
