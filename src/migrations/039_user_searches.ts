/**
 * Migration 039: User Searches & Search History
 * Tracks user searches and search suggestions for analytics
 */

export const migration_039_user_searches = {
  name: '039_user_searches',
  async up(pool: any) {
    // User searches - history of searches
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_searches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        query VARCHAR(255) NOT NULL,
        filters JSONB DEFAULT '{}',
        results_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_searches_user
      ON user_searches(user_id, created_at DESC)
    `);

    // Search suggestions - trending searches
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_suggestions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query VARCHAR(255) UNIQUE NOT NULL,
        category VARCHAR(50),
        search_count INTEGER DEFAULT 1,
        last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_suggestions_query
      ON search_suggestions(query)
    `);

    console.log('✓ Migration 039: User searches tables created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS search_suggestions CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_searches CASCADE');
    console.log('✓ Migration 039 rolled back');
  }
};
