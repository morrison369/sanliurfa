/**
 * Review Management System
 * Owner responses, helpful votes, sentiment tracking
 */

import { query, queryOne, queryRows, insert, update } from './postgres';
import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';
import { createNotification } from './notifications-queue';
import { logger } from './logging';
import { awardPoints } from './loyalty-system';

export interface ReviewResponse {
  id: string;
  review_id: string;
  place_id: string;
  owner_id: string;
  response_text: string;
  is_public: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Add response to a review
 */
export async function addReviewResponse(
  reviewId: string,
  placeId: string,
  ownerId: string,
  responseText: string
): Promise<ReviewResponse> {
  try {
    // Verify ownership
    const place = await queryOne('SELECT user_id FROM places WHERE id = $1', [placeId]);
    if (!place || place.user_id !== ownerId) {
      throw new Error('Access denied');
    }

    const response = await insert('review_responses', {
      review_id: reviewId,
      place_id: placeId,
      owner_id: ownerId,
      response_text: responseText,
      is_public: true
    });

    // Clear review caches
    await deleteCachePattern(`sanliurfa:review:${reviewId}:*`);
    await deleteCachePattern(`sanliurfa:place:${placeId}:reviews:*`);

    // Get reviewer info to send notification
    const review = await queryOne('SELECT user_id FROM reviews WHERE id = $1', [reviewId]);
    if (review) {
      const ownerUser = await queryOne('SELECT full_name FROM users WHERE id = $1', [ownerId]);
      const ownerName = ownerUser?.full_name || 'İşletme Sahibi';

      await createNotification(
        review.user_id,
        `${ownerName} yorumunuza yanıt verdi`,
        responseText.substring(0, 100) + '...',
        'comment',
        {
          actionUrl: `/yer/${placeId}?reviewId=${reviewId}#responses`,
          actionLabel: 'Yanıtı Gör'
        }
      );
    }

    logger.info('Review response added', { reviewId, placeId, ownerId });
    return response;
  } catch (error) {
    logger.error('Failed to add review response', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get responses for a review
 */
export async function getReviewResponses(reviewId: string): Promise<ReviewResponse[]> {
  const cacheKey = `sanliurfa:review:${reviewId}:responses`;

  try {
    const cached = await getCache<ReviewResponse[]>(cacheKey);
    if (cached) return cached;

    const responses = await queryRows(
      `SELECT * FROM review_responses
       WHERE review_id = $1 AND is_public = true
       ORDER BY created_at DESC`,
      [reviewId]
    );

    await setCache(cacheKey, responses, 600);
    return responses;
  } catch (error) {
    logger.error('Failed to get review responses', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Vote on review helpfulness
 */
export async function voteReviewHelpful(
  reviewId: string,
  userId: string,
  isHelpful: boolean
): Promise<{ helpful_count: number; unhelpful_count: number }> {
  try {
    // Insert or update vote
    await query(
      `INSERT INTO review_helpful_votes (review_id, user_id, is_helpful)
       VALUES ($1, $2, $3)
       ON CONFLICT (review_id, user_id)
       DO UPDATE SET is_helpful = $3`,
      [reviewId, userId, isHelpful]
    );

    // Update analytics
    const counts = await queryOne(
      `SELECT
        SUM(CASE WHEN is_helpful = true THEN 1 ELSE 0 END) as helpful_count,
        SUM(CASE WHEN is_helpful = false THEN 1 ELSE 0 END) as unhelpful_count
       FROM review_helpful_votes
       WHERE review_id = $1`,
      [reviewId]
    );

    await update(
      'review_analytics',
      { review_id: reviewId },
      {
        helpful_count: parseInt(counts?.helpful_count || '0'),
        unhelpful_count: parseInt(counts?.unhelpful_count || '0')
      }
    );

    // Clear cache
    await deleteCache(`sanliurfa:review:${reviewId}:helpful-count`);
    await deleteCachePattern(`sanliurfa:review:${reviewId}:*`);

    // Award points for helpful votes
    if (isHelpful) {
      const review = await queryOne('SELECT user_id FROM reviews WHERE id = $1', [reviewId]);
      if (review) {
        await awardPoints(review.user_id, 1, 'Review marked helpful', 'review', reviewId).catch(() => {});
      }
    }

    logger.info('Review helpful vote recorded', { reviewId, userId, isHelpful });

    return {
      helpful_count: parseInt(counts?.helpful_count || '0'),
      unhelpful_count: parseInt(counts?.unhelpful_count || '0')
    };
  } catch (error) {
    logger.error('Failed to record helpful vote', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get review analytics
 */
export async function getReviewAnalytics(reviewId: string): Promise<any | null> {
  const cacheKey = `sanliurfa:review:${reviewId}:analytics`;

  try {
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const analytics = await queryOne(
      'SELECT * FROM review_analytics WHERE review_id = $1',
      [reviewId]
    );

    if (analytics) {
      await setCache(cacheKey, analytics, 600);
    }
    return analytics;
  } catch (error) {
    logger.error('Failed to get review analytics', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get place review analytics summary
 */
export async function getPlaceReviewSummary(placeId: string): Promise<any> {
  const cacheKey = `sanliurfa:place:${placeId}:review-summary`;

  try {
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const summary = await queryOne(
      `SELECT
        COUNT(r.id) as total_reviews,
        AVG(r.rating) as avg_rating,
        SUM(CASE WHEN r.rating >= 4 THEN 1 ELSE 0 END) as positive_count,
        SUM(CASE WHEN r.rating <= 2 THEN 1 ELSE 0 END) as negative_count,
        SUM(ra.helpful_count) as total_helpful_votes,
        COUNT(rr.id) as responses_count
       FROM reviews r
       LEFT JOIN review_analytics ra ON r.id = ra.review_id
       LEFT JOIN review_responses rr ON r.id = rr.review_id AND rr.is_public = true
       WHERE r.place_id = $1`,
      [placeId]
    );

    if (summary) {
      await setCache(cacheKey, summary, 3600);
    }
    return summary;
  } catch (error) {
    logger.error('Failed to get review summary', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get top reviews for a place
 */
export async function getTopReviewsForPlace(
  placeId: string,
  limit: number = 5
): Promise<any[]> {
  try {
    const reviews = await queryRows(
      `SELECT
        r.*,
        ra.helpful_count,
        ra.sentiment_label,
        ra.quality_score,
        COUNT(rr.id) as response_count
       FROM reviews r
       LEFT JOIN review_analytics ra ON r.id = ra.review_id
       LEFT JOIN review_responses rr ON r.id = rr.review_id AND rr.is_public = true
       WHERE r.place_id = $1
       GROUP BY r.id, ra.id
       ORDER BY ra.quality_score DESC, ra.helpful_count DESC
       LIMIT $2`,
      [placeId, limit]
    );

    return reviews;
  } catch (error) {
    logger.error('Failed to get top reviews', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update review response
 */
export async function updateReviewResponse(
  responseId: string,
  ownerId: string,
  newText: string
): Promise<ReviewResponse> {
  try {
    // Verify ownership
    const response = await queryOne(
      'SELECT owner_id, review_id, place_id FROM review_responses WHERE id = $1',
      [responseId]
    );

    if (!response || response.owner_id !== ownerId) {
      throw new Error('Access denied');
    }

    const updated = await update(
      'review_responses',
      { id: responseId },
      {
        response_text: newText,
        is_edited: true,
        edited_at: new Date(),
        updated_at: new Date()
      }
    );

    // Clear cache
    await deleteCachePattern(`sanliurfa:review:${response.review_id}:*`);
    await deleteCachePattern(`sanliurfa:place:${response.place_id}:reviews:*`);

    logger.info('Review response updated', { responseId, ownerId });
    return updated;
  } catch (error) {
    logger.error('Failed to update response', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Delete review response
 */
export async function deleteReviewResponse(responseId: string, ownerId: string): Promise<boolean> {
  try {
    // Verify ownership
    const response = await queryOne(
      'SELECT owner_id, review_id, place_id FROM review_responses WHERE id = $1',
      [responseId]
    );

    if (!response || response.owner_id !== ownerId) {
      throw new Error('Access denied');
    }

    const result = await query('DELETE FROM review_responses WHERE id = $1', [responseId]);

    // Clear cache
    await deleteCachePattern(`sanliurfa:review:${response.review_id}:*`);
    await deleteCachePattern(`sanliurfa:place:${response.place_id}:reviews:*`);

    logger.info('Review response deleted', { responseId, ownerId });
    return result.rowCount > 0;
  } catch (error) {
    logger.error('Failed to delete response', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
