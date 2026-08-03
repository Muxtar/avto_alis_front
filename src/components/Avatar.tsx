import { imgUrl } from "@/lib/api";

// Ortaq avatar: istifadəçi şəkil yükləyibsə həmin şəkil, yoxdursa ad baş hərfləri
// (qradiyent fon). Bütün saytda (chat, profil, satıcılar, rəylər, zənglər) eyni
// məntiq işləsin deyə tək komponentə cəmləndi.
const initials = (n?: string | null) => (n || "?").split(" ").map((x) => x[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();

export default function Avatar({
  name,
  src,
  className = "w-10 h-10",
  textClassName = "text-xs",
  gradient = "from-blue-500 to-blue-600",
  rounded = "rounded-xl",
}: {
  name?: string | null;
  src?: string | null;
  className?: string;       // ölçü (w-/h-) + istəyə görə əlavə siniflər
  textClassName?: string;   // baş hərflərin şrift ölçüsü
  gradient?: string;        // baş hərf fonunun qradiyenti
  rounded?: string;         // künc radiusu (rounded-xl / rounded-full ...)
}) {
  const base = `${className} ${rounded} shrink-0 object-cover`;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imgUrl(src)} alt={name || ""} className={base} />;
  }
  return (
    <div className={`${className} ${rounded} shrink-0 bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-bold ${textClassName}`}>
      {initials(name)}
    </div>
  );
}
