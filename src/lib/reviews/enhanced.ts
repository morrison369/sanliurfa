/**
 * Enhanced Review System
 * Photos, helpful votes, and verification
 */

import { query } from '../postgres';

export interface ReviewPhoto {
  id: string;
  reviewId: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  order: number;
  createdAt: Date;
}

export interface Review {
  id: string;
  placeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title?: string;
  comment: string;
  photos: ReviewPhoto[];
  helpfulCount: number;
  visitDate?: Date;
  isVerified: boolean;
  isLocalGuide: boolean;
  language: string;
  status: 'active' | 'deleted' | 'flagged';
  editedAt?: Date;
  createdAt: Date;
  userHelpful?: boolean;
}

export interface CreateReviewInput {
  placeId: string;
  userId: string;
  rating: number;
  title?: string;
  comment: string;
  photos?: Array<{ url: string; caption?: string }>;
  visitDate?: Date;
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  if (input.rating < 1 || input.rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  if (!input.comment || input.comment.trim().length < 10) {
    throw new Error('Review must be at least 10 characters');
  }

  const userResult = await query(
    'SELECT full_name, avatar_url FROM users WHERE id = $1',
    [input.userId]
  );
  const user = userResult.rows[0];

  const result = await query(
    `INSERT INTO reviews (place_id, user_id, rating, title, content, visit_type, is_verified, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, 'active', NOW())
     RETURNING *`,
    [input.placeId, input.userId, input.rating, input.title, input.comment,
     input.visitDate ? 'visited' : null, false]
  );

  const review = result.rows[0];

  // Add photos
  if (input.photos && input.photos.length > 0) {
    for (let i = 0; i < input.photos.length; i++) {
      await query(
        `INSERT INTO review_photos (review_id, url, caption, display_order) VALUES ($1, $2, $3, $4)`,
        [review.id, input.photos[i].url, input.photos[i].caption, i]
      );
    }
  }

  // Update place rating
  await updatePlaceRating(input.placeId);

  return getReviewById(review.id, input.userId) as Promise<Review>;
}

export async function getReviewById(reviewId: string, currentUserId?: string): Promise<Review | null> {
  const result = await query(
    `SELECT r.*, 
      EXISTS(SELECT 1 FROM review_helpful h WHERE h.review_id = r.id AND h.user_id = $2) as user_helpful
     FROM reviews r WHERE r.id = $1`,
    [reviewId, currentUserId]
  );

  if (result.rows.length === 0) return null;

  const photos = await getReviewPhotos(reviewId);
  return mapReviewRow(result.rows[0], photos);
}

export async function getPlaceReviews(
  placeId: string,
  options: {
    sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
    filter?: 'all' | 'verified' | 'withPhotos' | 'localGuide';
    limit?: number;
    offset?: number;
    userId?: string;
  } = {}
): Promise<{ reviews: Review[]; total: number; average: number }> {
  const { sortBy = 'newest', filter = 'all', limit = 10, offset = 0, userId } = options;

  // Get total and average
  const statsResult = await query(
    `SELECT COUNT(*) as total, AVG(rating) as average FROM reviews 
     WHERE place_id = $1 AND status = 'active'`,
    [placeId]
  );

  let whereClause = "place_id = $1 AND status = 'active'";
  if (filter === 'verified') whereClause += ' AND is_verified = true';
  if (filter === 'withPhotos') whereClause += ' AND EXISTS(SELECT 1 FROM review_photos WHERE review_id = reviews.id)';
  if (filter === 'localGuide') whereClause += ' AND is_verified = true';

  let orderBy = 'created_at DESC';
  if (sortBy === 'oldest') orderBy = 'created_at ASC';
  if (sortBy === 'highest') orderBy = 'rating DESC, created_at DESC';
  if (sortBy === 'lowest') orderBy = 'rating ASC, created_at DESC';
  if (sortBy === 'helpful') orderBy = 'helpful_count DESC, created_at DESC';

  const result = await query(
    `SELECT r.*, 
      EXISTS(SELECT 1 FROM review_helpful h WHERE h.review_id = r.id AND h.user_id = $4) as user_helpful
     FROM reviews r
     WHERE ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $2 OFFSET $3`,
    [placeId, limit, offset, userId]
  );

  const reviews = await Promise.all(
    result.rows.map(async row => {
      const photos = await getReviewPhotos(row.id);
      return mapReviewRow(row, photos);
    })
  );

  return {
    reviews,
    total: parseInt(statsResult.rows[0].total),
    average: parseFloat(statsResult.rows[0].average) || 0,
  };
}

async function getReviewPhotos(reviewId: string): Promise<ReviewPhoto[]> {
  const result = await query(
    `SELECT * FROM review_photos WHERE review_id = $1 ORDER BY display_order`,
    [reviewId]
  );
  return result.rows.map(row => ({
    id: row.id,
    reviewId: row.review_id,
    url: row.url,
    thumbnailUrl: row.thumbnail_url,
    caption: row.caption,
    order: row.display_order,
    createdAt: row.created_at,
  }));
}

function mapReviewRow(row: any, photos: ReviewPhoto[] = []): Review {
  return {
    id: row.id,
    placeId: row.place_id,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar,
    rating: row.rating,
    title: row.title,
    comment: row.content,
    photos,
    helpfulCount: row.helpful_count || 0,
    visitDate: row.visit_date,
    isVerified: row.is_verified,
    isLocalGuide: row.is_local_guide,
    language: row.language,
    status: row.status,
    editedAt: row.edited_at,
    createdAt: new Date(row.created_at),
    userHelpful: row.user_helpful || false,
  };
}

export async function markHelpful(reviewId: string, userId: string): Promise<void> {
  await query(
    `INSERT INTO review_helpful (review_id, user_id, created_at) VALUES ($1, $2, NOW())
     ON CONFLICT (review_id, user_id) DO NOTHING`,
    [reviewId, userId]
  );
  await query(`UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1`, [reviewId]);
}

export async function unmarkHelpful(reviewId: string, userId: string): Promise<void> {
  const result = await query(
    `DELETE FROM review_helpful WHERE review_id = $1 AND user_id = $2 RETURNING *`,
    [reviewId, userId]
  );
  if (result.rows.length > 0) {
    await query(`UPDATE reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = $1`, [reviewId]);
  }
}

export async function updateReview(
  reviewId: string,
  userId: string,
  updates: Partial<Pick<CreateReviewInput, 'rating' | 'title' | 'comment'>>
): Promise<Review> {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.rating !== undefined) {
    sets.push(`rating = $${idx++}`);
    values.push(updates.rating);
  }
  if (updates.title !== undefined) {
    sets.push(`title = $${idx++}`);
    values.push(updates.title);
  }
  if (updates.comment !== undefined) {
    sets.push(`content = $${idx++}`);
    values.push(updates.comment);
  }
  sets.push(`updated_at = NOW()`);

