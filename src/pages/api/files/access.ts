/**
 * File Access & Analytics Endpoint
 * Track file access and get statistics
 */

import type { APIRoute } from 'astro';
import { getFileById, recordFileAccess, getFileAccessStats } from '../../../lib/file-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const fileId = url.searchParams.get('file_id');
    const days = parseInt(url.searchParams.get('days') || '30');

    if (!fileId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'File ID required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const file = await getFileById(fileId);
    if (!file || (file.uploaded_by_user_id !== locals.user.id && !locals.isAdmin)) {
      return apiError(ErrorCode.FORBIDDEN, 'Cannot access this file', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const stats = await getFileAccessStats(fileId, days);

    return apiResponse({
      success: true,
      data: { file, stats }
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to get file access stats', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};

export const POST: APIRoute = async ({ request, locals, url }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    const fileId = url.searchParams.get('file_id');
    const ipAddress = (request.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || '';

    if (!fileId) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'File ID required', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    await recordFileAccess(fileId, locals.user?.id || null, ipAddress, userAgent);

    return apiResponse({
      success: true,
      data: { message: 'Access recorded' }
    }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Failed to record file access', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
