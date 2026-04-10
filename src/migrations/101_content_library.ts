/**
 * Migration 101: Content Library
 * Content repository and management
 */

import type { Migration } from '../lib/migrations';

export const migration_101_content_library: Migration = {
  version: '101_content_library',
  description: 'Content repository and management',
  up: async (pool: any) => {
  try {
    // Content items/articles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_key VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(500) UNIQUE NOT NULL,
        description TEXT,
        content TEXT,
        content_type VARCHAR(50),
        category VARCHAR(100),
        author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'draft',
        visibility VARCHAR(50) DEFAULT 'private',
        featured BOOLEAN DEFAULT false,
        view_count INT DEFAULT 0,
        like_count INT DEFAULT 0,
        comment_count INT DEFAULT 0,
        seo_title VARCHAR(255),
        seo_description VARCHAR(500),
        seo_keywords TEXT[],
        published_at TIMESTAMP,
        scheduled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_items_author
      ON content_items(author_id, status, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_items_slug
      ON content_items(slug)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_items_category
      ON content_items(category, status, published_at DESC)
    `);

    // Content tags
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        tag_name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(content_id, tag_name)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_tags_name
      ON content_tags(tag_name)
    `);

    // Content relationships
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_relations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        related_content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        relation_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(source_content_id, related_content_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_relations
      ON content_relations(source_content_id, relation_type)
    `);

    // Content comments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment_text TEXT NOT NULL,
        is_approved BOOLEAN DEFAULT false,
        like_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_comments_content
      ON content_comments(content_id, is_approved, created_at DESC)
    `);

    // Content analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        view_date DATE NOT NULL,
        view_count INT DEFAULT 0,
        unique_viewers INT DEFAULT 0,
        avg_read_time INT,
        bounce_rate FLOAT,
        scroll_depth FLOAT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(content_id, view_date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_analytics_date
      ON content_analytics(content_id, view_date DESC)
    `);

    console.log('✓ Migration 101 completed: Content library tables created');
  } catch (error) {
    console.error('Migration 101 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS content_analytics CASCADE');
    await pool.query('DROP TABLE IF EXISTS content_comments CASCADE');
    await pool.query('DROP TABLE IF EXISTS content_relations CASCADE');
    await pool.query('DROP TABLE IF EXISTS content_tags CASCADE');
    await pool.query('DROP TABLE IF EXISTS content_items CASCADE');
    console.log('✓ Migration 101 rolled back');
  } catch (error) {
    console.error('Rollback 101 failed:', error);
    throw error;
  }
  }
};