  values.push(reviewId, userId);

  const result = await query(
    `UPDATE reviews SET ${sets.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Review not found or no permission');
  }

  await updatePlaceRating(result.rows[0].place_id);
  return getReviewById(reviewId, userId) as Promise<Review>;
}

export async function deleteReview(reviewId: string, userId: string, isAdmin = false): Promise<void> {
  const whereClause = isAdmin ? 'id = $1' : 'id = $1 AND user_id = $2';
  const params = isAdmin ? [reviewId] : [reviewId, userId];

  const result = await query(
    `UPDATE reviews SET status = 'deleted' WHERE ${whereClause} RETURNING place_id`,
    params
  );

  if (result.rows.length > 0) {
    await updatePlaceRating(result.rows[0].place_id);
  }
}

async function updatePlaceRating(placeId: string): Promise<void> {
  await query(
    `UPDATE places SET 
      rating = (SELECT AVG(rating) FROM reviews WHERE place_id = $1 AND status = 'active'),
      review_count = (SELECT COUNT(*) FROM reviews WHERE place_id = $1 AND status = 'active')
    WHERE id = $1`,
    [placeId]
  );
}

export async function getReviewBreakdown(placeId: string): Promise<Record<number, number>> {
  const result = await query(
    `SELECT rating, COUNT(*) as count FROM reviews WHERE place_id = $1 AND status = 'active' GROUP BY rating`,
    [placeId]
  );

  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  result.rows.forEach(row => {
    breakdown[row.rating] = parseInt(row.count);
  });

  return breakdown;
}
