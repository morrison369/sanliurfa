// @ts-nocheck
import type { APIRoute } from 'astro';
import { getCacheStats, clearNamespace, CACHE_NAMESPACES } from '../../../lib/cache/redis-cache';
import { getCacheStats as getImageCacheStats, clearImageCache } from '../../../lib/image-optimizer';

export const GET: APIRoute = async () => {
  // Check admin auth here in production
  
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

// POST to clear cache
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { type, namespace } = data;

    if (type === 'image') {
      clearImageCache();
    } else if (type === 'namespace' && namespace) {
      await clearNamespace(namespace);
    } else if (type === 'all') {
      clearImageCache();
      await clearNamespace('');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Cache cleared' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to clear cache' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
