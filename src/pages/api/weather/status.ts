import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { problemJson } from '../../../lib/api';

export const GET: APIRoute = async () => {
  try {
    const row = await queryOne<{ setting_value: Record<string, any> }>(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'weather.lastUpdated' LIMIT 1`,
    );
    const value = row?.setting_value || {};
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
    const staleMinutes = Number(value.staleMinutes || 45);
    const stale = !updatedAt || Date.now() - new Date(updatedAt).getTime() > staleMinutes * 60 * 1000;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          updatedAt,
          staleMinutes,
          stale,
          source: value.source || 'open-meteo',
          fromCache: Boolean(value.fromCache),
          location: value.location || null,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Weather Status Alınamadı',
      detail: error instanceof Error ? error.message : 'weather_status_failed',
      type: '/problems/weather-status-failed',
      instance: '/api/weather/status',
    });
  }
};
