/**
 * Migration 082: Advanced Moderation Tools
 * Content flagging, moderation actions, and moderation queues
 */

import { Pool } from 'pg';

export const migration_082_advanced_moderation = async (pool: Pool) => {
  try {
    // Content flags for user-submitted reports
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_type VARCHAR(50) NOT NULL,
        content_id UUID NOT NULL,
        flagged_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        flag_reason VARCHAR(100) NOT NULL,
        flag_description TEXT,
        flag_severity VARCHAR(50) DEFAULT 'medium',
        status VARCHAR(50) DEFAULT 'pending',
        reviewed_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        review_notes TEXT,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_flags_status
      ON content_flags(status, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_flags_content
      ON content_flags(content_type, content_id)
    `);

    // Moderation actions (log of all moderation activities)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS moderation_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        action_type VARCHAR(50) NOT NULL,
        target_type VARCHAR(50) NOT NULL,
        target_id UUID NOT NULL,
        action_reason TEXT NOT NULL,
        action_details JSONB,
        duration_hours INT,
        is_permanent BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'active',
        appeal_id UUID,
        appealed_at TIMESTAMP,
        appeal_status VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_admin
      ON moderation_actions(admin_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_target
      ON moderation_actions(target_type, target_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_moderation_actions_status
      ON moderation_actions(status, expires_at)
    `);

    // Moderation queue (items pending review)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS moderation_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        queue_type VARCHAR(50) NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        item_id UUID NOT NULL,
        priority VARCHAR(50) DEFAULT 'normal',
        reason TEXT,
        submitted_count INT DEFAULT 1,
        last_reported_at TIMESTAMP DEFAULT NOW(),
        assigned_to_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_moderation_queue_type
      ON moderation_queue(queue_type, priority, status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_moderation_queue_assigned
      ON moderation_queue(assigned_to_admin_id)
    `);

    // Word/pattern blacklist for automatic filtering
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_filter_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_type VARCHAR(50) NOT NULL,
        pattern VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL,
        severity VARCHAR(50) DEFAULT 'medium',
        is_active BOOLEAN DEFAULT true,
        created_by_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(rule_type, pattern)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_filter_rules_active
      ON content_filter_rules(is_active, rule_type)
    `);

    console.log('✓ Migration 082 completed: Advanced moderation tables created');
  } catch (error) {
    console.error('Migration 082 failed:', error);
    throw error;
  }
};

export const rollback_082 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS content_filter_rules CASCADE');
    await pool.query('DROP TABLE IF EXISTS moderation_queue CASCADE');
    await pool.query('DROP TABLE IF EXISTS moderation_actions CASCADE');
    await pool.query('DROP TABLE IF EXISTS content_flags CASCADE');
    console.log('✓ Migration 082 rolled back');
  } catch (error) {
    console.error('Rollback 082 failed:', error);
    throw error;
  }
};
