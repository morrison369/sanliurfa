/**
 * Admin - List notification drafts
 */

import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logger';

export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);

  try {
    if (!locals.isAdmin) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    let drafts: any[] = [];
    try {
      const result = await query(
        `SELECT d.*, u.full_name as creator_name
         FROM notification_drafts d
         LEFT JOIN users u ON u.id = d.created_by
         ORDER BY d.updated_at DESC
         LIMIT 100`,
        []
      );
      drafts = result.rows;
    } catch {
      // Table doesn't exist yet
    }

    return apiResponse({ drafts }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Notification drafts list failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Taslaklar alınamadı', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
