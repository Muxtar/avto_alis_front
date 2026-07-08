"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { COMPANY } from "@/lib/company";

export default function PrivacyPage() {
  const { locale } = useLanguage();
  const L: any = {
    az: {
      title: "Məxfilik siyasəti",
      updated: "Son yenilənmə: 2026",
      intro: `${COMPANY.brand} (“biz”, “platforma”) şəxsi məlumatlarınızı necə topladığını, istifadə etdiyini və qoruduğunu bu siyasət izah edir. Platformadan istifadə etməklə bu şərtləri qəbul edirsiniz.`,
      cardTitle: "Kart məlumatlarının təhlükəsizliyi",
      cardBody: "Bank kartı məlumatlarınız (kart nömrəsi, son istifadə tarixi, CVV/CVC) BİZİM saytda saxlanılmır və emal edilmir. Kartla ödəniş zamanı siz lisenziyalı ödəniş provayderinin (bankın) təhlükəsiz səhifəsinə yönləndirilirsiniz və bütün kart məlumatları yalnız orada, PCI DSS standartlarına uyğun şəkildə emal olunur. Platforma kart məlumatlarınıza çıxış əldə etmir və onları görmür.",
      tlsTitle: "Əlaqənin təhlükəsizliyi (TLS 1.2)",
      tlsBody: "Sayt ilə istifadəçi arasında bütün əlaqə TLS 1.2 (və ya daha yüksək) şifrələmə protokolu ilə qorunur. Ödəniş kanalı statik IP ünvanı üzərindən işləyir.",
      sections: [
        ["Topladığımız məlumatlar", "Hesab məlumatları (ad, telefon, e-poçt), kimlik təsdiqi məlumatları, elan və biznes məlumatları, texniki istifadə statistikası. Bank kartı məlumatları toplanmır."],
        ["Məlumatlardan istifadə", "Hesabın yaradılması və təsdiqi, elanların yayımı, sifariş və çatdırılmanın idarəsi, təhlükəsizlik və xidmətin təkmilləşdirilməsi."],
        ["Məlumatların paylaşılması", "Şəxsi məlumatları satmırıq. Yalnız xidmətin işləməsi üçün (məs. ödəniş provayderi, kuryer), qanuni tələb olduqda və ya razılığınızla paylaşıla bilər."],
        ["Sizin hüquqlarınız", "Məlumatlarınıza baxmaq, düzəltmək və ya silinməsini tələb etmək hüququnuz var."],
      ],
      contact: "Suallar üçün:",
      backHome: "← Ana səhifəyə qayıt",
    },
    en: {
      title: "Privacy Policy",
      updated: "Last updated: 2026",
      intro: `This policy explains how ${COMPANY.brand} (“we”, “the platform”) collects, uses and protects your personal data. By using the platform you accept these terms.`,
      cardTitle: "Card data security",
      cardBody: "Your bank card details (card number, expiry date, CVV/CVC) are NOT stored or processed on OUR website. During card payment you are redirected to the secure page of a licensed payment provider (bank), where all card data is processed in accordance with PCI DSS standards. The platform never accesses or sees your card data.",
      tlsTitle: "Connection security (TLS 1.2)",
      tlsBody: "All communication between the site and the user is protected with the TLS 1.2 (or higher) encryption protocol. The payment channel operates over a static IP address.",
      sections: [
        ["Data we collect", "Account data (name, phone, e-mail), identity verification data, listing and business data, technical usage statistics. Bank card data is not collected."],
        ["How we use data", "Creating and verifying accounts, publishing listings, managing orders and delivery, security, and improving the service."],
        ["Sharing of data", "We do not sell personal data. It may be shared only to operate the service (e.g. payment provider, courier), when legally required, or with your consent."],
        ["Your rights", "You have the right to access, correct, or request deletion of your data."],
      ],
      contact: "Questions:",
      backHome: "← Back to home",
    },
    ru: {
      title: "Политика конфиденциальности",
      updated: "Последнее обновление: 2026",
      intro: `Эта политика объясняет, как ${COMPANY.brand} собирает, использует и защищает ваши персональные данные. Используя платформу, вы принимаете эти условия.`,
      cardTitle: "Безопасность данных карты",
      cardBody: "Данные вашей банковской карты (номер, срок, CVV/CVC) НЕ хранятся и не обрабатываются на НАШЕМ сайте. При оплате картой вы перенаправляетесь на защищённую страницу лицензированного платёжного провайдера (банка), где все данные обрабатываются согласно стандартам PCI DSS. Платформа не имеет доступа к данным карты.",
      tlsTitle: "Безопасность соединения (TLS 1.2)",
      tlsBody: "Всё соединение между сайтом и пользователем защищено протоколом TLS 1.2 (или выше). Платёжный канал работает через статический IP-адрес.",
      sections: [
        ["Собираемые данные", "Данные аккаунта (имя, телефон, e-mail), данные верификации, данные объявлений и бизнеса, техническая статистика. Данные карты не собираются."],
        ["Использование данных", "Создание и верификация аккаунтов, публикация объявлений, управление заказами и доставкой, безопасность."],
        ["Передача данных", "Мы не продаём персональные данные. Передача возможна только для работы сервиса, по закону или с вашего согласия."],
        ["Ваши права", "Вы вправе просматривать, исправлять или удалять свои данные."],
      ],
      contact: "Вопросы:",
      backHome: "← На главную",
    },
  };
  const c = L[locale] || L.az;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">{c.title}</h1>
      <p className="text-muted text-sm mb-8">{c.updated}</p>

      <div className="space-y-6 text-sm sm:text-base leading-relaxed text-foreground/90">
        <p>{c.intro}</p>

        <section className="surface p-5 border border-green-500/20">
          <h2 className="text-lg font-semibold mb-2 text-green-500">🔒 {c.cardTitle}</h2>
          <p>{c.cardBody}</p>
        </section>

        <section className="surface p-5">
          <h2 className="text-lg font-semibold mb-2 text-foreground">🛡️ {c.tlsTitle}</h2>
          <p>{c.tlsBody}</p>
        </section>

        {c.sections.map(([h, body]: string[], i: number) => (
          <section key={i}>
            <h2 className="text-lg font-semibold mb-2 text-foreground">{i + 1}. {h}</h2>
            <p>{body}</p>
          </section>
        ))}

        <section>
          <p>{c.contact} <a href={`mailto:${COMPANY.email}`} className="text-orange-500 hover:underline">{COMPANY.email}</a></p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-card-border">
        <Link href="/elanlar" className="text-orange-500 text-sm font-medium hover:text-orange-400">{c.backHome}</Link>
      </div>
    </div>
  );
}
