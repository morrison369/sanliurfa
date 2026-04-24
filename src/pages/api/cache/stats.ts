import type { APIRoute } from 'astro';
import { getCacheStats, clearNamespace, CACHE_NAMESPACES } from '../../../lib/cache/redis-cache';
import { getCacheStats as getImageCacheStats, clearImageCache } from '../../../lib/image-optimizer';
import { problemJson } from '../../../lib/api';

interface CacheClearRequest {
  type?: 'image' | 'namespace' | 'all';
  namespace?: string;
}

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.isAdmin) {
    return problemJson({
      status: 403,
      title: 'Forbidden',
      detail: 'Admin erişimi gerekli',
      type: '/problems/cache-stats-forbidden',
      instance: '/api/cache/stats',
    });
  }

  const [cacheStats, imageStats] = await Promise.all([
    getCacheStats(),
    getImageCacheStats(),
  ]);

  return new Response(
    JSON.stringify({
      general: cacheStats,
      images: imageStats,
      namespaces: Object.keys(CACHE_NAMESPACES),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.isAdmin) {
    return problemJson({
      status: 403,
      title: 'Forbidden',
      detail: 'Admin erişimi gerekli',
      type: '/problems/cache-stats-forbidden',
      instance: '/api/cache/stats',
    });
  }

  try {
    const data = (await request.json()) as CacheClearRequest;
    const { type, namespace } = data;

    if (type === 'image') {
      clearImageCache();
    } else if (type === 'namespace' && namespace && Object.values(CACHE_NAMESPACES).includes(namespace as any)) {
      await clearNamespace(namespace);
    } else if (type === 'all') {
      clearImageCache();
      await clearNamespace('');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Cache cleared' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return problemJson({
      status: 500,
      title: 'Cache Temizlenemedi',
      detail: 'Failed to clear cache',
      type: '/problems/cache-stats-clear-failed',
      instance: '/api/cache/stats',
    });
  }
};
