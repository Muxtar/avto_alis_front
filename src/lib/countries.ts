// Top manufacturing origins for auto parts. Order: most-frequent first.
// Each entry is [code, label_az, flag-emoji].
export const MANUFACTURING_COUNTRIES: { code: string; az: string; ru: string; en: string; flag: string }[] = [
  { code: "DE", az: "Almaniya",       ru: "Германия",        en: "Germany",        flag: "🇩🇪" },
  { code: "JP", az: "Yaponiya",       ru: "Япония",          en: "Japan",          flag: "🇯🇵" },
  { code: "KR", az: "Cənubi Koreya",  ru: "Южная Корея",     en: "South Korea",    flag: "🇰🇷" },
  { code: "US", az: "ABŞ",            ru: "США",             en: "USA",            flag: "🇺🇸" },
  { code: "IT", az: "İtaliya",        ru: "Италия",          en: "Italy",          flag: "🇮🇹" },
  { code: "FR", az: "Fransa",         ru: "Франция",         en: "France",         flag: "🇫🇷" },
  { code: "GB", az: "Böyük Britaniya",ru: "Великобритания",  en: "United Kingdom", flag: "🇬🇧" },
  { code: "ES", az: "İspaniya",       ru: "Испания",         en: "Spain",          flag: "🇪🇸" },
  { code: "TR", az: "Türkiyə",        ru: "Турция",          en: "Türkiye",        flag: "🇹🇷" },
  { code: "CN", az: "Çin",            ru: "Китай",           en: "China",          flag: "🇨🇳" },
  { code: "RU", az: "Rusiya",         ru: "Россия",          en: "Russia",         flag: "🇷🇺" },
  { code: "PL", az: "Polşa",          ru: "Польша",          en: "Poland",         flag: "🇵🇱" },
  { code: "CZ", az: "Çexiya",         ru: "Чехия",           en: "Czech Republic", flag: "🇨🇿" },
  { code: "RO", az: "Rumıniya",       ru: "Румыния",         en: "Romania",        flag: "🇷🇴" },
  { code: "BR", az: "Braziliya",      ru: "Бразилия",        en: "Brazil",         flag: "🇧🇷" },
  { code: "MX", az: "Meksika",        ru: "Мексика",         en: "Mexico",         flag: "🇲🇽" },
  { code: "IN", az: "Hindistan",      ru: "Индия",           en: "India",          flag: "🇮🇳" },
  { code: "TH", az: "Tailand",        ru: "Таиланд",         en: "Thailand",       flag: "🇹🇭" },
  { code: "TW", az: "Tayvan",         ru: "Тайвань",         en: "Taiwan",         flag: "🇹🇼" },
  { code: "VN", az: "Vyetnam",        ru: "Вьетнам",         en: "Vietnam",        flag: "🇻🇳" },
  { code: "UA", az: "Ukrayna",        ru: "Украина",         en: "Ukraine",        flag: "🇺🇦" },
  { code: "BY", az: "Belarus",        ru: "Беларусь",        en: "Belarus",        flag: "🇧🇾" },
  { code: "AZ", az: "Azərbaycan",     ru: "Азербайджан",     en: "Azerbaijan",     flag: "🇦🇿" },
  { code: "OTHER", az: "Digər",       ru: "Другое",          en: "Other",          flag: "🌍" },
];

export const COUNTRY_BY_CODE = Object.fromEntries(
  MANUFACTURING_COUNTRIES.map((c) => [c.code, c])
);

export function countryLabel(code: string | null | undefined, locale: "az" | "ru" | "en" = "az"): string {
  if (!code) return "";
  const c = COUNTRY_BY_CODE[code];
  if (!c) return code;
  return `${c.flag} ${c[locale]}`;
}
