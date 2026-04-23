/**
 * Migration 131: Social swipe and matching baseline
 * Adds Tinder-like swipe and match tables for community discovery.
 */

import type { Migration } from '../lib/migrations';

export const migration_131_social_swipe_matching: Migration = {
  version: '131_social_swipe_matching',
  description: 'Create swipe profile, swipe actions and match tables',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_swipe_profiles (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        photos JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_swipes (
        id BIGSERIAL PRIMARY KEY,
        swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        direction VARCHAR(10) NOT NULL CHECK (direction IN ('like', 'pass')),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (swiper_id, target_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_matches (
        id BIGSERIAL PRIMARY KEY,
        user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE (user_a, user_b),
        CHECK (user_a <> user_b)
      );
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_social_swipes_swiper ON social_swipes(swiper_id, created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_social_swipes_target ON social_swipes(target_id, created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_social_matches_user_a ON social_matches(user_a, created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_social_matches_user_b ON social_matches(user_b, created_at DESC);`);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS social_matches');
    await pool.query('DROP TABLE IF EXISTS social_swipes');
    await pool.query('DROP TABLE IF EXISTS social_swipe_profiles');
  },
};
