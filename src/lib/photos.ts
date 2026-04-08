/**
 * Photo/Media management library
 * Handles photo uploads, voting, and gallery management for places
 */

import { pool, queryOne, queryMany } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';

/**
 * Upload a photo for a place
 */
export async function uploadPhoto(
  placeId: string,
  uploadedBy: string,
  filePath: string,
  fileSize: number,
  mimeType: string,
  altText?: string,
  caption?: string
): Promise<any> {
  try {
    const photo = await queryOne(
      `INSERT INTO place_photos (place_id, uploaded_by, file_path, file_size, mime_type, alt_text, caption)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, place_id, uploaded_by, file_path, caption, helpful_count, unhelpful_count, created_at`,
      [placeId, uploadedBy, filePath, fileSize, mimeType, altText || null, caption || null]
    );

    // Invalidate place photos cache
    await deleteCachePattern(`sanliurfa:photos:place:${placeId}*`);
    await deleteCache(`sanliurfa:places:${placeId}`);

    logger.info('Photo uploaded', { photoId: photo.id, placeId, uploadedBy });
    return photo;
  } catch (error) {
    logger.error('Photo upload failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get photos for a place with caching
 */
export async function getPlacePhotos(placeId: string, limit = 20): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:photos:place:${placeId}:limit:${limit}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const photos = await queryMany(
      `SELECT id, place_id, uploaded_by, file_path, file_size, mime_type, alt_text, caption,
              is_featured, helpful_count, unhelpful_count, created_at
       FROM place_photos
       WHERE place_id = $1
       ORDER BY is_featured DESC, helpful_count DESC, created_at DESC
       LIMIT $2`,
      [placeId, limit]
    );

    // Cache for 10 minutes
    await setCache(cacheKey, JSON.stringify(photos), 600);

    return photos;
  } catch (error) {
    logger.error('Get photos failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get a single photo by ID
 */
export async function getPhotoById(photoId: string): Promise<any> {
  try {
    const photo = await queryOne(
      `SELECT id, place_id, uploaded_by, file_path, file_size, mime_type, alt_text, caption,
              is_featured, helpful_count, unhelpful_count, created_at
       FROM place_photos
       WHERE id = $1`,
      [photoId]
    );

    return photo;
  } catch (error) {
    logger.error('Get photo failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Vote on a photo (helpful/unhelpful)
 */
export async function voteOnPhoto(
  photoId: string,
  userId: string,
  voteType: 'helpful' | 'unhelpful'
): Promise<boolean> {
  try {
    // Check if user already voted
    const existingVote = await queryOne(
      `SELECT id, vote_type FROM photo_votes WHERE photo_id = $1 AND user_id = $2`,
      [photoId, userId]
    );

    // If user already voted with the same type, do nothing
    if (existingVote?.vote_type === voteType) {
      return true;
    }

    // If user voted differently, update their vote
    if (existingVote) {
      // Decrease old vote count
      const oldVoteColumn = existingVote.vote_type === 'helpful' ? 'helpful_count' : 'unhelpful_count';
      await pool.query(
        `UPDATE place_photos SET ${oldVoteColumn} = GREATEST(0, ${oldVoteColumn} - 1) WHERE id = $1`,
        [photoId]
      );

      // Update vote
      await pool.query(
        `UPDATE photo_votes SET vote_type = $1 WHERE photo_id = $2 AND user_id = $3`,
        [voteType, photoId, userId]
      );
    } else {
      // Create new vote
      await pool.query(
        `INSERT INTO photo_votes (photo_id, user_id, vote_type) VALUES ($1, $2, $3)`,
        [photoId, userId, voteType]
      );
    }

    // Increase new vote count
    const newVoteColumn = voteType === 'helpful' ? 'helpful_count' : 'unhelpful_count';
    await pool.query(
      `UPDATE place_photos SET ${newVoteColumn} = ${newVoteColumn} + 1 WHERE id = $1`,
      [photoId]
    );

    // Get the photo to find place_id for cache invalidation
    const photo = await getPhotoById(photoId);
    if (photo) {
      await deleteCachePattern(`sanliurfa:photos:place:${photo.place_id}*`);
    }

    return true;
  } catch (error) {
    logger.error('Vote on photo failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Set a photo as featured for a place
 */
export async function setFeaturedPhoto(photoId: string, placeId: string, isFeatured: boolean): Promise<boolean> {
  try {
    // If setting as featured, unfeature other photos for this place
    if (isFeatured) {
      await pool.query(
        `UPDATE place_photos SET is_featured = false WHERE place_id = $1 AND id != $2`,
        [placeId, photoId]
      );
    }

    // Update this photo
    await pool.query(
      `UPDATE place_photos SET is_featured = $1 WHERE id = $2`,
      [isFeatured, photoId]
    );

    // Invalidate cache
    await deleteCachePattern(`sanliurfa:photos:place:${placeId}*`);
    await deleteCache(`sanliurfa:places:${placeId}`);

    return true;
  } catch (error) {
    logger.error('Set featured photo failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Delete a photo
 */
export async function deletePhoto(photoId: string): Promise<boolean> {
  try {
    // Get photo to find place_id before deleting
    const photo = await getPhotoById(photoId);

    // Delete votes first (cascades)
    await pool.query(`DELETE FROM photo_votes WHERE photo_id = $1`, [photoId]);

    // Delete photo
    await pool.query(`DELETE FROM place_photos WHERE id = $1`, [photoId]);

    // Invalidate cache
    if (photo) {
      await deleteCachePattern(`sanliurfa:photos:place:${photo.place_id}*`);
      await deleteCache(`sanliurfa:places:${photo.place_id}`);
    }

    return true;
  } catch (error) {
    logger.error('Delete photo failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get featured photo for a place
 */
export async function getFeaturedPhoto(placeId: string): Promise<any> {
  try {
    const photo = await queryOne(
      `SELECT id, place_id, uploaded_by, file_path, alt_text, caption, helpful_count
       FROM place_photos
       WHERE place_id = $1 AND is_featured = true
       LIMIT 1`,
      [placeId]
    );

    return photo;
  } catch (error) {
    logger.error('Get featured photo failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get user's photos
 */
export async function getUserPhotos(userId: string, limit = 50): Promise<any[]> {
  try {
    const photos = await queryMany(
      `SELECT id, place_id, uploaded_by, file_path, caption, helpful_count, created_at
       FROM place_photos
       WHERE uploaded_by = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return photos;
  } catch (error) {
    logger.error('Get user photos failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get photo count for a place
 */
export async function getPhotoCount(placeId: string): Promise<number> {
  try {
    const result = await queryOne(
      `SELECT COUNT(*) as count FROM place_photos WHERE place_id = $1`,
      [placeId]
    );

    return result?.count || 0;
  } catch (error) {
    logger.error('Get photo count failed', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}
