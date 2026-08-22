// Ümumi marketplace taksonomiyası — sayt hər şeyi satır (təkcə avto deyil).
// ÜÇ SƏVİYYƏ: Ana kateqoriya → Alt kateqoriya → Alt-alt kateqoriya (leaf).
//   məs. "Elektronika › Ağıllı ev sistemləri › Təhlükəsizlik kameraları"
// Hər əsas kateqoriyanın və hər alt kateqoriyanın öz ikonu var (bir-birindən fərqli).
// `vehicle` = avtomobillə bağlıdır (yalnız bu kateqoriyalarda marka/model/yanacaq/il sahələri çıxır).
// `service` = tip avtomatik SERVICE olsun.
//
// QAYDA: eyni alt kateqoriya adı İKİ ana kateqoriyada təkrarlanmır ("Digər"dən başqa).
// Təkrar adlar həm menyuda, həm də idxal (import) validasiyasında qeyri-müəyyənlik
// yaradırdı: "Şinlər və disklər" iki yerdə idi, "İşıqlandırma" iki yerdə və s.
// Ona görə təkrarlar birləşdirilib və ya dəqiqləşdirilib (məs. "Avtomobil işıqlandırması").

export interface LeafCategory {
  name: string;
}
export interface SubCategory {
  name: string;
  icon: string;
  subs?: LeafCategory[]; // 3-cü səviyyə (ola da bilər, olmaya da)
}
export interface MainCategory {
  name: string;
  icon: string; // emoji ikon (kateqoriya kartları üçün)
  subs: SubCategory[];
  vehicle?: boolean;
  service?: boolean;
  bookable?: boolean; // bron/rezervasiya kateqoriyası (restoran, otel, məkan...) — elan yaradanda bron seçimi təklif olunur
}

// s(ad, ikon, [alt-alt adları])
const s = (name: string, icon: string, leaves?: string[]): SubCategory =>
  leaves && leaves.length ? { name, icon, subs: leaves.map((n) => ({ name: n })) } : { name, icon };

