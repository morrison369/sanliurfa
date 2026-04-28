import type { Migration } from '../lib/migrations';

export const migration_145_search_pg_trgm: Migration = {
  version: '145_search_pg_trgm',
  description: 'Enable pg_trgm extension and add trigram index for autocomplete fuzzy search',

  up: async (pool: any) => {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_autocomplete_completion_trgm
      ON autocomplete_index
      USING GIN (completion_text gin_trgm_ops);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP INDEX IF EXISTS idx_autocomplete_completion_trgm;`);
  },
};
