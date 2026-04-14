import dotenv from 'dotenv';
dotenv.config();

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sanliurfa';

const { p: pool } = await import('../dist/server/chunks/postgres_xBeDjZv2.mjs');

const migrations = [
  { version: '001_initial_schema', description: 'Initial database schema', sql: `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      username VARCHAR(50) UNIQUE,
      avatar_url TEXT,
      bio TEXT,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      role VARCHAR(20) DEFAULT 'user',
      email_verified BOOLEAN DEFAULT false,
      email_verified_at TIMESTAMP,
      notification_preferences JSONB DEFAULT '{"email": true, "push": true, "in_app": true}'::jsonb,
      privacy_settings JSONB DEFAULT '{"profile_public": true, "show_email": false}'::jsonb,
      two_factor_enabled BOOLEAN DEFAULT false,
      two_factor_secret VARCHAR(32),
      language_preference VARCHAR(10) DEFAULT 'tr',
      theme_preference VARCHAR(20) DEFAULT 'light',
      last_login_at TIMESTAMP,
      login_attempts INTEGER DEFAULT 0,
      account_locked_until TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `},
  { version: '002_places_table', description: 'Create places table', sql: `
    CREATE TABLE IF NOT EXISTS places (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(200) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      address TEXT,
      phone VARCHAR(20),
      website VARCHAR(255),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      image_url TEXT,
      average_rating DECIMAL(2, 1) DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      opening_hours JSONB,
      price_range INTEGER,
      tags TEXT[],
      verified BOOLEAN DEFAULT false,
      featured BOOLEAN DEFAULT false,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `},
  { version: '003_reviews_table', description: 'Create reviews table', sql: `
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      content TEXT NOT NULL,
      images TEXT[],
      helpful_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(place_id, user_id)
    );
  `},
  { version: '004_favorites_table', description: 'Create favorites table', sql: `
    CREATE TABLE IF NOT EXISTS favorites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, place_id)
    );
  `},
  { version: '005_blog_posts_table', description: 'Create blog posts table', sql: `
    CREATE TABLE IF NOT EXISTS blog_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      featured_image TEXT,
      author_id UUID NOT NULL REFERENCES users(id),
      status VARCHAR(20) DEFAULT 'draft',
      view_count INTEGER DEFAULT 0,
      published_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `}
];

console.log('🚀 Migrasyonlar başlatılıyor...\n');

for (const migration of migrations) {
  try {
    // Check if already executed
    const check = await pool.query('SELECT 1 FROM migrations WHERE version = $1', [migration.version]);
    if (check.rows.length > 0) {
      console.log(`⏭️  ${migration.version} - zaten çalıştırılmış`);
      continue;
    }

    // Execute migration
    await pool.query(migration.sql);
    
    // Record migration
    await pool.query(
      'INSERT INTO migrations (version, description) VALUES ($1, $2)',
      [migration.version, migration.description]
    );
    
    console.log(`✅ ${migration.version} - ${migration.description}`);
  } catch (e) {
    console.error(`❌ ${migration.version} - HATA:`, e.message);
  }
}

console.log('\n🎉 Temel migrasyonlar tamamlandı!');
process.exit(0);
