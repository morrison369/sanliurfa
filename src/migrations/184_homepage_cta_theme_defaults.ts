import type { Migration } from '../lib/migrations';
import { HOMEPAGE_CTA_CONFIG, HOMEPAGE_PUBLIC_SECTION_ORDER } from '../data/homepage-shell';
import { HOMEPAGE_THEME_TOKENS } from '../data/homepage-theme';

export const migration_184_homepage_cta_theme_defaults: Migration = {
  version: '184_homepage_cta_theme_defaults',
  description: 'Ensure homepage.cta, homepage.sectionOrder and homepage.theme defaults exist',

  up: async (pool: any) => {
    await pool.query(
      `
        INSERT INTO site_settings (setting_key, setting_value, description)
        VALUES
          ('homepage.cta', $1::jsonb, 'Ana sayfa CTA yapılandırması'),
          ('homepage.sectionOrder', $2::jsonb, 'Ana sayfa public section sırası'),
          ('homepage.theme', $3::jsonb, 'Ana sayfa tema tokenları')
        ON CONFLICT (setting_key) DO NOTHING;
      `,
      [
        JSON.stringify(HOMEPAGE_CTA_CONFIG),
        JSON.stringify({ items: HOMEPAGE_PUBLIC_SECTION_ORDER }),
        JSON.stringify(HOMEPAGE_THEME_TOKENS),
      ],
    );
  },

  down: async (pool: any) => {
    await pool.query(`
      DELETE FROM site_settings
      WHERE setting_key IN ('homepage.cta', 'homepage.sectionOrder', 'homepage.theme');
    `);
  },
};
