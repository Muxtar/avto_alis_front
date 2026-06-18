import Link from "next/link";

export const metadata = {
  title: "Gizlilik Siyasəti — tradixai",
  description: "tradixai gizlilik siyasəti: hansı məlumatları toplayırıq, necə istifadə edirik və qoruyuruq.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Gizlilik Siyasəti</h1>
      <p className="text-muted text-sm mb-8">Son yenilənmə: 2026</p>

      <div className="space-y-6 text-sm sm:text-base leading-relaxed text-foreground/90">
        <section>
          <p>
            tradixai (“biz”, “platforma”) — hər şeyin alınıb-satıldığı onlayn bazardır. Bu
            siyasət saytdan və xidmətlərdən istifadə edərkən hansı şəxsi məlumatları topladığımızı,
            necə istifadə etdiyimizi və qoruduğumuzu izah edir. Platformadan istifadə etməklə bu
            şərtləri qəbul etmiş olursunuz.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">1. Topladığımız məlumatlar</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>Hesab məlumatları:</b> ad, soyad, telefon nömrəsi, e-poçt, məslək.</li>
            <li><b>Kimlik təsdiqi:</b> şəxsiyyət vəsiqəsi şəkli və selfie (üz uyğunluğunun yoxlanması üçün).</li>
            <li><b>Profil:</b> profil şəkli, əlaqələndirdiyiniz sosial media hesabları.</li>
            <li><b>Elanlar:</b> yerləşdirdiyiniz məhsul/xidmət məlumatları, şəkillər, qiymət, yer.</li>
            <li><b>Biznes məlumatları:</b> VÖEN, bank hesabı, biznes sənədləri (kartla satış üçün).</li>
            <li><b>Texniki məlumat:</b> cihaz, brauzer və istifadə statistikası.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">2. Məlumatlardan necə istifadə edirik</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Hesab yaratmaq, daxil olmaq və kimliyinizi təsdiqləmək;</li>
            <li>Elanları yayımlamaq, alıcı və satıcıları əlaqələndirmək;</li>
            <li>Ödənişləri (kartla satış) emal etmək və sifarişləri idarə etmək;</li>
            <li>Təhlükəsizliyi təmin etmək, saxtakarlığın qarşısını almaq;</li>
            <li>Xidməti yaxşılaşdırmaq və sizinlə əlaqə saxlamaq.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">3. Sosial media ilə təsdiq</h2>
          <p>
            “Hesabla təsdiqlə” funksiyasından istifadə etdikdə (məs. Facebook ilə daxil olmaqla),
            platforma yalnız sizin <b>açıq profil məlumatınızı</b> (ad və profil şəkli) və hesab
            linkinizi alır. Şifrənizi görmür və icazəsiz heç bir məlumatınıza çıxış əldə etmir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">4. Məlumatların paylaşılması</h2>
          <p>
            Şəxsi məlumatlarınızı satmırıq. Məlumat yalnız bu hallarda paylaşıla bilər: xidmətin
            işləməsi üçün (məs. ödəniş provayderi), qanuni tələb olduqda, və ya razılığınızla.
            Public profilinizdə yalnız özünüzün açıqladığınız (ad, təsdiqlənmiş sosial hesablar,
            elanlar) məlumat görünür.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">5. Təhlükəsizlik və saxlanma</h2>
          <p>
            Məlumatlarınızı qorumaq üçün texniki və təşkilati tədbirlər görürük. Kimlik sənədləri
            kimi həssas məlumatlar yalnız təsdiq məqsədilə saxlanılır və məhdud çıxışla qorunur.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">6. Sizin hüquqlarınız</h2>
          <p>
            Məlumatlarınıza baxmaq, düzəltmək və ya silinməsini tələb etmək hüququnuz var. Sosial
            hesab bağlantısını və ya profil məlumatlarını istənilən vaxt dəyişə/silə bilərsiniz.
            Hesabınızın silinməsini istəsəniz, aşağıdakı e-poçt ünvanı ilə bizə yazın.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">7. Əlaqə</h2>
          <p>
            Gizliliklə bağlı suallar üçün: <a href="mailto:info@tradixai.az" className="text-orange-500 hover:underline">info@tradixai.az</a>
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-card-border">
        <Link href="/elanlar" className="text-orange-500 text-sm font-medium hover:text-orange-400">← Ana səhifəyə qayıt</Link>
      </div>
    </div>
  );
}
