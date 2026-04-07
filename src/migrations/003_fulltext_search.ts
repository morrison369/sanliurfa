/**
 * Migrasyon: Full-Text Search Endeksleri
 * PostgreSQL full-text search için indeks ve vektör sütunları
 */

import type { Migration } from '../lib/migrations';

export const migration_003_fulltext_search: Migration = {
  version: '003_fulltext_search',
  description: 'Full-text search indeksleri ve tsvector sütunları',

  up: async (pool: any) => {
    // Places tablosuna tsvector sütunu ekle (Turkish)
    await pool.query(`
      ALTER TABLE places
      ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('turkish', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('turkish', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('turkish', coalesce(category, '')), 'C') ||
        setweight(to_tsvector('turkish', coalesce(address, '')), 'D')
      ) STORED;

      CREATE INDEX IF NOT EXISTS idx_places_search_vector
      ON places USING GIN(search_vector);
    `);

    // Reviews tablosuna tsvector sütunu ekle
    await pool.query(`
      ALTER TABLE reviews
      ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('turkish', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('turkish', coalesce(content, '')), 'B')
      ) STORED;

      CREATE INDEX IF NOT EXISTS idx_reviews_search_vector
      ON reviews USING GIN(search_vector);
    `);

    // Blog posts tablosuna tsvector sütunu ekle
    await pool.query(`
      ALTER TABLE blog_posts
      ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('turkish', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('turkish', coalesce(content, '')), 'B')
      ) STORED;

      CREATE INDEX IF NOT EXISTS idx_blog_posts_search_vector
      ON blog_posts USING GIN(search_vector);
    `);

    // Events tablosuna tsvector sütunu ekle
    await pool.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('turkish', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('turkish', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('turkish', coalesce(location, '')), 'C')
      ) STORED;

      CREATE INDEX IF NOT EXISTS idx_events_search_vector
      ON events USING GIN(search_vector);
    `);

    // Search tablosu (history)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        query TEXT NOT NULL,
        results_count INTEGER,
        result_types TEXT[],
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
    `);

    // Trending searches tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trending_searches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query TEXT NOT NULL UNIQUE,
        search_count INTEGER DEFAULT 1,
        last_searched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_trending_searches_count ON trending_searches(search_count DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS trending_searches CASCADE');
    await pool.query('DROP TABLE IF EXISTS search_history CASCADE');

    await pool.query('ALTER TABLE events DROP COLUMN IF EXISTS search_vector');
    await pool.query('ALTER TABLE blog_posts DROP COLUMN IF EXISTS search_vector');
    await pool.query('ALTER TABLE reviews DROP COLUMN IF EXISTS search_vector');
    await pool.query('ALTER TABLE places DROP COLUMN IF EXISTS search_vector');
  }
};
