"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { COMPANY } from "@/lib/company";

export default function TermsPage() {
  const { locale } = useLanguage();
  const L: any = {
    az: {
      title: "İstifadə şərtləri və qaydaları",
      updated: "Son yenilənmə: 2026",
      intro: `Bu şərtlər ${COMPANY.brand} platformasından istifadəni tənzimləyir. Saytdan istifadə etməklə aşağıdakı qayda və şərtləri qəbul edirsiniz.`,
      blocks: [
        ["1. Ümumi şərtlər", "Platforma alıcı və satıcıları birləşdirən onlayn marketplace xidmətidir. İstifadəçilər dəqiq və qanuni məlumat təqdim etməli, qüvvədə olan qanunvericiliyə əməl etməlidir."],
        ["2. Sifariş və ödəniş", "Məhsul/xidmət sifarişi platforma üzərindən verilir. Ödəniş nağd və ya bank kartı ilə (lisenziyalı ödəniş provayderi vasitəsilə) həyata keçirilir. Kartla ödənişdə sifarişin ümumi məbləği ödəniş anında göstərilir və istifadəçi ödənişi təsdiqləməklə razılaşır."],
        ["3. Məsuliyyət", "Elanların məzmununa görə məsuliyyət onları yerləşdirən istifadəçiyə aiddir. Platforma qanunsuz və ya qaydalara zidd elanları silmək hüququnu saxlayır."],
        ["4. Əlaqə", `Suallar üçün: ${COMPANY.email}`],
      ],
      related: "Əlaqəli sənədlər",
      returns: "Qaytarılma və dəyişdirilmə şərtləri",
      cancellation: "Ləğv etmə və ödəmə qaydası",
      privacy: "Məxfilik siyasəti",
      backHome: "← Ana səhifəyə qayıt",
    },
    en: {
      title: "Terms of Use & Rules",
      updated: "Last updated: 2026",
      intro: `These terms govern the use of the ${COMPANY.brand} platform. By using the site you accept the rules and conditions below.`,
      blocks: [
        ["1. General terms", "The platform is an online marketplace connecting buyers and sellers. Users must provide accurate and lawful information and comply with applicable legislation."],
        ["2. Orders and payment", "Orders for goods/services are placed through the platform. Payment is made in cash or by bank card (via a licensed payment provider). For card payments, the total order amount is shown at the moment of payment, and the user agrees to it by confirming the payment."],
        ["3. Liability", "Responsibility for the content of listings lies with the user who posts them. The platform reserves the right to remove unlawful or non-compliant listings."],
        ["4. Contact", `For questions: ${COMPANY.email}`],
      ],
      related: "Related documents",
      returns: "Return and Exchange Conditions",
      cancellation: "Cancellation and Payment Policy",
      privacy: "Privacy Policy",
      backHome: "← Back to home",
    },
    ru: {
      title: "Условия использования и правила",
      updated: "Последнее обновление: 2026",
      intro: `Эти условия регулируют использование платформы ${COMPANY.brand}. Используя сайт, вы принимаете правила ниже.`,
      blocks: [
        ["1. Общие условия", "Платформа — онлайн-маркетплейс, соединяющий покупателей и продавцов. Пользователи обязаны предоставлять точную и законную информацию."],
        ["2. Заказы и оплата", "Заказы оформляются через платформу. Оплата — наличными или банковской картой (через лицензированного провайдера). При оплате картой итоговая сумма отображается в момент оплаты, и пользователь соглашается с ней, подтверждая оплату."],
        ["3. Ответственность", "Ответственность за содержание объявлений несёт разместивший их пользователь. Платформа вправе удалять незаконные объявления."],
        ["4. Контакт", `Вопросы: ${COMPANY.email}`],
      ],
      related: "Связанные документы",
      returns: "Условия возврата и обмена",
      cancellation: "Правила отмены и оплаты",
      privacy: "Политика конфиденциальности",
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
        {c.blocks.map(([h, body]: string[], i: number) => (
          <section key={i}>
            <h2 className="text-lg font-semibold mb-2 text-foreground">{h}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>

      <div className="mt-8 surface p-5">
        <h2 className="text-sm font-semibold mb-3 text-foreground">{c.related}</h2>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/returns" className="text-orange-500 hover:underline">→ {c.returns}</Link>
          <Link href="/cancellation" className="text-orange-500 hover:underline">→ {c.cancellation}</Link>
          <Link href="/privacy" className="text-orange-500 hover:underline">→ {c.privacy}</Link>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-card-border">
        <Link href="/elanlar" className="text-orange-500 text-sm font-medium hover:text-orange-400">{c.backHome}</Link>
      </div>
    </div>
  );
}
