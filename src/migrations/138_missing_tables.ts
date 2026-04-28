/**
 * Migration 138: Add missing tables
 * - contact_messages (admin mesaj yönetimi için)
 * - place_hours (mekan çalışma saatleri)
 * - place_features (mekan özellikleri)
 * - place_analytics_events (mekan görüntüleme/tıklama olayları)
 * - sms_logs (SMS gönderim kaydı)
 * - phone_verifications (telefon doğrulama kodları)
 * - feature_flags (özellik bayrakları - DB kalıcılığı için)
 */

import type { Migration } from '../lib/migrations';

export const migration_138_missing_tables: Migration = {
  version: '138_missing_tables',
  description: 'Add contact_messages, place_hours, place_features, place_analytics_events, sms_logs, phone_verifications, feature_flags tables',

  up: async (pool: any) => {
    // Contact messages (iletişim formu mesajları - admin panelinden yönetilir)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(500),
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'general',
        place_id UUID REFERENCES places(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);
    `);

    // Place working hours
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_hours (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        open_time TIME,
        close_time TIME,
        is_closed BOOLEAN DEFAULT false,
        UNIQUE (place_id, day_of_week)
      );
      CREATE INDEX IF NOT EXISTS idx_place_hours_place_id ON place_hours(place_id);
    `);

    // Place features/amenities
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_features (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        feature VARCHAR(100) NOT NULL,
        UNIQUE (place_id, feature)
      );
      CREATE INDEX IF NOT EXISTS idx_place_features_place_id ON place_features(place_id);
    `);

    // Place analytics events (view, click, phone_click, etc.)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        session_id VARCHAR(100),
        ip_address INET,
        user_agent TEXT,
        referrer TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_place_analytics_place_id ON place_analytics_events(place_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_place_analytics_event_type ON place_analytics_events(event_type, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_place_analytics_created_at ON place_analytics_events(created_at DESC);
    `);

    // SMS logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sms_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
        provider VARCHAR(50) DEFAULT 'mock',
        message_id VARCHAR(100),
        error_message TEXT,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(phone, sent_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at DESC);
    `);

    // Phone number verification codes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS phone_verifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        phone VARCHAR(20) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON phone_verifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);
    `);

    // Feature flags (persistent, managed via admin panel)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(20) NOT NULL DEFAULT 'boolean',
        value JSONB NOT NULL DEFAULT 'false',
        default_value BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP TABLE IF EXISTS feature_flags CASCADE;
      DROP TABLE IF EXISTS phone_verifications CASCADE;
      DROP TABLE IF EXISTS sms_logs CASCADE;
      DROP TABLE IF EXISTS place_analytics_events CASCADE;
      DROP TABLE IF EXISTS place_features CASCADE;
      DROP TABLE IF EXISTS place_hours CASCADE;
      DROP TABLE IF EXISTS contact_messages CASCADE;
    `);
  },
};
