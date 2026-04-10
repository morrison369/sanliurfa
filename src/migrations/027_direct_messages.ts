/**
 * Migration 027: Direct Messages
 * User-to-user messaging system (conversations + direct_messages)
 */

import type { Migration } from '../lib/migrations';

export const migration_027_direct_messages: Migration = {
  version: '027_direct_messages',
  description: 'Direct messaging conversations, messages, and deletions',
  up: async (pool: any) => {
    try {
    // Conversations table (two-way unique)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        participant_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        participant_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_message_id UUID,
        last_activity_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT unique_conversation UNIQUE (
          LEAST(participant_a::text, participant_b::text),
          GREATEST(participant_a::text, participant_b::text)
        )
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_participant_a
      ON conversations(participant_a, last_activity_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversations_participant_b
      ON conversations(participant_b, last_activity_at DESC)
    `);

    // Direct messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation
      ON direct_messages(conversation_id, created_at ASC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_direct_messages_sender
      ON direct_messages(sender_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_direct_messages_unread
      ON direct_messages(conversation_id, read_at)
      WHERE read_at IS NULL
    `);

    // Conversation participants soft delete (tracks who deleted conversation)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_deletions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deleted_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(conversation_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conversation_deletions_user
      ON conversation_deletions(user_id, deleted_at DESC)
    `);

      console.log('✓ Migration 027 completed: Direct messaging tables created');
    } catch (error) {
      console.error('Migration 027 failed:', error);
      throw error;
    }
  },
  down: async (pool: any) => {
    try {
      await pool.query('DROP TABLE IF EXISTS conversation_deletions CASCADE');
      await pool.query('DROP TABLE IF EXISTS direct_messages CASCADE');
      await pool.query('DROP TABLE IF EXISTS conversations CASCADE');

      console.log('✓ Migration 027 rolled back');
    } catch (error) {
      console.error('Rollback 027 failed:', error);
      throw error;
    }
  }
};
