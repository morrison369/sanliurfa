/**
 * Migration 135: Expanded Categories, Districts, Neighborhoods
 * - Alt kategori desteği (parent_id)
 * - İlçeler tablosu (13 ilçe)
 * - Mahalleler tablosu
 * - Eczaneler tablosu
 * - Places tablosuna district_id, neighborhood_id
 * - SEO landing pages tablosu
 */

export const migration_135_category_district_neighborhood = {
  version: '135_category_district_neighborhood',
  description: 'Genişletilmiş kategori, ilçe, mahalle ve eczane sistemi',

  up: async (pool: any) => {
    // 1. Categories tablosuna parent_id ekle (alt kategori desteği)
    await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories(id)`);
    await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_title VARCHAR(500)`);
    await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS meta_description TEXT`);
    await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS place_count INTEGER DEFAULT 0`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)`);

    // 2. İlçeler tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS districts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        meta_title VARCHAR(500),
        meta_description TEXT,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        population INTEGER,
        image TEXT,
        is_central BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_districts_slug ON districts(slug)`);

    // 3. Mahalleler tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS neighborhoods (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        district_id INTEGER NOT NULL REFERENCES districts(id),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        population INTEGER,
        postal_code VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(slug, district_id)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_neighborhoods_district ON neighborhoods(district_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_neighborhoods_slug ON neighborhoods(slug)`);

    // 4. Eczaneler tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pharmacies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        address TEXT NOT NULL,
        phone VARCHAR(20),
        district_id INTEGER REFERENCES districts(id),
        neighborhood_id INTEGER REFERENCES neighborhoods(id),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        is_on_duty BOOLEAN DEFAULT false,
        duty_date DATE,
        opening_hours TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pharmacies_duty ON pharmacies(is_on_duty, duty_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_pharmacies_district ON pharmacies(district_id)`);

    // 5. Places tablosuna ilçe ve mahalle bağlantısı
    await pool.query(`ALTER TABLE places ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id)`);
    await pool.query(`ALTER TABLE places ADD COLUMN IF NOT EXISTS neighborhood_id INTEGER REFERENCES neighborhoods(id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_places_district ON places(district_id)`);

    // 6. SEO landing pages tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS seo_pages (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(500) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        meta_title VARCHAR(500),
        meta_description TEXT,
        heading VARCHAR(500),
        intro_text TEXT,
        category_filter VARCHAR(100),
        district_filter INTEGER REFERENCES districts(id),
        sort_by VARCHAR(50) DEFAULT 'rating',
        limit_count INTEGER DEFAULT 20,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_seo_pages_slug ON seo_pages(slug)`);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS seo_pages CASCADE');
    await pool.query('DROP TABLE IF EXISTS pharmacies CASCADE');
    await pool.query('DROP TABLE IF EXISTS neighborhoods CASCADE');
    await pool.query('DROP TABLE IF EXISTS districts CASCADE');
  }
};
