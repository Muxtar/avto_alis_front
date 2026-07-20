import React from "react";

// Kateqoriyalar üçün vahid xətti (line) SVG ikon dəsti — emoji əvəzinə.
// Modern, monoxrom, brend rənginə uyğun. Tap.az/Umico-dan daha premium görünür.
const PATHS: Record<string, React.ReactNode> = {
  "Nəqliyyat": (<><path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7A2 2 0 0 1 17.4 6.8L19 11" /><rect x="3" y="11" width="18" height="6" rx="1.6" /><circle cx="7.5" cy="17" r="1.6" /><circle cx="16.5" cy="17" r="1.6" /></>),
  "Avtomobil ehtiyat hissələri": (<><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" /></>),
  "Daşınmaz əmlak": (<><path d="M4 11l8-6 8 6" /><path d="M6 9.5V19h12V9.5" /><path d="M10 19v-4.5h4V19" /></>),
  "Elektronika": (<><rect x="7" y="2.5" width="10" height="19" rx="2.2" /><path d="M11 18.5h2" /></>),
  "Məişət texnikası": (<><rect x="5" y="3" width="14" height="18" rx="2.2" /><circle cx="12" cy="13" r="3.8" /><path d="M8.5 6.2h.01M11 6.2h.01" /></>),
  "Ev və bağ": (<><path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11" /><path d="M3 14.5A2 2 0 0 1 5 12.5h0a2 2 0 0 1 2 2v1.5h10v-1.5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2V19H3z" /><path d="M6 19v1.5M18 19v1.5" /></>),
  "Tikinti və təmir": (<><rect x="3" y="5.5" width="18" height="4.5" rx="1" /><rect x="3" y="14" width="18" height="4.5" rx="1" /><path d="M9 5.5V10M15 5.5V10M6 14v4.5M12 14v4.5M18 14v4.5" /></>),
  "Geyim və aksesuar": (<><path d="M9 4l3 2 3-2 5 3.5-2.2 3L15 9v11H9V9l-2.8 1.5L4 7.5z" /></>),
  "Gözəllik və sağlamlıq": (<><path d="M12 3l1.9 4.4L18.5 9l-4.6 1.6L12 15l-1.9-4.4L5.5 9l4.6-1.6z" /><path d="M18 14.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" /></>),
  "Uşaq aləmi": (<><circle cx="7.5" cy="6" r="2" /><circle cx="16.5" cy="6" r="2" /><circle cx="12" cy="13.5" r="6" /><path d="M10 12.5h.01M14 12.5h.01" /><path d="M10.3 16a2.5 2.5 0 0 0 3.4 0" /></>),
  "Hobbi və idman": (<><path d="M6.5 6.5l11 11" /><path d="M4.5 8.5L3 10a1.5 1.5 0 0 0 0 2.1l.9.9M19.5 15.5L21 14a1.5 1.5 0 0 0 0-2.1l-.9-.9" /><path d="M6 6L4.5 4.5M19.5 19.5L18 18" /></>),
  "Heyvanlar": (<><circle cx="8" cy="8.5" r="1.6" /><circle cx="16" cy="8.5" r="1.6" /><circle cx="5" cy="13" r="1.4" /><circle cx="19" cy="13" r="1.4" /><path d="M12 13c-2.4 0-4 1.7-4 3.4 0 1.5 1.6 2.6 4 2.6s4-1.1 4-2.6c0-1.7-1.6-3.4-4-3.4z" /></>),
  "Kənd təsərrüfatı": (<><path d="M12 21v-9" /><path d="M12 12c0-3.3 2.2-5.5 6.5-5.5C18.5 9.8 16.3 12 12 12z" /><path d="M12 14.5c0-3.3-2.2-5.5-6.5-5.5C5.5 12.3 7.7 14.5 12 14.5z" /></>),
  "İş elanları": (<><rect x="3" y="7" width="18" height="13" rx="2.2" /><path d="M8 7V5.4A2.4 2.4 0 0 1 10.4 3h3.2A2.4 2.4 0 0 1 16 5.4V7" /><path d="M3 12.5h18" /></>),
  "Xidmətlər": (<><path d="M14.6 6.3a3.6 3.6 0 0 0-4.9 4.6L3.8 16.8a1.6 1.6 0 0 0 0 2.3l1.1 1.1a1.6 1.6 0 0 0 2.3 0l5.9-5.9a3.6 3.6 0 0 0 4.6-4.9l-2.4 2.4-2.1-.4-.4-2.1z" /></>),
  "Digər": (<><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></>),
};

export default function CategoryIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const path = PATHS[name] || (<><path d="M7 7h10v10H7z" /><path d="M7 12h10M12 7v10" /></>);
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}

/* ─────────────── Alt kateqoriya ikonları ───────────────
   Əsas kateqoriyalarla EYNİ xətti (line) üslub. Ad üzrə açar söz uyğunlaşması;
   tapılmasa valideyn kateqoriyanın ikonuna düşür (emoji istifadə olunmur). */
const SUB: Record<string, React.ReactNode> = {
  car: (<><path d="M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7A2 2 0 0 1 17.4 6.8L19 11" /><rect x="3" y="11" width="18" height="6" rx="1.6" /><circle cx="7.5" cy="17" r="1.6" /><circle cx="16.5" cy="17" r="1.6" /></>),
  moto: (<><circle cx="5.5" cy="17" r="2.5" /><circle cx="18.5" cy="17" r="2.5" /><path d="M8 17h5l3-6h3M6 11h5l4 6M14 7h3" /></>),
  truck: (<><rect x="2.5" y="7" width="11" height="8" rx="1.4" /><path d="M13.5 10H17l3 3v2h-6.5z" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>),
  bus: (<><rect x="4" y="4" width="16" height="12" rx="2" /><path d="M4 10h16" /><circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" /></>),
  tractor: (<><circle cx="7" cy="16.5" r="3.5" /><circle cx="17.5" cy="17.5" r="2.5" /><path d="M4 12V8h5l2 4M11 12h6v3" /></>),
  boat: (<><path d="M3 17.5c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0" /><path d="M5 14l1.5-5h11L19 14z" /><path d="M12 9V4" /></>),
  tire: (<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.2" /><path d="M12 3.5v5M12 15.5v5M3.5 12h5M15.5 12h5" /></>),
  wrench: (<><path d="M14.6 6.3a3.6 3.6 0 0 0-4.9 4.6L3.8 16.8a1.6 1.6 0 0 0 0 2.3l1.1 1.1a1.6 1.6 0 0 0 2.3 0l5.9-5.9a3.6 3.6 0 0 0 4.6-4.9l-2.4 2.4-2.1-.4-.4-2.1z" /></>),
  battery: (<><rect x="2.5" y="7.5" width="16" height="9" rx="2" /><path d="M21.5 10.5v3" /><path d="M6 12h6M9 9v6" /></>),
  bulb: (<><path d="M9 17h6M10 20h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9V15h7v-1.1A6 6 0 0 0 12 3z" /></>),
  plug: (<><path d="M9 3v5M15 3v5" /><path d="M6.5 8h11v3a5.5 5.5 0 0 1-11 0z" /><path d="M12 16.5V21" /></>),
  music: (<><circle cx="7" cy="17" r="2.5" /><circle cx="18" cy="15" r="2.5" /><path d="M9.5 17V7l11-2v10" /></>),
  phone: (<><rect x="7" y="2.5" width="10" height="19" rx="2.2" /><path d="M11 18.5h2" /></>),
  laptop: (<><rect x="4" y="5" width="16" height="10" rx="1.6" /><path d="M2.5 18.5h19" /></>),
  tv: (<><rect x="2.5" y="5" width="19" height="12" rx="1.8" /><path d="M8 20.5h8M12 17v3.5" /></>),
  camera: (<><rect x="2.5" y="7" width="19" height="12.5" rx="2.2" /><circle cx="12" cy="13.2" r="3.6" /><path d="M8.5 7l1.5-2.5h4L15.5 7" /></>),
  headphone: (<><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="2.5" y="14" width="4.5" height="6" rx="1.6" /><rect x="17" y="14" width="4.5" height="6" rx="1.6" /></>),
  gamepad: (<><rect x="2.5" y="7.5" width="19" height="10" rx="4.4" /><path d="M7 11v3M5.5 12.5h3" /><circle cx="16" cy="11.8" r="1" /><circle cx="18.4" cy="13.8" r="1" /></>),
  watch: (<><circle cx="12" cy="12" r="5.2" /><path d="M12 9.6V12l1.6 1" /><path d="M9.4 6.8L9 3h6l-.4 3.8M9.4 17.2L9 21h6l-.4-3.8" /></>),
  home: (<><path d="M4 11l8-6 8 6" /><path d="M6 9.5V19h12V9.5" /><path d="M10 19v-4.5h4V19" /></>),
  building: (<><rect x="4.5" y="3" width="15" height="18" rx="1.6" /><path d="M8.5 7h2M13.5 7h2M8.5 11h2M13.5 11h2M8.5 15h2M13.5 15h2" /><path d="M10.5 21v-3h3v3" /></>),
  land: (<><path d="M3 18.5h18" /><path d="M5 18.5l3-7 4 3 3-5 4 9" /></>),
  sofa: (<><path d="M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11" /><path d="M3 14.5a2 2 0 0 1 4 0V16h10v-1.5a2 2 0 0 1 4 0V19H3z" /><path d="M6 19v1.5M18 19v1.5" /></>),
  bed: (<><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" /><path d="M3 14.5h18M3 18v2M21 18v2" /><circle cx="7.5" cy="11.5" r="1.4" /></>),
  kitchen: (<><path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10" /><path d="M16 3c-1.6 1.4-2 3-2 5s.6 3 2 3 2-1 2-3-.4-3.6-2-5zM16 11v10" /></>),
  fridge: (<><rect x="6" y="2.5" width="12" height="19" rx="2" /><path d="M6 10h12M9 6v2M9 13v2.5" /></>),
  washer: (<><rect x="4.5" y="2.5" width="15" height="19" rx="2" /><circle cx="12" cy="14" r="4.2" /><path d="M8 6h.01M11 6h.01" /></>),
  ac: (<><path d="M12 3v18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5" /><path d="M4 7.5l16 9M4 7.5l.4 3.4M4 7.5l3.4-.4M20 16.5l-.4-3.4M20 16.5l-3.4.4" /></>),
  shirt: (<><path d="M9 4l3 2 3-2 5 3.5-2.2 3L15 9v11H9V9l-2.8 1.5L4 7.5z" /></>),
  shoe: (<><path d="M3 16.5V10h4l2.5 2.5c1.5 1.5 3.5 2 6 2H21v2z" /><path d="M3 16.5h18v2H3z" /></>),
  bag: (<><path d="M6 8h12l1 12H5z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>),
  jewel: (<><path d="M7 3h10l4 6-9 12L3 9z" /><path d="M3 9h18M9.5 3L7 9l5 12 5-12-2.5-6" /></>),
  baby: (<><circle cx="12" cy="12" r="8.5" /><path d="M9 10.5h.01M15 10.5h.01" /><path d="M9.5 15a3.5 3.5 0 0 0 5 0" /></>),
  toy: (<><rect x="4" y="9" width="16" height="11" rx="2.2" /><path d="M12 9V6" /><circle cx="8.5" cy="4.5" r="1.8" /><circle cx="15.5" cy="4.5" r="1.8" /><path d="M8 14h2M14 14h2" /></>),
  book: (<><path d="M4 4.5A2 2 0 0 1 6 2.5h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 18.5V4.5" /><path d="M8 7h7M8 10.5h7" /></>),
  paw: (<><circle cx="8" cy="8.5" r="1.7" /><circle cx="16" cy="8.5" r="1.7" /><circle cx="5" cy="13" r="1.5" /><circle cx="19" cy="13" r="1.5" /><path d="M12 13c-2.4 0-4 1.7-4 3.4 0 1.5 1.6 2.6 4 2.6s4-1.1 4-2.6c0-1.7-1.6-3.4-4-3.4z" /></>),
  plant: (<><path d="M12 21v-9" /><path d="M12 12c0-3.3 2.2-5.5 6.5-5.5C18.5 9.8 16.3 12 12 12z" /><path d="M12 14.5c0-3.3-2.2-5.5-6.5-5.5C5.5 12.3 7.7 14.5 12 14.5z" /></>),
  basket: (<><path d="M3 8.5h18l-1.6 10a2 2 0 0 1-2 1.7H6.6a2 2 0 0 1-2-1.7z" /><path d="M8.5 8.5L11 3M15.5 8.5L13 3" /><path d="M9.5 12.5v4M14.5 12.5v4" /></>),
  dumbbell: (<><path d="M3 12h18" /><rect x="4.5" y="8.5" width="3.5" height="7" rx="1.2" /><rect x="16" y="8.5" width="3.5" height="7" rx="1.2" /><path d="M2 10.5v3M22 10.5v3" /></>),
  bike: (<><circle cx="6" cy="16.5" r="3.5" /><circle cx="18" cy="16.5" r="3.5" /><path d="M6 16.5l4-8h4l-2 8h6M10.5 8.5H14" /></>),
  sparkle: (<><path d="M12 3l1.9 4.4L18.5 9l-4.6 1.6L12 15l-1.9-4.4L5.5 9l4.6-1.6z" /><path d="M18 14.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z" /></>),
  briefcase: (<><rect x="3" y="7" width="18" height="13" rx="2.2" /><path d="M8 7V5.4A2.4 2.4 0 0 1 10.4 3h3.2A2.4 2.4 0 0 1 16 5.4V7" /><path d="M3 12.5h18" /></>),
  brick: (<><rect x="3" y="5.5" width="18" height="4.5" rx="1" /><rect x="3" y="14" width="18" height="4.5" rx="1" /><path d="M9 5.5V10M15 5.5V10M6 14v4.5M12 14v4.5M18 14v4.5" /></>),
  health: (<><path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6c0 5.8-8.5 11.3-8.5 11.3z" /></>),
};

// Ad üzrə açar söz → ikon (ilk uyğunluq qazanır).
const RULES: [RegExp, string][] = [
  [/minik|avtomobil|sürücü|maşın/i, "car"], [/motosiklet|moped|skuter/i, "moto"],
  [/yük maşın|qoşqu|treyler|kamyon/i, "truck"], [/avtobus|mikroavtobus/i, "bus"],
  [/xüsusi texnika|traktor|kombayn/i, "tractor"], [/su nəqliyyat|qayıq|yaxta|kater/i, "boat"],
  [/təkər|şin|disk/i, "tire"], [/akkumulyator|batareya/i, "battery"],
  [/işıqlandırma|işıq|lampa/i, "bulb"], [/audio|multimedia|musiqi|dinamik|kolonka/i, "music"],
  [/qulaqlıq/i, "headphone"], [/oyun konsol|konsol|playstation|oyun/i, "gamepad"],
  [/telefon|smartfon/i, "phone"], [/noutbuk|komp[uü]ter|planşet/i, "laptop"],
  [/televizor|monitor|proyektor|^tv/i, "tv"], [/foto|kamera|obyektiv/i, "camera"],
  [/saat/i, "watch"], [/elektrik|elektronika|kabel|adapter/i, "plug"],
  [/mühərrik|transmissiya|asqı|sükan|əyləc|filtr|yağ|soyutma|kuzov|ehtiyat hiss|salon|şüşə|güzgü/i, "wrench"],
  [/mənzil|ev|villa|həyət|bağ evi|kotted/i, "home"],
  [/ofis|obyekt|mağaza|bina|anbar|kommersiya/i, "building"],
  [/torpaq|sahə|əkin yeri/i, "land"],
  [/mebel|divan|stol|stul|şkaf/i, "sofa"], [/yataq|çarpayı|döşək/i, "bed"],
  [/mətbəx|qab|qazan|bişir/i, "kitchen"], [/soyuducu|dondurucu/i, "fridge"],
  [/paltaryuyan|qabyuyan|ütü|tozsoran/i, "washer"], [/kondisioner|isitmə|ventilyator|split/i, "ac"],
  [/geyim|paltar|köynək|pencək|don|şalvar/i, "shirt"], [/ayaqqabı|çəkmə|krossovka/i, "shoe"],
  [/çanta|aksesuar|kəmər|eynək/i, "bag"], [/zərgər|qızıl|gümüş|bəzək|üzük/i, "jewel"],
  [/körpə|uşaq arabası|uşaq/i, "baby"], [/oyuncaq/i, "toy"],
  [/kitab|dərslik|jurnal|qəzet/i, "book"], [/heyvan|it |pişik|quş|akvarium|balıq/i, "paw"],
  [/bitki|gül|toxum|gübrə|əkin|bağ üçün/i, "plant"], [/ərzaq|qida|yemək|içki|şirniyyat/i, "basket"],
  [/idman|fitnes|trenajor|tren/i, "dumbbell"], [/velosiped/i, "bike"],
  [/gözəllik|kosmetika|ətir|saç|dırnaq/i, "sparkle"], [/sağlamlıq|tibbi|dərman|əczaçı/i, "health"],
  [/iş elan|vakansiya|karyera|işçi/i, "briefcase"],
  [/tikinti|inşaat|material|sement|kərpic|boya|təmir|usta|santexnik/i, "brick"],
  [/xidmət|çatdırılma|təmizlik|nəqliyyat xidməti/i, "wrench"],
];

// Alt kateqoriya ikonu — əsas kateqoriyalarla eyni üslubda (emoji yox).
export function SubCategoryIcon({ name, parent, className = "w-5 h-5" }: { name: string; parent?: string; className?: string }) {
  const hit = RULES.find(([re]) => re.test(name));
  const path = (hit && SUB[hit[1]]) || (parent && PATHS[parent]) || SUB.wrench;
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}
