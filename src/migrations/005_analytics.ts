/**
 * Migrasyon: Analytics Tabloları
 * Ziyaretçi, etkinlik ve kullanım istatistikleri
 */

import type { Migration } from '../lib/migrations';

export const migration_005_analytics: Migration = {
  version: '005_analytics',
  description: 'Analytics sistemi: ziyaretçi, görüntülemeler, tıklamalar takibi',

  up: async (pool: any) => {
    // Page views tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        page_path VARCHAR(500) NOT NULL,
        referrer VARCHAR(500),
        ip_address VARCHAR(45),
        user_agent TEXT,
        session_id VARCHAR(255),
        duration_ms INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
      CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);
      CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
    `);

    // Place views tablosu (hangi yerlere bakıldığı)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ip_address VARCHAR(45),
        session_id VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_place_views_place_id ON place_views(place_id);
      CREATE INDEX IF NOT EXISTS idx_place_views_user_id ON place_views(user_id);
      CREATE INDEX IF NOT EXISTS idx_place_views_created_at ON place_views(created_at DESC);
    `);

    // User actions tablosu (tıklamalar, indirmeler vb.)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action_type VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50),
        resource_id UUID,
        metadata JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_actions_action_type ON user_actions(action_type);
      CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at DESC);
    `);

    // Daily stats tablosu (günlük özetler)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stat_date DATE NOT NULL UNIQUE,
        page_views INTEGER DEFAULT 0,
        unique_users INTEGER DEFAULT 0,
        new_users INTEGER DEFAULT 0,
        reviews_created INTEGER DEFAULT 0,
        places_viewed INTEGER DEFAULT 0,
        favorites_added INTEGER DEFAULT 0,
        avg_session_duration_ms INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date DESC);
    `);

    // Popular places (view count)
    await pool.query(`
      CREATE MATERIALIZED VIEW popular_places AS
      SELECT
        p.id,
        p.name,
        p.slug,
        p.category,
        p.rating,
        COUNT(pv.id) as view_count,
        COUNT(DISTINCT pv.user_id) as unique_viewers,
        COUNT(DISTINCT DATE(pv.created_at)) as view_days
      FROM places p
      LEFT JOIN place_views pv ON p.id = pv.place_id
      WHERE pv.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY p.id, p.name, p.slug, p.category, p.rating
      ORDER BY view_count DESC;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_popular_places_id ON popular_places (id);
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP MATERIALIZED VIEW IF EXISTS popular_places CASCADE');
    await pool.query('DROP TABLE IF EXISTS daily_stats CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_actions CASCADE');
    await pool.query('DROP TABLE IF EXISTS place_views CASCADE');
    await pool.query('DROP TABLE IF EXISTS page_views CASCADE');
  }
};
