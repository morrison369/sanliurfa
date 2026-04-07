/**
 * Migration 015: User Onboarding
 * Adds onboarding tracking columns to users table
 */

export const migration_015_user_onboarding = {
  name: '015_user_onboarding',
  async up(pool: any) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP
    `);

    // Create index for finding users needing onboarding
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed
      ON users(onboarding_completed)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_verified
      ON users(email_verified)
    `);

    console.log('✓ Migration 015: User onboarding columns added');
  },

  async down(pool: any) {
    await pool.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS email_verified,
      DROP COLUMN IF EXISTS email_verified_at,
      DROP COLUMN IF EXISTS onboarding_completed,
      DROP COLUMN IF EXISTS onboarding_completed_at
    `);
    console.log('✓ Migration 015 rolled back');
  }
};
