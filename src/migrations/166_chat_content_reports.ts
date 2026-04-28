/**
 * Migration 166: Chat tables + content_reports
 * Adds missing chat_rooms, chat_messages, chat_participants,
 * chat_message_status, and content_reports tables.
 */

import type { Migration } from '../lib/migrations';

export const migration_166_chat_content_reports: Migration = {
  version: '166_chat_content_reports',
  description: 'chat tabloları + content_reports tablosu',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(20) DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
        name VARCHAR(255),
        last_message_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
        sender_name VARCHAR(255),
        sender_avatar TEXT,
        content TEXT NOT NULL,
        reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
        is_deleted BOOLEAN DEFAULT false,
        edited_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(room_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_message_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
        message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        UNIQUE(message_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL CHECK (type IN ('place', 'review', 'comment', 'user')),
        content_id UUID NOT NULL,
        reason TEXT NOT NULL,
        reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
        moderator_notes TEXT,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE places ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
      ALTER TABLE places ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
    `);

    // users.provider / provider_id — social/auth.ts uses these generic columns
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id) WHERE provider IS NOT NULL;
    `);

    // search_logs — used by analytics, search/advanced, search/filters, ai-search
    await pool.query(`
      CREATE TABLE IF NOT EXISTS search_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query VARCHAR(500) NOT NULL,
        normalized_query VARCHAR(500),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        results_count INTEGER DEFAULT 0,
        filters JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_search_logs_query ON search_logs(query, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_search_logs_user ON search_logs(user_id, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_message_status_unread ON chat_message_status(room_id, user_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status, created_at DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP TABLE IF EXISTS content_reports CASCADE;
      DROP TABLE IF EXISTS chat_message_status CASCADE;
      DROP TABLE IF EXISTS chat_participants CASCADE;
      DROP TABLE IF EXISTS chat_messages CASCADE;
      DROP TABLE IF EXISTS chat_rooms CASCADE;
    `);
  },
};