export const CATEGORIES: MainCategory[] = [
  {
    name: "Nəqliyyat", icon: "🚗", vehicle: true, subs: [
      s("Minik avtomobilləri", "🚙", ["Sedan", "Hetçbek", "Universal", "Offroader / SUV", "Kupe", "Kabriolet", "Pikap", "Minivan və mikrovan", "Elektromobillər", "Hibrid avtomobillər"]),
      s("Motosiklet və mopedlər", "🏍️", ["Motosikletlər", "Moped və skuterlər", "Kvadrosiklet (ATV)", "Kross və enduro", "Dəbilqə və ekipirovka"]),
      s("Yük maşınları", "🚚", ["Kiçik yük maşınları", "Ağır yük maşınları (tır)", "Refrijeratorlar", "Özüboşaldanlar", "Sistern və yanacaqdaşıyanlar", "Furqonlar", "Evakuatorlar"]),
      s("Avtobus və mikroavtobus", "🚌", ["Avtobuslar", "Mikroavtobuslar", "Turist avtobusları", "Məktəb avtobusları"]),
      s("Tikinti və xüsusi texnika", "🚜", ["Ekskavatorlar", "Buldozerlər", "Yükləyicilər", "Avtokranlar", "Beton qarışdıranlar", "Avtovışkalar", "Qazma texnikası", "Yol texnikası"]),
      s("Su nəqliyyatı", "⛵", ["Qayıqlar", "Kater və yaxtalar", "Jet-ski", "Rezin qayıqlar", "Sükan mühərrikləri", "Su nəqliyyatı aksesuarları"]),
      s("Qoşqu və treyler", "🚛", ["Yük qoşquları", "Avtomobil treylerləri", "Qayıq treylerləri", "Karvan (dach treyler)"]),
      s("Elektrik nəqliyyat vasitələri", "🛴", ["Elektrik skuterlər", "Elektrik mopedlər", "Hoverbord və seqvey", "Elektrik arabalar (qolf)"]),
    ],
  },
  {
    name: "Avtomobil ehtiyat hissələri", icon: "⚙️", vehicle: true, subs: [
      s("Mühərrik hissələri", "🔧", ["Porşen və halqalar", "Silindr başlığı", "Vaxt kəməri və zənciri", "Klapanlar", "Yastıqlar (vkladış)", "Turbinalar", "Prokladka dəstləri"]),
      s("Transmissiya", "⚙️", ["Sürətlər qutusu", "Mufta (sıxac) dəstləri", "Karden valı", "Diferensial", "Ötürücü valları"]),
      s("Asqı və sükan", "🛠️", ["Amortizatorlar", "Yaylar", "Sükan reyki", "Şar barmaqlar", "Stabilizator hissələri", "Rıçaqlar", "Podşipniklər"]),
      s("Əyləc sistemi", "🛑", ["Əyləc diskləri", "Əyləc kolodkaları", "Suportlar", "Əyləc silindrləri", "Əyləc şlanqları", "ABS sensorları"]),
      s("Avtoelektrik və elektronika", "🔌", ["Starterlər", "Generatorlar", "Şam və kətüşkalar", "Sensorlar", "Beyin (ECU)", "Naqil dəstləri", "Siqnalizasiya və mərkəzi kilid", "Diaqnostika cihazları"]),
      s("Filtrlər və yağlar", "🛢️", ["Mühərrik yağları", "Yağ filtrləri", "Hava filtrləri", "Yanacaq filtrləri", "Salon filtrləri", "Transmissiya yağları"]),
      s("Soyutma və kondisioner", "❄️", ["Radiatorlar", "Su nasosları", "Termostatlar", "Kondisioner kompressoru", "Ventilyatorlar"]),
      s("Egzoz sistemi", "💨", ["Egzoz boruları", "Katalizatorlar", "Səsboğanlar", "Lambda zondu"]),
      s("Kuzov hissələri", "🚘", ["Kapot", "Qanadlar", "Qapılar", "Bamperlər", "Baqaj qapağı", "Radiator barmaqlığı", "Kuzov kilidləri"]),
      s("Avtomobil işıqlandırması", "💡", ["Ön faralar", "Arxa stop işıqları", "Duman işıqları", "LED və ksenon lampalar", "Dönmə siqnalları"]),
      s("Şüşə və güzgülər", "🪟", ["Ön şüşə", "Yan şüşələr", "Arxa şüşə", "Yan güzgülər", "Salon güzgüsü", "Şüşəsilənlər"]),
      s("Salon və aksesuar", "🪑", ["Oturacaqlar", "Ayaqaltılar", "Sükan və qapaqlar", "Oturacaq örtükləri (çexol)", "Salon işıqlandırması", "Videoregistratorlar"]),
      s("Akkumulyator", "🔋", ["Minik avtomobilləri üçün", "Yük maşınları üçün", "Motosikletlər üçün", "Şarj cihazları"]),
      s("Avto audio və multimedia", "🔊", ["Maqnitolalar", "Android monitorlar", "Dinamiklər", "Sabvuferlər", "Gücləndiricilər", "Antenalar"]),
      s("Təkər, şin və disklər", "🛞", ["Yay şinləri", "Qış şinləri", "Dörd fəsil şinlər", "Yüngül lehimli disklər", "Ştamplanmış disklər", "Kamera və qapaqlar", "Bolt və qayqalar"]),
      s("Avtokimya və qulluq vasitələri", "🧴", ["Antifriz", "Əyləc mayesi", "Şüşəyuyucu mayelər", "Yuyucu və cilalar", "Qoruyucu örtüklər (vosk, keramika)"]),
    ],
  },
  {
    name: "Daşınmaz əmlak", icon: "🏠", subs: [
      s("Mənzillər (yeni tikili)", "🏢", ["1 otaqlı", "2 otaqlı", "3 otaqlı", "4 otaqlı", "5 və daha çox otaqlı"]),
      s("Mənzillər (köhnə tikili)", "🏬", ["1 otaqlı", "2 otaqlı", "3 otaqlı", "4 otaqlı", "5 və daha çox otaqlı"]),
      s("Həyət evi, villa və bağ evləri", "🏡", ["Həyət evləri", "Villalar", "Bağ evləri", "Kotteclər", "Yarımçıq tikili evlər"]),
      s("Torpaq sahələri", "🏞️", ["Yaşayış üçün torpaq", "Kənd təsərrüfatı torpağı", "Kommersiya torpağı", "Bağ sahəsi"]),
      s("Ofislər", "🏤", ["Biznes mərkəzində ofis", "Yaşayış binasında ofis", "Ayrıca ofis binası", "Kovorkinq yeri"]),
      s("Obyekt və mağazalar", "🏪", ["Mağazalar", "Restoran və kafe obyekti", "Anbar və istehsalat sahəsi", "Gözəllik salonu obyekti", "Ticarət mərkəzində yer"]),
      s("Qaraj və anbar", "🏚️", ["Qarajlar", "Parkinq yeri", "Anbarlar", "Soyuducu anbarlar"]),
      s("Günlük kirayə", "🛏️", ["Günlük mənzillər", "Günlük evlər", "Otaq və hostel"]),
      s("Xaricdə əmlak", "🌍", ["Türkiyə", "Gürcüstan", "BƏƏ", "Rusiya", "Digər ölkələr"]),
    ],
  },
  {
    name: "Elektronika", icon: "📱", subs: [
      s("Telefonlar", "📱", ["Smartfonlar", "Düyməli telefonlar", "Stasionar telefonlar", "Telefon ehtiyat hissələri"]),
      s("Planşetlər", "📲", ["Android planşetlər", "iPad", "Qrafik planşetlər", "Elektron kitab oxuyucular"]),
      s("Noutbuklar", "💻", ["Ofis noutbukları", "Oyun noutbukları", "Ultrabuklar", "MacBook", "Noutbuk aksesuarları"]),
      s("Kompüterlər", "🖥️", ["Stasionar kompüterlər", "Monobloklar", "Oyun kompüterləri", "Serverlər"]),
      s("Komponentlər və periferiya", "🖲️", ["Monitorlar", "Video kartlar", "Prosessorlar", "Ana platalar", "Operativ yaddaş (RAM)", "SSD və HDD", "Qida blokları", "Korpus və soyutma", "Klaviatura və siçan", "Printer və skanerlər"]),
      s("TV və proyektorlar", "📺", ["Televizorlar", "Smart TV pristavkaları", "Proyektorlar və ekranlar", "Divar kronşteynləri", "Peyk avadanlığı"]),
      s("Audio (qulaqlıq, dinamik)", "🎧", ["Simli qulaqlıqlar", "Simsiz qulaqlıqlar", "Portativ dinamiklər", "Ev akustikası", "Mikrofonlar", "Musiqi mərkəzləri"]),
      s("Foto və video kameralar", "📷", ["Fotoaparatlar", "Video kameralar", "Ekşn kameralar", "Obyektivlər", "Dronlar (kvadrokopter)", "İşıq və ştativlər"]),
      s("Oyun konsolları", "🎮", ["PlayStation", "Xbox", "Nintendo", "Oyun diskləri", "Geympad və aksesuarlar", "VR eynəklər"]),
      s("Smart saat və qurğular", "⌚", ["Ağıllı saatlar", "Fitnes qolbaqları", "Ağıllı üzük və eynəklər", "Saat qayışları"]),
      s("Ağıllı ev sistemləri", "🏠", ["Ağıllı dinamiklər", "Ağıllı ev sensorları", "Təhlükəsizlik kameraları", "Ağıllı işıqlandırma", "Qapı zəngi və videodomofonlar", "Siqnalizasiya sistemləri", "Ağıllı rozetkalar", "İdarəetmə pultları"]),
      s("Şəbəkə avadanlığı", "📡", ["Routerlər", "Modemlər", "Switch və access point", "Şəbəkə kabelləri", "Siqnal gücləndiriciləri"]),
      s("Aksesuar və kabellər", "🔌", ["Şarj cihazları", "Power bank", "Kabel və adapterlər", "Telefon çexolları", "Qoruyucu şüşələr", "Yaddaş kartları və fleşkalar"]),
      s("Mobil nömrələr", "📞", ["Azercell", "Bakcell", "Nar", "Naxtel", "VIP nömrələr"]),
    ],
  },
  {
    name: "Məişət texnikası", icon: "🧺", subs: [
      s("Soyuducular", "❄️", ["İkiqapılı soyuducular", "Birkameralı soyuducular", "Side-by-Side", "Dondurucular", "Şərab şkafları"]),
      s("Paltaryuyan maşınlar", "🧼", ["Avtomat paltaryuyanlar", "Yarımavtomat paltaryuyanlar", "Quruducu maşınlar", "Paltaryuyan-quruducular"]),
      s("Qabyuyan maşınlar", "🍽️", ["Tam ölçülü (60 sm)", "Dar (45 sm)", "Stolüstü", "Quraşdırılan"]),
      s("Sobalar və plitələr", "🔥", ["Qaz plitələri", "Elektrik plitələri", "Quraşdırılan sobalar", "Bişirmə səthləri", "Aspiratorlar"]),
      s("Mikrodalğalı sobalar", "♨️", ["Adi mikrodalğalılar", "Qrilli modellər", "Quraşdırılan modellər"]),
      s("Kondisioner və ventilyator", "🌬️", ["Split kondisionerlər", "Mobil kondisionerlər", "Ventilyatorlar", "Hava təmizləyicilər", "Nəmləndiricilər"]),
      s("Tozsoranlar", "🧹", ["Adi tozsoranlar", "Robot tozsoranlar", "Şaquli tozsoranlar", "Yuyucu tozsoranlar"]),
      s("Mətbəx texnikası", "☕", ["Çaydan və termopotlar", "Qəhvə maşınları", "Blender və mikserlər", "Ət maşınları", "Aerogril və fritürnitsa", "Toster və sendviç makerlər", "Şirəçəkənlər", "Multipişiricilər"]),
      s("Ütü və tikiş maşınları", "🧵", ["Ütülər", "Buxarlı təmizləyicilər", "Tikiş maşınları", "Overloklar"]),
      s("Su qızdırıcı və qızdırıcılar", "🔆", ["Su qızdırıcılar (boyler)", "Kombi və qazanlar", "Elektrik qızdırıcılar", "Radiatorlar", "Qaz sobaları"]),
      s("Fərdi qulluq texnikası", "💇", ["Saç qurudanlar", "Saç düzləşdiricilər", "Üz qırxma maşınları", "Epilyatorlar", "Elektrik diş fırçaları"]),
    ],
  },
  {
    name: "Ev və bağ", icon: "🛋️", subs: [
      s("Mebel", "🛋️", ["Divanlar", "Kreslolar", "Stol və stullar", "Şkaf və komodlar", "Ofis mebeli", "Kompüter masaları", "TV altlıqları"]),
      s("Yataq və mətbəx mebeli", "🛏️", ["Çarpayılar", "Döşəklər", "Mətbəx dəstləri", "Yataq dəstləri (mebel)", "Bufet və vitrinlər"]),
      s("İşıqlandırma və lampalar", "💡", ["Çilçıraqlar", "Divar və tavan işıqları", "Stolüstü lampalar", "LED lentlər", "Bağ işıqlandırması"]),
      s("Xalça və tekstil", "🧶", ["Xalçalar", "Pərdələr", "Yorğan və yastıqlar", "Yataq dəstləri (tekstil)", "Süfrə və dəsmallar"]),
      s("Ev dekoru və aksesuar", "🖼️", ["Şəkil və tablolar", "Güzgülər", "Divar saatları", "Şam və vazalar", "Süni güllər"]),
      s("Qab-qacaq", "🍴", ["Qazan və tavalar", "Boşqab dəstləri", "Çay və qəhvə dəstləri", "Bıçaq dəstləri", "Saxlama qabları"]),
      s("Bağ və həyət", "🌷", ["Bağ mebeli", "Manqal və qrillər", "Çətir və çadırlar", "Hovuzlar", "Uşaq oyun meydançaları"]),
      s("Bitki və güllər", "🪴", ["Otaq bitkiləri", "Dibçək və altlıqlar", "Süni bitkilər", "Buket və çiçəklər"]),
      s("Bağ alətləri", "🪓", ["Ot biçən maşınlar", "Budama alətləri", "Bel və dırmıqlar", "Suvarma şlanqları", "Motobloklar"]),
      s("Təmizlik ləvazimatı", "🧴", ["Yuyucu vasitələr", "Təmizlik alətləri", "Zibil qabları", "Kağız məhsullar"]),
    ],
  },
  {
    name: "Tikinti və təmir", icon: "🧱", subs: [
      s("İnşaat materialları", "🧱", ["Metal və armatur", "Taxta materiallar", "Gips-karton", "Suvaq və şpaklyovka", "Hidroizolyasiya materialları"]),
      s("Sement, qum, kərpic", "🪨", ["Sement", "Qum və çınqıl", "Kərpic və bloklar", "Hazır beton"]),
      s("Santexnika", "🚿", ["Unitaz və rakovinalar", "Vanna və duş kabinləri", "Qarışdırıcılar (kran)", "Boru və fitinqlər", "Su nasosları", "Su filtrləri"]),
      s("Elektrik malları", "🔌", ["Kabel və naqillər", "Avtomat və şitlər", "Rozetka və açarlar", "Sayğaclar", "Generator və stabilizatorlar"]),
      s("Alət və avadanlıq", "🛠️", ["Elektrik alətlər (perforator, drel)", "Əl alətləri", "Ölçü alətləri", "Qaynaq aparatları", "Kompressorlar", "Nərdivanlar"]),
      s("Qapı və pəncərə", "🚪", ["Giriş qapıları", "Otaq qapıları", "Plastik pəncərələr", "Alüminium konstruksiyalar", "Qapı furniturası"]),
      s("Boya və laklar", "🎨", ["Divar boyaları", "Emal və laklar", "Həlledicilər", "Fırça və valiklər", "Divar kağızları"]),
      s("İzolyasiya və dam", "🏗️", ["Dam örtükləri", "İstilik izolyasiyası", "Səs izolyasiyası", "Su izolyasiyası"]),
      s("Furnitura və bərkidici", "🔩", ["Vint və şuruplar", "Mismarlar", "Ankerlər", "Yapışdırıcılar", "Kilid və menteşələr"]),
      s("Kafel və döşəmə", "🟫", ["Kafel və metlax", "Laminat və parket", "Linoleum", "Plintuslar", "Süni daş"]),
    ],
  },
  {
    name: "Geyim və aksesuar", icon: "👕", subs: [
      s("Qadın geyimi", "👗", ["Donlar", "Köynək və bluzalar", "Şalvar və cins", "Ətəklər", "Trikotaj", "Alt geyim", "Çimərlik geyimi"]),
      s("Kişi geyimi", "👔", ["Köynəklər", "Kostyumlar", "Şalvar və cins", "Futbolkalar", "Trikotaj", "Alt geyim"]),
      s("Üst geyim (gödəkçə, palto)", "🧥", ["Gödəkçələr", "Paltolar", "Kürklər", "Yağmurluqlar", "Jiletlər"]),
      s("Ayaqqabı", "👟", ["Qadın ayaqqabıları", "Kişi ayaqqabıları", "Krossovkalar", "Çəkmə və botlar", "Ev ayaqqabıları"]),
      s("Çantalar", "👜", ["Qadın çantaları", "Kişi çantaları", "Bel çantaları", "Səyahət çantaları", "Pul kisələri"]),
      s("Saatlar", "⌚", ["Qadın qol saatları", "Kişi qol saatları", "Lüks saatlar"]),
      s("Zinət əşyaları", "💍", ["Üzüklər", "Sırğalar", "Boyunbağılar", "Qolbaqlar", "Qızıl və gümüş dəstlər", "Bijuteriya"]),
      s("Eynək və aksesuar", "🕶️", ["Günəş eynəkləri", "Optik eynəklər", "Kəmərlər", "Şərf və şallar", "Papaq və şapkalar", "Əlcəklər"]),
      s("İdman geyimi", "🩳", ["İdman kostyumları", "Futbolka və şortlar", "İdman ayaqqabıları", "Üzgüçülük geyimi"]),
    ],
  },
  {
    name: "Gözəllik və sağlamlıq", icon: "💄", subs: [
      s("Kosmetika", "💄", ["Üz kosmetikası", "Göz kosmetikası", "Dodaq kosmetikası", "Dırnaq lakları", "Kosmetika dəstləri", "Fırça və sponclar"]),
      s("Ətriyyat", "🌸", ["Qadın ətirləri", "Kişi ətirləri", "Uniseks ətirlər", "Dezodorantlar"]),
      s("Saç baxımı", "💇", ["Şampunlar", "Balzam və maskalar", "Saç boyaları", "Ştayling vasitələri", "Saç uzatma materialları"]),
      s("Dəri baxımı", "🧴", ["Üz kremləri", "Serum və maskalar", "Təmizləyicilər", "Bədən baxımı", "Günəşdən qoruyucular"]),
      s("Tibbi mallar", "💊", ["Sarğı materialları", "Tibbi maskalar", "Ortopedik məhsullar", "Əlil arabaları", "Tibbi geyim"]),
      s("Vitamin və qida əlavələri", "💉", ["Vitaminlər", "Mineral əlavələr", "İdman qidalanması", "Arıqlama məhsulları"]),
      s("Manikür və pedikür", "💅", ["Manikür alətləri", "Gel-lak və materiallar", "Freza və lampalar", "Pedikür vasitələri"]),
      s("Sağlamlıq cihazları", "🩺", ["Tonometrlər", "Termometrlər", "Qlükometrlər", "İnhalyatorlar", "Masaj cihazları"]),
    ],
  },
  {
    name: "Uşaq aləmi", icon: "🧸", subs: [
      s("Uşaq geyimi", "👶", ["Qız uşaq geyimi", "Oğlan uşaq geyimi", "Yenidoğan geyimi", "Uşaq ayaqqabıları", "Uşaq üst geyimi"]),
      s("Oyuncaqlar", "🧸", ["Konstruktorlar", "Yumşaq oyuncaqlar", "Kuklalar", "Maşın və texnika oyuncaqları", "İnkişafetdirici oyuncaqlar", "Açıq hava oyuncaqları"]),
      s("Uşaq arabaları", "🍼", ["Gəzinti arabaları", "Araba dəstləri (2 və 3 in 1)", "Yeriş arabaları", "Araba aksesuarları"]),
      s("Avtokreslolar", "💺", ["0-13 kq", "9-18 kq", "15-36 kq", "Buster oturacaqlar"]),
      s("Uşaq mebeli", "🪑", ["Uşaq çarpayıları", "Beşiklər", "Yazı masaları", "Uşaq şkafları", "Pelenka masaları"]),
      s("Məktəbli ləvazimatı", "🎒", ["Məktəb çantaları", "Dəftərxana ləvazimatı", "Penal və qələmlər", "Məktəb forması"]),
      s("Körpə əşyaları", "🧷", ["Uşaq bezləri", "Butulka və əmziklər", "Uşaq hamamı", "Uşaq qidası", "Körpə baxım vasitələri"]),
    ],
  },
  {
    name: "Hobbi və idman", icon: "⚽", subs: [
      s("İdman və fitnes", "🏋️", ["Trenajorlar", "Qaçış yolları", "Ağırlıq və ştanqlar", "Yoga və fitnes ləvazimatı", "Boks avadanlığı", "Komanda idman ləvazimatı"]),
      s("Velosipedlər", "🚲", ["Dağ velosipedləri", "Şəhər velosipedləri", "Uşaq velosipedləri", "Elektrik velosipedlər", "Velosiped hissə və aksesuarları"]),
      s("Musiqi alətləri", "🎸", ["Gitaralar", "Klaviş alətlər", "Zərb alətləri", "Nəfəs alətləri", "Milli alətlər (tar, saz)", "Studiya avadanlığı"]),
      s("Kitablar", "📚", ["Bədii ədəbiyyat", "Dərsliklər", "Uşaq kitabları", "Elmi və peşəkar kitablar", "Jurnal və qəzetlər"]),
      s("Kolleksiya və antikvariat", "🪙", ["Sikkə və banknotlar", "Poçt markaları", "Antik əşyalar", "Rəsm əsərləri", "Nişan və medallar"]),
      s("Ov və balıqçılıq", "🎣", ["Ov ləvazimatı", "Balıqçılıq ləvazimatı", "Ov geyimi", "Durbin və optika"]),
      s("Səyahət və kemp", "⛺", ["Çadırlar", "Yuxu kisələri", "Turist çantaları", "Kemp mebeli", "Termos və səyahət qabları"]),
      s("Biletlər", "🎟️", ["Konsert biletləri", "İdman biletləri", "Teatr və kino biletləri"]),
      s("Əl işləri və sənət", "✂️", ["Toxuculuq ləvazimatı", "Rəsm ləvazimatı", "Tikiş materialları", "Dekorativ əl işləri"]),
      s("Oyunlar (lövhə, puzzle)", "🎲", ["Stolüstü oyunlar", "Puzzlelar", "Şahmat və nərd", "Kart oyunları"]),
    ],
  },
  {
    name: "Heyvanlar", icon: "🐾", subs: [
      s("İtlər", "🐕", ["Kiçik cinslər", "Böyük cinslər", "Küçüklər", "Nəsilli (sənədli) itlər"]),
      s("Pişiklər", "🐈", ["Nəsilli pişiklər", "Pişik balaları", "Ev pişikləri"]),
      s("Quşlar", "🦜", ["Tutuquşular", "Kanareykalar", "Göyərçinlər", "Ev quşları (toyuq, ördək)"]),
      s("Akvarium və balıqlar", "🐠", ["Akvariumlar", "Akvarium balıqları", "Filtr və avadanlıq", "Akvarium dekoru"]),
      s("Kənd təsərrüfatı heyvanları", "🐄", ["İnək və camışlar", "Qoyun və keçilər", "Dovşanlar", "Arı ailələri"]),
      s("Atlar", "🐎", ["Atlar", "At ləvazimatı (yəhər, cilov)"]),
      s("Yem və ləvazimat", "🦴", ["İt yemi", "Pişik yemi", "Quş yemi", "Qəfəs və daşıyıcılar", "Oyuncaq və aksesuarlar", "Heyvan baxım vasitələri"]),
    ],
  },
  {
    name: "Kənd təsərrüfatı", icon: "🌾", subs: [
      s("Kənd təsərrüfatı texnikası", "🚜", ["Traktorlar", "Kombaynlar", "Kotan və aqreqatlar", "Səpin texnikası", "Motobloklar (k/t)", "K/t texnika ehtiyat hissələri"]),
      s("Toxum və şitillər", "🌱", ["Tərəvəz toxumları", "Meyvə şitilləri", "Taxıl toxumu", "Çiçək toxumları"]),
      s("Gübrə və kimyəvi maddələr", "🧪", ["Üzvi gübrələr", "Mineral gübrələr", "Pestisidlər", "Herbisidlər"]),
      s("Heyvandarlıq", "🐑", ["Yem və konsentratlar", "Sağım avadanlığı", "İnkubatorlar", "Damazlıq ləvazimat"]),
      s("Məhsullar (bal, meyvə)", "🍯", ["Bal və arı məhsulları", "Meyvə və giləmeyvə", "Taxıl və dənli bitkilər", "Quru meyvə və qoz"]),
      s("Suvarma avadanlığı", "💧", ["Damcı suvarma", "Suvarma nasosları", "Şlanq və borular", "Yağmurlama sistemləri"]),
    ],
  },
  {
    name: "İş elanları", icon: "💼", subs: [
      s("Vakansiyalar", "📋", ["Satış və ticarət", "Xidmət və restoran", "Tikinti və sənaye", "IT və mühəndislik", "Nəqliyyat və logistika", "Ofis və inzibati işlər", "Təhsil və tibb"]),
      s("İş axtarıram", "🔍", ["Tam ştat", "Yarım ştat", "Uzaqdan iş", "Növbəli iş"]),
      s("Biznes və avadanlıq", "🏭", ["İstehsalat avadanlığı", "Ticarət avadanlığı", "Restoran avadanlığı", "Gözəllik salonu avadanlığı", "Kassa və tərəzilər"]),
      s("Hazır biznes", "🤝", ["Kafe və restoran", "Mağaza", "İstehsalat", "Xidmət sahəsi"]),
      s("Françayzinq", "🏷️"),
    ],
  },
  {
    name: "Xidmətlər", icon: "🛠️", service: true, subs: [
      s("Təmir və tikinti xidmətləri", "🏗️", ["Mənzil təmiri", "Suvaq və boyaq işləri", "Kafel və döşəmə işləri", "Asma tavan", "Dizayn və layihə", "Tikinti briqadası"]),
      s("Avtomobil xidmətləri", "🔧", ["Avtoyuma", "Kompüter diaqnostikası", "Mühərrik təmiri", "Şin xidməti", "Kuzov və boyaq", "Avto elektrik", "Evakuator xidməti"]),
      s("Məişət texnikası təmiri", "🔌", ["Soyuducu təmiri", "Paltaryuyan təmiri", "Kondisioner təmiri", "Soba və plitə təmiri", "TV təmiri"]),
      s("Kompüter və telefon təmiri", "💻", ["Telefon təmiri", "Noutbuk təmiri", "Proqram quraşdırma", "Məlumatların bərpası"]),
      s("Santexnik xidmətləri", "🚿"),
      s("Elektrik xidmətləri", "⚡"),
      s("Kondisioner quraşdırma", "❄️"),
      s("Mebel yığılması və təmiri", "🪑"),
      s("Təmizlik xidmətləri", "🧹", ["Mənzil təmizliyi", "Ofis təmizliyi", "Xalça yuma", "Pəncərə təmizliyi", "Dezinfeksiya"]),
      s("Köçürmə və yükdaşıma", "🚚", ["Mənzil köçürməsi", "Ofis köçürməsi", "Yükləyici xidməti", "Ölkədaxili daşınma"]),
      s("Nəqliyyat və logistika", "🚛", ["Beynəlxalq yükdaşıma", "Kargo xidməti", "Sürücü xidməti", "Anbar xidməti"]),
      s("Təhsil və repetitor", "📚", ["Riyaziyyat", "İbtidai sinif", "İmtahan hazırlığı", "Musiqi dərsləri", "Rəsm dərsləri"]),
      s("Dil kursları", "🗣️", ["İngilis dili", "Rus dili", "Türk dili", "Alman dili", "Ərəb və fars dili"]),
      s("IT və proqramlaşdırma", "👨‍💻", ["Mobil tətbiq hazırlanması", "Backend / Frontend", "Verilənlər bazası", "Şəbəkə qurulumu", "Kibertəhlükəsizlik"]),
      s("Veb sayt və dizayn", "🎨", ["Veb sayt hazırlanması", "Loqo və brendinq", "UI/UX dizayn", "Qrafik dizayn"]),
      s("Reklam və marketinq", "📢", ["SMM və sosial media", "Kontekst reklam", "Çöl reklamı", "SEO"]),
      s("Foto və video çəkiliş", "📷", ["Toy çəkilişi", "Məhsul çəkilişi", "Studiya çəkilişi", "Video montaj", "Dron çəkilişi"]),
      s("Tədbir təşkili (toy, DJ)", "🎉", ["Toy təşkili", "Ad günü təşkili", "DJ və musiqi", "Dekor və bəzək", "Aparıcı (tamada)"]),
      s("Aşpaz və catering", "👨‍🍳"),
      s("Gözəllik xidmətləri", "💇", ["Saç kəsimi və düzümü", "Makiyaj", "Manikür-pedikür xidməti", "Kirpik və qaş", "Kosmetologiya"]),
      s("Masaj və SPA", "💆"),
      s("Tibbi xidmətlər", "🩺", ["Evdə tibb bacısı", "Stomatoloq", "Analiz və müayinə", "Reabilitasiya"]),
      s("Hüquq xidmətləri", "⚖️", ["Vəkil xidməti", "Sənəd hazırlanması", "Notarius müşayiəti", "Miqrasiya məsələləri"]),
      s("Mühasibatlıq və maliyyə", "📊", ["Mühasibat xidməti", "Vergi hesabatları", "Audit", "Biznes məsləhət"]),
      s("Tərcümə xidmətləri", "🌐"),
      s("Çap və poliqrafiya", "🖨️"),
      s("Dayə və qulluq", "👶"),
      s("Geyim tikişi və təmiri", "🧵"),
      s("Bağ və həyət xidmətləri", "🌳"),
      s("Heyvan xidmətləri (baytar)", "🐾"),
      s("Quraşdırma və montaj", "🔩"),
    ],
  },
  {
    name: "Turizm, istirahət və məkan", icon: "🏖️", bookable: true, subs: [
      s("Restoran və kafe", "🍽️", ["Restoranlar", "Kafelər", "Fast food", "Çayxanalar"]),
      s("Otel və mehmanxana", "🏨", ["Otellər", "Mini otellər", "Hostellər", "Kurort otelləri"]),
      s("Villa və bağ evi (bron)", "🏡", ["Hovuzlu villalar", "Dəniz kənarı evlər", "Dağ evləri", "Qış üçün evlər"]),
      s("Şadlıq sarayı və ziyafət", "🎉", ["Şadlıq sarayları", "Banket zalları", "Toy salonları"]),
      s("İstirahət mərkəzi", "🏞️", ["Ailəvi istirahət mərkəzləri", "Dəniz kənarı zonalar", "Piknik zonaları"]),
      s("Hovuz və saun", "🏊", ["Hovuzlar", "Saunalar", "Hamamlar", "SPA mərkəzləri"]),
      s("Tur və səyahət", "✈️", ["Xarici turlar", "Daxili turlar", "Aviabilet və viza", "Ekskursiyalar"]),
      s("Konfrans və iş otağı", "🏢", ["Konfrans zalları", "Kovorkinq", "Tədris otaqları"]),
    ],
  },
  {
    name: "Ərzaq və qida məhsulları", icon: "🥦", subs: [
      s("Meyvə və tərəvəz", "🍎", ["Meyvələr", "Tərəvəzlər", "Göyərti", "Quru meyvələr"]),
      s("Ət, quş və balıq", "🍖", ["Mal əti", "Quzu əti", "Toyuq və hinduşka", "Balıq və dəniz məhsulları", "Kolbasa məmulatları"]),
      s("Süd məhsulları və yumurta", "🥛", ["Süd", "Pendir", "Qatıq və ayran", "Yağ və xama", "Yumurta"]),
      s("Çörək və şirniyyat", "🍞", ["Çörək məmulatları", "Tort və pirojnalar", "Milli şirniyyat", "Şokolad və konfetlər"]),
      s("Bal, mürəbbə və konserv", "🍯", ["Təbii bal", "Mürəbbələr", "Turşular", "Konservlər"]),
      s("İçkilər", "🧃", ["Su", "Meyvə şirələri", "Qazlı içkilər", "Çay və qəhvə", "Enerji içkiləri"]),
      s("Bakkal (un, düyü, yağ)", "🌾", ["Un və yarma", "Düyü", "Makaron", "Bitki yağları", "Şəkər və duz"]),
      s("Ədviyyat və souslar", "🧂", ["Ədviyyatlar", "Souslar", "Sirkə və marinadlar"]),
      s("Kənd (bio) məhsulları", "🧺", ["Kənd yumurtası", "Kənd yağı və pendiri", "Bio meyvə-tərəvəz", "Ev şəraitində hazırlananlar"]),
    ],
  },
  {
    name: "Digər", icon: "📦", subs: [
      s("Müxtəlif", "📦"),
      s("Pulsuz / Bağışlanır", "🎁"),
      s("İtmiş və tapılmış", "🔎"),
    ],
  },
];

