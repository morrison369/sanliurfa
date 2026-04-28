import type { Migration } from '../lib/migrations';

export const migration_148_social_event_partition_ready: Migration = {
  version: '148_social_event_partition_ready',
  description:
    'Prepare social event store for tenant/event sharding and archive partitioning',

  up: async (pool: any) => {
    await pool.query(`
      ALTER TABLE social_event_store
      ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default';

      CREATE INDEX IF NOT EXISTS idx_social_event_store_tenant_event_created
      ON social_event_store (tenant_id, event_type, created_at DESC);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_event_store_archive (
        id UUID NOT NULL,
        tenant_id TEXT NOT NULL DEFAULT 'default',
        event_type VARCHAR(100) NOT NULL,
        actor_user_id UUID,
        target_user_id UUID,
        conversation_id UUID NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      ) PARTITION BY RANGE (created_at);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_event_store_archive_default
      PARTITION OF social_event_store_archive DEFAULT;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_social_event_store_archive_tenant_event_created
      ON social_event_store_archive (tenant_id, event_type, created_at DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP TABLE IF EXISTS social_event_store_archive_default CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS social_event_store_archive CASCADE;`);
    await pool.query(`DROP INDEX IF EXISTS idx_social_event_store_tenant_event_created;`);
    await pool.query(`ALTER TABLE social_event_store DROP COLUMN IF EXISTS tenant_id;`);
  },
};

