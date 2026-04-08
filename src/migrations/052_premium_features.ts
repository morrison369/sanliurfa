/**
 * Migration 052: Premium Features
 * Add tables for advanced search, collections, and analytics
 */

import { Pool } from 'pg';

export const migration_052_premium_features = async (pool: Pool) => {
  try {
    // Saved searches (Advanced Search feature - Basic+)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        search_filters JSONB NOT NULL,
        search_keyword VARCHAR(255),
        proximity_latitude DECIMAL(10, 8),
        proximity_longitude DECIMAL(11, 8),
        proximity_radius_km INTEGER,
        categories TEXT[] DEFAULT '{}',
        rating_min INTEGER,
        rating_max INTEGER,
        sort_by VARCHAR(50) DEFAULT 'rating',
        search_count INTEGER DEFAULT 0,
        last_searched_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_saved_searches_user
      ON saved_searches(user_id, created_at DESC)
    `);

    // Collections (Save places - Basic+)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT false,
        cover_image_url TEXT,
        place_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collections_user
      ON collections(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collections_public
      ON collections(is_public, created_at DESC)
    `);

    // Collection places (Many-to-many)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collection_places (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(collection_id, place_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collection_places_collection
      ON collection_places(collection_id, added_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collection_places_place
      ON collection_places(place_id)
    `);

    // Place analytics (Pro+ feature)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        date DATE NOT NULL,
        view_count INTEGER DEFAULT 0,
        search_appearances INTEGER DEFAULT 0,
        click_count INTEGER DEFAULT 0,
        favorite_count INTEGER DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(place_id, date)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_place_analytics_place_date
      ON place_analytics(place_id, date DESC)
    `);

    // Support tickets (Enterprise feature)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(20) DEFAULT 'open',
        assigned_to UUID REFERENCES users(id),
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user
      ON support_tickets(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status
      ON support_tickets(status, priority DESC, created_at DESC)
    `);

    // Support messages (conversation thread)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id),
        message TEXT NOT NULL,
        attachments TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
      ON support_messages(ticket_id, created_at DESC)
    `);

    console.log('✓ Migration 052 completed: Premium features tables created');
  } catch (error) {
    console.error('Migration 052 failed:', error);
    throw error;
  }
};

export const rollback_052 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS support_messages CASCADE');
    await pool.query('DROP TABLE IF EXISTS support_tickets CASCADE');
    await pool.query('DROP TABLE IF EXISTS place_analytics CASCADE');
    await pool.query('DROP TABLE IF EXISTS collection_places CASCADE');
    await pool.query('DROP TABLE IF EXISTS collections CASCADE');
    await pool.query('DROP TABLE IF EXISTS saved_searches CASCADE');

    console.log('✓ Migration 052 rolled back');
  } catch (error) {
    console.error('Rollback 052 failed:', error);
    throw error;
  }
};
