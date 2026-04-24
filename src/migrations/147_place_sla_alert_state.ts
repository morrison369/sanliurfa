import type { Migration } from '../lib/migrations';

export const migration_147_place_sla_alert_state: Migration = {
  version: '147_place_sla_alert_state',
  description: 'Track place SLA alert cooldown state per place',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS place_sla_alert_state (
        place_id UUID PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
        last_alert_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_place_sla_alert_state_last_alert
      ON place_sla_alert_state (last_alert_at DESC);
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP TABLE IF EXISTS place_sla_alert_state CASCADE;`);
  },
};

