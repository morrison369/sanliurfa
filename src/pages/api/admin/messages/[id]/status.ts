// API: Update contact message status (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { query } from '../../../../../lib/postgres';
import { getRequestId, HttpStatus, apiError, apiResponse, ErrorCode } from '../../../../../lib/api';
import { logger } from '../../../../../lib/logging';
import { recordRequest } from '../../../../../lib/metrics';
import { withAdminOpsWriteAccess } from '../../../../../lib/admin-ops-access';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    return await withAdminOpsWriteAccess({
      request,
      locals,
      endpoint: '/api/admin/messages/[id]/status',
      requestId,
      startTime,
      onDenied: (_response, statusCode, duration) => {
        recordRequest('POST', '/api/admin/messages/[id]/status', statusCode, duration);
      },
      onSuccess: (_response, duration) => {
        recordRequest('POST', '/api/admin/messages/[id]/status', HttpStatus.OK, duration);
      }
    }, async () => {
      const { id } = params;
      const formData = await request.formData();
      const status = formData.get('status')?.toString();

      if (!status || !['new', 'read', 'replied', 'archived'].includes(status)) {
        recordRequest('POST', '/api/admin/messages/[id]/status', HttpStatus.BAD_REQUEST, Date.now() - startTime);
        return apiError(
          ErrorCode.VALIDATION_ERROR,
          'Invalid status',
          HttpStatus.BAD_REQUEST,
          undefined,
          requestId
        );
      }

      await query(
        'UPDATE contact_messages SET status = $1, updated_at = $2 WHERE id = $3',
        [status, new Date().toISOString(), id]
      );

      return apiResponse(
        { success: true },
        HttpStatus.OK,
        requestId
      );
    });
  } catch (err) {
    logger.error('Message status update error', err instanceof Error ? err : new Error(String(err)));
    recordRequest('POST', '/api/admin/messages/[id]/status', HttpStatus.INTERNAL_SERVER_ERROR, Date.now() - startTime);
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Server error',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
