/**
 * Migration 168: Web Vitals CLS + INP Columns
 *
 * `client_performance_metrics` tablosu (migration 058) sadece TTFB/FCP/LCP/DCL/Load
 * için dedicated column tutuyordu. 2026-04-25'te `web-vitals` library'sine geçildi
 * ve artık CLS (Cumulative Layout Shift) ve INP (Interaction to Next Paint) de
 * toplanıyor — bunlar Core Web Vitals'in iki kritik metriği:
 *
 * - **CLS**: visual stability (threshold: 0.1)
 * - **INP**: responsiveness, 2024'te FID'i replace etti (threshold: 200ms)
 *
 * JSONB'de tutmak yerine dedicated column ekleyerek p75/p95 aggregation hızlanır
 * (admin dashboard query'leri 10-50x hızlı). Indeksler timestamp-based partitioning
 * için reverse order'da oluşturulur.
 */

import type { Migration } from '../lib/migrations';

export const migration_168_perf_metrics_cls_inp: Migration = {
  version: '168_perf_metrics_cls_inp',
  description: 'Web Vitals CLS + INP kolonları (Core Web Vitals 2024 standardı)',

  up: async (pool: any) => {
    await pool.query(`
      ALTER TABLE client_performance_metrics
        ADD COLUMN IF NOT EXISTS cls NUMERIC,
        ADD COLUMN IF NOT EXISTS inp NUMERIC;
    `);

    // Web Vitals threshold-based partial index'ler — "poor" değerleri hızlı bul
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_perf_cls_poor
        ON client_performance_metrics(timestamp DESC)
        WHERE cls > 0.25;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_perf_inp_poor
        ON client_performance_metrics(timestamp DESC)
        WHERE inp > 500;
    `);

    // LCP poor index zaten yoktu, eklerken birlikte
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_perf_lcp_poor
        ON client_performance_metrics(timestamp DESC)
        WHERE lcp > 4000;
    `);

    console.log('✓ Migration 168 completed: CLS + INP columns + threshold indexes');
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP INDEX IF EXISTS idx_perf_cls_poor;
      DROP INDEX IF EXISTS idx_perf_inp_poor;
      DROP INDEX IF EXISTS idx_perf_lcp_poor;
    `);
    await pool.query(`
      ALTER TABLE client_performance_metrics
        DROP COLUMN IF EXISTS cls,
        DROP COLUMN IF EXISTS inp;
    `);
    console.log('✓ Migration 168 rolled back');
  },
};
