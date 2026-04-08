/**
 * Delete Webhook API
 * DELETE: Remove a webhook
 */

import type { APIRoute } from 'astro';
import { deleteWebhook } from '../../../lib/webhooks';
import { apiResponse, apiError, HttpStatus, ErrorCode } from '../../../lib/api';
import { logger } from '../../../lib/logging';

export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    if (!locals.user) {
      return apiError(ErrorCode.AUTH_REQUIRED, 'Authentication required', HttpStatus.UNAUTHORIZED);
    }

    const { id } = params;

    if (!id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Webhook ID required', HttpStatus.BAD_REQUEST);
    }

    await deleteWebhook(locals.user.id, id);

    return apiResponse(
      {
        success: true,
        message: 'Webhook deleted successfully'
      },
      HttpStatus.OK
    );
  } catch (error) {
    logger.error('Delete webhook failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to delete webhook', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};
