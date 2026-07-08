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
        ["2. Sifariş və ödəniş", "Məhsul/xidmət sifarişi platforma üzərindən verilir. Ödəniş nağd və ya bank kartı ilə (lisenziyalı ödəniş provayderi vasitəsilə) həyata keçirilir. Kartla ödənişdə sifarişin ümumi məbləği (məhsul + varsa çatdırılma haqqı) ödəniş anında göstərilir. Ödənişi təsdiqləməklə istifadəçi məbləğlə razılaşmış olur."],
        ["3. Qaytarılma və dəyişdirilmə şərtləri", "Alıcı məhsulu təhvil aldıqdan sonra 14 gün ərzində qaytara və ya dəyişdirə bilər — bu şərtlə ki, məhsul istifadə olunmamış, orijinal görünüşü və qablaşdırması qorunmuş olsun. Qüsurlu və ya təsvirə uyğun olmayan məhsullar üçün qaytarma tələbini platformadakı “Qaytarma” bölməsindən yaratmaq olar. Təsdiqlənmiş qaytarma üzrə vəsait ilkin ödəniş üsuluna geri qaytarılır."],
        ["4. Ləğv etmə və ödəmə qaydası", "Sifariş satıcı tərəfindən təsdiqlənənə qədər ləğv edilə bilər. Kartla ödənilmiş sifariş ləğv edildikdə ödənilmiş məbləğ eyni karta geri qaytarılır (geri qaytarma müddəti bankdan asılıdır, adətən 3–10 iş günü). Çatdırılma başladıqdan sonra ləğv üçün satıcı/dəstək xidməti ilə əlaqə saxlanılır."],
        ["5. Məsuliyyət", "Elanların məzmununa görə məsuliyyət onları yerləşdirən istifadəçiyə aiddir. Platforma qanunsuz və ya qaydalara zidd elanları silmək hüququnu saxlayır."],
        ["6. Əlaqə", `Suallar üçün: ${COMPANY.email}`],
      ],
      backHome: "← Ana səhifəyə qayıt",
    },
    en: {
      title: "Terms of Use & Rules",
      updated: "Last updated: 2026",
      intro: `These terms govern the use of the ${COMPANY.brand} platform. By using the site you accept the rules and conditions below.`,
      blocks: [
        ["1. General terms", "The platform is an online marketplace connecting buyers and sellers. Users must provide accurate and lawful information and comply with applicable legislation."],
        ["2. Orders and payment", "Orders for goods/services are placed through the platform. Payment is made in cash or by bank card (via a licensed payment provider). For card payments, the total amount (goods + delivery fee, if any) is shown at the moment of payment. By confirming the payment, the user agrees to the amount."],
        ["3. Return and exchange conditions", "The buyer may return or exchange a product within 14 days of receipt, provided the product is unused and its original appearance and packaging are preserved. For defective or misdescribed products, a return request can be created in the “Returns” section of the platform. For approved returns, funds are refunded to the original payment method."],
        ["4. Cancellation and refund policy", "An order can be cancelled before it is confirmed by the seller. When a card-paid order is cancelled, the paid amount is refunded to the same card (refund time depends on the bank, usually 3–10 business days). After delivery has started, cancellation is handled via the seller/support."],
        ["5. Liability", "Responsibility for the content of listings lies with the user who posts them. The platform reserves the right to remove unlawful or non-compliant listings."],
        ["6. Contact", `For questions: ${COMPANY.email}`],
      ],
      backHome: "← Back to home",
    },
    ru: {
      title: "Условия использования и правила",
      updated: "Последнее обновление: 2026",
      intro: `Эти условия регулируют использование платформы ${COMPANY.brand}. Используя сайт, вы принимаете правила ниже.`,
      blocks: [
        ["1. Общие условия", "Платформа — онлайн-маркетплейс, соединяющий покупателей и продавцов. Пользователи обязаны предоставлять точную и законную информацию."],
        ["2. Заказы и оплата", "Заказы оформляются через платформу. Оплата — наличными или банковской картой (через лицензированного провайдера). При оплате картой итоговая сумма (товар + доставка, если есть) отображается в момент оплаты. Подтверждая оплату, пользователь соглашается с суммой."],
        ["3. Возврат и обмен", "Покупатель может вернуть или обменять товар в течение 14 дней с момента получения при условии, что товар не использован и сохранён его вид и упаковка. Возврат оформляется в разделе «Возвраты». Средства возвращаются на исходный способ оплаты."],
        ["4. Отмена и возврат средств", "Заказ можно отменить до подтверждения продавцом. При отмене оплаченного картой заказа сумма возвращается на ту же карту (срок зависит от банка, обычно 3–10 рабочих дней)."],
        ["5. Ответственность", "Ответственность за содержание объявлений несёт разместивший их пользователь. Платформа вправе удалять незаконные объявления."],
        ["6. Контакт", `Вопросы: ${COMPANY.email}`],
      ],
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

      <div className="mt-10 pt-6 border-t border-card-border">
        <Link href="/elanlar" className="text-orange-500 text-sm font-medium hover:text-orange-400">{c.backHome}</Link>
      </div>
    </div>
  );
}
