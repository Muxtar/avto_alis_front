export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
// Derive uploads URL from API if not set explicitly — strips trailing /api.
export const UPLOADS =
  process.env.NEXT_PUBLIC_UPLOADS_URL ||
  API.replace(/\/api\/?$/, '') + '/uploads';
