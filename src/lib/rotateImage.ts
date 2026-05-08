// Brauzerdə canvas vasitəsilə şəkili 90/180/270 dərəcə fırlatır və yeni File
// obyekti qaytarır. Texniki pasport şəkilləri telefonla yan çəkilirsə bu helper
// kullanıcıya düzəltmə imkanı verir — fırlatılmış File backend-ə yenidən
// göndərilir, AI/OCR düz oxuya bilir.

export async function rotateImageFile(file: File, degrees: 90 | 180 | 270 | -90): Promise<File> {
  const normalized = ((degrees % 360) + 360) % 360; // -90 → 270
  const img = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas dəstəklənmir');

  const swapDims = normalized === 90 || normalized === 270;
  canvas.width = swapDims ? img.naturalHeight : img.naturalWidth;
  canvas.height = swapDims ? img.naturalWidth : img.naturalHeight;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normalized * Math.PI) / 180);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92),
  );
  if (!blob) throw new Error('Şəkil yaradılmadı');

  // Faylın orijinal adını saxla — backend filename-i diskdə öz adı ilə yaradır,
  // ona görə bu sadəcə debug üçündür.
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Şəkil yüklənmədi'));
    };
    img.src = url;
  });
}
