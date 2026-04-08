/**
 * Migration 076: Social Interactions
 * Likes, reactions, and engagement tracking
 */

import { Pool } from 'pg';

export const migration_076_social_interactions = async (pool: Pool) => {
  try {
    // Place likes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_likes_place
      ON place_likes(place_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_likes_user
      ON place_likes(user_id, created_at DESC)
    `);

    // Review reactions (like, helpful, funny, etc)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reaction_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(review_id, user_id, reaction_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_reactions_review
      ON review_reactions(review_id, reaction_type)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_reactions_user
      ON review_reactions(user_id, created_at DESC)
    `);

    // Shares
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID REFERENCES places(id) ON DELETE CASCADE,
        review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
        share_platform VARCHAR(50),
        share_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shares_place
      ON shares(place_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shares_review
      ON shares(review_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_shares_user
      ON shares(shared_by_user_id, created_at DESC)
    `);

    console.log('✓ Migration 076 completed: Social interactions tables created');
  } catch (error) {
    console.error('Migration 076 failed:', error);
    throw error;
  }
};

export const rollback_076 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS shares CASCADE');
    await pool.query('DROP TABLE IF EXISTS review_reactions CASCADE');
    await pool.query('DROP TABLE IF EXISTS place_likes CASCADE');
    console.log('✓ Migration 076 rolled back');
  } catch (error) {
    console.error('Rollback 076 failed:', error);
    throw error;
  }
};
