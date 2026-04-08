/**
 * API: Publish Content
 * POST - Publish content
 */
import type { APIRoute } from 'astro';
import { publishContent, getContentById } from '../../../../lib/content-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { recordRequest } from '../../../../lib/metrics';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, params, locals }) => {
  const requestId = getRequestId(request as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    if (!locals.user?.id) {
      recordRequest('POST', `/api/content/${params.contentId}/publish`, HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const { contentId } = params;
    const success = await publishContent(contentId as string, locals.user.id);

    if (!success) {
      recordRequest('POST', `/api/content/${contentId}/publish`, HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(ErrorCode.FORBIDDEN, 'Access denied', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const content = await getContentById(contentId as string);
    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/content/${contentId}/publish`, HttpStatus.OK, duration);

    return apiResponse(
      {
        success: true,
        data: content,
        message: 'Content published successfully'
      },
      HttpStatus.OK,
      requestId
    );
  } catch (err) {
    const duration = Date.now() - startTime;
    recordRequest('POST', `/api/content/${params.contentId}/publish`, HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to publish content', err instanceof Error ? err : new Error(String(err)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
