/**
 * Migration 029: Comments & Replies System
 * Creates comments table for threaded discussions on reviews and places
 */

export const migration_029_comments = {
  name: '029_comments',
  async up(pool: any) {
    // Comments table - threaded comments on reviews/places
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_type VARCHAR(50) NOT NULL DEFAULT 'review',
        target_id UUID NOT NULL,
        parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        helpful_count INTEGER DEFAULT 0,
        unhelpful_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);

    // Indexes for fast lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_target
      ON comments(target_type, target_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_user_id
      ON comments(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_parent
      ON comments(parent_comment_id, created_at ASC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_not_deleted
      ON comments(target_type, target_id) WHERE deleted_at IS NULL
    `);

    // Comment votes table - track user votes on comments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comment_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vote_type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        -- User can only vote once per comment
        UNIQUE(comment_id, user_id),
        CONSTRAINT valid_vote_type CHECK (vote_type IN ('helpful', 'unhelpful'))
      )
    `);

    // Indexes for comment votes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comment_votes_comment
      ON comment_votes(comment_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comment_votes_user
      ON comment_votes(user_id, created_at DESC)
    `);

    console.log('✓ Migration 029: Comments tables created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS comment_votes CASCADE');
    await pool.query('DROP TABLE IF EXISTS comments CASCADE');
    console.log('✓ Migration 029 rolled back');
  }
};
