// Azərbaycanca peşə/məslək siyahısı (türkcə sözlər yoxdur) — Məslək sahəsində
// yazdıqca təklif üçün. İstifadəçi "hek" yazanda "Həkim" tapılsın deyə
// axtarışda Azərbaycan hərfləri latına normallaşdırılır (ə→e, ş→s, ç→c, ...).

export const PROFESSIONS: string[] = [
  "Həkim", "Diş həkimi", "Cərrah", "Pediatr", "Tibb bacısı", "Əczaçı", "Baytar", "Psixoloq",
  "Müəllim", "Tərbiyəçi", "Repetitor", "Tələbə", "Alim", "Tədqiqatçı",
  "Mühəndis", "Memar", "İnşaatçı", "Proqramçı", "Veb proqramçı", "Sistem administratoru",
  "Qrafik dizayner", "Veb dizayner", "Mühasib", "İqtisadçı", "Maliyyəçi", "Bankir", "Auditor",
  "Hüquqşünas", "Vəkil", "Notarius", "Tərcüməçi", "Jurnalist", "Redaktor", "Yazıçı",
  "Satıcı", "Kassir", "Mağaza müdiri", "Anbardar", "Marketoloq", "Menecer", "Layihə meneceri",
  "Sahibkar", "Direktor", "Administrator", "Katib", "Operator", "Kuryer", "Logist",
  "Sürücü", "Taksi sürücüsü", "Avtomexanik", "Çilingər", "Elektrik", "Santexnik", "Qaynaqçı",
  "Usta", "Boyaçı", "Suvaqçı", "Dülgər", "Mebel ustası", "Kondisioner ustası",
  "Aşpaz", "Konditer", "Çörəkçi", "Qəssab", "Ofisiant", "Barmen",
  "Bərbər", "Saç ustası", "Kosmetoloq", "Manikürçü", "Vizajist", "Masajçı",
  "Dərzi", "Modelyer", "Toxucu",
  "Fermer", "Bağban", "Maldar", "Arıçı", "Balıqçı",
  "Polis", "Hərbçi", "Mühafizəçi", "Sərhədçi", "Yanğınsöndürən", "Xilasedici",
  "Rəssam", "Heykəltəraş", "Fotoqraf", "Operator (kamera)", "Rejissor", "Aktyor",
  "Müğənni", "Musiqiçi", "Bəstəkar", "Rəqqas",
  "İdmançı", "Məşqçi", "Fitnes təlimatçısı",
  "Geoloq", "Kimyaçı", "Fizik", "Riyaziyyatçı", "Bioloq", "Coğrafiyaçı", "Tarixçi", "Filoloq",
  "Sosioloq", "Politoloq", "Statistik",
  "Rieltor", "Sığortaçı", "Broker",
  "Dayə", "Qulluqçu", "Təmizlikçi", "Bağça müdiri",
  "Stilist", "Florist", "Ailə həkimi", "Pensiyaçı", "Sərbəst çalışan", "İşsiz",
];

const AZ_NORM: Record<string, string> = { ə: "e", ç: "c", ğ: "g", ö: "o", ş: "s", ü: "u" };
function normAz(s: string): string {
  return s
    .replace(/[İIı]/g, "i")
    .toLowerCase()
    .split("")
    .map((c) => AZ_NORM[c] ?? c)
    .join("");
}

// Yazılana görə təklif: əvvəlcə başlayanlar, sonra içində keçənlər.
export function searchProfessions(query: string, limit = 6): string[] {
  const q = normAz(query.trim());
  if (!q) return [];
  const norm = PROFESSIONS.map((p) => ({ p, n: normAz(p) }));
  const starts = norm.filter((x) => x.n.startsWith(q)).map((x) => x.p);
  const contains = norm.filter((x) => !x.n.startsWith(q) && x.n.includes(q)).map((x) => x.p);
  return [...starts, ...contains].slice(0, limit);
}
