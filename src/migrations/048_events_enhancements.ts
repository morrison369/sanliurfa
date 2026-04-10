/**
 * Migration 048: Events System Enhancements
 * Add RSVP tracking, capacity, and better event management
 */

import type { Migration } from '../lib/migrations';

export const migration_048_events_enhancements: Migration = {
  version: '048_events_enhancements',
  description: 'Event RSVP, capacity, and management enhancements',
  async up(pool: any) {
    // Add new columns to events table
    await pool.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS category VARCHAR(50),
      ADD COLUMN IF NOT EXISTS capacity INTEGER,
      ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    `);

    // Create event_attendees table for RSVP tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS event_attendees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'attending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_event_attendees_event
      ON event_attendees(event_id, status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_event_attendees_user
      ON event_attendees(user_id, created_at DESC)
    `);

    // Add attendee count column to events
    await pool.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS attendee_count INTEGER DEFAULT 0
    `);

    console.log('✓ Migration 048: Events enhancements created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS event_attendees CASCADE');
    await pool.query(`
      ALTER TABLE events
      DROP COLUMN IF EXISTS category,
      DROP COLUMN IF EXISTS capacity,
      DROP COLUMN IF EXISTS image_url,
      DROP COLUMN IF EXISTS is_online,
      DROP COLUMN IF EXISTS is_free,
      DROP COLUMN IF EXISTS price,
      DROP COLUMN IF EXISTS view_count,
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS attendee_count
    `);
    console.log('✓ Migration 048 rolled back');
  }
};
