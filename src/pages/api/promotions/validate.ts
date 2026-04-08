/**
 * Validate Coupon Code
 * POST /api/promotions/validate - Validate and apply a coupon code
 */

import type { APIRoute } from 'astro';
import { validatePromotion } from '../../../lib/promotions-management';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { validateWithSchema } from '../../../lib/validation';

const validateSchema = {
  couponCode: {
    type: 'string' as const,
    required: true,
    minLength: 2,
    maxLength: 50,
    sanitize: true
  },
  purchaseAmount: {
    type: 'number' as const,
    required: true,
    min: 0
  }
} as any;

export const POST: APIRoute = async ({ request }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    const body = await request.json();

    const validation = validateWithSchema(body, validateSchema);
    if (!validation.valid) {
      recordRequest('POST', '/api/promotions/validate', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { couponCode, purchaseAmount } = validation.data;

    const result = await validatePromotion(couponCode, purchaseAmount);

    recordRequest(
      'POST',
      '/api/promotions/validate',
      result.valid ? HttpStatus.OK : HttpStatus.BAD_REQUEST,
      Date.now() - startTime
    );

    if (!result.valid) {
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        result.message,
        HttpStatus.BAD_REQUEST,
        undefined,
        requestId
      );
    }

    return apiResponse({
      success: true,
      valid: true,
      discount: result.discount,
      promotion: result.promotion,
      message: result.message
    }, HttpStatus.OK, requestId);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/promotions/validate', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to validate promotion', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to validate promotion',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
