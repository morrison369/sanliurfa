import type { Migration } from '../lib/migrations';

export const migration_010_saved_searches: Migration = {
  version: '010_saved_searches',
  description: 'Saved searches table',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        query VARCHAR(255) NOT NULL,
        filters JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      );

      CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS saved_searches CASCADE');
  }
};
