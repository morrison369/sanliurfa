import { pool } from './postgres';
import { logger } from './logging';

export async function getVendorProfile(userId: string): Promise<any> {
  try {
    const result = await pool.query(
      `SELECT id, place_id, business_name, phone, email, verified, rating, response_rate
       FROM vendor_profiles WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Vendor profile lookup failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function createOrUpdateVendor(userId: string, place_id: string, data: any): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO vendor_profiles (user_id, place_id, business_name, phone, email, verified)
       VALUES ($1, $2, $3, $4, $5, false)
       ON CONFLICT (user_id) DO UPDATE SET place_id = $2, business_name = $3, phone = $4, email = $5`,
      [userId, place_id, data.businessName, data.phone, data.email]
    );
    logger.info('Vendor profile updated', { userId });
    return true;
  } catch (error) {
    logger.error('Vendor update failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function addReviewResponse(review_id: string, vendor_id: string, response: string): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO review_responses (review_id, vendor_id, response)
       VALUES ($1, $2, $3)
       ON CONFLICT (review_id) DO UPDATE SET response = $3`,
      [review_id, vendor_id, response]
    );
    return true;
  } catch (error) {
    logger.error('Review response failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
