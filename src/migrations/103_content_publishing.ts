/**
 * Migration 103: Content Publishing
 * Content versioning, workflows, and publishing
 */

import type { Migration } from '../lib/migrations';

export const migration_103_content_publishing: Migration = {
  version: '103_content_publishing',
  description: 'Content versioning, workflows, and publishing',
  up: async (pool: any) => {
  try {
    // Content versions/revisions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        version_number INT NOT NULL,
        title VARCHAR(500) NOT NULL,
        content TEXT,
        changed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        change_summary TEXT,
        is_published BOOLEAN DEFAULT false,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(content_id, version_number)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_versions
      ON content_versions(content_id, version_number DESC)
    `);

    // Content approval/review workflow
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        version_id UUID NOT NULL REFERENCES content_versions(id) ON DELETE CASCADE,
        requested_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'pending',
        approval_notes TEXT,
        rejection_reason TEXT,
        requested_at TIMESTAMP DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        UNIQUE(content_id, version_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_approvals_status
      ON content_approvals(status, requested_at DESC)
    `);

    // Publishing schedule
    await pool.query(`
      CREATE TABLE IF NOT EXISTS publishing_schedule (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        scheduled_publish_at TIMESTAMP NOT NULL,
        scheduled_unpublish_at TIMESTAMP,
        publish_status VARCHAR(50) DEFAULT 'pending',
        scheduled_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        executed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(content_id, scheduled_publish_at)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_publishing_schedule_date
      ON publishing_schedule(scheduled_publish_at) WHERE publish_status = 'pending'
    `);

    // Content audit trail
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_audit_trail (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL,
        performed_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        changes JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_audit_trail
      ON content_audit_trail(content_id, created_at DESC)
    `);

    // Content templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_name VARCHAR(255) UNIQUE NOT NULL,
        template_slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        template_content TEXT,
        default_category VARCHAR(100),
        fields JSONB,
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_templates_active
      ON content_templates(is_active, created_at DESC)
    `);

    console.log('✓ Migration 103 completed: Content publishing tables created');
  } catch (error) {
    console.error('Migration 103 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS content_templates CASCADE');
    await pool.query('DROP TABLE IF EXISTS content_audit_trail CASCADE');
    await pool.query('DROP TABLE IF EXISTS publishing_schedule CASCADE');
    await pool.query('DROP TABLE IF EXISTS content_approvals CASCADE');
    await pool.query('DROP TABLE IF EXISTS content_versions CASCADE');
    console.log('✓ Migration 103 rolled back');
  } catch (error) {
    console.error('Rollback 103 failed:', error);
    throw error;
  }
  }
};
