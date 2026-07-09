"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { COMPANY } from "@/lib/company";

export default function AboutPage() {
  const { locale } = useLanguage();
  const L: any = {
    az: {
      title: "Haqqımızda",
      updated: "Son yenilənmə: 2026",
      intro: `${COMPANY.brand} — Azərbaycanda fəaliyyət göstərən onlayn ticarət platformasıdır. Platforma istifadəçilərə məhsul və xidmətləri yerləşdirmək, satmaq və almaq, biznes obyektlərini idarə etmək və kartla təhlükəsiz ödəniş etmək imkanı verir.`,
      activity: "Fəaliyyətimiz",
      activityText: "Biz alıcı və satıcıları bir araya gətirən marketplace xidməti göstəririk: elanların yerləşdirilməsi, sifariş və çatdırılma, biznes profilləri, rəy/konsultasiya və referal satış. Kartla ödənişlər lisenziyalı ödəniş provayderi vasitəsilə emal olunur.",
      legal: "Hüquqi məlumatlar",
      legalName: "Ad",
      voen: "VÖEN",
      address: "Hüquqi ünvan",
      contact: "Əlaqə",
      backHome: "← Ana səhifəyə qayıt",
    },
    en: {
      title: "About Us",
      updated: "Last updated: 2026",
      intro: `${COMPANY.brand} is an online marketplace operating in Azerbaijan. The platform lets users list, sell and buy goods and services, manage business locations, and pay securely by card.`,
      activity: "Our activity",
      activityText: "We provide a marketplace that connects buyers and sellers: listing of ads, orders and delivery, business profiles, consultations and referral sales. Card payments are processed through a licensed payment provider.",
      legal: "Legal information",
      legalName: "Name",
      voen: "Taxpayer ID (VÖEN)",
      address: "Legal address",
      contact: "Contact",
      backHome: "← Back to home",
    },
    ru: {
      title: "О нас",
      updated: "Последнее обновление: 2026",
      intro: `${COMPANY.brand} — онлайн-площадка, работающая в Азербайджане. Платформа позволяет размещать, продавать и покупать товары и услуги, управлять бизнес-объектами и безопасно оплачивать картой.`,
      activity: "Наша деятельность",
      activityText: "Мы предоставляем маркетплейс, соединяющий покупателей и продавцов: размещение объявлений, заказы и доставка, бизнес-профили, консультации и реферальные продажи. Оплата картой обрабатывается лицензированным платёжным провайдером.",
      legal: "Юридическая информация",
      legalName: "Название",
      voen: "ИНН (VÖEN)",
      address: "Юридический адрес",
      contact: "Контакт",
      backHome: "← На главную",
    },
  };
  const c = L[locale] || L.az;
  const addr = locale === "en" ? COMPANY.legalAddressEn : COMPANY.legalAddressAz;
  const name = locale === "en" ? COMPANY.legalNameEn : COMPANY.legalName;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">{c.title}</h1>
      <p className="text-muted text-sm mb-8">{c.updated}</p>

      <div className="space-y-6 text-sm sm:text-base leading-relaxed text-foreground/90">
        <p>{c.intro}</p>
        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">{c.activity}</h2>
          <p>{c.activityText}</p>
        </section>

        <section className="surface p-5">
          <h2 className="text-lg font-semibold mb-3 text-foreground">{c.legal}</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2"><dt className="text-muted min-w-[130px]">{c.legalName}:</dt><dd className="font-medium">{name}</dd></div>
            <div className="flex gap-2"><dt className="text-muted min-w-[130px]">{c.voen}:</dt><dd className="font-medium">{COMPANY.voen}</dd></div>
            <div className="flex gap-2"><dt className="text-muted min-w-[130px]">{c.address}:</dt><dd className="font-medium">{addr}</dd></div>
            <div className="flex gap-2"><dt className="text-muted min-w-[130px]">{c.contact}:</dt><dd className="font-medium"><a href={`mailto:${COMPANY.email}`} className="text-orange-500 hover:underline">{COMPANY.email}</a> · {COMPANY.phones.join(", ")}</dd></div>
          </dl>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-card-border">
        <Link href="/elanlar" className="text-orange-500 text-sm font-medium hover:text-orange-400">{c.backHome}</Link>
      </div>
    </div>
  );
}
