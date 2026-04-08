/**
 * Migration 028: Followers & Following System
 * Creates follower relationships between users for social features
 */

export const migration_028_followers = {
  name: '028_followers',
  async up(pool: any) {
    // Followers table - tracks who follows whom
    await pool.query(`
      CREATE TABLE IF NOT EXISTS followers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        -- Ensure unique follower relationships (one user can't follow another twice)
        UNIQUE(follower_id, following_id),
        -- Prevent self-following
        CONSTRAINT no_self_follow CHECK (follower_id != following_id)
      )
    `);

    // Indexes for fast lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_followers_follower_id
      ON followers(follower_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_followers_following_id
      ON followers(following_id, created_at DESC)
    `);

    // Index for mutual followers (finding friends)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_followers_both
      ON followers(follower_id, following_id)
    `);

    console.log('✓ Migration 028: Followers table created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS followers CASCADE');
    console.log('✓ Migration 028 rolled back');
  }
};
