/**
 * Healthcheck Endpoint
 * Used by PM2, Docker, and load balancers
 */

import type { APIRoute } from 'astro';
import { pool, getPoolStatus } from '../../lib/postgres';
import { isRedisAvailable } from '../../lib/cache/cache';

export const GET: APIRoute = async () => {
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

  const poolStatus = getPoolStatus();
  const redisStatus = isRedisAvailable() ? 'connected' : 'disconnected';
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

  return new Response(JSON.stringify(health), {
    status: allHealthy ? 200 : 503,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
};
