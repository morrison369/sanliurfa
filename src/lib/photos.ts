import { pool } from './postgres';
import { logger } from './logging';

export async function getPlacePhotos(placeId: string): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT id, user_id, url, caption, helpful_count, created_at
       FROM place_photos
       WHERE place_id = $1 AND verified = true
       ORDER BY helpful_count DESC, created_at DESC`,
      [placeId]
    );
    return result.rows;
  } catch (error) {
    logger.error('Get photos failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function uploadPhoto(placeId: string, userId: string, url: string, caption?: string): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO place_photos (place_id, user_id, url, caption)
       VALUES ($1, $2, $3, $4)`,
      [placeId, userId, url, caption || null]
    );
    return true;
  } catch (error) {
    logger.error('Photo upload failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function markPhotoAsHelpful(photoId: string): Promise<boolean> {
  try {
    await pool.query(
      `UPDATE place_photos SET helpful_count = helpful_count + 1 WHERE id = $1`,
      [photoId]
    );
    return true;
  } catch (error) {
    logger.error('Mark helpful failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
