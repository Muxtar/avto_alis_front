"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { COMPANY } from "@/lib/company";

export default function ReturnsPage() {
  const { locale } = useLanguage();
  const L: any = {
    az: {
      title: "Qaytarılma və dəyişdirilmə şərtləri",
      updated: "Son yenilənmə: 2026",
      blocks: [
        ["1. Qaytarma müddəti", "Alıcı məhsulu təhvil aldıqdan sonra 14 (on dörd) təqvim günü ərzində qaytara və ya dəyişdirə bilər — bu şərtlə ki, məhsul istifadə olunmamış, orijinal görünüşü, etiketləri və qablaşdırması qorunmuş olsun."],
        ["2. Qüsurlu və ya təsvirə uyğun olmayan məhsul", "Məhsul qüsurludursa, natamam və ya elandakı təsvirə uyğun deyilsə, alıcı platformadakı “Qaytarma” bölməsindən qaytarma tələbi yarada bilər. Belə hallarda çatdırılma xərci alıcıdan tutulmur."],
        ["3. Vəsaitin geri qaytarılması", "Təsdiqlənmiş qaytarma üzrə ödənilmiş məbləğ ilkin ödəniş üsuluna geri qaytarılır. Kartla ödənişdə vəsait eyni karta qaytarılır (müddət bankdan asılıdır, adətən 3–10 iş günü)."],
        ["4. Qaytarılmayan məhsullar", "Gigiyenik məhsullar, fərdi sifarişlə hazırlanan məhsullar və qanunvericiliklə qaytarılması nəzərdə tutulmayan mallar geri qaytarıla bilməz."],
        ["5. Əlaqə", `Qaytarma ilə bağlı suallar üçün: ${COMPANY.email}`],
      ],
      back: "← İstifadə şərtləri",
      backHome: "← Ana səhifə",
    },
    en: {
      title: "Return and Exchange Conditions",
      updated: "Last updated: 2026",
      blocks: [
        ["1. Return period", "The buyer may return or exchange a product within 14 (fourteen) calendar days of receipt, provided the product is unused and its original appearance, labels and packaging are preserved."],
        ["2. Defective or misdescribed products", "If a product is defective, incomplete, or does not match the description in the listing, the buyer may create a return request in the “Returns” section of the platform. In such cases the delivery cost is not charged to the buyer."],
        ["3. Refund of funds", "For approved returns, the paid amount is refunded to the original payment method. For card payments the funds are returned to the same card (time depends on the bank, usually 3–10 business days)."],
        ["4. Non-returnable products", "Hygiene products, custom-made products, and goods that cannot be returned under the law are non-returnable."],
        ["5. Contact", `For return-related questions: ${COMPANY.email}`],
      ],
      back: "← Terms of Use",
      backHome: "← Home",
    },
    ru: {
      title: "Условия возврата и обмена",
      updated: "Последнее обновление: 2026",
      blocks: [
        ["1. Срок возврата", "Покупатель может вернуть или обменять товар в течение 14 (четырнадцати) календарных дней с момента получения при условии, что товар не использован и сохранены его вид, ярлыки и упаковка."],
        ["2. Бракованный или несоответствующий товар", "Если товар бракованный, неполный или не соответствует описанию, покупатель может оформить возврат в разделе «Возвраты». В таких случаях стоимость доставки с покупателя не взимается."],
        ["3. Возврат средств", "По одобренному возврату сумма возвращается на исходный способ оплаты. При оплате картой средства возвращаются на ту же карту (срок зависит от банка, обычно 3–10 рабочих дней)."],
        ["4. Невозвратные товары", "Гигиенические товары, изделия на заказ и товары, не подлежащие возврату по закону, возврату не подлежат."],
        ["5. Контакт", `Вопросы по возврату: ${COMPANY.email}`],
      ],
      back: "← Условия использования",
      backHome: "← На главную",
    },
  };
  const c = L[locale] || L.az;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">{c.title}</h1>
      <p className="text-muted text-sm mb-8">{c.updated}</p>
      <div className="space-y-6 text-sm sm:text-base leading-relaxed text-foreground/90">
        {c.blocks.map(([h, body]: string[], i: number) => (
          <section key={i}>
            <h2 className="text-lg font-semibold mb-2 text-foreground">{h}</h2>
            <p>{body}</p>
          </section>
        ))}
      </div>
      <div className="mt-10 pt-6 border-t border-card-border flex gap-5">
        <Link href="/terms" className="text-orange-500 text-sm font-medium hover:text-orange-400">{c.back}</Link>
        <Link href="/elanlar" className="text-muted text-sm font-medium hover:text-orange-400">{c.backHome}</Link>
      </div>
    </div>
  );
}
