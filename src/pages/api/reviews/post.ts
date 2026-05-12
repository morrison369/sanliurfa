/**
 * Create Review
 * POST /api/reviews/post - Create a new review with quota checking
 */

import type { APIRoute } from 'astro';
import { insert, query, queryOne } from '../../../lib/postgres';
import { checkAndIncrementQuota } from '../../../lib/usage/usage-tracking';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { validateWithSchema, type ValidationSchema } from '../../../lib/validation';
import { deleteCache } from '../../../lib/cache';

const createReviewSchema = {
  placeId: {
    type: 'string' as const,
    required: true,
    minLength: 36,
    maxLength: 36,
  },
  rating: {
    type: 'number' as const,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: 'string' as const,
    required: false,
    maxLength: 200,
  },
  content: {
    type: 'string' as const,
    required: true,
    minLength: 10,
    maxLength: 5000,
    sanitize: true,
  },
} as ValidationSchema;

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);
  const startTime = Date.now();
  logger.setRequestId(requestId);

  try {
    // Check authentication
    if (!locals.user) {
      recordRequest('POST', '/api/reviews/post', HttpStatus.UNAUTHORIZED, Date.now() - startTime);
      return apiError(
        ErrorCode.UNAUTHORIZED,
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        undefined,
        requestId
      );
    }

    // Validate request body
    const body = await request.json();
    const validation = validateWithSchema(body, createReviewSchema);

    if (!validation.valid) {
      recordRequest('POST', '/api/reviews/post', HttpStatus.UNPROCESSABLE_ENTITY, Date.now() - startTime);
      return apiError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        HttpStatus.UNPROCESSABLE_ENTITY,
        validation.errors,
        requestId
      );
    }

    const { placeId, rating, title, content } = validation.data;

    // Verify place exists
    const place = await queryOne(
      'SELECT id FROM places WHERE id = $1',
      [placeId]
    );

    if (!place) {
      recordRequest('POST', '/api/reviews/post', HttpStatus.NOT_FOUND, Date.now() - startTime);
      return apiError(
        ErrorCode.NOT_FOUND,
        'Place not found',
        HttpStatus.NOT_FOUND,
        undefined,
        requestId
      );
    }

    // Atomic quota check + increment (HARD RULE #47) — prevents race condition where
    // concurrent requests both pass checkQuota and both create reviews beyond the limit.
    const quotaResult = await checkAndIncrementQuota(locals.user.id, 'UNLIMITED_REVIEWS');
    if (!quotaResult.allowed) {
      recordRequest('POST', '/api/reviews/post', HttpStatus.FORBIDDEN, Date.now() - startTime);
      const limit = quotaResult.limit ?? '?';
      return apiError(
        ErrorCode.FORBIDDEN,
        `Aylık yorum kotanız tükendi. Sıfırlanması: 30 gün sonra. (${quotaResult.current}/${limit})`,
        HttpStatus.FORBIDDEN,
        undefined,
        requestId
      );
    }

    // Create review
    const review = await insert('reviews', {
      place_id: placeId,
      user_id: locals.user.id,
      rating,
      title: title || `Rating: ${rating}`,
      content,
      is_approved: true,
      created_at: new Date().toISOString(),
    });

    const newUsage = quotaResult.current;

    // Award points
    await insert('points_transactions', {
      user_id: locals.user.id,
      amount: 50,
      type: 'earn',
      reason: 'Yorum yapıldı',
      reference_id: review.id,
      created_at: new Date().toISOString(),
    });

    // Atomic points increment — avoids SELECT+UPDATE race condition (HARD RULE #47)
    await query(
      'UPDATE users SET points = COALESCE(points, 0) + 50 WHERE id = $1',
      [locals.user.id]
    );

    // Invalidate caches (paralel)
    await Promise.all([
      deleteCache(`reviews:${placeId}`),
      deleteCache(`places:${placeId}`),
      deleteCache(`user:profile:${locals.user.id}`),
    ]);

    recordRequest('POST', '/api/reviews/post', HttpStatus.CREATED, Date.now() - startTime);
    logger.logMutation('create', 'reviews', review.id, locals.user.id);

    return apiResponse(
      {
        success: true,
        review,
        pointsEarned: 50,
        quotaStatus: {
          current: newUsage,
          limit: quotaResult.limit,
          remaining: quotaResult.limit ? quotaResult.limit - newUsage : null,
        },
      },
      HttpStatus.CREATED,
      requestId
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    recordRequest('POST', '/api/reviews/post', HttpStatus.INTERNAL_SERVER_ERROR, duration);
    logger.error('Failed to create review', error instanceof Error ? error : new Error(String(error)));
    return apiError(
      ErrorCode.INTERNAL_ERROR,
      'Failed to create review',
      HttpStatus.INTERNAL_SERVER_ERROR,
      undefined,
      requestId
    );
  }
};
