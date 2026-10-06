"use client";
// «Şəkil çək» — telefonda BİRBAŞA kameranı açır.
// `accept="image/*"` olan adi fayl girişi bir çox Android telefonda yalnız
// qalereyanı açır; kamera üçün ayrıca `capture` girişi lazımdır. Sistemdə şəkil
// götürülən hər yerdə qalereya düyməsinin yanında bu düymə də olur.
// Kompüterdə adi fayl seçimi kimi işləyir.
export default function CameraCapture({ onPick, onFiles, className, children, disabled, facing = "environment", title = "Kamera ilə çək" }: {
  onPick?: (file: File) => void;          // tək fayl
  onFiles?: (files: FileList) => void;    // FileList gözləyən mövcud emalçılar üçün
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  facing?: "environment" | "user";       // arxa kamera (sənəd) / ön kamera (selfi)
  title?: string;
}) {
  return (
    <label className={`${className || ""} ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`} title={title}>
      {children ?? "📷 Şəkil çək"}
      <input type="file" accept="image/*" capture={facing} className="hidden" disabled={disabled}
        onChange={(e) => {
          const fl = e.target.files;
          if (fl && fl.length) { onFiles?.(fl); onPick?.(fl[0]); }
          e.target.value = "";
        }} />
    </label>
  );
}
