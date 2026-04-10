/**
 * Migration 023: Badge Definitions
 * Creates badge_definitions table with built-in badge types and criteria
 */

import type { Migration } from '../lib/migrations';

export const migration_023_badge_definitions: Migration = {
  version: '023_badge_definitions',
  description: 'Badge definitions and criteria catalog',
  async up(pool: any) {
    // Create badge_definitions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS badge_definitions (
        id SERIAL PRIMARY KEY,
        badge_type VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        category VARCHAR(50),
        criteria JSONB,
        points_reward INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_badge_definitions_category
      ON badge_definitions(category)
    `);

    // Seed default badges
    const badgesToInsert = [
      {
        badge_type: 'first_review',
        name: 'İlk Yorum',
        description: 'İlk yorumunu yazdın',
        icon: '⭐',
        category: 'milestone',
        criteria: JSON.stringify({ type: 'review_count', threshold: 1 }),
        points_reward: 50
      },
      {
        badge_type: 'explorer',
        name: 'Keşifçi',
        description: '10 yorum yazdın',
        icon: '🔭',
        category: 'engagement',
        criteria: JSON.stringify({ type: 'review_count', threshold: 10 }),
        points_reward: 100
      },
      {
        badge_type: 'local_guide',
        name: 'Yerel Rehber',
        description: '50 yorum yazdın',
        icon: '🗺️',
        category: 'engagement',
        criteria: JSON.stringify({ type: 'review_count', threshold: 50 }),
        points_reward: 500
      },
      {
        badge_type: 'photo_enthusiast',
        name: 'Fotoğraf Meraklısı',
        description: 'İlk fotoğrafını yükledi',
        icon: '📸',
        category: 'content',
        criteria: JSON.stringify({ type: 'photo_count', threshold: 1 }),
        points_reward: 30
      },
      {
        badge_type: 'community_pillar',
        name: 'Topluluk Direği',
        description: '100 faydalı oy aldın',
        icon: '🏛️',
        category: 'community',
        criteria: JSON.stringify({ type: 'helpful_votes', threshold: 100 }),
        points_reward: 200
      },
      {
        badge_type: 'early_adopter',
        name: 'Öncü Üye',
        description: 'İlk 1000 üyeden birisin',
        icon: '🌟',
        category: 'milestone',
        criteria: JSON.stringify({ type: 'user_rank', threshold: 1000 }),
        points_reward: 150
      }
    ];

    for (const badge of badgesToInsert) {
      await pool.query(
        `INSERT INTO badge_definitions (badge_type, name, description, icon, category, criteria, points_reward)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (badge_type) DO NOTHING`,
        [badge.badge_type, badge.name, badge.description, badge.icon, badge.category, badge.criteria, badge.points_reward]
      );
    }
  },

  async down(pool: any) {
    await pool.query(`DROP TABLE IF EXISTS badge_definitions CASCADE`);
  }
};
