/**
 * Migration 031: Content Moderation & Reporting System
 * Adds tables for user reports, moderation actions, and user bans
 */

import type { Migration } from '../lib/migrations';

export const migration_031_content_moderation: Migration = {
  version: '031_content_moderation',
  description: 'Content moderation, user reports, and ban management',

  up: async (pool: any) => {
    // Reports table - for user-submitted content reports
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('comment', 'review', 'message', 'user', 'place')),
        content_id UUID NOT NULL,
        reason VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
        resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        resolution_note TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
      CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
      CREATE INDEX IF NOT EXISTS idx_reports_content_type ON reports(content_type, content_id);
      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
    `);

    // Moderation actions - record of actions taken on reports
    await pool.query(`
      CREATE TABLE IF NOT EXISTS moderation_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
        target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('warning', 'content_removed', 'suspend', 'ban', 'appeal_granted')),
        reason TEXT NOT NULL,
        duration_days INTEGER,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_user ON moderation_actions(target_user_id);
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_type ON moderation_actions(action_type);
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_expires ON moderation_actions(expires_at) WHERE expires_at IS NOT NULL;
    `);

    // User bans - track active bans on users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_bans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        banned_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        duration_days INTEGER,
        appeal_reason TEXT,
        appeal_status VARCHAR(50) CHECK (appeal_status IN ('pending', 'granted', 'denied')),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, expires_at)
      );
      CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(expires_at) WHERE expires_at > NOW();
      CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(user_id, expires_at DESC);
    `);

    // Moderation queue - tracks items needing review
    await pool.query(`
      CREATE TABLE IF NOT EXISTS moderation_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_type VARCHAR(50) NOT NULL,
        content_id UUID NOT NULL,
        reason VARCHAR(100),
        report_count INTEGER DEFAULT 1,
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
      CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned ON moderation_queue(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_moderation_queue_priority ON moderation_queue(priority DESC, created_at ASC);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP TABLE IF EXISTS moderation_queue CASCADE;
      DROP TABLE IF EXISTS user_bans CASCADE;
      DROP TABLE IF EXISTS moderation_actions CASCADE;
      DROP TABLE IF EXISTS reports CASCADE;
    `);
  }
};
