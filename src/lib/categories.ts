// Ümumi marketplace taksonomiyası — sayt hər şeyi satır (təkcə avto deyil).
// Hər əsas kateqoriyanın öz alt kateqoriyaları var. `vehicle` = avtomobillə
// bağlıdır (yalnız bu kateqoriyalarda marka/model/yanacaq/il sahələri çıxır).

export interface MainCategory {
  name: string;
  icon: string; // emoji ikon (kateqoriya kartları üçün)
  subs: string[];
  vehicle?: boolean;
  service?: boolean; // tip avtomatik SERVICE olsun
}

export const CATEGORIES: MainCategory[] = [
  { name: "Nəqliyyat", icon: "🚗", vehicle: true, subs: ["Minik avtomobilləri", "Motosiklet və mopedlər", "Yük və kommersiya", "Tikinti və xüsusi texnika", "Su nəqliyyatı", "Şinlər və disklər"] },
  { name: "Avtomobil ehtiyat hissələri", icon: "⚙️", vehicle: true, subs: ["Mühərrik hissələri", "Transmissiya", "Asqı və sükan", "Əyləc sistemi", "Elektrik və elektronika", "Filtrlər və servis", "Soyutma və kondisioner", "Kuzov hissələri", "İşıqlandırma", "Şüşə və güzgü", "Salon hissələri", "Təkər və disk", "Multimedia və aksesuar"] },
  { name: "Daşınmaz əmlak", icon: "🏠", subs: ["Mənzillər", "Evlər və villalar", "Torpaq sahələri", "Ofis və obyektlər", "Qaraj və yer"] },
  { name: "Elektronika", icon: "📱", subs: ["Telefonlar və aksesuarlar", "Kompüter və noutbuk", "TV, audio, video", "Foto və video", "Oyun və konsollar", "Smart cihazlar"] },
  { name: "Məişət texnikası", icon: "🧺", subs: ["İri texnika", "Mətbəx texnikası", "İqlim texnikası", "Təmizlik texnikası"] },
  { name: "Ev və bağ", icon: "🛋️", subs: ["Mebel", "Ev dekoru", "Qab-qacaq və mətbəx", "Bağ və tərəvəz", "Tekstil"] },
  { name: "Tikinti və təmir", icon: "🧱", subs: ["İnşaat materialları", "Santexnika", "Elektrik malları", "Alət və avadanlıq", "Qapı və pəncərə"] },
  { name: "Geyim və aksesuar", icon: "👕", subs: ["Qadın geyimi", "Kişi geyimi", "Ayaqqabı", "Çanta və aksesuar", "Saat və zinət"] },
  { name: "Gözəllik və sağlamlıq", icon: "💄", subs: ["Kosmetika", "Ətriyyat", "Sağlamlıq"] },
  { name: "Uşaq aləmi", icon: "🧸", subs: ["Uşaq geyimi", "Oyuncaqlar", "Uşaq əşyaları", "Məktəbli"] },
  { name: "Hobbi və idman", icon: "⚽", subs: ["İdman", "Musiqi alətləri", "Kitablar və media", "Kolleksiya və əntiq", "Ov və balıqçılıq"] },
  { name: "Heyvanlar", icon: "🐾", subs: ["Ev heyvanları", "Heyvan ləvazimatı", "Kənd təsərrüfatı heyvanları"] },
  { name: "İş elanları", icon: "💼", subs: ["Vakansiyalar", "İş axtarıram", "Biznes və avadanlıq"] },
  { name: "Xidmətlər", icon: "🛠️", service: true, subs: ["Avto xidmət", "Təmir və tikinti", "Məişət texnikası təmiri", "Gözəllik xidmətləri", "Təhsil və repetitor", "Nəqliyyat və daşınma", "IT və dizayn", "Tədbir xidmətləri", "Hüquq və maliyyə", "Təmizlik"] },
  { name: "Kənd təsərrüfatı", icon: "🌾", subs: ["Texnika", "Bitki və toxum", "Məhsullar"] },
  { name: "Digər", icon: "📦", subs: ["Müxtəlif", "Pulsuz / Bağışlanır"] },
];

export const getIcon = (main: string): string => getCat(main)?.icon || "📦";

export const SEP = " › ";
export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export function getCat(name: string): MainCategory | undefined {
  return CATEGORIES.find((c) => c.name === name);
}
export function getSubs(main: string): string[] {
  return getCat(main)?.subs || [];
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

// ----- URL slug-ları (tap.az üslubu: /elanlar/elektronika/audio-video) -----
const AZ_MAP: Record<string, string> = {
  ə: "e", ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u",
};
export function slugify(s: string): string {
  return s
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
    const s = c.subs.find((su) => slugify(su) === slugs[1]);
    return s ? buildCat(c.name, s) : c.name;
  }
  return c.name;
}
