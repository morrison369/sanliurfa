/**
 * Domain-spesifik cache invalidation helper'ları.
 *
 * Her mutation (POST/PUT/DELETE/PATCH) sonrası ilgili cache pattern'lerini
 * atomik olarak temizler. CLAUDE.md "Redis Caching" kuralı:
 *   "Every mutation must invalidate related cache patterns via deleteCache()
 *    or deleteCachePattern()."
 *
 * Pattern Konvansiyonu (cache.ts'te tanımlı):
 *   - `entity:list:*`       → list query cache'leri (filter/limit/offset)
 *   - `entity:detail:*`     → detail query cache'leri (slug/id bazlı)
 *   - `entity:{id}:*`       → entity-spesifik child cache'leri (place reviews, photos, vb.)
 *   - `entity:user:{id}`    → kullanıcı-spesifik aggregated cache (favoriler, takip)
 *   - `homepage:*`          → ana sayfa featured/recent widget cache'leri
 *
 * Tüm helper'lar `.catch(() => null)` ile non-fatal:
 *   - Redis erişim hatası mutation'ı bozmamalı (fail-open).
 *   - cache.ts içindeki `isRedisConnectionIssue` guard'ı zaten bağlantı sorunlarını yutar.
 *
 * HARD RULE #18 uyumlu: `deleteCache`/`deleteCachePattern` helper'ları `prefixKey()` uygular,
 * `sanliurfa:` namespace otomatik eklenir.
 */

import { deleteCache, deleteCachePattern } from './cache';

/**
 * Cache invalidate: belirli bir mekan (place) mutation sonrası.
 * Etkilenen alanlar: detail sayfası, list sayfaları, homepage featured,
 * search index, place-related child cache'ler (reviews, photos, likes).
 */
export async function invalidatePlace(placeId: string | null | undefined): Promise<void> {
  await Promise.all([
    deleteCachePattern('places:list:*').catch(() => null),
    deleteCachePattern('places:detail:*').catch(() => null),
    deleteCachePattern('places:category:*').catch(() => null),
    deleteCache('places:top_rated').catch(() => null),
    deleteCache('homepage:featured').catch(() => null),
    deleteCachePattern('search:*').catch(() => null),
    placeId ? deleteCachePattern(`place:${placeId}:*`).catch(() => null) : null,
  ]);
}

/**
 * Cache invalidate: tarif (recipe) mutation sonrası.
 */
export async function invalidateRecipe(slug?: string | null): Promise<void> {
  await Promise.all([
    deleteCachePattern('recipes:*').catch(() => null),
    deleteCache('homepage:featured').catch(() => null),
    slug ? deleteCache(`recipe:${slug}`).catch(() => null) : null,
  ]);
}

/**
 * Cache invalidate: etkinlik (event) mutation sonrası.
 */
export async function invalidateEvent(eventId?: string | null): Promise<void> {
  await Promise.all([
    deleteCachePattern('events:*').catch(() => null),
    deleteCache('homepage:featured').catch(() => null),
    eventId ? deleteCachePattern(`event:${eventId}:*`).catch(() => null) : null,
  ]);
}

/**
 * Cache invalidate: blog yazısı mutation sonrası (admin CRUD + scheduled publish + comment).
 */
export async function invalidateBlog(slug?: string | null): Promise<void> {
  await Promise.all([
    deleteCachePattern('blog:*').catch(() => null),
    deleteCachePattern('page:blog:index:*').catch(() => null),
    deleteCache('homepage:recent_posts').catch(() => null),
    slug ? deleteCachePattern(`page:blog:detail:${slug}*`).catch(() => null) : null,
  ]);
}

/**
 * Cache invalidate: tarihi yer (historical site) mutation sonrası.
 */
export async function invalidateHistoricalSite(siteId?: string | null): Promise<void> {
  await Promise.all([
    deleteCachePattern('historical-sites:*').catch(() => null),
    deleteCachePattern('historical_sites:*').catch(() => null),
    deleteCache('homepage:featured').catch(() => null),
    siteId ? deleteCachePattern(`historical-site:${siteId}:*`).catch(() => null) : null,
  ]);
}

/**
 * Cache invalidate: yorum (review) eklendi/silindi/güncellendi.
 * Place'in detail + list cache'leri etkilenir (rating/count değişti).
 */
export async function invalidateReview(
  placeId?: string | null,
  reviewId?: string | null,
): Promise<void> {
  await Promise.all([
    deleteCachePattern('places:detail:*').catch(() => null),
    deleteCachePattern('places:list:*').catch(() => null),
    placeId ? deleteCachePattern(`place:${placeId}:reviews:*`).catch(() => null) : null,
    placeId ? deleteCachePattern(`place:${placeId}:*`).catch(() => null) : null,
    reviewId ? deleteCachePattern(`review:${reviewId}:*`).catch(() => null) : null,
  ]);
}

