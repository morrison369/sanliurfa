/**
 * Migration 180: Event Submissions + Feature DB Integrity
 *
 * Feature Audit 2026-05-12 bulgularına dayanan iki temel:
 *
 * 1. event_submissions tablosu:
 *    - Üyelerin etkinlik önerebilmesi için (place_submissions ile aynı pattern)
 *    - Status: pending/approved/rejected
 *    - Approved → events tablosuna kopyalanır (manual ya da otomatik)
 *
 * 2. Eksik integrity:
 *    - review_helpful (user_id, review_id) unique (aynı user iki kez oy veremesin)
 *    - social_swipes (swiper_id, target_id) unique (aynı user'a iki kez swipe yok)
 *    - 4 missing index (reviews, follows, swipes, match_profiles)
 *
 * Reasoning: Atıl özelliklerin (favorites, helpful, flags, photos) aktivasyonu
 * için DB hazır olmalı. Bu migration UI implementasyonu öncesi temel atıyor.
 */

export const migration = {
  description: 'Event submissions table + missing FK/indexes (feature foundation)',

  async up(pool: any) {
    // 1. event_submissions tablosu (place_submissions ile aynı pattern)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100),
        location TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ,
        image_url TEXT,
        organizer_name VARCHAR(255),
        organizer_email VARCHAR(255),
        organizer_phone VARCHAR(50),
        contact_url TEXT,
        ticket_url TEXT,
        is_free BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
        admin_note TEXT,
        approved_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_event_submissions_status_created
        ON event_submissions (status, created_at DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_event_submissions_user
        ON event_submissions (user_id, created_at DESC) WHERE user_id IS NOT NULL;
    `);

    // 2. review_helpful + social_swipes: unique constraints ZATEN var
    //    (review_helpful_review_id_user_id_key, social_swipes_swiper_id_target_user_id_key)
    //    Bu adım atlandı — verify edildi.

    // 3. Performance indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_place_status_created
        ON reviews (place_id, status, created_at DESC)
        WHERE status = 'active';
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_follows_follower_created
        ON user_follows (follower_id, created_at DESC);
    `);
    // user_follows kolon: following_id (followed_id değil)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_follows_following
        ON user_follows (following_id, created_at DESC);
    `);
    // social_swipes kolon: target_user_id (target_id değil)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_swipes_swiper_created
        ON social_swipes (swiper_id, created_at DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_swipes_target_created
        ON social_swipes (target_user_id, created_at DESC);
    `);
    // user_match_profiles kolon: is_discoverable (is_active değil)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_match_profiles_discoverable
        ON user_match_profiles (is_discoverable, updated_at DESC)
        WHERE is_discoverable = true;
    `);
  },

  async down(pool: any) {
    await pool.query(`DROP INDEX IF EXISTS idx_user_match_profiles_discoverable;`);
    await pool.query(`DROP INDEX IF EXISTS idx_social_swipes_target_created;`);
    await pool.query(`DROP INDEX IF EXISTS idx_social_swipes_swiper_created;`);
    await pool.query(`DROP INDEX IF EXISTS idx_user_follows_following;`);
    await pool.query(`DROP INDEX IF EXISTS idx_user_follows_follower_created;`);
    await pool.query(`DROP INDEX IF EXISTS idx_reviews_place_status_created;`);
    await pool.query(`DROP INDEX IF EXISTS idx_event_submissions_user;`);
    await pool.query(`DROP INDEX IF EXISTS idx_event_submissions_status_created;`);
    await pool.query(`DROP TABLE IF EXISTS event_submissions;`);
  },
};

export default migration;
