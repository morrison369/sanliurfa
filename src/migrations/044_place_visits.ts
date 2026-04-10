/**
 * Migration 044: Place Visit History System
 * Tracks user visits to places with notes and ratings
 */

import type { Migration } from '../lib/migrations';

export const migration_044_place_visits: Migration = {
  version: '044_place_visits',
  description: 'Place visit history with notes and ratings',
  async up(pool: any) {
    // Place visits table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        visited_at TIMESTAMP NOT NULL,
        notes TEXT,
        rating NUMERIC(2,1),
        duration_minutes INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_visits_user
      ON place_visits(user_id, visited_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_visits_place
      ON place_visits(place_id, visited_at DESC)
    `);

    // Denormalized visit count on places table
    await pool.query(`
      ALTER TABLE places
      ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0
    `);

    console.log('✓ Migration 044: Place visit history system created');
  },

  async down(pool: any) {
    await pool.query('ALTER TABLE places DROP COLUMN IF EXISTS visit_count');
    await pool.query('DROP TABLE IF EXISTS place_visits CASCADE');
    console.log('✓ Migration 044 rolled back');
  }
};