// Hər kateqoriyada "Digər" alt-seçimi olsun (istifadəçi tələbi) — uyğun alt yoxdursa seçilir.
for (const c of CATEGORIES) {
  if (!c.subs.some((x) => x.name === "Digər")) c.subs.push(s("Digər", "➕"));
}

export const SEP = " › ";
export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export const getIcon = (main: string): string => getCat(main)?.icon || "📦";
// Alt kateqoriyanın öz ikonu (yoxdursa əsas kateqoriyanın ikonu).
export function getSubIcon(main: string, sub: string): string {
  const c = getCat(main);
  return c?.subs.find((x) => x.name === sub)?.icon || c?.icon || "📦";
}

export function getCat(name: string): MainCategory | undefined {
  return CATEGORIES.find((c) => c.name === name);
}
// Alt kateqoriya obyekti (3-cü səviyyəyə çatmaq üçün).
export function getSubCat(main: string, sub: string): SubCategory | undefined {
  return getCat(main)?.subs.find((x) => x.name === sub);
}
// Alt kateqoriya adlarını (string massivi) qaytarır — köhnə istifadəçilərlə uyğun.
export function getSubs(main: string): string[] {
  return (getCat(main)?.subs || []).map((x) => x.name);
}
// 3-cü səviyyə (alt-alt) adları — yoxdursa boş massiv.
export function getLeaves(main: string, sub: string): string[] {
  return (getSubCat(main, sub)?.subs || []).map((x) => x.name);
}
export function hasLeaves(main: string, sub: string): boolean {
  return getLeaves(main, sub).length > 0;
}
// "Ana › Alt › Alt-alt" (boş səviyyələr atılır).
export function buildCat(main: string, sub: string, leaf?: string): string {
  return [main, sub, leaf].filter(Boolean).join(SEP);
}
export function parseCat(value: string | undefined | null): { main: string; sub: string; leaf: string } {
  if (!value) return { main: "", sub: "", leaf: "" };
  const parts = value.split(SEP);
  return { main: parts[0] || "", sub: parts[1] || "", leaf: parts[2] || "" };
}
// Bu kateqoriya avtomobillə bağlıdırmı (marka/model/yanacaq/il sahələri üçün)?
export function isVehicleCat(main: string): boolean {
  return !!getCat(main)?.vehicle;
}
export function isServiceCat(main: string): boolean {
  return !!getCat(main)?.service;
}
// Mühərriksiz alt-kateqoriyalar — yanacaq/il/model/forVehicle sahələri bunlarda mənasızdır.
const NON_MOTOR_SUBS = new Set(["Təkər, şin və disklər", "Qoşqu və treyler", "Avtokimya və qulluq vasitələri"]);
// Bu alt-kateqoriya mühərrikli nəqliyyat/avto hissəsidirmi (model/yanacaq/il sahələri üçün)?
export function isVehicleSub(main: string, sub: string): boolean {
  return isVehicleCat(main) && !NON_MOTOR_SUBS.has(sub);
}

