// Ümumi marketplace taksonomiyası — sayt hər şeyi satır (təkcə avto deyil).
// Hər əsas kateqoriyanın və hər alt kateqoriyanın öz ikonu var (bir-birindən fərqli).
// `vehicle` = avtomobillə bağlıdır (yalnız bu kateqoriyalarda marka/model/yanacaq/il sahələri çıxır).
// `service` = tip avtomatik SERVICE olsun.

export interface SubCategory {
  name: string;
  icon: string;
}
export interface MainCategory {
  name: string;
  icon: string; // emoji ikon (kateqoriya kartları üçün)
  subs: SubCategory[];
  vehicle?: boolean;
  service?: boolean;
  bookable?: boolean; // bron/rezervasiya kateqoriyası (restoran, otel, məkan...) — elan yaradanda bron seçimi təklif olunur
}

const s = (name: string, icon: string): SubCategory => ({ name, icon });

export const CATEGORIES: MainCategory[] = [
  {
    name: "Nəqliyyat", icon: "🚗", vehicle: true, subs: [
      s("Minik avtomobilləri", "🚙"),
      s("Motosiklet və mopedlər", "🏍️"),
      s("Yük maşınları", "🚚"),
      s("Avtobus və mikroavtobus", "🚌"),
      s("Tikinti və xüsusi texnika", "🚜"),
      s("Su nəqliyyatı", "⛵"),
      s("Qoşqu və treyler", "🚛"),
      s("Təkər və disklər", "🛞"),
    ],
  },
  {
    name: "Avtomobil ehtiyat hissələri", icon: "⚙️", vehicle: true, subs: [
      s("Mühərrik hissələri", "🔧"),
      s("Transmissiya", "⚙️"),
      s("Asqı və sükan", "🛠️"),
      s("Əyləc sistemi", "🛑"),
      s("Elektrik və elektronika", "🔌"),
      s("Filtrlər və yağlar", "🛢️"),
      s("Soyutma və kondisioner", "❄️"),
      s("Kuzov hissələri", "🚘"),
      s("İşıqlandırma", "💡"),
      s("Şüşə və güzgülər", "🪟"),
      s("Salon və aksesuar", "🪑"),
      s("Akkumulyator", "🔋"),
      s("Audio və multimedia", "🔊"),
      s("Şinlər və disklər", "🛞"),
    ],
  },
  {
    name: "Daşınmaz əmlak", icon: "🏠", subs: [
      s("Mənzillər (yeni tikili)", "🏢"),
      s("Mənzillər (köhnə tikili)", "🏬"),
      s("Evlər və villalar", "🏡"),
      s("Həyət evləri və bağ", "🏘️"),
      s("Torpaq sahələri", "🏞️"),
      s("Ofislər", "🏤"),
      s("Obyekt və mağazalar", "🏪"),
      s("Qaraj və anbar", "🏚️"),
      s("Günlük kirayə", "🛏️"),
      s("Xaricdə əmlak", "🌍"),
    ],
  },
  {
    name: "Elektronika", icon: "📱", subs: [
      s("Telefonlar", "📱"),
      s("Planşetlər", "📲"),
      s("Noutbuklar", "💻"),
      s("Kompüterlər", "🖥️"),
      s("Komponentlər və monitorlar", "🖲️"),
      s("TV və proyektorlar", "📺"),
      s("Audio (qulaqlıq, dinamik)", "🎧"),
      s("Foto və video kameralar", "📷"),
      s("Oyun konsolları", "🎮"),
      s("Smart saat və qurğular", "⌚"),
      s("Şəbəkə avadanlığı", "📡"),
      s("Aksesuar və kabellər", "🔌"),
    ],
  },
  {
    name: "Məişət texnikası", icon: "🧺", subs: [
      s("Soyuducular", "❄️"),
      s("Paltaryuyan maşınlar", "🧼"),
      s("Qabyuyan maşınlar", "🍽️"),
      s("Sobalar və plitələr", "🔥"),
      s("Mikrodalğalı sobalar", "♨️"),
      s("Kondisioner və ventilyator", "🌬️"),
      s("Tozsoranlar", "🧹"),
      s("Mətbəx texnikası", "☕"),
      s("Ütü və tikiş maşınları", "🧵"),
      s("Su qızdırıcı və qızdırıcılar", "🔆"),
    ],
  },
  {
    name: "Ev və bağ", icon: "🛋️", subs: [
      s("Mebel", "🛋️"),
      s("Yataq və mətbəx mebeli", "🛏️"),
      s("İşıqlandırma", "💡"),
      s("Xalça və tekstil", "🧶"),
      s("Ev dekoru və aksesuar", "🖼️"),
      s("Qab-qacaq", "🍴"),
      s("Bağ və həyət", "🌷"),
      s("Bitki və güllər", "🪴"),
      s("Bağ alətləri", "🪓"),
      s("Təmizlik ləvazimatı", "🧴"),
    ],
  },
  {
    name: "Tikinti və təmir", icon: "🧱", subs: [
      s("İnşaat materialları", "🧱"),
      s("Sement, qum, kərpic", "🪨"),
      s("Santexnika", "🚿"),
      s("Elektrik malları", "🔌"),
      s("Alət və avadanlıq", "🛠️"),
      s("Qapı və pəncərə", "🚪"),
      s("Boya və laklar", "🎨"),
      s("İzolyasiya və dam", "🏗️"),
      s("Furnitura və bərkidici", "🔩"),
      s("Kafel və döşəmə", "🟫"),
    ],
  },
  {
    name: "Geyim və aksesuar", icon: "👕", subs: [
      s("Qadın geyimi", "👗"),
      s("Kişi geyimi", "👔"),
      s("Uşaq geyimi", "👶"),
      s("Ayaqqabı", "👟"),
      s("Çantalar", "👜"),
      s("Saatlar", "⌚"),
      s("Zinət əşyaları", "💍"),
      s("Eynək və aksesuar", "🕶️"),
      s("İdman geyimi", "🩳"),
      s("Üst geyim (gödəkçə, palto)", "🧥"),
    ],
  },
  {
    name: "Gözəllik və sağlamlıq", icon: "💄", subs: [
      s("Kosmetika", "💄"),
      s("Ətriyyat", "🌸"),
      s("Saç baxımı", "💇"),
      s("Dəri baxımı", "🧴"),
      s("Tibbi mallar", "💊"),
      s("Vitamin və qida əlavələri", "💉"),
      s("Manikür və pedikür", "💅"),
      s("Sağlamlıq cihazları", "🩺"),
    ],
  },
  {
    name: "Uşaq aləmi", icon: "🧸", subs: [
      s("Uşaq geyimi", "👶"),
      s("Oyuncaqlar", "🧸"),
      s("Uşaq arabaları", "🍼"),
      s("Avtokreslolar", "💺"),
      s("Uşaq mebeli", "🪑"),
      s("Məktəbli ləvazimatı", "🎒"),
      s("Körpə əşyaları", "🧷"),
    ],
  },
  {
    name: "Hobbi və idman", icon: "⚽", subs: [
      s("İdman və fitnes", "🏋️"),
      s("Velosipedlər", "🚲"),
      s("Musiqi alətləri", "🎸"),
      s("Kitablar", "📚"),
      s("Kolleksiya və antikvariat", "🪙"),
      s("Ov və balıqçılıq", "🎣"),
      s("Səyahət və kemp", "⛺"),
      s("Biletlər", "🎟️"),
      s("Əl işləri və sənət", "✂️"),
      s("Oyunlar (lövhə, puzzle)", "🎲"),
    ],
  },
  {
    name: "Heyvanlar", icon: "🐾", subs: [
      s("İtlər", "🐕"),
      s("Pişiklər", "🐈"),
      s("Quşlar", "🦜"),
      s("Akvarium və balıqlar", "🐠"),
      s("Kənd təsərrüfatı heyvanları", "🐄"),
      s("Atlar", "🐎"),
      s("Yem və ləvazimat", "🦴"),
    ],
  },
  {
    name: "Kənd təsərrüfatı", icon: "🌾", subs: [
      s("Kənd təsərrüfatı texnikası", "🚜"),
      s("Toxum və bitkilər", "🌱"),
      s("Gübrə və kimyəvi maddələr", "🧪"),
      s("Heyvandarlıq", "🐑"),
      s("Məhsullar (bal, meyvə)", "🍯"),
      s("Suvarma avadanlığı", "💧"),
    ],
  },
  {
    name: "İş elanları", icon: "💼", subs: [
      s("Vakansiyalar", "📋"),
      s("İş axtarıram", "🔍"),
      s("Biznes və avadanlıq", "🏭"),
      s("Hazır biznes", "🤝"),
      s("Françayzinq", "🏷️"),
    ],
  },
  {
    name: "Xidmətlər", icon: "🛠️", service: true, subs: [
      s("Təmir və tikinti xidmətləri", "🏗️"),
      s("Avtomobil xidmətləri", "🔧"),
      s("Məişət texnikası təmiri", "🔌"),
      s("Kompüter və telefon təmiri", "💻"),
      s("Santexnik xidmətləri", "🚿"),
      s("Elektrik xidmətləri", "⚡"),
      s("Kondisioner quraşdırma", "❄️"),
      s("Mebel yığılması və təmiri", "🪑"),
      s("Təmizlik xidmətləri", "🧹"),
      s("Köçürmə və yükdaşıma", "🚚"),
      s("Nəqliyyat və logistika", "🚛"),
      s("Təhsil və repetitor", "📚"),
      s("Dil kursları", "🗣️"),
      s("IT və proqramlaşdırma", "👨‍💻"),
      s("Veb sayt və dizayn", "🎨"),
      s("Reklam və marketinq", "📢"),
      s("Foto və video çəkiliş", "📷"),
      s("Tədbir təşkili (toy, DJ)", "🎉"),
      s("Aşpaz və catering", "👨‍🍳"),
      s("Gözəllik xidmətləri", "💇"),
      s("Masaj və SPA", "💆"),
      s("Tibbi xidmətlər", "🩺"),
      s("Hüquq xidmətləri", "⚖️"),
      s("Mühasibatlıq və maliyyə", "📊"),
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
      s("Restoran və kafe", "🍽️"),
      s("Otel və mehmanxana", "🏨"),
      s("Bağ evi və villa (günlük)", "🏡"),
      s("Şadlıq sarayı və ziyafət", "🎉"),
      s("İstirahət mərkəzi", "🏞️"),
      s("Hovuz və saun", "🏊"),
      s("Tur və səyahət", "✈️"),
      s("Konfrans və iş otağı", "🏢"),
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
// Alt kateqoriya adlarını (string massivi) qaytarır — köhnə istifadəçilərlə uyğun.
export function getSubs(main: string): string[] {
  return (getCat(main)?.subs || []).map((x) => x.name);
}
export function buildCat(main: string, sub: string): string {
  return [main, sub].filter(Boolean).join(SEP);
}
export function parseCat(value: string | undefined | null): { main: string; sub: string } {
  if (!value) return { main: "", sub: "" };
  const parts = value.split(SEP);
  return { main: parts[0] || "", sub: parts[1] || "" };
}
// Bu kateqoriya avtomobillə bağlıdırmı (marka/model/yanacaq/il sahələri üçün)?
export function isVehicleCat(main: string): boolean {
  return !!getCat(main)?.vehicle;
}
export function isServiceCat(main: string): boolean {
  return !!getCat(main)?.service;
}
// Mühərriksiz alt-kateqoriyalar — yanacaq/il/model/forVehicle sahələri bunlarda mənasızdır.
const NON_MOTOR_SUBS = new Set(["Təkər və disklər", "Şinlər və disklər", "Qoşqu və treyler"]);
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
// Kateqoriya stringi ("Main › Sub") → slug massivi.
export function catToSlugs(cat: string): string[] {
  const { main, sub } = parseCat(cat);
  return [main && slugify(main), sub && slugify(sub)].filter(Boolean) as string[];
}
// Slug massivi → kateqoriya stringi (yoxdursa "").
export function slugsToCat(slugs: string[]): string {
  if (!slugs.length) return "";
  const c = CATEGORIES.find((x) => slugify(x.name) === slugs[0]);
  if (!c) return "";
  if (slugs[1]) {
    const sub = c.subs.find((su) => slugify(su.name) === slugs[1]);
    return sub ? buildCat(c.name, sub.name) : c.name;
  }
  return c.name;
}
