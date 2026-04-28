import type { Migration } from '../lib/migrations';

/**
 * Migration 139: DB-first site content management
 * Tüm site metin/gorsel bloklarinin admin panelinden database uzerinden yonetilmesi.
 */
export const migration_139_site_content_management: Migration = {
  version: '139_site_content_management',
  description: 'Create site_settings, site_content_blocks, site_media_assets for full admin-managed content',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        setting_key VARCHAR(200) UNIQUE NOT NULL,
        setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
        description TEXT,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings(setting_key);
      CREATE INDEX IF NOT EXISTS idx_site_settings_updated_at ON site_settings(updated_at DESC);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_content_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        page_key VARCHAR(120) NOT NULL,
        block_key VARCHAR(120) NOT NULL,
        title TEXT,
        subtitle TEXT,
        body TEXT,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        media_url TEXT,
        media_alt TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(page_key, block_key)
      );

      CREATE INDEX IF NOT EXISTS idx_site_blocks_page_active
      ON site_content_blocks(page_key, is_active, sort_order);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_media_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        asset_key VARCHAR(200) UNIQUE NOT NULL,
        url TEXT NOT NULL,
        alt TEXT,
        mime_type VARCHAR(120),
        width INTEGER,
        height INTEGER,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_site_media_assets_key ON site_media_assets(asset_key);
    `);

    await pool.query(`
      INSERT INTO site_settings (setting_key, setting_value, description)
      VALUES (
        'homepage.hero',
        '{
          "badge":"ŞANLIURFA ODAKLI DİJİTAL REHBER",
          "title":"Şanlıurfa için hızlı, modern ve güvenilir şehir rehberi",
          "description":"Mekan keşfi, nöbetçi eczane, otobüs saatleri, ilçe bazlı içerik ve yemek tariflerini tek bir profesyonel platformda toplayan Şanlıurfa odaklı rehber.",
          "searchPlaceholder":"Şanlıurfa''da mekan, kategori veya ilçe ara...",
          "backgroundImage":"/images/hero/hero-home.webp"
        }'::jsonb,
        'Ana sayfa hero alani yonetimi'
      )
      ON CONFLICT (setting_key) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`
      DROP TABLE IF EXISTS site_media_assets CASCADE;
      DROP TABLE IF EXISTS site_content_blocks CASCADE;
      DROP TABLE IF EXISTS site_settings CASCADE;
    `);
  },
};

