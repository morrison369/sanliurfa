/**
 * Migration 017: Internationalization
 * Adds language preference support to users table
 */

export const migration_017_internationalization = {
  name: '017_internationalization',
  async up(pool: any) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS language_preference VARCHAR(10) DEFAULT 'tr'
    `);

    // Create index for language preference queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_language_preference
      ON users(language_preference)
    `);

    console.log('✓ Migration 017: Internationalization support added');
  },

  async down(pool: any) {
    await pool.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS language_preference
    `);
    console.log('✓ Migration 017 rolled back');
  }
};
