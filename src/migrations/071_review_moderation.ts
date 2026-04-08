/**
 * Migration 071: Review Moderation System
 * Review flagging, moderation queue, actions tracking
 */

import { Pool } from 'pg';

export const migration_071_review_moderation = async (pool: Pool) => {
  try {
    // Review flags/reports
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        reported_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        flag_reason VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        resolved_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        resolution TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      )
    `);

    // Indexes for moderation queue
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_flags_status
      ON review_flags(status, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_flags_review
      ON review_flags(review_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_flags_reported_by
      ON review_flags(reported_by_user_id, created_at DESC)
    `);

    // Moderation actions log
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_moderation_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        flag_id UUID REFERENCES review_flags(id) ON DELETE SET NULL,
        action_type VARCHAR(50) NOT NULL,
        action_reason TEXT NOT NULL,
        taken_by_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        visibility_status VARCHAR(50),
        is_reversible BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_review
      ON review_moderation_actions(review_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_admin
      ON review_moderation_actions(taken_by_admin_id, created_at DESC)
    `);

    // Spam detection patterns
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_spam_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pattern_type VARCHAR(50) NOT NULL,
        review_count INT DEFAULT 0,
        flagged_count INT DEFAULT 0,
        spam_score DECIMAL(5, 2) DEFAULT 0.0,
        last_review_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_spam_patterns_user
      ON review_spam_patterns(user_id, spam_score DESC)
    `);

    // Review verification
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_verification (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL UNIQUE REFERENCES reviews(id) ON DELETE CASCADE,
        verification_status VARCHAR(50) DEFAULT 'unverified',
        verified_purchase BOOLEAN DEFAULT false,
        verified_at TIMESTAMP,
        verified_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_verification_status
      ON review_verification(verification_status)
    `);

    console.log('✓ Migration 071 completed: Review moderation system created');
  } catch (error) {
    console.error('Migration 071 failed:', error);
    throw error;
  }
};

export const rollback_071 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS review_verification CASCADE');
    await pool.query('DROP TABLE IF EXISTS review_spam_patterns CASCADE');
    await pool.query('DROP TABLE IF EXISTS review_moderation_actions CASCADE');
    await pool.query('DROP TABLE IF EXISTS review_flags CASCADE');
    console.log('✓ Migration 071 rolled back');
  } catch (error) {
    console.error('Rollback 071 failed:', error);
    throw error;
  }
};
