/**
 * Migrasyon: Audit Logging Tablosu
 * Kullanıcı eylemlerini ve değişiklikleri kaydeder
 */

import type { Migration } from '../lib/migrations';

export const migration_002_audit_logging: Migration = {
  version: '002_audit_logging',
  description: 'Audit logging sistemi: tüm kullanıcı eylemleri ve veri değişiklikleri kaydedilir',

  up: async (pool: any) => {
    // Audit logs tablosu
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(255),
        description TEXT,
        old_values JSONB,
        new_values JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        status VARCHAR(20) DEFAULT 'success',
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
    `);

    // Audit events tablosu (gerçek zamanlı)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        audit_log_id UUID NOT NULL REFERENCES audit_logs(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_audit_events_log_id ON audit_events(audit_log_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_type ON audit_events(event_type);
    `);

    // Audit config tablosu (hangi eylemleri izleyelim)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource_type VARCHAR(100) NOT NULL UNIQUE,
        track_create BOOLEAN DEFAULT true,
        track_update BOOLEAN DEFAULT true,
        track_delete BOOLEAN DEFAULT true,
        track_view BOOLEAN DEFAULT false,
        sensitive_fields TEXT[],
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Varsayılan konfigürasyonlar
      INSERT INTO audit_config (resource_type, track_create, track_update, track_delete, track_view, sensitive_fields)
      VALUES
        ('users', true, true, true, false, ARRAY['password_hash', 'email']),
        ('places', true, true, true, false, ARRAY[]::TEXT[]),
        ('reviews', true, true, true, false, ARRAY[]::TEXT[]),
        ('blog_posts', true, true, true, false, ARRAY[]::TEXT[]),
        ('events', true, true, true, false, ARRAY[]::TEXT[]),
        ('favorites', true, true, true, false, ARRAY[]::TEXT[])
      ON CONFLICT (resource_type) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS audit_config CASCADE');
    await pool.query('DROP TABLE IF EXISTS audit_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS audit_logs CASCADE');
  }
};
