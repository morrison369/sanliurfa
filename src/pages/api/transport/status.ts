import type { APIRoute } from 'astro';
import { queryOne } from '../../../lib/postgres';
import { problemJson, safeErrorDetail } from '../../../lib/api';

export const GET: APIRoute = async () => {
  try {
    const row = await queryOne<{ setting_value: Record<string, any> }>(
      `SELECT setting_value FROM site_settings WHERE setting_key = 'transport.lastUpdated' LIMIT 1`,
    );
    const value = row?.setting_value || {};
    const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : null;
    const freshnessMinutes = Number(value.freshnessMinutes || 60);
    const providerSnapshots = Array.isArray(value.providerSnapshots) ? value.providerSnapshots : [];
    const healthyProviders = Number(value.healthyProviders || 0);
    const stale =
      !updatedAt || Date.now() - new Date(updatedAt).getTime() > freshnessMinutes * 60 * 1000;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          updatedAt,
          freshnessMinutes,
          stale,
          sources: Array.isArray(value.sources) ? value.sources : [],
          healthyProviders,
          providerSnapshots,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      },
    );
  } catch (error) {
    return problemJson({
      status: 500,
      title: 'Transport Status Alınamadı',
      detail: safeErrorDetail(error, 'transport_status_failed'),
      type: '/problems/transport-status-failed',
      instance: '/api/transport/status',
    });
  }
};
