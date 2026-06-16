export type TaxonomySub = { name: string; parts: string[] };
export type TaxonomyMain = { name: string; subs: TaxonomySub[] };

// ============================================================================
// Ümumi marketplace taksonomiyası (Tap.az tipli) — 3 səviyyə: əsas › alt › yarpaq.
// Mövcud avtomobil ehtiyat hissələri "Avtomobil ehtiyat hissələri" və "Nəqliyyat"
// kateqoriyaları altında tam saxlanılıb.
// ============================================================================

export const TAXONOMY: TaxonomyMain[] = [
  // ---------------------- NƏQLİYYAT ----------------------
  {
    name: "Nəqliyyat",
    subs: [
      { name: "Minik avtomobilləri", parts: ["Sedan", "Universal", "Hetçbek", "Krossover / SUV", "Kupe", "Kabriolet", "Pikap", "Elektromobil"] },
      { name: "Motosiklet və mopedlər", parts: ["Motosiklet", "Moped / Skuter", "Kvadrosikl (ATV)", "Mototsikl ehtiyat hissələri"] },
      { name: "Yük və kommersiya", parts: ["Yük maşını", "Furqon", "Avtobus / Mikroavtobus", "Yarımqoşqu / Treyler"] },
      { name: "Tikinti və xüsusi texnika", parts: ["Traktor", "Ekskavator", "Yükləyici", "Kran"] },
      { name: "Su nəqliyyatı", parts: ["Qayıq", "Kater", "Jet-ski"] },
      { name: "Şinlər və disklər", parts: ["Yay şinləri", "Qış şinləri", "Ərinti disklər", "Dəmir disklər"] },
    ],
  },

  // ---------------------- AVTOMOBİL EHTİYAT HİSSƏLƏRİ ----------------------
  // (Köhnə avto taksonomiyası tam burada saxlanılıb.)
  {
    name: "Avtomobil ehtiyat hissələri",
    subs: [
      { name: "Mühərrik hissələri", parts: ["Mühərrik (motor)", "Turbin", "İnjektor (forsunka)", "Yanacaq nasosu", "Yanacaq reykası", "Qaz kələbəyi (drossel)", "Lambda zond", "EGR klapanı", "MAF sensoru", "Krank mili sensoru", "Paylayıcı val sensoru", "Karter", "Mühərrik yastıqları", "Şam", "Katuşka"] },
      { name: "Transmissiya hissələri", parts: ["Sürətlər qutusu (karobka)", "Debriyaj", "Diferensial", "Reduktor", "Kardan valı", "Yarımox", "Şrus (qranat)"] },
      { name: "Asqı və sükan hissələri", parts: ["Amortizatorlar", "Yaylar", "Sükan reykası", "Sükan nasosu", "Sükan ucluqları", "Şarovoy", "Stabilizator qolları", "Stupitsa", "Podşipniklər"] },
      { name: "Əyləc sistemi hissələri", parts: ["Əyləc diskləri", "Əyləc bəndləri (kolodkalar)", "Tormoz silindri", "ABS bloku", "ABS sensorları"] },
      { name: "Elektrik və elektronika", parts: ["Generator", "Starter", "Akkumulyator", "ECU", "Sığorta qutusu", "Relelər", "Elektrik naqilləri"] },
      { name: "Filtrlər və servis hissələri", parts: ["Hava filtri", "Yağ filtri", "Yanacaq filtri", "Salon filtri", "Mühərrik yağı", "Antifriz", "Əyləc mayesi"] },
      { name: "Soyutma və kondisioner", parts: ["Radiator", "Kondisioner kompressoru", "Kondisioner radiatoru", "Radiator çərçivəsi", "Termostat", "Su nasosu"] },
      { name: "Kuzov hissələri", parts: ["Kapot", "Qapılar", "Baqaj qapağı", "Bamper", "Qanadlar (krılo)", "Eşiklər", "Ön panel (televizor)", "Spoyler", "Dam relsləri"] },
      { name: "İşıqlandırma", parts: ["Faralar", "Arxa fənərlər", "Duman faraları", "Stop işıqları", "Faraların korpusu"] },
      { name: "Şüşə və güzgü", parts: ["Ön şüşə", "Yan şüşə", "Arxa şüşə", "Güzgülər", "Salon güzgüsü", "Sileceklər", "Şüşəqaldıran mexanizmləri"] },
      { name: "Salon hissələri", parts: ["Oturacaqlar", "Təhlükəsizlik kəmərləri", "Hava yastıqları", "Torpedo", "Cihazlar paneli", "Qapı kartları", "Döşəmə örtüyü"] },
      { name: "Yanacaq sistemi", parts: ["Yanacaq çəni", "Çən qapağı"] },
      { name: "Multimedia və aksesuar", parts: ["Multimedia sistemi", "Dinamiklər", "Videoqeydiyyatçı", "Park kamerası", "Park sensorları", "Siqnalizasiya", "Oturacaq üzlükləri", "Ayaqaltılar", "Kompressorlar"] },
    ],
  },

  // ---------------------- DAŞINMAZ ƏMLAK ----------------------
  {
    name: "Daşınmaz əmlak",
    subs: [
      { name: "Mənzillər", parts: ["Yeni tikili - satılır", "Köhnə tikili - satılır", "Kirayə - aylıq", "Kirayə - günlük"] },
      { name: "Evlər və villalar", parts: ["Həyət evi - satılır", "Bağ evi - satılır", "Villa - satılır", "Kirayə ev"] },
      { name: "Torpaq sahələri", parts: ["Tikinti üçün", "Kənd təsərrüfatı", "Bağ sahəsi"] },
      { name: "Ofis və obyektlər", parts: ["Ofis", "Mağaza / Obyekt", "Anbar", "Sex / İstehsalat"] },
      { name: "Qaraj və yer", parts: ["Qaraj", "Parking yeri"] },
    ],
  },

  // ---------------------- ELEKTRONİKA ----------------------
  {
    name: "Elektronika",
    subs: [
      { name: "Telefonlar və aksesuarlar", parts: ["Smartfonlar", "Düyməli telefonlar", "Qoruyucu / Çexol", "Adapter / Kabel", "Power bank", "Qulaqlıq"] },
      { name: "Kompüter və noutbuk", parts: ["Noutbuk", "Stasionar kompüter", "Monitor", "Komputer hissələri", "Klaviatura / Siçan", "Printer / Skaner"] },
      { name: "TV, audio, video", parts: ["Televizor", "Səs sistemi", "Layihələndirici (proyektor)", "Media pleyer"] },
      { name: "Foto və video", parts: ["Fotoaparat", "Videokamera", "Linzalar", "Dron"] },
      { name: "Oyun və konsollar", parts: ["PlayStation", "Xbox", "Nintendo", "Oyunlar / Disklər"] },
      { name: "Smart cihazlar", parts: ["Smart saat", "Fitnes bilərzik", "Planşet", "Smart-ev cihazları"] },
    ],
  },

  // ---------------------- MƏİŞƏT TEXNİKASI ----------------------
  {
    name: "Məişət texnikası",
    subs: [
      { name: "İri texnika", parts: ["Soyuducu", "Paltaryuyan", "Qabyuyan", "Plitə / Soba", "Dondurucu"] },
      { name: "Mətbəx texnikası", parts: ["Mikrodalğalı soba", "Blender", "Çay dəmləyən", "Qəhvə maşını", "Ət maşını", "Toster"] },
      { name: "İqlim texnikası", parts: ["Kondisioner", "Ventilyator", "Qızdırıcı", "Nəmləndirici"] },
      { name: "Təmizlik texnikası", parts: ["Tozsoran", "Buxar təmizləyici", "Ütü"] },
    ],
  },

  // ---------------------- EV VƏ BAĞ ----------------------
  {
    name: "Ev və bağ",
    subs: [
      { name: "Mebel", parts: ["Divan / Künc", "Çarpayı", "Şkaf", "Masa və stullar", "Mətbəx mebeli", "Uşaq mebeli"] },
      { name: "Ev dekoru", parts: ["Xalça", "Pərdə", "Güzgü", "Tablo", "İşıqlandırma / Lyustra"] },
      { name: "Qab-qacaq və mətbəx", parts: ["Qablar dəsti", "Bıçaqlar", "Saxlama qabları"] },
      { name: "Bağ və tərəvəz", parts: ["Bağ alətləri", "Manqal", "Bağ mebeli", "Toxum və gübrə"] },
      { name: "Tekstil", parts: ["Yorğan-döşək", "Dəsmal", "Süfrə"] },
    ],
  },

  // ---------------------- TİKİNTİ VƏ TƏMİR ----------------------
  {
    name: "Tikinti və təmir",
    subs: [
      { name: "İnşaat materialları", parts: ["Sement / Qum", "Kərpic / Blok", "Boya / Lak", "İzolyasiya", "Gips / Mərmər"] },
      { name: "Santexnika", parts: ["Kran / Smesitel", "Unitaz", "Vanna / Duş", "Borular / Fitinqlər", "Su qızdırıcı"] },
      { name: "Elektrik malları", parts: ["Kabel / Naqil", "Avtomat / Şit", "Rozetka / Açar", "Lampa"] },
      { name: "Alət və avadanlıq", parts: ["Əl alətləri", "Elektrik alətləri", "Şurupovert / Drel", "Bolqarka", "Qaynaq aparatı"] },
      { name: "Qapı və pəncərə", parts: ["Qapılar", "Plastik pəncərələr", "Qıfıl və furnitura"] },
    ],
  },

  // ---------------------- GEYİM VƏ AKSESUAR ----------------------
  {
    name: "Geyim və aksesuar",
    subs: [
      { name: "Qadın geyimi", parts: ["Üst geyim", "Don / Yubka", "Şalvar", "Gödəkçə / Palto", "Alt geyim"] },
      { name: "Kişi geyimi", parts: ["Köynək", "Şalvar", "Gödəkçə / Kostyum", "Üst geyim"] },
      { name: "Ayaqqabı", parts: ["Qadın ayaqqabısı", "Kişi ayaqqabısı", "İdman ayaqqabısı"] },
      { name: "Çanta və aksesuar", parts: ["Çanta", "Pul kisəsi", "Kəmər", "Eynək", "Şərf / Şlyapa"] },
      { name: "Saat və zinət", parts: ["Qol saatı", "Qızıl / Gümüş", "Bijuteriya"] },
    ],
  },

  // ---------------------- GÖZƏLLİK VƏ SAĞLAMLIQ ----------------------
  {
    name: "Gözəllik və sağlamlıq",
    subs: [
      { name: "Kosmetika", parts: ["Üz baxımı", "Makiyaj", "Saç baxımı", "Manikür ləvazimatı"] },
      { name: "Ətriyyat", parts: ["Qadın ətirləri", "Kişi ətirləri"] },
      { name: "Sağlamlıq", parts: ["Tibbi cihazlar", "Vitaminlər", "Ortopedik məhsullar"] },
    ],
  },

  // ---------------------- UŞAQ ALƏMİ ----------------------
  {
    name: "Uşaq aləmi",
    subs: [
      { name: "Uşaq geyimi", parts: ["Yenidoğulmuş", "Oğlan geyimi", "Qız geyimi", "Uşaq ayaqqabısı"] },
      { name: "Oyuncaqlar", parts: ["İnkişafedici oyuncaqlar", "Konstruktor", "Kuklalar", "Maşınlar"] },
      { name: "Uşaq əşyaları", parts: ["Uşaq arabası", "Uşaq oturacağı (avto)", "Beşik", "Qidalandırma"] },
      { name: "Məktəbli", parts: ["Çanta", "Dəftərxana", "Forma"] },
    ],
  },

  // ---------------------- HOBBİ, İDMAN, İSTİRAHƏT ----------------------
  {
    name: "Hobbi və idman",
    subs: [
      { name: "İdman", parts: ["Trenajor", "Fitnes ləvazimatı", "Velosiped", "Komandalı idman", "Su idmanı"] },
      { name: "Musiqi alətləri", parts: ["Gitara", "Pianino / Sintezator", "Nəfəs alətləri", "Studiya avadanlığı"] },
      { name: "Kitablar və media", parts: ["Bədii ədəbiyyat", "Dərslik", "Jurnal / Komiks"] },
      { name: "Kolleksiya və əntiq", parts: ["Antikvar", "Pul / Marka", "Kolleksiya əşyaları"] },
      { name: "Ov və balıqçılıq", parts: ["Ov ləvazimatı", "Balıqçılıq", "Turizm / Kemp"] },
    ],
  },

  // ---------------------- HEYVANLAR ----------------------
  {
    name: "Heyvanlar",
    subs: [
      { name: "Ev heyvanları", parts: ["İt", "Pişik", "Quş", "Akvarium balıqları", "Gəmiricilər"] },
      { name: "Heyvan ləvazimatı", parts: ["Yem", "Aksesuar", "Qəfəs / Akvarium"] },
      { name: "Kənd təsərrüfatı heyvanları", parts: ["Mal-qara", "Quşçuluq", "Arıçılıq"] },
    ],
  },

  // ---------------------- İŞ VƏ BİZNES ----------------------
  {
    name: "İş elanları",
    subs: [
      { name: "Vakansiyalar", parts: ["Satış / Ticarət", "İnşaat", "IT / Texnologiya", "Nəqliyyat / Sürücü", "Xidmət sektoru", "Mühasibatlıq", "Tibb", "Təhsil"] },
      { name: "İş axtarıram (CV)", parts: ["Tam ştat", "Yarım ştat", "Frilans"] },
      { name: "Biznes və avadanlıq", parts: ["Hazır biznes", "Kommersiya avadanlığı", "Tərəfdaşlıq"] },
    ],
  },

  // ---------------------- XİDMƏTLƏR ----------------------
  {
    name: "Xidmətlər",
    subs: [
      { name: "Avto xidmət", parts: ["Avto təmir / Usta", "Şin montajı", "Avto yuma", "Diaqnostika", "Evakuator"] },
      { name: "Təmir və tikinti", parts: ["Mənzil təmiri", "Santexnik", "Elektrik", "Usta / Dülgər", "Kafel / Mərmər"] },
      { name: "Məişət texnikası təmiri", parts: ["Soyuducu təmiri", "Paltaryuyan təmiri", "Kondisioner servisi", "Telefon / Komputer təmiri"] },
      { name: "Gözəllik xidmətləri", parts: ["Bərbər / Saç", "Manikür / Pedikür", "Makiyaj", "Kosmetologiya"] },
      { name: "Təhsil və repetitor", parts: ["Repetitor", "Xarici dil", "Musiqi dərsi", "Avtoməktəb"] },
      { name: "Nəqliyyat və daşınma", parts: ["Yük daşınması", "Köçürülmə", "Kuryer", "Taksi / Transfer"] },
      { name: "IT və dizayn", parts: ["Sayt / Proqram", "Qrafik dizayn", "SMM / Reklam", "Foto / Video"] },
      { name: "Tədbir xidmətləri", parts: ["Toy / Mərasim", "Foto-video çəkiliş", "Aşpaz / Catering", "Musiqi / DJ"] },
      { name: "Hüquq və maliyyə", parts: ["Hüquqi xidmət", "Mühasibatlıq", "Tərcümə"] },
      { name: "Təmizlik", parts: ["Mənzil təmizliyi", "Ofis təmizliyi", "Kimyəvi təmizləmə"] },
    ],
  },

  // ---------------------- KƏND TƏSƏRRÜFATI ----------------------
  {
    name: "Kənd təsərrüfatı",
    subs: [
      { name: "Texnika", parts: ["Traktor", "Kotan / Aqreqat", "Suvarma sistemi"] },
      { name: "Bitki və toxum", parts: ["Toxum", "Tinglər", "Gübrə"] },
      { name: "Məhsullar", parts: ["Meyvə-tərəvəz", "Bal", "Süd məhsulları"] },
    ],
  },

  // ---------------------- DİGƏR ----------------------
  {
    name: "Digər",
    subs: [
      { name: "Pulsuz / Bağışlanır", parts: ["Pulsuz əşyalar"] },
      { name: "Müxtəlif", parts: ["Digər"] },
    ],
  },
];

