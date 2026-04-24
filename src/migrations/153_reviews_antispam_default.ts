import type { Migration } from '../lib/migrations';

export const migration_153_reviews_antispam_default: Migration = {
  version: '153_reviews_antispam_default',
  description: 'Ensure reviews.antiSpam exists in site_settings for DB-first gates',

  up: async (pool: any) => {
    await pool.query(`
      INSERT INTO site_settings (setting_key, setting_value, description)
      VALUES (
        'reviews.antiSpam',
        '{
          "enabled": true,
          "autoModerateThreshold": 55,
          "hardBlockThreshold": 85,
          "minLength": 20,
          "repeatedCharLimit": 6,
          "suspiciousKeywords": ["telegram", "whatsapp", "bedava", "free money", "http://", "https://"],
          "allowlist": []
        }'::jsonb,
        'Yorum anti-spam varsayilan politikasi'
      )
      ON CONFLICT (setting_key) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DELETE FROM site_settings
      WHERE setting_key = 'reviews.antiSpam';
    `);
  },
};
