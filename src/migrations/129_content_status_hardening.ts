/**
 * Migration 129: Content Status Hardening
 * Ensures public content tables expose the status columns used by Astro routes and sitemaps.
 */

export const migration_129_content_status_hardening = {
  name: '129_content_status_hardening',
  async up(pool: any) {
    await pool.query(`
      ALTER TABLE historical_sites
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    `);

    await pool.query(`
      UPDATE historical_sites
      SET status = 'active'
      WHERE status IS NULL
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_historical_sites_status_slug
      ON historical_sites(status, slug)
    `);

    await pool.query(`
      ALTER TABLE foods
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    `);

    await pool.query(`
      UPDATE foods
      SET status = 'active'
      WHERE status IS NULL
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_foods_status_slug
      ON foods(status, slug)
    `);
  },

  async down(pool: any) {
    await pool.query('DROP INDEX IF EXISTS idx_foods_status_slug');
    await pool.query('DROP INDEX IF EXISTS idx_historical_sites_status_slug');
  },
};