/**
 * Cache invalidate: yorum (comment) eklendi/silindi.
 * Target type'a göre detail cache'i etkilenir.
 */
export async function invalidateComment(
  targetType: string,
  targetId: string,
): Promise<void> {
  const ops: Array<Promise<unknown>> = [
    deleteCachePattern(`comments:${targetType}:${targetId}:*`).catch(() => null),
  ];
  if (targetType === 'place') {
    ops.push(deleteCachePattern('places:detail:*').catch(() => null));
    ops.push(deleteCachePattern(`place:${targetId}:*`).catch(() => null));
  } else if (targetType === 'blog') {
    ops.push(deleteCachePattern('blog:*').catch(() => null));
    ops.push(deleteCachePattern(`page:blog:detail:${targetId}*`).catch(() => null));
  } else if (targetType === 'event') {
    ops.push(deleteCachePattern('events:*').catch(() => null));
  } else if (targetType === 'recipe') {
    ops.push(deleteCachePattern('recipes:*').catch(() => null));
  }
  await Promise.all(ops);
}

/**
 * Cache invalidate: favori toggle sonrası.
 * Kullanıcının favori listesi + opsiyonel place detail cache.
 */
export async function invalidateFavorite(
  userId: string,
  placeId?: string | null,
): Promise<void> {
  await Promise.all([
    deleteCachePattern(`favorites:${userId}:*`).catch(() => null),
    deleteCache(`favorites:user:${userId}`).catch(() => null),
    placeId ? deleteCachePattern(`place:${placeId}:*`).catch(() => null) : null,
  ]);
}

/**
 * Cache invalidate: kullanıcı takip toggle sonrası.
 */
export async function invalidateFollow(
  actorUserId: string,
  targetUserId: string,
): Promise<void> {
  await Promise.all([
    deleteCache(`followers:${targetUserId}`).catch(() => null),
    deleteCache(`following:${actorUserId}`).catch(() => null),
    deleteCachePattern(`user:profile:${actorUserId}*`).catch(() => null),
    deleteCachePattern(`user:profile:${targetUserId}*`).catch(() => null),
  ]);
}

/**
 * Cache invalidate: mekan takip (place follow) toggle sonrası.
 */
export async function invalidatePlaceFollow(
  userId: string,
  placeId: string,
): Promise<void> {
  await Promise.all([
    deleteCachePattern(`place:${placeId}:followers:*`).catch(() => null),
    deleteCachePattern(`user:${userId}:followed-places:*`).catch(() => null),
    deleteCache(`place:${placeId}:follower_count`).catch(() => null),
  ]);
}

/**
 * Cache invalidate: kullanıcı profil/ayar güncellemesi sonrası.
 */
export async function invalidateUser(userId: string): Promise<void> {
  await Promise.all([
    deleteCachePattern(`user:profile:${userId}*`).catch(() => null),
    deleteCachePattern(`user:settings:${userId}*`).catch(() => null),
    deleteCache(`user:${userId}`).catch(() => null),
  ]);
}

/**
 * Cache invalidate: rozet/puan/başarım kazanımı sonrası (gamification).
 * Hem user hem opsiyonel place cache'lerini etkiler.
 */
export async function invalidateGamification(
  userId?: string | null,
  placeId?: string | null,
): Promise<void> {
  await Promise.all([
    deleteCachePattern('leaderboard:*').catch(() => null),
    userId ? deleteCachePattern(`user:${userId}:badges:*`).catch(() => null) : null,
    userId ? deleteCachePattern(`user:${userId}:achievements:*`).catch(() => null) : null,
    userId ? deleteCache(`points:user:${userId}`).catch(() => null) : null,
    userId ? deleteCache(`tier:user:${userId}`).catch(() => null) : null,
    placeId ? deleteCachePattern(`place:${placeId}:badges:*`).catch(() => null) : null,
    placeId ? deleteCachePattern(`place:${placeId}:*`).catch(() => null) : null,
  ]);
}

/**
 * Cache invalidate: bildirim oluşturuldu/okundu.
 */
export async function invalidateNotification(userId: string): Promise<void> {
  await Promise.all([
    deleteCache(`notifications:unread:${userId}`).catch(() => null),
    deleteCachePattern(`notifications:${userId}:*`).catch(() => null),
  ]);
}

/**
 * Cache invalidate: fotoğraf upload/delete sonrası.
 */
export async function invalidatePhoto(placeId?: string | null): Promise<void> {
  await Promise.all([
    placeId ? deleteCachePattern(`photos:place:${placeId}*`).catch(() => null) : null,
    placeId ? deleteCachePattern(`place:${placeId}:*`).catch(() => null) : null,
    deleteCachePattern('places:detail:*').catch(() => null),
  ]);
}
