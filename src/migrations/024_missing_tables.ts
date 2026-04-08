/**
 * Migration 024: Missing Tables
 * Creates tables that are referenced in code but have no migrations:
 * historical_sites, foods, coupons, reservations, messages, blog_post_revisions
 */

export const migration_024_missing_tables = {
  name: '024_missing_tables',
  async up(pool: any) {
    // Historical sites table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS historical_sites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(500) NOT NULL,
        title VARCHAR(500),
        description TEXT,
        short_description TEXT,
        history TEXT,
        significance TEXT,
        location VARCHAR(500),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        images TEXT[],
        cover_image TEXT,
        gallery TEXT[],
        visiting_hours TEXT,
        entrance_fee TEXT,
        tips TEXT,
        nearby_places UUID[],
        tags TEXT[],
        is_unesco BOOLEAN DEFAULT false,
        period VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_historical_sites_slug
      ON historical_sites(slug)
    `);

    // Foods table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(500) NOT NULL,
        description TEXT,
        history TEXT,
        ingredients TEXT[],
        where_to_eat TEXT,
        images TEXT[],
        cover_image TEXT,
        tags TEXT[],
        is_vegetarian BOOLEAN DEFAULT false,
        is_spicy BOOLEAN DEFAULT false,
        difficulty VARCHAR(50),
        prep_time INTEGER,
        rating DECIMAL(3,2) DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_foods_slug
      ON foods(slug)
    `);

    // Coupons table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        min_purchase DECIMAL(10,2),
        max_uses INTEGER,
        used_count INTEGER DEFAULT 0,
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_coupons_code
      ON coupons(code)
    `);

    // Reservations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        place_id UUID REFERENCES places(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        time TIME,
        party_size INTEGER,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_user_id
      ON reservations(user_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_place_id
      ON reservations(place_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_date
      ON reservations(date)
    `);

    // Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
        subject VARCHAR(255),
        body TEXT NOT NULL,
        email VARCHAR(255),
        name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_status
      ON messages(status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at
      ON messages(created_at DESC)
    `);

    // Blog post revisions table (for content versioning)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_post_revisions (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
        title VARCHAR(500),
        content TEXT,
        editor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        change_summary TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blog_post_revisions_post_id
      ON blog_post_revisions(post_id, created_at DESC)
    `);
  },

  async down(pool: any) {
    await pool.query(`DROP TABLE IF EXISTS blog_post_revisions CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS messages CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS reservations CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS coupons CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS foods CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS historical_sites CASCADE`);
  }
};
