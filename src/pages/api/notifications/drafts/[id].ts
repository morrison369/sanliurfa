/**
 * Admin - Delete notification draft
 */

import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logger';

export const DELETE: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId({ request } as any);

  try {
    if (!locals.isAdmin) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const { id } = params;
    if (!id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'ID zorunludur', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    try {
      await query('DELETE FROM notification_drafts WHERE id = $1', [id]);
    } catch {
      // Table doesn't exist — nothing to delete
    }

    logger.info('Notification draft deleted', { id });
    return apiResponse({ deleted: true }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Notification draft delete failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Taslak silinemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
