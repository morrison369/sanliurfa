/**
 * Migration 177: SSR Performance Metrics Table
 *
 * Middleware'de Server-Timing: ssr;dur=N header + logger.warn('Slow SSR render')
 * zaten var (>800ms). Bu migration o metrikleri DB'ye de yazıp `/admin/performance`
 * sayfasında path bazlı aggregate (count, avg, p95, max) görmemizi sağlar.
 *
 * Sadece slow render'lar (>800ms) yazılır — table küçük kalır.
 * Yazma async + fail-safe (`.catch(() => null)`) — request latency'ye etki etmez.
 *
 * Index stratejisi:
 *   - (path, created_at DESC) — admin sayfası path bazlı GROUP BY için
 *   - (created_at DESC) — 24 saat / 7 gün time-window query'leri için
 */

export const migration = {
  description: 'SSR slow render metrics (>800ms) for /admin/performance dashboard',

  async up(pool: any) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ssr_perf_metrics (
        id BIGSERIAL PRIMARY KEY,
        path TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        status INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ssr_perf_metrics_path_created
        ON ssr_perf_metrics (path, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ssr_perf_metrics_created
        ON ssr_perf_metrics (created_at DESC);
    `);
  },

  async down(pool: any) {
    await pool.query(`DROP INDEX IF EXISTS idx_ssr_perf_metrics_created;`);
    await pool.query(`DROP INDEX IF EXISTS idx_ssr_perf_metrics_path_created;`);
    await pool.query(`DROP TABLE IF EXISTS ssr_perf_metrics;`);
  },
};

export default migration;
