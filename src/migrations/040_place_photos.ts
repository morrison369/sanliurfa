/**
 * Migration 040: Place Photos
 * Allows users to upload photos for places
 */

import type { Migration } from '../lib/migrations';

export const migration_040_place_photos: Migration = {
  version: '040_place_photos',
  description: 'Place photos - user uploaded media for places',

  up: async (pool: any) => {
    // Create place photos table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        alt_text TEXT,
        caption TEXT,
        is_featured BOOLEAN DEFAULT false,
        helpful_count INTEGER DEFAULT 0,
        unhelpful_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create photo votes table for tracking helpful/unhelpful votes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS photo_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        photo_id UUID NOT NULL REFERENCES place_photos(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vote_type VARCHAR(20) NOT NULL CHECK (vote_type IN ('helpful', 'unhelpful')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(photo_id, user_id)
      )
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_photos_place ON place_photos(place_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_place_photos_featured ON place_photos(place_id) WHERE is_featured = true;
      CREATE INDEX IF NOT EXISTS idx_place_photos_user ON place_photos(uploaded_by, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_photo_votes_photo ON photo_votes(photo_id);
      CREATE INDEX IF NOT EXISTS idx_photo_votes_user ON photo_votes(user_id);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP TABLE IF EXISTS photo_votes CASCADE
    `);

    await pool.query(`
      DROP TABLE IF EXISTS place_photos CASCADE
    `);
  }
};
