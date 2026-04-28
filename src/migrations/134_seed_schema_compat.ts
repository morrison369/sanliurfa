/**
 * Migration 134: Seed Schema Compatibility
 * Adds missing columns and tables required by 2026 seed data.
 * Ensures places, categories, and related tables match seed SQL expectations.
 */

export const migration_134_seed_schema_compat = {
  version: '134_seed_schema_compat',
  description: 'Seed data uyumu: categories tablosu, places eksik sütunlar',

  up: async (pool: any) => {
    // 1. Categories tablosu (seed data buna INSERT yapıyor)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        color VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. Places tablosuna eksik sütunları ekle
    // category_id (FK to categories)
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id)
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS short_description TEXT
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS meta_description TEXT
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS price_range VARCHAR(10)
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS price_min INTEGER
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS price_max INTEGER
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS features TEXT[]
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS thumbnail_url TEXT
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS images TEXT[]
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS avg_rating DECIMAL(3,2) DEFAULT 0
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id)
    `);
    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS tags TEXT[]
    `);

    // 3. places tablosunda opening_hours JSON olabilmesi için tip dönüşümü
    // (TEXT -> JSONB daha iyi ama TEXT'te JSON string de çalışır)

    // 4. Users tablosuna eksik sütunlar
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT
    `);
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0
    `);
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
    `);
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255)
    `);

    // 5. Blog posts tablosuna eksik sütunlar
    await pool.query(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS cover_image TEXT`);
    await pool.query(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS featured_image TEXT`);
    await pool.query(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category VARCHAR(100)`);
    await pool.query(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category_slug VARCHAR(100)`);
    await pool.query(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft'`);
    await pool.query(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS excerpt TEXT`);
    await pool.query(`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS author_name VARCHAR(255)`);

    // 6. Support tickets tablosu (contact API buna INSERT yapıyor)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number VARCHAR(20) UNIQUE DEFAULT ('TKT-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0')),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'general',
        place_id UUID REFERENCES places(id),
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(50) DEFAULT 'medium',
        assigned_to UUID REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 7. place_categories alias view (bazı query'ler bunu kullanıyor)
    await pool.query(`
      CREATE OR REPLACE VIEW place_categories AS
      SELECT * FROM categories
    `);

    // 8. place_daily_analytics tablosu (admin dashboard kullanıyor)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_daily_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID REFERENCES places(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        views INTEGER DEFAULT 0,
        phone_clicks INTEGER DEFAULT 0,
        direction_clicks INTEGER DEFAULT 0,
        website_clicks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(place_id, date)
      )
    `);

    // 9. Events tablosuna eksik sütunlar
    await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'published'`);
    await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS image TEXT`);
    await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(100)`);

    // 10. Historical sites tablosuna eksik sütunlar
    await pool.query(`ALTER TABLE historical_sites ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'`);
    await pool.query(`ALTER TABLE historical_sites ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false`);

    // 11. İndeksler
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_places_category_id ON places(category_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_places_status ON places(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_places_is_featured ON places(is_featured)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_place_daily_analytics_place_date ON place_daily_analytics(place_id, date)`);
  },

  down: async (pool: any) => {
    await pool.query('DROP VIEW IF EXISTS place_categories');
    await pool.query('DROP TABLE IF EXISTS place_daily_analytics CASCADE');
    await pool.query('DROP TABLE IF EXISTS support_tickets CASCADE');
    await pool.query('DROP TABLE IF EXISTS categories CASCADE');
    // Sütun silme tehlikeli olduğu için burada yapmıyoruz
  }
};
