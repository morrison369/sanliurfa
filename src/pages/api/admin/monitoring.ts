import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { logger } from '../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // System stats
    const [
      dbStats,
      errorStats,
      requestStats,
      recentErrors,
      hourlyStats
    ] = await Promise.all([
      // Database size
      query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as db_size,
          (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count
      `),

      // Error stats (last 24h)
      query(`
        SELECT 
          level,
          COUNT(*) as count
        FROM system_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY level
      `),

      // Request stats (if you have request logs)
      query(`
        SELECT 
          metadata->>'method' as method,
          COUNT(*) as count,
          AVG((metadata->>'duration')::int) as avg_duration
        FROM system_logs
        WHERE level = 'info'
          AND message LIKE '% % % - %'
          AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY metadata->>'method'
      `),

      // Recent errors
      query(`
        SELECT 
          id,
          level,
          message,
          context,
          created_at
        FROM system_logs
        WHERE level IN ('error', 'fatal')
          AND created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 10
      `),

      // Hourly stats
      query(`
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          level,
          COUNT(*) as count
        FROM system_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', created_at), level
        ORDER BY hour DESC
      `)
    ]);

    // System resources
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    return new Response(JSON.stringify({
      success: true,
      system: {
        uptime: Math.floor(uptime),
        memory: {
          used: Math.round(memory.heapUsed / 1024 / 1024),
          total: Math.round(memory.heapTotal / 1024 / 1024),
          rss: Math.round(memory.rss / 1024 / 1024)
        },
        nodeVersion: process.version,
        platform: process.platform
      },
      database: dbStats.rows[0],
      errors: errorStats.rows,
      requests: requestStats.rows,
      recentErrors: recentErrors.rows,
      hourlyStats: hourlyStats.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Monitoring API error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
