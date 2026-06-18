import Link from "next/link";

export const metadata = {
  title: "İstifadə Şərtləri — tradixai",
  description: "tradixai istifadə şərtləri.",
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">İstifadə Şərtləri</h1>
      <p className="text-muted text-sm mb-8">Son yenilənmə: 2026</p>

      <div className="space-y-6 text-sm sm:text-base leading-relaxed text-foreground/90">
        <section>
          <p>
            tradixai platformasından istifadə etməklə aşağıdakı şərtləri qəbul edirsiniz. Şərtlərlə
            razı deyilsinizsə, xidmətdən istifadə etməyin.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">1. Hesab</h2>
          <p>
            Hesab yaratdıqda düzgün məlumat verməlisiniz. Hesabınızın təhlükəsizliyinə görə özünüz
            məsuliyyət daşıyırsınız. Saxta məlumat və ya başqasının kimliyindən istifadə qadağandır.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">2. Elanlar</h2>
          <p>
            Yerləşdirdiyiniz elanların qanuni, dəqiq və real olmasına cavabdehsiniz. Qadağan olunmuş,
            saxta və ya yanıldıcı məhsul/xidmət elanları silinə bilər.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">3. Alış-veriş</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>VÖEN-li (biznes) elanlar:</b> sayt üzərindən kartla ödəniş mümkündür.</li>
            <li><b>VÖEN-siz (fərdi) elanlar:</b> ödəniş sayt üzərindən deyil — alıcı və satıcı birbaşa razılaşır. Platforma bu əməliyyatlara cavabdeh deyil.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">4. Məsuliyyət</h2>
          <p>
            Platforma alıcı və satıcıları əlaqələndirən vasitədir. İstifadəçilər arasındakı
            razılaşmaların və məhsulun keyfiyyətinin məsuliyyəti tərəflərə aiddir.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2 text-foreground">5. Əlaqə</h2>
          <p>
            Suallar üçün: <a href="mailto:info@tradixai.az" className="text-orange-500 hover:underline">info@tradixai.az</a>
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-card-border">
        <Link href="/elanlar" className="text-orange-500 text-sm font-medium hover:text-orange-400">← Ana səhifəyə qayıt</Link>
      </div>
    </div>
  );
}
