export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
// Derive uploads URL from API if not set explicitly — strips trailing /api.
export const UPLOADS =
  process.env.NEXT_PUBLIC_UPLOADS_URL ||
  API.replace(/\/api\/?$/, '') + '/uploads';

// Şəkil URL-i: tam http URL-dirsə (məs. Cloudinary) olduğu kimi qaytarır,
// yalnız fayl adıdırsa serverin /uploads yolu ilə birləşdirir. Beləliklə həm
// bulud (Cloudinary), həm köhnə yerli şəkillər eyni cür göstərilir.
export const imgUrl = (name?: string | null): string => {
  if (!name) return '';
  return /^https?:\/\//.test(name) ? name : `${UPLOADS}/${name}`;
};
