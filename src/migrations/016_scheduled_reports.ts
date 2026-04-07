/**
 * Migration 016: Scheduled Reports
 * Creates table for managing scheduled report generation
 */

export const migration_016_scheduled_reports = {
  name: '016_scheduled_reports',
  async up(pool: any) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_reports (
        id SERIAL PRIMARY KEY,
        report_type VARCHAR(50) NOT NULL,
        period VARCHAR(50) NOT NULL,
        frequency VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        enabled BOOLEAN DEFAULT true,
        last_run TIMESTAMP,
        next_run TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_reports_enabled
      ON scheduled_reports(enabled)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run
      ON scheduled_reports(next_run) WHERE enabled = true
    `);

    console.log('✓ Migration 016: Scheduled reports table created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS scheduled_reports CASCADE');
    console.log('✓ Migration 016 rolled back');
  }
};
