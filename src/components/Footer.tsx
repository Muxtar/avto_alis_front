'use client';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-card-border bg-card/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center font-bold text-xs text-white">
                AB
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                AvtoBazar
              </span>
            </div>
            <p className="text-muted text-xs leading-relaxed">
              {t('footerDesc')}
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t('footerPlatform')}</h3>
            <div className="flex flex-col gap-2">
              <Link href="/marketplace" className="text-muted text-xs hover:text-orange-500 transition-colors">{t('marketplace')}</Link>
              <Link href="/inquiries" className="text-muted text-xs hover:text-orange-500 transition-colors">{t('inquiries')}</Link>
              <Link href="/orders" className="text-muted text-xs hover:text-orange-500 transition-colors">{t('orders')}</Link>
              <Link href="/messages" className="text-muted text-xs hover:text-orange-500 transition-colors">{t('messages')}</Link>
            </div>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t('footerAccount')}</h3>
            <div className="flex flex-col gap-2">
              <Link href="/" className="text-muted text-xs hover:text-orange-500 transition-colors">{t('register')}</Link>
              <Link href="/profile" className="text-muted text-xs hover:text-orange-500 transition-colors">{t('profile')}</Link>
              <Link href="/account" className="text-muted text-xs hover:text-orange-500 transition-colors">{t('myListings')}</Link>
              <Link href="/cart" className="text-muted text-xs hover:text-orange-500 transition-colors">{t('cart')}</Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t('footerContact')}</h3>
            <div className="flex flex-col gap-2">
              <span className="text-muted text-xs">info@avtobazar.az</span>
              <span className="text-muted text-xs">+994 12 345 67 89</span>
              <span className="text-muted text-xs">{t('footerCity')}</span>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-card-border mt-6 sm:mt-8 pt-4 sm:pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-muted text-xs">&copy; {year} AvtoBazar. {t('footerRights')}</p>
          <div className="flex gap-4">
            <span className="text-muted text-xs hover:text-orange-500 cursor-pointer transition-colors">{t('footerPrivacy')}</span>
            <span className="text-muted text-xs hover:text-orange-500 cursor-pointer transition-colors">{t('footerTerms')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
