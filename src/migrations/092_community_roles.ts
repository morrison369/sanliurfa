/**
 * Migration 092: Community Roles & Privileges
 * Community roles and user privileges
 */

import type { Migration } from '../lib/migrations';

export const migration_092_community_roles: Migration = {
  version: '092_community_roles',
  description: 'Community roles and user privileges',
  up: async (pool: any) => {
  try {
    // Community roles (contributor, expert, moderator, etc.)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_key VARCHAR(100) NOT NULL UNIQUE,
        role_name VARCHAR(255) NOT NULL,
        description TEXT,
        icon_url VARCHAR(500),
        color VARCHAR(20),
        min_reputation INT DEFAULT 0,
        privileges JSONB,
        is_automatic BOOLEAN DEFAULT true,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_community_roles_reputation
      ON community_roles(min_reputation, display_order)
    `);

    // User community roles assignment
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_community_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id UUID NOT NULL REFERENCES community_roles(id) ON DELETE CASCADE,
        assigned_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        assignment_reason TEXT,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, role_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_roles
      ON user_community_roles(user_id, is_active)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_expiry
      ON user_community_roles(expires_at) WHERE expires_at IS NOT NULL
    `);

    // User titles (display name/honorary titles)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_titles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title_text VARCHAR(255) NOT NULL,
        title_type VARCHAR(50) DEFAULT 'custom',
        is_official BOOLEAN DEFAULT false,
        color VARCHAR(20),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_titles
      ON user_titles(user_id, is_active)
    `);

    // Community statistics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_statistics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        total_contributions INT DEFAULT 0,
        helpful_rating FLOAT DEFAULT 0,
        reviews_written INT DEFAULT 0,
        comments_made INT DEFAULT 0,
        places_recommended INT DEFAULT 0,
        followers_count INT DEFAULT 0,
        following_count INT DEFAULT 0,
        influence_score FLOAT DEFAULT 0,
        last_active_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_community_stats_influence
      ON community_statistics(influence_score DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_community_stats_active
      ON community_statistics(last_active_at DESC)
    `);

    // User expertise areas (for expert badges)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_expertise (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(100) NOT NULL,
        expertise_level INT DEFAULT 1,
        contribution_count INT DEFAULT 0,
        helpful_count INT DEFAULT 0,
        last_contribution_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, category)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_expertise
      ON user_expertise(user_id, expertise_level DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_expertise_category
      ON user_expertise(category, expertise_level DESC)
    `);

    console.log('✓ Migration 092 completed: Community roles tables created');
  } catch (error) {
    console.error('Migration 092 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS user_expertise CASCADE');
    await pool.query('DROP TABLE IF EXISTS community_statistics CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_titles CASCADE');
    await pool.query('DROP TABLE IF EXISTS user_community_roles CASCADE');
    await pool.query('DROP TABLE IF EXISTS community_roles CASCADE');
    console.log('✓ Migration 092 rolled back');
  } catch (error) {
    console.error('Rollback 092 failed:', error);
    throw error;
  }
  }
};
