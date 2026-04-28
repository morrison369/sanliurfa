/**
 * Migration 169: Drop Dead Backup Tables
 *
 * Migration 167 `backup_configs` + `backups` tabloları create etmişti.
 * Backup feature'ı kod tarafında tamamen kaldırıldı (2026-04-26):
 * `lib/backup/` klasörü, `lib/lifecycle.ts` scheduler init, admin endpoint,
 * env vars, helper fonksiyonlar — hepsi silindi.
 *
 * Tablolar orphan kaldı. Veri kaybını önlemek için tablolar drop edilmez;
 * varsa archived_* adıyla uygulama yolundan çıkarılır.
 */

import type { Migration } from '../lib/migrations';

export const migration_169_drop_dead_backup_tables: Migration = {
  version: '169_drop_dead_backup_tables',
  description: 'Archive unused backup_configs + backups tables (feature removed from code)',

  up: async (pool: any) => {
    const archiveTable = async (
      tableName: 'backups' | 'backup_configs',
      archivedName: 'archived_backups_169' | 'archived_backup_configs_169'
    ) => {
      const result = await pool.query(
        `SELECT to_regclass($1) AS source_table, to_regclass($2) AS archived_table`,
        [`public.${tableName}`, `public.${archivedName}`]
      );
      const row = result.rows[0];

      if (!row?.source_table) {
        return;
      }

      if (row.archived_table) {
        throw new Error(
          `Migration 169 blocked: both ${tableName} and ${archivedName} exist. ` +
            'Resolve the duplicate archive table manually before continuing.'
        );
      }

      await pool.query(`ALTER TABLE ${tableName} RENAME TO ${archivedName}`);
    };

    await archiveTable('backups', 'archived_backups_169');
    await archiveTable('backup_configs', 'archived_backup_configs_169');
  },

  down: async (pool: any) => {
    await pool.query(`
      DO $$
      BEGIN
        IF to_regclass('public.archived_backup_configs_169') IS NOT NULL
           AND to_regclass('public.backup_configs') IS NULL THEN
          ALTER TABLE archived_backup_configs_169 RENAME TO backup_configs;
        END IF;

        IF to_regclass('public.archived_backups_169') IS NOT NULL
           AND to_regclass('public.backups') IS NULL THEN
          ALTER TABLE archived_backups_169 RENAME TO backups;
        END IF;
      END $$;
    `);
  },
};

export default migration_169_drop_dead_backup_tables;
