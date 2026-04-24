/**
 * Healthcheck Endpoint
 * Used by PM2, Docker, and load balancers
 */

import type { APIRoute } from 'astro';

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

    const poolStatus = getPoolStatus();
    const allHealthy = dbStatus === 'connected' && redisStatus === 'connected';

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
      },
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };

    const responseStatus = dbStatus === 'connected' ? 200 : 503;

    return new Response(JSON.stringify(health), {
      status: responseStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
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
      error: error instanceof Error ? error.message : 'health_init_failed',
    };

    return new Response(JSON.stringify(fallback), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
};
