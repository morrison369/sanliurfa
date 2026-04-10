/**
 * Migration 069: Review Responses System
 * Business owner responses to user reviews
 */

import type { Migration } from '../lib/migrations';

export const migration_069_review_responses: Migration = {
  version: '069_review_responses',
  description: 'Business owner responses to user reviews',
  up: async (pool: any) => {
  try {
    // Review responses from place owners
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        response_text TEXT NOT NULL,
        is_public BOOLEAN DEFAULT true,
        is_edited BOOLEAN DEFAULT false,
        edited_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexes for responses
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_responses_review
      ON review_responses(review_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_responses_place
      ON review_responses(place_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_responses_owner
      ON review_responses(owner_id, created_at DESC)
    `);

    // Response ratings - users can rate owner's response
    await pool.query(`
      CREATE TABLE IF NOT EXISTS response_ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        response_id UUID NOT NULL REFERENCES review_responses(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(response_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_response_ratings_response
      ON response_ratings(response_id)
    `);

    // Response notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS response_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        reviewer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        response_id UUID REFERENCES review_responses(id) ON DELETE CASCADE,
        notification_sent BOOLEAN DEFAULT false,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_response_notifications_user
      ON response_notifications(reviewer_user_id, created_at DESC)
    `);

    console.log('✓ Migration 069 completed: Review responses system created');
  } catch (error) {
    console.error('Migration 069 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS response_notifications CASCADE');
    await pool.query('DROP TABLE IF EXISTS response_ratings CASCADE');
    await pool.query('DROP TABLE IF EXISTS review_responses CASCADE');
    console.log('✓ Migration 069 rolled back');
  } catch (error) {
    console.error('Rollback 069 failed:', error);
    throw error;
  }
  }
};
