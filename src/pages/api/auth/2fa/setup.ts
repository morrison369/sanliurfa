/**
 * 2FA Setup Endpoint
 * Initialize two-factor authentication method
 */

import type { APIRoute } from 'astro';
import { create2FAMethod } from '../../../../lib/two-factor-auth';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  logger.setRequestId(requestId);

  try {
    // Auth check
    if (!locals.user) {
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required', HttpStatus.UNAUTHORIZED, undefined, requestId);
    }

    const body = await request.json();
    const { method_type, method_identifier } = body;

    if (!method_type || !['totp', 'email', 'sms'].includes(method_type)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Invalid method type', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    if (method_type !== 'totp' && !method_identifier) {
      return apiError(ErrorCode.VALIDATION_ERROR, `${method_type} identifier required`, HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }

    // Create 2FA method
    const method = await create2FAMethod(
      locals.user.id,
      method_type,
      method_identifier || ''
    );

    if (!method) {
      return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create 2FA method', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
    }

    logger.info('2FA method setup initiated', { userId: locals.user.id, methodType: method_type });

    const response: any = {
      success: true,
      data: {
        method_id: method.id,
        method_type: method.method_type,
        backup_codes_count: method.backup_codes?.length || 0
      }
    };

    // For TOTP, include QR code data
    if (method_type === 'totp') {
      response.data.totp_uri = `otpauth://totp/Sanliurfa:${locals.user.email}?secret=${method.secret_key}&issuer=Sanliurfa`;
      response.data.secret_key = method.secret_key;
    }

    return apiResponse(response, HttpStatus.CREATED, requestId);
  } catch (error) {
    logger.error('2FA setup failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Setup failed', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