// ----- Elan formasında hər kateqoriyaya uyğun sahələr -----
// Yalnız uyğun gələn sahələr göstərilir (məs. Daşınmaz əmlakda marka/model çıxmır).
export type ListingField = "brand" | "country" | "condition" | "stock" | "model" | "year" | "fuel" | "forVehicle" | "unit";

const CATEGORY_FIELDS: Record<string, ListingField[]> = {
  "Nəqliyyat": ["brand", "model", "year", "fuel", "condition"],
  "Avtomobil ehtiyat hissələri": ["brand", "country", "forVehicle", "condition", "stock", "unit"],
  "Daşınmaz əmlak": [],
  "Elektronika": ["brand", "country", "condition", "stock"],
  "Məişət texnikası": ["brand", "country", "condition", "stock"],
  "Ev və bağ": ["condition", "stock"],
  "Tikinti və təmir": ["brand", "condition", "stock", "unit"],
  "Geyim və aksesuar": ["brand", "condition", "stock"],
  "Gözəllik və sağlamlıq": ["brand", "condition", "stock"],
  "Uşaq aləmi": ["brand", "condition", "stock"],
  "Hobbi və idman": ["brand", "condition", "stock"],
  "Heyvanlar": ["stock"],
  "İş elanları": [],
  "Kənd təsərrüfatı": ["condition", "stock", "unit"],
  "Xidmətlər": [],
  "Turizm, istirahət və məkan": [],
  "Ərzaq və qida məhsulları": ["stock", "unit"],
  "Digər": ["condition", "stock"],
};
// Bu əsas kateqoriyada elan formasında hansı sahələr göstərilməlidir?
export function getListingFields(main: string): ListingField[] {
  return CATEGORY_FIELDS[main] ?? ["brand", "condition", "stock"];
}

