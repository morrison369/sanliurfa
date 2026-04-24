import type { Migration } from '../lib/migrations';

export const migration_158_homepage_sections_setting_seed: Migration = {
  version: '158_homepage_sections_setting_seed',
  description: 'Ensure homepage.sections exists for DB-first homepage ordering and visibility',

  up: async (pool: any) => {
    await pool.query(`
      INSERT INTO site_settings (setting_key, setting_value, description)
      VALUES (
        'homepage.sections',
        '{
          "order":[
            "hero",
            "mvp-quick-start",
            "quick-actions",
            "live-status",
            "district-service",
            "popular-categories",
            "trend-density",
            "districts",
            "historical-sites",
            "featured-places",
            "recent-places",
            "trust-signals",
            "guides-community",
            "audience-plans",
            "district-spotlights",
            "recent-reviews",
            "main-categories",
            "recipes",
            "blog",
            "faq",
            "main-cta"
          ],
          "visibility":{}
        }'::jsonb,
        'Ana sayfa section görünürlük ve sıra ayarları'
      )
      ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = CASE
          WHEN jsonb_typeof(site_settings.setting_value->'order') = 'array'
            THEN jsonb_set(
              site_settings.setting_value,
              '{order}',
              (
                SELECT jsonb_agg(item ORDER BY ord)
                FROM (
                  SELECT item, ord
                  FROM jsonb_array_elements_text(site_settings.setting_value->'order') WITH ORDINALITY AS existing(item, ord)
                  WHERE item <> 'mvp-quick-start'
                  UNION ALL
                  SELECT 'mvp-quick-start'::text AS item, 1.5::numeric AS ord
                ) ordered
              ),
              true
            )
          ELSE EXCLUDED.setting_value
        END,
        description = COALESCE(site_settings.description, EXCLUDED.description),
        updated_at = NOW();
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      UPDATE site_settings
      SET setting_value = jsonb_set(
        setting_value,
        '{order}',
        (
          SELECT COALESCE(jsonb_agg(item ORDER BY ord), '[]'::jsonb)
          FROM jsonb_array_elements_text(setting_value->'order') WITH ORDINALITY AS existing(item, ord)
          WHERE item <> 'mvp-quick-start'
        ),
        true
      ),
      updated_at = NOW()
      WHERE setting_key = 'homepage.sections'
        AND jsonb_typeof(setting_value->'order') = 'array';
    `);
  },
};
