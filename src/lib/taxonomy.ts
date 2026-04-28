export type TaxonomySub = { name: string; parts: string[] };
export type TaxonomyMain = { name: string; subs: TaxonomySub[] };

export const TAXONOMY: TaxonomyMain[] = [
  {
    name: "Mühərrik",
    subs: [
      { name: "Yanma Sistemi", parts: ["Şam", "Yüksək gərginlik kabelləri", "Katuşka"] },
      { name: "Yağlama Sistemi", parts: ["Yağ filtri", "Yağ nasosu"] },
      { name: "Soyutma Sistemi", parts: ["Radiator", "Termostat", "Su nasosu"] },
      { name: "Yanacaq Sistemi", parts: ["Forsunka", "Yanacaq filtri", "Yanacaq nasosu"] },
      { name: "Hava Sistemi", parts: ["Hava filtri", "Turbo", "Intercooler"] },
      { name: "Qayış və Zəncir", parts: ["GRM qayışı", "Gərici"] },
    ],
  },
  {
    name: "Transmissiya",
    subs: [
      { name: "Mexaniki Qutu", parts: ["İlişmə diski", "Presplata"] },
      { name: "Avtomatik Qutu", parts: ["Filtr", "Solenoid"] },
      { name: "Diferensial və Val", parts: ["Diferensial", "Ötürücü val"] },
    ],
  },
  {
    name: "Əyləc Sistemi",
    subs: [
      { name: "Ön Əyləc", parts: ["Qəlib", "Disk", "Suport"] },
      { name: "Arxa Əyləc", parts: ["Qəlib", "Barabanlı", "Disk"] },
      { name: "ABS və Elektronika", parts: ["ABS sensoru", "ABS bloku"] },
    ],
  },
  {
    name: "Asqı və İdarəetmə",
    subs: [
      { name: "Ön Asqı", parts: ["Amortizator", "Yay", "Şarnir"] },
      { name: "Arxa Asqı", parts: ["Amortizator", "Yay"] },
      { name: "Rul Sistemi", parts: ["Rəğbə", "Krəmayer"] },
    ],
  },
  {
    name: "Elektrika",
    subs: [
      { name: "Akkumulyator və Generator", parts: ["Akkumulyator", "Generator"] },
      { name: "Starter", parts: ["Starter"] },
      { name: "İşıqlandırma", parts: ["Far", "Stop", "Duman"] },
      { name: "Sensorlar", parts: ["ABS sensoru", "Lambda", "MAF"] },
    ],
  },
  {
    name: "Kuzov və Eksterior",
    subs: [
      { name: "Tamponlar", parts: ["Ön tampon", "Arxa tampon", "Difüzör"] },
      { name: "Qapılar və Qanadlar", parts: ["Qapı", "Qanad"] },
      { name: "Kapot və Baqaj", parts: ["Kapot", "Baqaj qapağı"] },
      { name: "Güzgülər", parts: ["Güzgü"] },
      { name: "Şüşələr", parts: ["Ön şüşə", "Arxa şüşə", "Yan şüşə"] },
    ],
  },
  {
    name: "Disk və Təkər",
    subs: [
      { name: "Yay Təkərləri", parts: ["Yay təkəri"] },
      { name: "Qış Təkərləri", parts: ["Qış təkəri"] },
      { name: "Disklər", parts: ["Ərinti disk", "Dəmir disk"] },
    ],
  },
  {
    name: "İnterior",
    subs: [
      { name: "Oturacaqlar", parts: ["Oturacaq", "Oturacaq örtüyü"] },
      { name: "Panellər", parts: ["Ön panel", "Qapı paneli"] },
      { name: "Salon Filtri", parts: ["Salon filtri"] },
    ],
  },
  {
    name: "İxrac Sistemi",
    subs: [
      { name: "Katalizator", parts: ["Katalizator"] },
      { name: "Səsboğucu", parts: ["Səsboğucu"] },
      { name: "Boru", parts: ["İxrac borusu"] },
    ],
  },
  {
    name: "Aksesuar və İstehlak",
    subs: [
      { name: "Yağlar və Mayelər", parts: ["Mühərrik yağı", "Əyləc mayesi", "Antifriz"] },
      { name: "Dəyişdirici hissələr", parts: ["Digər"] },
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
