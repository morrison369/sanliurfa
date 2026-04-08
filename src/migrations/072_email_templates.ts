/**
 * Migration 072: Email Templates System
 * Reusable email templates for transactional and marketing emails
 */

import { Pool } from 'pg';

export const migration_072_email_templates = async (pool: Pool) => {
  try {
    // Email templates
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        template_type VARCHAR(50) NOT NULL,
        subject_line TEXT NOT NULL,
        preview_text VARCHAR(255),
        html_content TEXT NOT NULL,
        plain_text_content TEXT,
        template_variables JSONB DEFAULT '{}',
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        is_system_template BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexes for templates
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_templates_type
      ON email_templates(template_type, is_active)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_templates_slug
      ON email_templates(slug)
    `);

    // Template versions/history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_template_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
        version_number INT NOT NULL,
        subject_line TEXT NOT NULL,
        html_content TEXT NOT NULL,
        plain_text_content TEXT,
        created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(template_id, version_number)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_template_versions_template
      ON email_template_versions(template_id, version_number DESC)
    `);

    // Template test sends
    await pool.query(`
      CREATE TABLE IF NOT EXISTS template_test_sends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
        test_email VARCHAR(255) NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW(),
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_template_test_sends
      ON template_test_sends(template_id, sent_at DESC)
    `);

    console.log('✓ Migration 072 completed: Email templates system created');
  } catch (error) {
    console.error('Migration 072 failed:', error);
    throw error;
  }
};

export const rollback_072 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS template_test_sends CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_template_versions CASCADE');
    await pool.query('DROP TABLE IF EXISTS email_templates CASCADE');
    console.log('✓ Migration 072 rolled back');
  } catch (error) {
    console.error('Rollback 072 failed:', error);
    throw error;
  }
};
