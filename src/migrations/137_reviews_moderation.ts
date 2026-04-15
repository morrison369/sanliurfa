/**
 * Migration 137: Reviews Moderation Columns
 * Adds status, moderation tracking, images, and visit_type to reviews
 */

import type { Pool } from 'pg';

export const migration_137_reviews_moderation = async (pool: Pool) => {
  await pool.query(`
    ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
      CHECK (status IN ('active', 'pending', 'rejected', 'flagged', 'deleted')),
    ADD COLUMN IF NOT EXISTS is_moderated BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS images TEXT[],
    ADD COLUMN IF NOT EXISTS visit_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_reviews_status
    ON reviews(status, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_reviews_moderated
    ON reviews(is_moderated, status)
  `);

  console.log('✓ Migration 137 completed: Reviews moderation columns added');
};