// ----- Kateqoriyaya xüsusi əlavə sahələr (tap.az üslubu) -----
export interface AttrDef {
  key: string;
  label: string;
  type: "select" | "number" | "text";
  options?: string[];
  suffix?: string; // məs. "m²", "km"
}

const CATEGORY_ATTRS: Record<string, AttrDef[]> = {
  "Daşınmaz əmlak": [
    { key: "estateType", label: "Əmlakın tipi", type: "select", options: ["Mənzil", "Həyət evi / Villa", "Ofis", "Torpaq", "Obyekt", "Qaraj"] },
    { key: "dealType", label: "Əməliyyat", type: "select", options: ["Satış", "Aylıq kirayə", "Günlük kirayə"] },
    { key: "rooms", label: "Otaq sayı", type: "select", options: ["1", "2", "3", "4", "5", "6+"] },
    { key: "area", label: "Sahə", type: "number", suffix: "m²" },
    { key: "floor", label: "Mərtəbə", type: "number" },
    { key: "totalFloors", label: "Binanın mərtəbə sayı", type: "number" },
    { key: "deed", label: "Sənəd", type: "select", options: ["Kupça", "Çıxarış", "Müqavilə ilə"] },
    { key: "repair", label: "Təmir", type: "select", options: ["Təmirli", "Orta", "Təmirsiz"] },
  ],
  "Nəqliyyat": [
    { key: "bodyType", label: "Ban növü", type: "select", options: ["Sedan", "Hetçbek", "Universal", "Offroader / SUV", "Kupe", "Pikap", "Mikroavtobus", "Furqon", "Motosiklet"] },
    { key: "mileage", label: "Yürüş", type: "number", suffix: "km" },
    { key: "transmission", label: "Sürətlər qutusu", type: "select", options: ["Avtomat", "Mexaniki", "Robot", "Variator"] },
    { key: "engine", label: "Mühərrik həcmi", type: "number", suffix: "L" },
    { key: "color", label: "Rəng", type: "text" },
  ],
  "Elektronika": [
    { key: "memory", label: "Yaddaş", type: "select", options: ["16 GB", "32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB"] },
    { key: "color", label: "Rəng", type: "text" },
    { key: "warranty", label: "Zəmanət", type: "select", options: ["Var", "Yoxdur"] },
  ],
  "Məişət texnikası": [
    { key: "color", label: "Rəng", type: "text" },
    { key: "warranty", label: "Zəmanət", type: "select", options: ["Var", "Yoxdur"] },
  ],
  "Geyim və aksesuar": [
    { key: "size", label: "Ölçü", type: "select", options: ["XS", "S", "M", "L", "XL", "XXL", "3XL"] },
    { key: "color", label: "Rəng", type: "text" },
  ],
  "Uşaq aləmi": [
    { key: "ageGroup", label: "Yaş qrupu", type: "select", options: ["0-1 yaş", "1-3 yaş", "3-6 yaş", "6-12 yaş", "12+ yaş"] },
  ],
  "Heyvanlar": [
    { key: "petKind", label: "Növ", type: "text" },
    { key: "petAge", label: "Yaş", type: "text" },
  ],
  "İş elanları": [
    { key: "salary", label: "Maaş", type: "text" },
    { key: "schedule", label: "İş qrafiki", type: "select", options: ["Tam ştat", "Yarım ştat", "Növbəli", "Uzaqdan"] },
    { key: "experience", label: "Təcrübə", type: "select", options: ["Təcrübəsiz", "1 ilə qədər", "1-3 il", "3-5 il", "5+ il"] },
  ],
  "Kənd təsərrüfatı": [
    { key: "amount", label: "Miqdar", type: "text" },
  ],
};
export function getCategoryAttrs(main: string): AttrDef[] {
  return CATEGORY_ATTRS[main] ?? [];
}

