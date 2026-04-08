/**
 * Create Promotion/Coupon
 * POST /api/promotions/create - Create a new promotion (Pro+ only)
 */

import type { APIRoute } from 'astro';
import { insert, queryOne } from '../../../lib/postgres';
import { hasFeatureAccess } from '../../../lib/feature-gating';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { validateWithSchema } from '../../../lib/validation';
import { deleteCache } from '../../../lib/cache';

const createPromotionSchema = {
  placeId: {
    type: 'string' as const,
    required: true,
    minLength: 36,
    maxLength: 36,
  },
  couponCode: {
    type: 'string' as const,
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: '^[A-Z0-9_-]+$',
  },
  discountType: {
    type: 'string' as const,
    required: true,
    pattern: '^(percentage|fixed)$',
  },
  discountValue: {
    type: 'number' as const,
    required: true,
    min: 0,
    max: 100,
  },
  maxUses: {
    type: 'number' as const,
    required: false,
    min: 1,
  },
  expiresAt: {
    type: 'string' as const,
    required: false,
  },
  description: {
    type: 'string' as const,
    required: false,
    maxLength: 500,
  },
} as any;

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check authentication
    if (!locals.user) {
      recordRequest('POST', '/api/promotions/create', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // CHECK FEATURE ACCESS - Promotions require Pro tier or higher
    const hasCreatePromotionAccess = await hasFeatureAccess(locals.user.id, 'CREATE_PROMOTIONS');

    if (!hasCreatePromotionAccess) {
      recordRequest('POST', '/api/promotions/create', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'Promosyon oluşturmak için Pro plana yükseltin',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateWithSchema(body, createPromotionSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/promotions/create', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { placeId, couponCode, discountType, discountValue, maxUses, expiresAt, description } =
      validation.data;

    // Verify place belongs to user
    const place = await queryOne(
      'SELECT id, owner_id FROM places WHERE id = $1',
      [placeId]
    );

    if (!place || place.owner_id !== locals.user.id) {
      recordRequest('POST', '/api/promotions/create', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        'This place does not belong to you',
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Create promotion
    const promotion = await insert('promotions', {
      place_id: placeId,
      coupon_code: couponCode.toUpperCase(),
      discount_type: discountType,
      discount_value: discountValue,
      max_uses: maxUses || null,
      expires_at: expiresAt || null,
      description,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    // Invalidate cache
    await deleteCache(`sanliurfa:places:${placeId}:promotions`);

    recordRequest('POST', '/api/promotions/create', HttpStatus.CREATED, Date.now() - startTime);
    logger.logMutation('create', 'promotions', promotion.id, locals.user.id);

    return apiResponse(
      {
        success: true,
        promotion,
        message: 'Promosyon başarıyla oluşturuldu',
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/promotions/create', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to create promotion', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create promotion',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
