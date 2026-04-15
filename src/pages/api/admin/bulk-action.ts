/**
 * POST /api/admin/bulk-action
 * Body: { action: string, items: string[] }
 * Supported actions: delete, approve, reject, activate, deactivate, ban, unban
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logger';

const SUPPORTED_ACTIONS = new Set([
  'delete', 'approve', 'reject', 'activate', 'deactivate', 'ban', 'unban',
  'publish', 'unpublish', 'archive', 'restore', 'feature', 'unfeature',
]);

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);

  try {
    if (!locals.isAdmin) {
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

    // Sanitize IDs — only allow UUID format
    const safeItems = items.filter((id: any) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id));
    if (safeItems.length === 0) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz öğe ID formatı', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const placeholders = safeItems.map((_: any, i: number) => `$${i + 1}`).join(', ');
    let affected = 0;

    // Determine table + field based on action and type hint
    const resourceType = type || 'places';
    const tableMap: Record<string, string> = {
      places: 'places', reviews: 'reviews', users: 'users',
      blog_posts: 'blog_posts', events: 'events', photos: 'photos',
    };
    const table = tableMap[resourceType] || 'places';

    switch (action) {
      case 'delete':
        if (table === 'users') {
          const result = await query(
            `UPDATE users SET is_active = false, deleted_at = NOW() WHERE id IN (${placeholders})`,
            safeItems
          );
          affected = result.rowCount ?? 0;
        } else {
          const result = await query(
            `UPDATE ${table} SET is_active = false WHERE id IN (${placeholders})`,
            safeItems
          );
          affected = result.rowCount ?? 0;
        }
        break;
      case 'approve':
      case 'activate':
      case 'publish':
      case 'restore':
        const activateResult = await query(
          `UPDATE ${table} SET is_active = true WHERE id IN (${placeholders})`,
          safeItems
        );
        affected = activateResult.rowCount ?? 0;
        break;
      case 'reject':
      case 'deactivate':
      case 'unpublish':
      case 'archive':
        const deactivateResult = await query(
          `UPDATE ${table} SET is_active = false WHERE id IN (${placeholders})`,
          safeItems
        );
        affected = deactivateResult.rowCount ?? 0;
        break;
      case 'ban':
        const banResult = await query(
          `UPDATE users SET is_banned = true, banned_at = NOW() WHERE id IN (${placeholders})`,
          safeItems
        );
        affected = banResult.rowCount ?? 0;
        break;
      case 'unban':
        const unbanResult = await query(
          `UPDATE users SET is_banned = false, banned_at = NULL WHERE id IN (${placeholders})`,
          safeItems
        );
        affected = unbanResult.rowCount ?? 0;
        break;
      case 'feature':
        const featureResult = await query(
          `UPDATE ${table} SET is_featured = true WHERE id IN (${placeholders})`,
          safeItems
        );
        affected = featureResult.rowCount ?? 0;
        break;
      case 'unfeature':
        const unfeatureResult = await query(
          `UPDATE ${table} SET is_featured = false WHERE id IN (${placeholders})`,
          safeItems
        );
        affected = unfeatureResult.rowCount ?? 0;
        break;
    }

    logger.info('Bulk action executed', { action, type: table, count: affected, adminId: locals.user?.id });
    return apiResponse({ success: true, affected, action, count: safeItems.length }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Bulk action failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Toplu işlem başarısız', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
