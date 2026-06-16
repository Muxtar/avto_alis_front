// Ümumi marketplace taksonomiyası — sayt hər şeyi satır (təkcə avto deyil).
// Hər əsas kateqoriyanın öz alt kateqoriyaları var. `vehicle` = avtomobillə
// bağlıdır (yalnız bu kateqoriyalarda marka/model/yanacaq/il sahələri çıxır).

export interface MainCategory {
  name: string;
  subs: string[];
  vehicle?: boolean;
  service?: boolean; // tip avtomatik SERVICE olsun
}

export const CATEGORIES: MainCategory[] = [
  { name: "Nəqliyyat", vehicle: true, subs: ["Minik avtomobilləri", "Motosiklet və mopedlər", "Yük və kommersiya", "Tikinti və xüsusi texnika", "Su nəqliyyatı", "Şinlər və disklər"] },
  { name: "Avtomobil ehtiyat hissələri", vehicle: true, subs: ["Mühərrik hissələri", "Transmissiya", "Asqı və sükan", "Əyləc sistemi", "Elektrik və elektronika", "Filtrlər və servis", "Soyutma və kondisioner", "Kuzov hissələri", "İşıqlandırma", "Şüşə və güzgü", "Salon hissələri", "Təkər və disk", "Multimedia və aksesuar"] },
  { name: "Daşınmaz əmlak", subs: ["Mənzillər", "Evlər və villalar", "Torpaq sahələri", "Ofis və obyektlər", "Qaraj və yer"] },
  { name: "Elektronika", subs: ["Telefonlar və aksesuarlar", "Kompüter və noutbuk", "TV, audio, video", "Foto və video", "Oyun və konsollar", "Smart cihazlar"] },
  { name: "Məişət texnikası", subs: ["İri texnika", "Mətbəx texnikası", "İqlim texnikası", "Təmizlik texnikası"] },
  { name: "Ev və bağ", subs: ["Mebel", "Ev dekoru", "Qab-qacaq və mətbəx", "Bağ və tərəvəz", "Tekstil"] },
  { name: "Tikinti və təmir", subs: ["İnşaat materialları", "Santexnika", "Elektrik malları", "Alət və avadanlıq", "Qapı və pəncərə"] },
  { name: "Geyim və aksesuar", subs: ["Qadın geyimi", "Kişi geyimi", "Ayaqqabı", "Çanta və aksesuar", "Saat və zinət"] },
  { name: "Gözəllik və sağlamlıq", subs: ["Kosmetika", "Ətriyyat", "Sağlamlıq"] },
  { name: "Uşaq aləmi", subs: ["Uşaq geyimi", "Oyuncaqlar", "Uşaq əşyaları", "Məktəbli"] },
  { name: "Hobbi və idman", subs: ["İdman", "Musiqi alətləri", "Kitablar və media", "Kolleksiya və əntiq", "Ov və balıqçılıq"] },
  { name: "Heyvanlar", subs: ["Ev heyvanları", "Heyvan ləvazimatı", "Kənd təsərrüfatı heyvanları"] },
  { name: "İş elanları", subs: ["Vakansiyalar", "İş axtarıram", "Biznes və avadanlıq"] },
  { name: "Xidmətlər", service: true, subs: ["Avto xidmət", "Təmir və tikinti", "Məişət texnikası təmiri", "Gözəllik xidmətləri", "Təhsil və repetitor", "Nəqliyyat və daşınma", "IT və dizayn", "Tədbir xidmətləri", "Hüquq və maliyyə", "Təmizlik"] },
  { name: "Kənd təsərrüfatı", subs: ["Texnika", "Bitki və toxum", "Məhsullar"] },
  { name: "Digər", subs: ["Müxtəlif", "Pulsuz / Bağışlanır"] },
];

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
