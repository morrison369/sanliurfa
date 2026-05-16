export const PUBLIC_IMAGE_CACHE_CONTROL = 'public, max-age=2592000, immutable';
export const PUBLIC_UPLOAD_CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';
export const OPTIMIZED_STATIC_IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export function isPublicUploadPath(pathname: string): boolean {
  return pathname.startsWith('/uploads/') || pathname.startsWith('uploads/');
}
