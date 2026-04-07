import { pool } from './postgres';
import { logger } from './logging';

export async function createAd(vendor_id: string, ad_type: string, data: any): Promise<string | null> {
  try {
    const result = await pool.query(
      `INSERT INTO advertisements (vendor_id, place_id, ad_type, title, content, budget)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [vendor_id, data.place_id, ad_type, data.title, data.content, data.budget]
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    logger.error('Ad creation failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getVendorAds(vendor_id: string): Promise<any[]> {
  try {
    const result = await pool.query(
      `SELECT id, ad_type, title, budget, spent, impressions, clicks, status, created_at
       FROM advertisements
       WHERE vendor_id = $1
       ORDER BY created_at DESC`,
      [vendor_id]
    );
    return result.rows;
  } catch (error) {
    logger.error('Get ads failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function recordAdInteraction(ad_id: string, type: 'impression' | 'click'): Promise<boolean> {
  try {
    if (type === 'impression') {
      await pool.query(`UPDATE advertisements SET impressions = impressions + 1 WHERE id = $1`, [ad_id]);
    } else {
      await pool.query(`UPDATE advertisements SET clicks = clicks + 1 WHERE id = $1`, [ad_id]);
    }
    return true;
  } catch (error) {
    logger.error('Ad interaction failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
