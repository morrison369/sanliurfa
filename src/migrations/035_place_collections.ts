/**
 * Migration 035: Place Collections
 * Allows users to create curated lists of places
 */

import type { Migration } from '../lib/migrations';

export const migration_035_place_collections: Migration = {
  version: '035_place_collections',
  description: 'Place collections - user curated lists of places',

  up: async (pool: any) => {
    // Create collections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        is_public BOOLEAN DEFAULT false,
        place_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create collection items table (many-to-many between collections and places)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collection_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        collection_id UUID NOT NULL REFERENCES place_collections(id) ON DELETE CASCADE,
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        note TEXT,
        position INTEGER,
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(collection_id, place_id)
      )
    `);

    // Create collection followers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collection_followers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        collection_id UUID NOT NULL REFERENCES place_collections(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        followed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(collection_id, user_id)
      )
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collections_user ON place_collections(user_id, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_collections_public ON place_collections(is_public) WHERE is_public = true;
      CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id);
      CREATE INDEX IF NOT EXISTS idx_collection_items_place ON collection_items(place_id);
      CREATE INDEX IF NOT EXISTS idx_collection_followers_collection ON collection_followers(collection_id);
      CREATE INDEX IF NOT EXISTS idx_collection_followers_user ON collection_followers(user_id);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP TABLE IF EXISTS collection_followers CASCADE
    `);

    await pool.query(`
      DROP TABLE IF EXISTS collection_items CASCADE
    `);

    await pool.query(`
      DROP TABLE IF EXISTS place_collections CASCADE
    `);
  }
};
