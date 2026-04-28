import type { Migration } from '../lib/migrations';

export const migration_157_homepage_mvp_section_order: Migration = {
  version: '157_homepage_mvp_section_order',
  description: 'Register mvp-quick-start homepage section and add it to homepage.sections order',

  up: async (pool: any) => {
    await pool.query(`
      INSERT INTO homepage_sections (id, section_key, title, description, config, is_active, sort_order)
      VALUES (
        'f5e8a2ca-7f60-4d0b-9000-157000000001',
        'mvp-quick-start',
        'MVP Hızlı Başlangıç',
        'Günlük ihtiyaç, keşif ve topluluk akışlarını ana sayfada öne çıkarır.',
        '{"managedBy":"site_settings","settingKey":"homepage.mvpQuickStart"}'::jsonb,
        true,
        15
      )
      ON CONFLICT (section_key)
      DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        config = EXCLUDED.config,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW();
    `);

    await pool.query(`
      UPDATE site_settings
      SET setting_value = jsonb_set(
        setting_value,
        '{order}',
        (
          SELECT jsonb_agg(item ORDER BY ord)
          FROM (
            SELECT item, ord
            FROM jsonb_array_elements_text(setting_value->'order') WITH ORDINALITY AS existing(item, ord)
            WHERE item <> 'mvp-quick-start'
            UNION ALL
            SELECT 'mvp-quick-start'::text AS item, 1.5::numeric AS ord
          ) ordered
        ),
        true
      ),
      updated_at = NOW()
      WHERE setting_key = 'homepage.sections'
        AND jsonb_typeof(setting_value->'order') = 'array';
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DELETE FROM homepage_sections
      WHERE section_key = 'mvp-quick-start';
    `);

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
