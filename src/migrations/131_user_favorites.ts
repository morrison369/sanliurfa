import type { Migration } from '../lib/migrations/migration-system';

const migration: Migration = {
  version: '131',
  name: 'user_favorites',
  description: 'Add user favorites/places saved table',
  
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, place_id)
      );
    `);

    await client.query(`
      CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
      CREATE INDEX idx_user_favorites_place ON user_favorites(place_id);
    `);
  },

  down: async (client) => {
    await client.query(`DROP TABLE IF EXISTS user_favorites;`);
  }
};

export default migration;

