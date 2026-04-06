import type { APIRoute } from 'astro';
import { query } from '../../lib/postgres';

export const GET: APIRoute = async () => {
  const checks = {
    database: false,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: import.meta.env.NODE_ENV || 'development',
  };

  try {
    // Check database connection
    await query('SELECT 1');
    checks.database = true;

    return new Response(
      JSON.stringify({ status: 'healthy', checks }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return new Response(
      JSON.stringify({ status: 'unhealthy', checks, error: String(error) }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
