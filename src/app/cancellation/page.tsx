"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/LanguageContext";
import { COMPANY } from "@/lib/company";

export default function CancellationPage() {
  const { locale } = useLanguage();
  const L: any = {
    az: {
      title: "Ləğv etmə və ödəmə qaydası",
      updated: "Son yenilənmə: 2026",
      blocks: [
        ["1. Sifarişin ləğvi", "Sifariş satıcı tərəfindən təsdiqlənənə qədər alıcı tərəfindən pulsuz ləğv edilə bilər. Ləğv sifarişlər siyahısından həyata keçirilir."],
        ["2. Kartla ödənişin geri qaytarılması", "Kartla ödənilmiş sifariş ləğv edildikdə ödənilmiş məbləğ eyni karta geri qaytarılır. Geri qaytarma müddəti bankdan asılıdır (adətən 3–10 iş günü)."],
        ["3. Çatdırılma başladıqdan sonra", "Kuryer məhsulu götürdükdən/çatdırılma başladıqdan sonra ləğv üçün satıcı və ya dəstək xidməti ilə əlaqə saxlanılmalıdır."],
        ["4. Ödəniş üsulları", "Ödəniş nağd və ya bank kartı ilə həyata keçirilir. Kartla ödənişlər lisenziyalı ödəniş provayderi (bank) vasitəsilə emal olunur. Kart məlumatları (kart nömrəsi, CVV və s.) saytımızda saxlanılmır."],
        ["5. Ödəniş məbləği", "Kartla ödənişdə sifarişin ümumi məbləği (məhsul + varsa çatdırılma haqqı) ödəniş anında göstərilir. Ödənişi təsdiqləməklə istifadəçi məbləğlə razılaşmış olur."],
        ["6. Əlaqə", `Ödəniş və ləğvlə bağlı suallar üçün: ${COMPANY.email}`],
      ],
      back: "← İstifadə şərtləri",
      backHome: "← Ana səhifə",
    },
    en: {
      title: "Cancellation and Payment Policy",
      updated: "Last updated: 2026",
      blocks: [
        ["1. Order cancellation", "An order can be cancelled free of charge by the buyer before it is confirmed by the seller. Cancellation is done from the orders list."],
        ["2. Refund of card payments", "When a card-paid order is cancelled, the paid amount is refunded to the same card. The refund period depends on the bank (usually 3–10 business days)."],
        ["3. After delivery has started", "Once the courier has picked up the product / delivery has started, cancellation must be arranged with the seller or support."],
        ["4. Payment methods", "Payment is made in cash or by bank card. Card payments are processed through a licensed payment provider (bank). Card data (card number, CVV, etc.) is not stored on our website."],
        ["5. Payment amount", "For card payments, the total order amount (goods + delivery fee, if any) is shown at the moment of payment. By confirming the payment, the user agrees to the amount."],
        ["6. Contact", `For payment and cancellation questions: ${COMPANY.email}`],
      ],
      back: "← Terms of Use",
      backHome: "← Home",
    },
    ru: {
      title: "Правила отмены и оплаты",
      updated: "Последнее обновление: 2026",
      blocks: [
        ["1. Отмена заказа", "Заказ может быть бесплатно отменён покупателем до подтверждения продавцом. Отмена выполняется из списка заказов."],
        ["2. Возврат оплаты картой", "При отмене оплаченного картой заказа сумма возвращается на ту же карту. Срок возврата зависит от банка (обычно 3–10 рабочих дней)."],
        ["3. После начала доставки", "После того как курьер забрал товар / доставка началась, отмену необходимо согласовать с продавцом или поддержкой."],
        ["4. Способы оплаты", "Оплата производится наличными или банковской картой. Оплата картой обрабатывается лицензированным платёжным провайдером (банком). Данные карты (номер, CVV и т. д.) на нашем сайте не хранятся."],
        ["5. Сумма оплаты", "При оплате картой итоговая сумма заказа (товар + доставка, если есть) отображается в момент оплаты. Подтверждая оплату, пользователь соглашается с суммой."],
        ["6. Контакт", `Вопросы по оплате и отмене: ${COMPANY.email}`],
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
