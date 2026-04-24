/**
 * Migration 120: Blog System
 * Blog posts, categories, tags, and content management
 */

import { Pool } from 'pg';

export const migration_120_blog_system = async (pool: Pool) => {
  try {
    // Blog posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        excerpt TEXT,
        content TEXT NOT NULL,
        content_html TEXT,
        category_id UUID REFERENCES blog_categories(id),
        author_id UUID REFERENCES users(id),
        author_name VARCHAR(100),
        author_avatar VARCHAR(255),
        featured_image VARCHAR(255),
        status VARCHAR(50) DEFAULT 'draft',
        published_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        reading_time INTEGER DEFAULT 5,
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        meta_title VARCHAR(255),
        meta_description TEXT,
        is_featured BOOLEAN DEFAULT false,
        is_pinned BOOLEAN DEFAULT false
      )
    `);

    await pool.query(`
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category_id UUID;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
      ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status, published_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(is_featured, published_at DESC)
    `);

    // Blog categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7),
        icon VARCHAR(50),
        parent_id UUID REFERENCES blog_categories(id),
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        post_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
      ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS color VARCHAR(7);
      ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS icon VARCHAR(50);
      ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
      ALTER TABLE blog_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    // Blog tags table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(7),
        post_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE blog_tags ADD COLUMN IF NOT EXISTS slug VARCHAR(100);
      ALTER TABLE blog_tags ADD COLUMN IF NOT EXISTS color VARCHAR(7);
    `);

    // Post-Tag relationship
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_post_tags (
        post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
        tag_id UUID REFERENCES blog_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, tag_id)
      )
    `);

    // Content revisions (versioning)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
        title VARCHAR(255),
        content TEXT,
        editor_id UUID REFERENCES users(id),
        editor_name VARCHAR(100),
        change_summary VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_revisions_post ON blog_revisions(post_id, created_at DESC)
    `);

    // Auto-publish schedule
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
        scheduled_at TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Content generation jobs (for bots/agents)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_generation_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        parameters JSONB,
        result_post_id UUID REFERENCES blog_posts(id),
        error_message TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert default categories
    await pool.query(`
      INSERT INTO blog_categories (slug, name, description, color, icon, sort_order) VALUES
      ('tarih', 'Tarih', 'Şanlıurfa''nın zengin tarihi ve kültürel mirası', '#8B4513', 'Landmark', 1),
      ('yemek', 'Yemek', 'Urfa mutfağından eşsiz lezzetler', '#E63946', 'UtensilsCrossed', 2),
      ('gezi', 'Gezi', 'Şanlıurfa gezi rehberleri ve rotaları', '#2A9D8F', 'Map', 3),
      ('kultur', 'Kültür', 'Yerel kültür ve gelenekler', '#F4A261', 'Palmtree', 4),
      ('otel', 'Otel', 'Konaklama önerileri', '#1D3557', 'Hotel', 5),
      ('restoran', 'Restoran', 'Restoran incelemeleri', '#E63946', 'Store', 6),
      ('haber', 'Haber', 'Şanlıurfa haberleri', '#457B9D', 'Newspaper', 7)
      ON CONFLICT (slug) DO NOTHING
    `);

    // Insert default tags
    await pool.query(`
      INSERT INTO blog_tags (slug, name, color) VALUES
      ('gobeklitepe', 'Göbeklitepe', '#8B4513'),
      ('balikligol', 'Balıklıgöl', '#457B9D'),
      ('harran', 'Harran', '#E9C46A'),
      ('halfeti', 'Halfeti', '#264653'),
      ('urfa-kebabi', 'Urfa Kebabı', '#E63946'),
      ('cig-kofte', 'Çiğ Köfte', '#F4A261'),
      ('rehber', 'Rehber', '#2A9D8F'),
      ('tavsiye', 'Tavsiye', '#E76F51'),
      ('2025', '2025', '#1D3557')
      ON CONFLICT (slug) DO NOTHING
    `);

    console.log('✓ Migration 120 completed: Blog system tables created');
  } catch (error) {
    console.error('Migration 120 failed:', error);
    throw error;
  }
};

export const rollback_120 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS content_generation_jobs CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_schedules CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_revisions CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_post_tags CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_tags CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_posts CASCADE');
    await pool.query('DROP TABLE IF EXISTS blog_categories CASCADE');
    console.log('✓ Migration 120 rolled back');
  } catch (error) {
    console.error('Rollback 120 failed:', error);
    throw error;
  }
};