export const TAXONOMY_SEPARATOR = " › ";

export function buildCategoryPath(main: string, sub: string, leaf: string): string {
  return [main, sub, leaf].filter(Boolean).join(TAXONOMY_SEPARATOR);
}

export function parseCategoryPath(value: string | undefined | null): { main: string; sub: string; leaf: string } {
  if (!value) return { main: "", sub: "", leaf: "" };
  const parts = value.split(TAXONOMY_SEPARATOR);
  return { main: parts[0] || "", sub: parts[1] || "", leaf: parts[2] || "" };
}

export function getMainCategoryNames(): string[] {
  return TAXONOMY.map((m) => m.name);
}

export function getSubsFor(main: string): TaxonomySub[] {
  return TAXONOMY.find((m) => m.name === main)?.subs || [];
}

export function getPartsFor(main: string, sub: string): string[] {
  return getSubsFor(main).find((s) => s.name === sub)?.parts || [];
}

// Bu kateqoriya avtomobil/nəqliyyatla bağlıdırmı? (avto-spesifik sahələri —
// marka/model/yanacaq/forVehicle — yalnız belə kateqoriyalarda göstərmək üçün.)
export function isVehicleCategory(main: string): boolean {
  return main === "Nəqliyyat" || main === "Avtomobil ehtiyat hissələri";
}
