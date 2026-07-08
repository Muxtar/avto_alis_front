"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { COMPANY } from "@/lib/company";

export default function ContactPage() {
  const { locale } = useLanguage();
  const L: any = {
    az: {
      title: "Əlaqə",
      intro: "Suallarınız və ya müraciətləriniz üçün bizimlə əlaqə saxlayın.",
      phone: "Mobil nömrə",
      email: "E-mail",
      address: "Ünvan",
      legalName: "Şirkət",
      voen: "VÖEN",
      hours: "İş saatları",
      hoursVal: "Hər gün 09:00–20:00",
      backHome: "← Ana səhifəyə qayıt",
    },
    en: {
      title: "Contact",
      intro: "Get in touch with us for any questions or requests.",
      phone: "Mobile phone",
      email: "E-mail",
      address: "Address",
      legalName: "Company",
      voen: "Taxpayer ID (VÖEN)",
      hours: "Working hours",
      hoursVal: "Every day 09:00–20:00",
      backHome: "← Back to home",
    },
    ru: {
      title: "Контакты",
      intro: "Свяжитесь с нами по любым вопросам.",
      phone: "Мобильный телефон",
      email: "E-mail",
      address: "Адрес",
      legalName: "Компания",
      voen: "ИНН (VÖEN)",
      hours: "Часы работы",
      hoursVal: "Ежедневно 09:00–20:00",
      backHome: "← На главную",
    },
  };
  const c = L[locale] || L.az;
  const addr = locale === "en" ? COMPANY.legalAddressEn : COMPANY.legalAddressAz;

  const Row = ({ label, children }: any) => (
    <div className="flex gap-2 py-2 border-b border-card-border last:border-0">
      <span className="text-muted min-w-[130px]">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">{c.title}</h1>
      <p className="text-muted text-sm mb-8">{c.intro}</p>

      <div className="surface p-5 text-sm sm:text-base">
        <Row label={c.legalName}>{COMPANY.legalName}</Row>
        <Row label={c.voen}>{COMPANY.voen}</Row>
        <Row label={c.phone}><a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} className="text-orange-500 hover:underline">{COMPANY.phone}</a></Row>
        <Row label={c.email}><a href={`mailto:${COMPANY.email}`} className="text-orange-500 hover:underline">{COMPANY.email}</a></Row>
        <Row label={c.address}>{addr}</Row>
        <Row label={c.hours}>{c.hoursVal}</Row>
      </div>

      <div className="mt-10 pt-6 border-t border-card-border">
        <Link href="/elanlar" className="text-orange-500 text-sm font-medium hover:text-orange-400">{c.backHome}</Link>
      </div>
    </div>
  );
}
