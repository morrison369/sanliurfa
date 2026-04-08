/**
 * Create Review
 * POST /api/reviews/post - Create a new review with quota checking
 */

import type { APIRoute } from 'astro';
import { insert, queryOne, update as updateDb } from '../../../lib/postgres';
import { checkQuota, incrementUsage } from '../../../lib/usage-tracking';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logging';
import { recordRequest } from '../../../lib/metrics';
import { validateWithSchema } from '../../../lib/validation';
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
} as any;

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId({ request } as any);
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

    // CHECK QUOTA - Reviews are limited for free tier users
    const quotaStatus = await checkQuota(locals.user.id, 'UNLIMITED_REVIEWS');

    if (!quotaStatus.canUse) {
      recordRequest('POST', '/api/reviews/post', HttpStatus.FORBIDDEN, Date.now() - startTime);
      return apiError(
        ErrorCode.FORBIDDEN,
        `Aylık yorum kotanız tükendi. Sıfırlanması: 30 gün sonra. (${quotaStatus.current}/${quotaStatus.limit})`,
        HttpStatus.FORBIDDEN,
        undefined,
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

    // Increment quota usage
    const newUsage = await incrementUsage(locals.user.id, 'UNLIMITED_REVIEWS', 1);

    // Award points
    await insert('points_transactions', {
      user_id: locals.user.id,
      amount: 50,
      type: 'earn',
      reason: 'Yorum yapıldı',
      reference_id: review.id,
      created_at: new Date().toISOString(),
    });

    // Update user points
    const user = await queryOne(
      'SELECT points FROM users WHERE id = $1',
      [locals.user.id]
    );

    await updateDb('users', locals.user.id, {
      points: (user?.points || 0) + 50,
    });

    // Invalidate caches
    await deleteCache(`sanliurfa:reviews:${placeId}`);
    await deleteCache(`sanliurfa:places:${placeId}`);

    recordRequest('POST', '/api/reviews/post', HttpStatus.CREATED, Date.now() - startTime);
    logger.logMutation('create', 'reviews', review.id, locals.user.id);

    return apiResponse(
      {
        success: true,
        review,
        pointsEarned: 50,
        quotaStatus: {
          current: newUsage,
          limit: quotaStatus.limit,
          remaining: quotaStatus.limit ? quotaStatus.limit - newUsage : null,
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
