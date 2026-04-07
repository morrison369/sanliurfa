import type { Migration } from '../lib/migrations';

export const migration_011_vendor_and_community: Migration = {
  version: '011_vendor_and_community',
  description: 'Vendor tools, community features, badges',

  up: async (pool: any) => {
    // Vendor profile
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        place_id UUID REFERENCES places(id) ON DELETE SET NULL,
        business_name VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(255),
        verified BOOLEAN DEFAULT false,
        rating NUMERIC(3,2),
        response_rate NUMERIC(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_vendor_profiles_user_id ON vendor_profiles(user_id);
    `);

    // Review responses
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        vendor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(review_id)
      );
    `);

    // User follows
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      );

      CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
      CREATE INDEX idx_user_follows_following ON user_follows(following_id);
    `);

    // User badges
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_type VARCHAR(50) NOT NULL,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, badge_type)
      );
    `);

    // Review voting
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        helpful BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(review_id, user_id)
      );
    `);

    // Comment threads
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_review_comments_review ON review_comments(review_id);
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS review_comments CASCADE');
    await pool.query('DROP TABLE IF EXISTS review_votes CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_badges CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_follows CASCADE');
    await pool.query('DROP TABLE IF EXISTS review_responses CASCADE');
    await pool.query('DROP TABLE IF EXISTS vendor_profiles CASCADE');
  }
};
