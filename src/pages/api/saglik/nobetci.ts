// API: Nöbetçi Eczane listesi
// GET  /api/saglik/nobetci?ilce=eyyubiye&tarih=2026-04-14
// POST /api/saglik/nobetci/rotate — Admin: nöbetçi rotasyonunu güncelle
import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { getCache, setCache } from '../../../lib/cache';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const district = url.searchParams.get('ilce');
    const date = url.searchParams.get('tarih') || new Date().toISOString().split('T')[0];

    const cacheKey = `saglik:nobetci:${date}:${district || 'all'}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
      });
    }

    let sql = `
      SELECT p.*, d.name as district_name, d.slug as district_slug
      FROM pharmacies p
      LEFT JOIN districts d ON p.district_id = d.id
      WHERE p.is_on_duty = true
        AND (p.duty_date = $1 OR p.duty_date IS NULL)
    `;
    const params: any[] = [date];

    if (district) {
      sql += ` AND d.slug = $2`;
      params.push(district);
    }

    sql += ' ORDER BY d.name, p.name';

    const result = await query(sql, params);

    const data = {
      date,
      count: result.rows.length,
      pharmacies: result.rows,
    };

    await setCache(cacheKey, data, 3600); // 1 saat cache

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    logger.error('Nobetci API error:', e);
    return new Response(JSON.stringify({ error: 'Veri yüklenemedi', pharmacies: [], count: 0 }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
