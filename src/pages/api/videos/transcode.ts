/**
 * Video Transcoding Endpoint
 * Create and manage transcoding jobs
 */

import type { APIRoute } from 'astro';
import { createTranscodingJob, getPendingTranscodingJobs, getTranscodingStats } from '../../../lib/video-processing';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { video_file_id, quality, codec, bitrate, resolution } = body;

    if (!video_file_id || !quality || !codec || !bitrate || !resolution) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Missing parameters', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    const job = await createTranscodingJob(video_file_id, quality, codec, bitrate, resolution);

    if (!job) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create job', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    return apiResponse({ success: true, data: job }, HttpStatus.CREATED, requestId);
  } catch (error) {
    logger.error('Failed to create transcoding job', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
