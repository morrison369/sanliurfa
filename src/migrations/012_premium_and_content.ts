import type { Migration } from '../lib/migrations';

export const migration_012_premium_and_content: Migration = {
  version: '012_premium_and_content',
  description: 'Premium memberships, photos, ads',

  up: async (pool: any) => {
    // Memberships
    await pool.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        tier VARCHAR(20) DEFAULT 'free',
        stripe_customer_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        started_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Photos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        caption TEXT,
        helpful_count INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_place_photos_place ON place_photos(place_id);
    `);

    // Ads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID REFERENCES places(id),
        ad_type VARCHAR(50),
        title VARCHAR(255),
        content TEXT,
        budget NUMERIC(10,2),
        spent NUMERIC(10,2) DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_ads_vendor ON advertisements(vendor_id);
      CREATE INDEX idx_ads_place ON advertisements(place_id);
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS advertisements CASCADE');
    await pool.query('DROP TABLE IF EXISTS place_photos CASCADE');
    await pool.query('DROP TABLE IF EXISTS memberships CASCADE');
  }
};