// ----- URL slug-ları (tap.az üslubu: /elanlar/elektronika/audio-video) -----
const AZ_MAP: Record<string, string> = {
  ə: "e", ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u",
};
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .split("")
    .map((ch) => AZ_MAP[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
// ───────── Köhnə kateqoriya adları (uyğunluq üçün) ─────────
// Taksonomiya təmizlənəndə bəzi alt kateqoriyalar birləşdirildi/adı dəqiqləşdirildi.
// Köhnə linklər (bookmark, Google) və köhnə elanlar itməsin deyə xəritə saxlanılır.
// Bazadakı köhnə dəyərləri yeniləmək üçün: backend/prisma/migrate-categories.ts
export const LEGACY_CAT_MAP: Record<string, string> = {
  "Nəqliyyat › Təkər və disklər": "Avtomobil ehtiyat hissələri › Təkər, şin və disklər",
  "Avtomobil ehtiyat hissələri › Şinlər və disklər": "Avtomobil ehtiyat hissələri › Təkər, şin və disklər",
  "Avtomobil ehtiyat hissələri › İşıqlandırma": "Avtomobil ehtiyat hissələri › Avtomobil işıqlandırması",
  "Avtomobil ehtiyat hissələri › Elektrik və elektronika": "Avtomobil ehtiyat hissələri › Avtoelektrik və elektronika",
  "Avtomobil ehtiyat hissələri › Audio və multimedia": "Avtomobil ehtiyat hissələri › Avto audio və multimedia",
  "Ev və bağ › İşıqlandırma": "Ev və bağ › İşıqlandırma və lampalar",
  "Daşınmaz əmlak › Evlər və villalar": "Daşınmaz əmlak › Həyət evi, villa və bağ evləri",
  "Daşınmaz əmlak › Həyət evləri və bağ": "Daşınmaz əmlak › Həyət evi, villa və bağ evləri",
  "Elektronika › Komponentlər və monitorlar": "Elektronika › Komponentlər və periferiya",
  "Geyim və aksesuar › Uşaq geyimi": "Uşaq aləmi › Uşaq geyimi",
  "Turizm, istirahət və məkan › Bağ evi və villa (günlük)": "Turizm, istirahət və məkan › Villa və bağ evi (bron)",
  "Kənd təsərrüfatı › Toxum və bitkilər": "Kənd təsərrüfatı › Toxum və şitillər",
};
// Köhnə dəyəri (varsa) yeni yola çevirir — yoxdursa olduğu kimi qaytarır.
export function normalizeCat(value: string | undefined | null): string {
  if (!value) return "";
  return LEGACY_CAT_MAP[value] || value;
}

// Kateqoriya stringi ("Ana › Alt › Alt-alt") → slug massivi.
export function catToSlugs(cat: string): string[] {
  const { main, sub, leaf } = parseCat(cat);
  return [main && slugify(main), sub && slugify(sub), leaf && slugify(leaf)].filter(Boolean) as string[];
}
// Slug massivi → kateqoriya stringi (yoxdursa ""). 3 səviyyəyə qədər.
export function slugsToCat(slugs: string[]): string {
  if (!slugs.length) return "";
  // Köhnə link? (məs. /elanlar/neqliyyat/teker-ve-diskler) → yeni yola yönləndir.
  const legacy = LEGACY_SLUG_MAP[slugs.join("/")];
  if (legacy) return legacy;
  const c = CATEGORIES.find((x) => slugify(x.name) === slugs[0]);
  if (!c) return "";
  if (!slugs[1]) return c.name;
  const sub = c.subs.find((su) => slugify(su.name) === slugs[1]);
  if (!sub) return c.name;
  if (!slugs[2]) return buildCat(c.name, sub.name);
  const leaf = (sub.subs || []).find((l) => slugify(l.name) === slugs[2]);
  return leaf ? buildCat(c.name, sub.name, leaf.name) : buildCat(c.name, sub.name);
}

// Köhnə yolların slug açarları — slugsToCat üçün (slugify aşağıda təyin olunub,
// funksiya olduğu üçün hoist olunur).
const LEGACY_SLUG_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_CAT_MAP).map(([oldPath, newPath]) => [
    oldPath.split(SEP).map(slugify).join("/"),
    newPath,
  ]),
);
