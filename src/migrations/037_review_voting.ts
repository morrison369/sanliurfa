/**
 * Migration 037: Review Voting System
 * Adds helpful voting to reviews
 */

export const migration_037_review_voting = {
  name: '037_review_voting',
  async up(pool: any) {
    // Add voting columns to reviews if not exists
    await pool.query(`
      ALTER TABLE reviews
      ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS unhelpful_count INTEGER DEFAULT 0
    `);

    // Review votes table - track helpful/unhelpful votes on reviews
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vote_type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        -- User can only vote once per review
        UNIQUE(review_id, user_id),
        CONSTRAINT valid_review_vote_type CHECK (vote_type IN ('helpful', 'unhelpful'))
      )
    `);

    // Indexes for review votes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_votes_review
      ON review_votes(review_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_votes_user
      ON review_votes(user_id, created_at DESC)
    `);

    console.log('✓ Migration 037: Review voting system added');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS review_votes CASCADE');
    await pool.query(`
      ALTER TABLE reviews
      DROP COLUMN IF EXISTS helpful_count,
      DROP COLUMN IF EXISTS unhelpful_count
    `);
    console.log('✓ Migration 037 rolled back');
  }
};
