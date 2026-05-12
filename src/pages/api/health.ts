/**
 * Healthcheck Endpoint
 * Used by PM2, Docker, and load balancers
 */

import type { APIRoute } from 'astro';
import { statfsSync } from 'node:fs';
import { apiResponse, HttpStatus, safeErrorDetail } from '../../lib/api';

// In-process cache for the integrations summary. Health endpoint is hit every few
// seconds by load balancers / uptime monitors; without this we'd run 5 DB queries
// per health call. 30s TTL is short enough that admin-side config changes show up
// quickly, long enough to absorb the polling noise.
let _integrationsCache: Record<string, 'configured' | 'unconfigured'> | null = null;
let _integrationsCacheAt = 0;
const INTEGRATIONS_CACHE_TTL_MS = 10_000; // 10s — admin config değişiklikleri hızlı yansıt

/** Test hook — exported for vitest. Don't call from production code. */
export function _resetIntegrationsCacheForTests(): void {
  _integrationsCache = null;
  _integrationsCacheAt = 0;
}

/**
 * Quick non-network probe of admin-managed integrations. Reports whether each
 * service has credentials configured (DB or env), without hitting the actual
 * provider — that's what /api/admin/site/integrations/test is for.
 *
 * Returns 'configured' | 'unconfigured' so monitoring tools can see at a glance
 * which integrations are wired up. No secrets are leaked.
 *
 * Result is cached for 30s to keep `/api/health` cheap under high-frequency polling.
 */
async function getIntegrationsSummary(): Promise<Record<string, 'configured' | 'unconfigured'>> {
  const now = Date.now();
  if (_integrationsCache && now - _integrationsCacheAt < INTEGRATIONS_CACHE_TTL_MS) {
    return _integrationsCache;
  }
  const summary: Record<string, 'configured' | 'unconfigured'> = {
    resend: 'unconfigured',
    smtp: 'unconfigured',
    stripe: 'unconfigured',
    analytics: 'unconfigured',
    image_providers: 'unconfigured',
  };
  try {
    const { queryOne } = await import('../../lib/postgres');
    const rows = await Promise.all([
      queryOne<{ setting_value: { api_key?: string } }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'integrations.email'`,
        [],
      ),
      queryOne<{ setting_value: { host?: string; user?: string; pass?: string } }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'integrations.smtp'`,
        [],
      ),
      queryOne<{ setting_value: { secret_key?: string } }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'integrations.payment'`,
        [],
      ),
      queryOne<{ setting_value: { ga_id?: string } }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'integrations.analytics'`,
        [],
      ),
      queryOne<{ setting_value: { unsplash_access_key?: string; pexels_api_key?: string } }>(
        `SELECT setting_value FROM site_settings WHERE setting_key = 'integrations.image_providers'`,
        [],
      ),
    ]);
    if (rows[0]?.setting_value?.api_key || process.env.RESEND_API_KEY) summary.resend = 'configured';
    const smtp = rows[1]?.setting_value;
    if ((smtp?.host && smtp?.user && smtp?.pass) || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)) summary.smtp = 'configured';
    if (rows[2]?.setting_value?.secret_key || process.env.STRIPE_SECRET_KEY) summary.stripe = 'configured';
    if (rows[3]?.setting_value?.ga_id) summary.analytics = 'configured';
    const ip = rows[4]?.setting_value;
    if (ip?.unsplash_access_key || ip?.pexels_api_key || process.env.UNSPLASH_ACCESS_KEY || process.env.PEXELS_API_KEY) summary.image_providers = 'configured';
  } catch {
    // If DB lookup fails the health response still includes the env-only verdict.
    if (process.env.RESEND_API_KEY) summary.resend = 'configured';
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) summary.smtp = 'configured';
    if (process.env.STRIPE_SECRET_KEY) summary.stripe = 'configured';
    if (process.env.UNSPLASH_ACCESS_KEY || process.env.PEXELS_API_KEY) summary.image_providers = 'configured';
  }
  _integrationsCache = summary;
  _integrationsCacheAt = now;
  return summary;
}

export const GET: APIRoute = async () => {
  try {
    const { pool, getPoolStatus } = await import('../../lib/postgres');
    const { getRedisClient } = await import('../../lib/cache/cache');

    let dbStatus = 'unknown';
    let dbLatency = -1;

    // Check PostgreSQL
    try {
      const start = Date.now();
      await pool.query('SELECT 1');
      dbLatency = Date.now() - start;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    let redisStatus = 'disconnected';
    try {
      const redis = await getRedisClient();
      await redis.ping();
      redisStatus = 'connected';
    } catch {
      redisStatus = 'disconnected';
    }

    const integrations = dbStatus === 'connected' ? await getIntegrationsSummary() : null;
    const poolStatus = getPoolStatus();

    // Disk usage — uploads klasörünün bulunduğu mount'u kontrol et.
    // Statfs non-blocking sync syscall (microseconds). Hata olursa null döner.
    let disk: { totalGb: number; freeGb: number; usedPercent: number; status: 'ok' | 'warning' | 'critical' } | null = null;
    try {
      const stats = statfsSync(process.cwd());
      const blockSize = stats.bsize;
      const totalBytes = stats.blocks * blockSize;
      const freeBytes = stats.bavail * blockSize;
      const usedPercent = Math.round(((totalBytes - freeBytes) / totalBytes) * 100);
      const diskStatus = usedPercent >= 95 ? 'critical' : usedPercent >= 80 ? 'warning' : 'ok';
      disk = {
        totalGb: Math.round((totalBytes / 1024 / 1024 / 1024) * 10) / 10,
        freeGb: Math.round((freeBytes / 1024 / 1024 / 1024) * 10) / 10,
        usedPercent,
        status: diskStatus,
      };
    } catch {
      disk = null;
    }

    const diskOk = disk === null || disk.status !== 'critical';
    const allHealthy = dbStatus === 'connected' && redisStatus === 'connected' && diskOk;

    const health = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
          pool: poolStatus,
        },
        redis: {
          status: redisStatus,
        },
        disk,
      },
      integrations,
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };

    const responseStatus = dbStatus === 'connected' ? HttpStatus.OK : 503;

    return apiResponse(health, responseStatus);
  } catch (error) {
    const fallback = {
      status: 'down',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: { status: 'unknown', latencyMs: -1 },
        redis: { status: 'unknown' },
      },
      error: safeErrorDetail(error, 'health_init_failed'),
    };

    return apiResponse(fallback, 503);
  }
};
