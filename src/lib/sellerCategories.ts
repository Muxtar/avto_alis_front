// Avto usta / ehtiyat hissə satıcısı üçün ixtisas kateqoriyaları.
// 15 əsas kateqoriya, hər birinin altında konkret hissələr (a, b, c...).
// `id`-lər dil-müstəqildir və bazada saxlanılır (serviceCategories String[]).
//   - əsas kateqoriya:  "1" .. "15"
//   - alt hissə:        "1a", "1b", ... (əsas id + hərf)

export type SellerPart = { id: string; name: string };
export type SellerCategory = { id: string; name: string; parts: SellerPart[] };

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

function cat(id: string, name: string, partNames: string[]): SellerCategory {
  return {
    id,
    name,
    parts: partNames.map((p, i) => ({ id: `${id}${LETTERS[i]}`, name: p })),
  };
}

export const SELLER_CATEGORIES: SellerCategory[] = [
  cat("1", "Mühərrik hissələri", [
    "Mühərrik (motor)", "Turbin", "İnjektor (forsunka)", "Yanacaq nasosu",
    "Yanacaq reykası", "Qaz kelebeği (drossel)", "Lambda zond", "EGR klapanı",
    "MAF sensoru", "Krank mili sensoru", "Paylayıcı val sensoru", "Karter",
    "Mühərrik yastıqları",
  ]),
  cat("2", "Transmissiya hissələri", [
    "Sürətlər qutusu (karobka)", "Debriyaj", "Diferensial", "Reduktor",
    "Kardan valı", "Yarımox", "Şrus (qranat)",
  ]),
  cat("3", "Asqı və sükan hissələri", [
    "Amortizatorlar", "Yaylar", "Sükan reykası", "Sükan nasosu",
    "Sükan ucluqları", "Şarovoy", "Stabilizator qolları", "Stupitsa",
    "Podşipniklər",
  ]),
  cat("4", "Əyləc sistemi hissələri", [
    "Əyləc diskləri", "Əyləc bəndləri (kolodkalar)", "Tormoz silindri",
    "ABS bloku", "ABS sensorları",
  ]),
  cat("5", "Elektrik və elektronika hissələri", [
    "Generator", "Starter", "Akkumulyator", "ECU", "Sığorta qutusu",
    "Relelər", "Elektrik naqilləri",
  ]),
  cat("6", "Filtrlər və servis hissələri", [
    "Hava filtri", "Yağ filtri", "Yanacaq filtri", "Şamlar (sveçalar)",
  ]),
  cat("7", "Soyutma və kondisioner hissələri", [
    "Radiator", "Kondisioner kompressoru", "Kondisioner radiatoru",
    "Radiator çərçivəsi",
  ]),
  cat("8", "Kuzov hissələri", [
    "Kapot", "Qapılar", "Baqaj qapağı", "Bamper", "Qanadlar (krılo)",
    "Eşiklər", "Dam hissəsi", "Ön panel (televizor)", "Arxa panel",
    "Mühərrik qoruyucusu", "Altlıq hissələri", "Spoyler", "Dam relsləri",
  ]),
  cat("9", "İşıqlandırma hissələri", [
    "Faralar", "Arxa fənərlər", "Duman faraları", "Stop işıqları",
    "Faraların korpusu",
  ]),
  cat("10", "Şüşə və güzgü hissələri", [
    "Şüşələr", "Güzgülər", "Salon güzgüsü", "Sileceklər",
    "Şüşəqaldıran mexanizmləri",
  ]),
  cat("11", "Salon hissələri", [
    "Oturacaqlar", "Təhlükəsizlik kəmərləri", "Hava yastıqları",
    "Sükan hava yastığı", "Torpedo", "Cihazlar paneli", "Qapı kartları",
    "Qapı dəstəkləri", "Qapı qıfılları", "Döşəmə örtüyü", "Tavan üzlüyü",
    "Günlüklər (kozyryok)", "Salon ventilyatoru",
  ]),
  cat("12", "Təkər və disk hissələri", [
    "Təkərlər", "Disklər",
  ]),
  cat("13", "Yanacaq sistemi hissələri", [
    "Yanacaq çəni", "Çən qapağı",
  ]),
  cat("14", "Multimedia və elektron aksesuarlar", [
    "Multimedia sistemi", "Dinamiklər", "Videoqeydiyyatçı", "Park kamerası",
    "Park sensorları", "Telefon tutacağı", "Siqnalizasiya sistemi",
  ]),
  cat("15", "Avtomobil aksesuarları", [
    "Oturacaq üzlükləri", "Sükan örtükləri", "Ayaqaltılar", "Günəşlik pərdələr",
    "Yan pərdələr", "Dekorativ xrom hissələr", "Hava təravətləndiriciləri",
    "Dam baqajları", "Alətlər dəsti", "Kompressorlar", "Tozsoranlar",
  ]),
];

// id → ad (həm əsas, həm alt hissə)
const NAME_BY_ID = new Map<string, string>();
for (const c of SELLER_CATEGORIES) {
  NAME_BY_ID.set(c.id, c.name);
  for (const p of c.parts) NAME_BY_ID.set(p.id, p.name);
}

export function partName(id: string): string {
  return NAME_BY_ID.get(id) || id;
}

export function categoryOfPart(partId: string): SellerCategory | undefined {
  return SELLER_CATEGORIES.find((c) => c.parts.some((p) => p.id === partId));
}

// Seçilmiş alt-hissə id-lərini əsas kateqoriyalara görə qruplaşdırır
// (profil səhifəsində göstərmək üçün).
export function groupSelectedParts(
  selected: string[],
): { category: SellerCategory; parts: SellerPart[] }[] {
  const set = new Set(selected);
  const out: { category: SellerCategory; parts: SellerPart[] }[] = [];
  for (const c of SELLER_CATEGORIES) {
    const parts = c.parts.filter((p) => set.has(p.id));
    if (parts.length > 0) out.push({ category: c, parts });
  }
  return out;
}
