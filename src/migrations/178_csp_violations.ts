/**
 * Migration 178: CSP Violations Table
 *
 * Browser /api/security/csp-report endpoint'ine POST eder (CSP `report-uri` directive).
 * Bu tablo violation'ları persist eder; /admin/security/csp sayfasında aggregate
 * (en sık blocked-uri'ler, violated-directive dağılımı) görmek için.
 *
 * Pattern: ssr_perf_metrics ile aynı — log + DB write fail-safe, request latency'ye etki etmez.
 *
 * Index stratejisi:
 *   - (created_at DESC) — son 24 saat ihlal listesi
 *   - (violated_directive, created_at DESC) — directive bazlı aggregate
 */

export const migration = {
  description: 'CSP violation reports (browser-submitted via report-uri)',

  async up(pool: any) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS csp_violations (
        id BIGSERIAL PRIMARY KEY,
        document_uri TEXT NOT NULL,
        referrer TEXT,
        blocked_uri TEXT,
        violated_directive TEXT NOT NULL,
        effective_directive TEXT,
        original_policy TEXT,
        disposition TEXT,
        status_code INTEGER,
        source_file TEXT,
        line_number INTEGER,
        column_number INTEGER,
        script_sample TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_csp_violations_created
        ON csp_violations (created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_csp_violations_directive_created
        ON csp_violations (violated_directive, created_at DESC);
    `);
  },

  async down(pool: any) {
    await pool.query(`DROP INDEX IF EXISTS idx_csp_violations_directive_created;`);
    await pool.query(`DROP INDEX IF EXISTS idx_csp_violations_created;`);
    await pool.query(`DROP TABLE IF EXISTS csp_violations;`);
  },
};

export default migration;
