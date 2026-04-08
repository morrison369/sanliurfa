import type { APIRoute } from 'astro';
import { pool } from '../../../lib/postgres';
import { getWebhookAuditHistory, getUserActivitySummary } from '../../../lib/webhook-audit';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

/**
 * GET /api/webhooks/audit?webhookId=xxx&summary=true
 * Get audit logs or activity summary
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const url = new URL(request.url);
    const webhookId = url.searchParams.get('webhookId');
    const summary = url.searchParams.get('summary') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (summary) {
      // Return activity summary
      const activitySummary = await getUserActivitySummary(pool, locals.user.id);
      return apiResponse(
        { success: true, data: activitySummary },
        HttpStatus.OK,
        requestId
      );
    }

    if (!webhookId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID required', HttpStatus.BAD_REQUEST);
    }

    // Return audit logs
    const { logs, total } = await getWebhookAuditHistory(pool, webhookId, locals.user.id, limit, offset);

    return apiResponse(
      {
        success: true,
        data: logs,
        pagination: {
          limit,
          offset,
          total,
          pages: Math.ceil(total / limit)
        }
      },
      HttpStatus.OK,
      requestId
    );
  } catch (error) {
    logger.error('Failed to get audit logs', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to get audit logs', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
