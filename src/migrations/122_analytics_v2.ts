/**
 * Migration 122: Analytics Tables
 */

import { Pool } from 'pg';

export const migration_122_analytics = async (pool: Pool) => {
  try {
    // Page views table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        path VARCHAR(500) NOT NULL,
        user_id UUID REFERENCES users(id),
        referrer VARCHAR(500),
        user_agent VARCHAR(255),
        ip_address INET,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS path VARCHAR(500);
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_page_views_path 
      ON page_views(path, created_at)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_page_views_date 
      ON page_views(created_at)
    `);

    // Events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        properties JSONB,
        user_id UUID REFERENCES users(id),
        ip_address INET,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS name VARCHAR(100);
      ALTER TABLE events ADD COLUMN IF NOT EXISTS properties JSONB;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_name 
      ON events(name, created_at)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_events_properties 
      ON events USING GIN (properties)
    `);

    console.log('✓ Migration 122 completed: Analytics tables created');
  } catch (error) {
    console.error('Migration 122 failed:', error);
    throw error;
  }
};

export const rollback_122 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS events CASCADE');
    await pool.query('DROP TABLE IF EXISTS page_views CASCADE');
    console.log('✓ Migration 122 rolled back');
  } catch (error) {
    console.error('Rollback 122 failed:', error);
    throw error;
  }
};
