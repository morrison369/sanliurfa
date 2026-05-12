/**
 * Admin Cache Management
 * GET  /api/admin/cache         — Cache istatistikleri
 * POST /api/admin/cache         — Cache temizle (pattern veya key)
 */
import type { APIRoute } from 'astro';
import { apiResponse, HttpStatus, problemJson, safeErrorDetail } from '../../../lib/api';
import { deleteCachePattern, deleteCache, getCache } from '../../../lib/cache/cache';
import { logger } from '../../../lib/logging';

function isAdmin(locals: App.Locals) {
  if (process.env.NODE_ENV !== 'production' && process.env.E2E_ADMIN_BYPASS === '1') return true;
  return locals?.user?.role === 'admin';
}

// Bilinen cache pattern'ları
const KNOWN_PATTERNS = [
  { key: 'page:blog:index:*', label: 'Blog Listeleme' },
  { key: 'page:blog:detail:*', label: 'Blog Detay' },
  { key: 'page:isletme:*', label: 'İşletme Sayfaları' },
  { key: 'page:yemek-tarifleri:*', label: 'Yemek Tarifleri' },
  { key: 'page:etkinlikler:*', label: 'Etkinlikler' },
  { key: 'page:gezilecek-yerler:*', label: 'Gezilecek Yerler' },
  { key: 'page:guide:*', label: 'Rehber Sayfalar' },
  { key: 'public:route:*', label: 'Public Route Cache' },
];

export const GET: APIRoute = async ({ locals }) => {
  try {
    if (!isAdmin(locals)) {
      return problemJson({ status: 403, title: 'Forbidden', detail: 'Admin yetkisi gerekli', type: '/problems/forbidden', instance: '/api/admin/cache' });
    }

    // Spot check a few keys to see if they exist
    const checks = await Promise.all(
      KNOWN_PATTERNS.slice(0, 4).map(async (p) => {
        const sample = p.key.replace(':*', ':sample');
        const val = await getCache(sample).catch(() => null);
        return { pattern: p.key, label: p.label, sample: !!val };
      })
    );

    return apiResponse({
      patterns: KNOWN_PATTERNS,
      note: 'Cache Redis\'te saklanır, TTL dolduğunda otomatik temizlenir. Manuel temizleme için POST isteği gönderin.',
    }, HttpStatus.OK);
  } catch (error) {
    logger.error('Admin cache GET error', error);
    return problemJson({ status: 500, title: 'Hata', detail: safeErrorDetail(error, 'Cache bilgisi alınamadı'), type: '/problems/cache-get-failed', instance: '/api/admin/cache' });
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    if (!isAdmin(locals)) {
      return problemJson({ status: 403, title: 'Forbidden', detail: 'Admin yetkisi gerekli', type: '/problems/forbidden', instance: '/api/admin/cache' });
    }

    const body = await request.json().catch(() => ({})) as { pattern?: string; key?: string; all?: boolean };

    const ALLOWED_PATTERNS = new Set(KNOWN_PATTERNS.map(p => p.key));

    if (body.all) {
      // Tüm bilinen pattern'ları temizle
      await Promise.all(KNOWN_PATTERNS.map(p => deleteCachePattern(p.key).catch(() => null)));
      logger.info(`Admin cache cleared all patterns [userId=${locals.user?.id}]`);
      return apiResponse({ cleared: true, message: 'Tüm cache pattern\'ları temizlendi.' }, HttpStatus.OK);
    }

    if (body.pattern) {
      if (!ALLOWED_PATTERNS.has(body.pattern)) {
        return problemJson({ status: 422, title: 'Geçersiz Pattern', detail: 'İzin verilmeyen cache pattern\'ı', type: '/problems/invalid-pattern', instance: '/api/admin/cache' });
      }
      await deleteCachePattern(body.pattern).catch(() => null);
      logger.info(`Admin cache pattern cleared [pattern=${body.pattern} userId=${locals.user?.id}]`);
      return apiResponse({ cleared: true, pattern: body.pattern }, HttpStatus.OK);
    }

    return problemJson({ status: 422, title: 'Geçersiz İstek', detail: 'pattern, key veya all parametresi gerekli', type: '/problems/missing-param', instance: '/api/admin/cache' });
  } catch (error) {
    logger.error('Admin cache POST error', error);
    return problemJson({ status: 500, title: 'Hata', detail: safeErrorDetail(error, 'Cache temizlenemedi'), type: '/problems/cache-clear-failed', instance: '/api/admin/cache' });
  }
};
