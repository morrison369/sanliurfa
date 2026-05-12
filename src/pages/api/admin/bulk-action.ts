/**
 * POST /api/admin/bulk-action
 * Body: { action: string, items: string[], type?: string }
 * Supported actions: delete, approve, reject, activate, deactivate, ban, unban,
 *                    publish, unpublish, archive, restore, feature, unfeature
 *
 * Response:
 *   { success, affected, action, count,
 *     skipped, skipped_details: [{ id, reason }] }
 * Reasons: 'invalid_uuid_format' | 'not_found_or_already_in_state'
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId, safeErrorDetail } from '../../../lib/api';
import { logger } from '../../../lib/logger';
import { deleteCachePattern } from '../../../lib/cache';

const SUPPORTED_ACTIONS = new Set([
  'delete', 'approve', 'reject', 'activate', 'deactivate', 'ban', 'unban',
  'publish', 'unpublish', 'archive', 'restore', 'feature', 'unfeature',
]);

interface SkipDetail { id: string; reason: 'invalid_uuid_format' | 'not_found_or_already_in_state'; }

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);

  try {
    if (locals.user?.role !== 'admin') {
      return apiError(ErrorCode.FORBIDDEN, 'Admin erişimi gerekli', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { action, items, type } = body;

    if (!action || !SUPPORTED_ACTIONS.has(action)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz işlem', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    if (!Array.isArray(items) || items.length === 0) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Öğe listesi boş olamaz', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    if (items.length > 500) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'En fazla 500 öğe işlenebilir', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Sanitize IDs — sadece UUID formatına izin ver. Format dışı olanlar
    // skipped_details'a `invalid_uuid_format` reason'ı ile dahil edilir.
    const safeItems = items.filter(
      (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id),
    );
    const skippedInvalid: SkipDetail[] = items
      .filter((id: unknown) => !safeItems.includes(id as string))
      .map((id: unknown) => ({ id: String(id), reason: 'invalid_uuid_format' as const }));

    if (safeItems.length === 0) {
      return apiResponse(
        { success: true, affected: 0, action, count: items.length, skipped: items.length, skipped_details: skippedInvalid },
        HttpStatus.OK,
        requestId,
      );
    }

    // Resource type → table + status column
    const VALID_RESOURCE_TYPES = new Set(['places', 'reviews', 'users', 'blog_posts', 'events', 'photos']);
    const resourceType = type && VALID_RESOURCE_TYPES.has(type) ? type : 'places';
    const tableMap: Record<string, string> = {
      places: 'places', reviews: 'reviews', users: 'users',
      blog_posts: 'blog_posts', events: 'events', photos: 'photos',
    };
    const table = tableMap[resourceType] || 'places';
    const usesStatusCol = table === 'places' || table === 'users';

    const placeholders = safeItems.map((_, i) => `$${i + 1}`).join(', ');

    // Action → SQL eşleştirme. Her UPDATE `RETURNING id` döner — etkilenen
    // ID'ler `affectedIds`'e geçer; `safeItems - affectedIds` = "DB'de yok veya
    // zaten hedef state'te" olarak skipped_details'a eklenir.
    let sql: string | null = null;
    switch (action) {
      case 'delete':
        if (table === 'users') {
          sql = `UPDATE users SET status = 'deleted', deleted_at = NOW() WHERE id IN (${placeholders}) RETURNING id`;
        } else if (usesStatusCol) {
          sql = `UPDATE ${table} SET status = 'inactive' WHERE id IN (${placeholders}) RETURNING id`;
        } else {
          sql = `UPDATE ${table} SET is_active = false WHERE id IN (${placeholders}) RETURNING id`;
        }
        break;
      case 'approve':
      case 'activate':
      case 'publish':
      case 'restore':
        sql = usesStatusCol
          ? `UPDATE ${table} SET status = 'active' WHERE id IN (${placeholders}) RETURNING id`
          : `UPDATE ${table} SET is_active = true WHERE id IN (${placeholders}) RETURNING id`;
        break;
      case 'reject':
      case 'deactivate':
      case 'unpublish':
      case 'archive':
        sql = usesStatusCol
          ? `UPDATE ${table} SET status = 'inactive' WHERE id IN (${placeholders}) RETURNING id`
          : `UPDATE ${table} SET is_active = false WHERE id IN (${placeholders}) RETURNING id`;
        break;
      case 'ban':
        sql = `UPDATE users SET is_banned = true, banned_at = NOW() WHERE id IN (${placeholders}) RETURNING id`;
        break;
      case 'unban':
        sql = `UPDATE users SET is_banned = false, banned_at = NULL WHERE id IN (${placeholders}) RETURNING id`;
        break;
      case 'feature':
        sql = `UPDATE ${table} SET is_featured = true WHERE id IN (${placeholders}) RETURNING id`;
        break;
      case 'unfeature':
        sql = `UPDATE ${table} SET is_featured = false WHERE id IN (${placeholders}) RETURNING id`;
        break;
    }

    let affectedIds: string[] = [];
    if (sql) {
      const result = await query<{ id: string }>(sql, safeItems);
      affectedIds = result.rows.map((r) => r.id);
    }
    const affected = affectedIds.length;

    const skippedNotFound: SkipDetail[] = safeItems
      .filter((id) => !affectedIds.includes(id))
      .map((id) => ({ id, reason: 'not_found_or_already_in_state' as const }));

    const skippedDetails: SkipDetail[] = [...skippedInvalid, ...skippedNotFound];

    // Cache invalidation (HARD RULE — mutation sonrası)
    const cachePatterns: Record<string, string> = {
      places: 'places:*',
      reviews: 'reviews:*',
      users: 'user:*',
      blog_posts: 'blog:*',
      events: 'events:*',
      photos: 'places:*',
    };
    const cachePattern = cachePatterns[resourceType];
    if (cachePattern) {
      await deleteCachePattern(cachePattern).catch(() => null);
    }

    logger.info('Bulk action executed', {
      action, type: table, count: affected, skipped: skippedDetails.length, adminId: locals.user?.id,
    });

    return apiResponse({
      success: true,
      affected,
      action,
      count: items.length,
      skipped: skippedDetails.length,
      skipped_details: skippedDetails,
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Bulk action failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      safeErrorDetail(error, 'Toplu işlem başarısız'),
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId,
    );
  }
};
