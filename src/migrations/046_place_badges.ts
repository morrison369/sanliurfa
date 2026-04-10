/**
 * Migration 046: Place Badges System
 * Award badges to places based on criteria (ratings, reviews, verification, etc.)
 */

import type { Migration } from '../lib/migrations';

export const migration_046_place_badges: Migration = {
  version: '046_place_badges',
  description: 'Place badge awards and metadata',
  async up(pool: any) {
    // Place badges table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        badge_type VARCHAR(50) NOT NULL,
        awarded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reason TEXT,
        metadata JSONB DEFAULT '{}',
        UNIQUE(place_id, badge_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_badges
      ON place_badges(place_id, badge_type)
    `);

    // Badge definitions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS badge_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(10),
        description TEXT,
        criteria JSONB,
        auto_award BOOLEAN DEFAULT false
      )
    `);

    // Insert default badge types
    await pool.query(`
      INSERT INTO badge_definitions (type, name, icon, description, auto_award)
      VALUES
        ('verified', 'Doğrulanmış', '✅', 'Resmi olarak doğrulanmış mekan', true),
        ('top_rated', 'Yüksek Puanlı', '⭐', '4.5+ puanla en iyi mekanlardan', true),
        ('popular', 'Popüler', '🔥', 'Çok ziyaret edilen ve beğenilen mekan', true),
        ('new', 'Yeni', '🆕', 'Son eklenen mekanlar', true),
        ('featured', 'Öne Çıkan', '💎', 'Platform tarafından öne çıkarılan mekan', false),
        ('award_winner', 'Ödül Sahibi', '🏆', 'Hizmet ödülü kazanmış mekan', false),
        ('trusted', 'Güvenilir', '🛡️', 'Yüksek güven puanına sahip mekan', true),
        ('responsive', 'Yanıt Verici', '📞', 'Hızlı yanıt veren mekan', true)
      ON CONFLICT DO NOTHING
    `);

    console.log('✓ Migration 046: Place badges system created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS place_badges CASCADE');
    await pool.query('DROP TABLE IF EXISTS badge_definitions CASCADE');
    console.log('✓ Migration 046 rolled back');
  }
};
