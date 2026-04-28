import type { Migration } from '../lib/migrations';

export const migration_146_social_event_store_place_lifecycle: Migration = {
  version: '146_social_event_store_place_lifecycle',
  description: 'Add social_event_store and place_lifecycle_events tables for unified social stream and place workflow timeline',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_event_store (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        conversation_id UUID NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_social_event_store_created_at
      ON social_event_store (created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_social_event_store_event_type
      ON social_event_store (event_type);

      CREATE INDEX IF NOT EXISTS idx_social_event_store_actor_target
      ON social_event_store (actor_user_id, target_user_id);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_lifecycle_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        from_status VARCHAR(40),
        to_status VARCHAR(40) NOT NULL,
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_place_lifecycle_events_place_created
      ON place_lifecycle_events (place_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_place_lifecycle_events_to_status
      ON place_lifecycle_events (to_status, created_at DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP TABLE IF EXISTS place_lifecycle_events CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS social_event_store CASCADE;`);
  },
};

