// API: Nöbetçi Eczane listesi
// GET  /api/saglik/nobetci?ilce=eyyubiye&tarih=2026-04-14
// POST /api/saglik/nobetci/rotate — Admin: nöbetçi rotasyonunu güncelle
import type { APIRoute } from 'astro';
import { query, queryOne } from '../../../lib/postgres';
import { getCache, setCache } from '../../../lib/cache';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus } from '../../../lib/api';

export const GET: APIRoute = async ({ url }) => {
  try {
    const district = url.searchParams.get('ilce');
    const requestedDate = url.searchParams.get('tarih') || new Date().toISOString().split('T')[0];
    const explicitDate = url.searchParams.has('tarih');
    const latestRow = explicitDate
      ? null
      : await queryOne<{ duty_date: string | null }>(
          `SELECT duty_date::text
           FROM pharmacies
           WHERE is_on_duty = true
           ORDER BY duty_date DESC NULLS LAST
           LIMIT 1`,
        );
    const effectiveDate = latestRow?.duty_date || requestedDate;

    const cacheKey = `saglik:nobetci:${explicitDate ? requestedDate : `latest:${effectiveDate}`}:${district || 'all'}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return apiResponse(cached, HttpStatus.OK);
    }

    let sql = `
      SELECT p.*, d.name as district_name, d.slug as district_slug
      FROM pharmacies p
      LEFT JOIN districts d ON p.district_id = d.id
      WHERE p.is_on_duty = true
        AND (p.duty_date = $1 OR p.duty_date IS NULL)
    `;
    const params: unknown[] = [effectiveDate];

    if (district) {
      sql += ` AND d.slug = $2`;
      params.push(district);
    }

    sql += ' ORDER BY d.name, p.name';

    const result = await query(sql, params);

    const freshnessRow = await queryOne<{ setting_value: Record<string, unknown> }>(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'pharmacy.lastUpdated' LIMIT 1`,
    );
    const freshnessMeta = freshnessRow?.setting_value || {};

    const data = {
      requestedDate,
      effectiveDate,
      stale: Boolean(freshnessMeta.sourceStale) || effectiveDate !== requestedDate,
      count: result.rows.length,
      pharmacies: result.rows,
    };

    await setCache(cacheKey, data, 3600); // 1 saat cache

    return apiResponse(data, HttpStatus.OK);
  } catch (e) {
    logger.error('Nobetci API error:', e);
    return problemJson({
      status: 500,
      title: 'Nöbetçi Eczane Verisi Alınamadı',
      detail: 'Veri yüklenemedi',
      type: '/problems/saglik-nobetci-failed',
      instance: '/api/saglik/nobetci',
    });
  }
};
