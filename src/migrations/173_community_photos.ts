import type { Migration } from '../lib/migrations';

export const migration_173_community_photos: Migration = {
  version: '173_community_photos',
  description: 'Topluluk fotoğraf galerisi: community_photos + community_photo_likes',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        caption TEXT,
        location VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected')),
        rejection_reason TEXT,
        approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        like_count INTEGER NOT NULL DEFAULT 0,
        comment_count INTEGER NOT NULL DEFAULT 0,
        view_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_community_photos_user
        ON community_photos(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_community_photos_approved
        ON community_photos(status, created_at DESC) WHERE status = 'approved';
      CREATE INDEX IF NOT EXISTS idx_community_photos_pending
        ON community_photos(status, created_at ASC) WHERE status = 'pending';
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_photo_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        photo_id UUID NOT NULL REFERENCES community_photos(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(photo_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_community_photo_likes_photo
        ON community_photo_likes(photo_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_community_photo_likes_user
        ON community_photo_likes(user_id, created_at DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS community_photo_likes CASCADE');
    await pool.query('DROP TABLE IF EXISTS community_photos CASCADE');
  },
};
