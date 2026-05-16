import type { Migration } from '../lib/migrations';

export const migration_186_member_classifieds: Migration = {
  version: '186_member_classifieds',
  description: 'Add member-only free classifieds tables for Sanliurfa listings',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classified_categories (
        id SERIAL PRIMARY KEY,
        parent_id INTEGER REFERENCES classified_categories(id) ON DELETE SET NULL,
        name VARCHAR(160) NOT NULL,
        slug VARCHAR(180) NOT NULL UNIQUE,
        description TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS classified_listings (
        id TEXT PRIMARY KEY DEFAULT ('cl_' || md5(random()::text || clock_timestamp()::text)),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES classified_categories(id),
        title VARCHAR(180) NOT NULL,
        slug VARCHAR(220) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        price NUMERIC(14,2),
        currency VARCHAR(3) NOT NULL DEFAULT 'TRY',
        district VARCHAR(80) NOT NULL,
        neighborhood VARCHAR(120),
        address TEXT,
        city VARCHAR(80) NOT NULL DEFAULT 'Şanlıurfa',
        phone VARCHAR(30),
        images TEXT[] NOT NULL DEFAULT '{}',
        condition VARCHAR(40) NOT NULL DEFAULT 'belirtilmedi',
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        view_count INTEGER NOT NULL DEFAULT 0,
        contact_count INTEGER NOT NULL DEFAULT 0,
        published_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT classified_listings_city_check CHECK (city = 'Şanlıurfa'),
        CONSTRAINT classified_listings_status_check CHECK (status IN ('draft', 'pending', 'active', 'rejected', 'archived', 'expired'))
      );

      CREATE INDEX IF NOT EXISTS idx_classified_categories_parent ON classified_categories(parent_id);
      CREATE INDEX IF NOT EXISTS idx_classified_listings_status ON classified_listings(status);
      CREATE INDEX IF NOT EXISTS idx_classified_listings_category ON classified_listings(category_id);
      CREATE INDEX IF NOT EXISTS idx_classified_listings_district ON classified_listings(district);
      CREATE INDEX IF NOT EXISTS idx_classified_listings_user ON classified_listings(user_id);
      CREATE INDEX IF NOT EXISTS idx_classified_listings_created ON classified_listings(created_at DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP TABLE IF EXISTS classified_listings;
      DROP TABLE IF EXISTS classified_categories;
    `);
  },
};
