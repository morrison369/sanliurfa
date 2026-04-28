import type { Migration } from '../lib/migrations';

export const migration_154_db_first_platform_expansion: Migration = {
  version: '154_db_first_platform_expansion',
  description:
    'Add DB-first content platform tables for homepage sections, city services and SEO overrides',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS homepage_sections (
        id UUID PRIMARY KEY,
        section_key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_service_entries (
        id UUID PRIMARY KEY,
        service_key TEXT NOT NULL UNIQUE,
        service_group TEXT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        summary TEXT,
        href TEXT NOT NULL,
        icon TEXT,
        badge TEXT,
        freshness_key TEXT,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS seo_overrides (
        id UUID PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_key TEXT NOT NULL,
        canonical_path TEXT NOT NULL,
        seo_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT seo_overrides_entity_unique UNIQUE (entity_type, entity_key)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_homepage_sections_active_sort
      ON homepage_sections (is_active, sort_order);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_site_service_entries_group_sort
      ON site_service_entries (service_group, is_active, sort_order);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_seo_overrides_entity
      ON seo_overrides (entity_type, entity_key, is_active);
    `);

    await pool.query(`
      INSERT INTO homepage_sections (id, section_key, title, description, config, is_active, sort_order)
      VALUES
        ('f5e8a2ca-7f60-4d0b-9000-154000000001', 'hero', 'Hero', 'Ana sayfa açılış deneyimi', '{"managedBy":"site_settings","settingKey":"homepage.hero"}'::jsonb, true, 10),
        ('f5e8a2ca-7f60-4d0b-9000-154000000002', 'city-services', 'Şehir Servisleri', 'Nöbetçi eczane, otobüs ve uçak saatleri modülü', '{"managedBy":"site_service_entries","group":"city-services"}'::jsonb, true, 20),
        ('f5e8a2ca-7f60-4d0b-9000-154000000003', 'district-spotlights', 'İlçe Vitrini', 'İlçe bazlı keşif blokları', '{"managedBy":"site_settings","settingKey":"homepage.sectionCopy"}'::jsonb, true, 30),
        ('f5e8a2ca-7f60-4d0b-9000-154000000004', 'seo-answer-boxes', 'AEO/GEO Cevap Kutuları', 'Kısa, alıntılanabilir cevap blokları', '{"managedBy":"seo_overrides","entityType":"homepage"}'::jsonb, true, 40)
      ON CONFLICT (section_key) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO site_service_entries (
        id, service_key, service_group, title, slug, summary, href, icon, badge, freshness_key, payload, is_active, sort_order
      )
      VALUES
        (
          'f5e8a2ca-7f60-4d0b-9000-154000000101',
          'health-pharmacy-duty',
          'city-services',
          'Nöbetçi Eczaneler',
          'nobetci-eczaneler',
          'İlçe bazlı güncel nöbetçi eczane listesi',
          '/saglik/nobetci-eczaneler',
          'cross',
          'Canlı',
          'transport.lastUpdated',
          '{"entityType":"health","metricLabel":"eczane"}'::jsonb,
          true,
          10
        ),
        (
          'f5e8a2ca-7f60-4d0b-9000-154000000102',
          'transport-bus-hours',
          'city-services',
          'Otobüs Saatleri',
          'otobus-saatleri',
          'Şehir içi toplu taşıma saat ve hat görünümü',
          '/ulasim/otobus-saatleri',
          'bus',
          'Güncel',
          'transport.lastUpdated',
          '{"entityType":"transport","metricLabel":"hat"}'::jsonb,
          true,
          20
        ),
        (
          'f5e8a2ca-7f60-4d0b-9000-154000000103',
          'transport-flight-hours',
          'city-services',
          'Uçak Saatleri',
          'ucak-saatleri',
          'GAP Havalimanı uçuş planlama rehberi',
          '/ulasim/ucak-saatleri',
          'plane',
          'Planla',
          'transport.lastUpdated',
          '{"entityType":"transport","metricLabel":"ucus"}'::jsonb,
          true,
          30
        )
      ON CONFLICT (service_key) DO NOTHING;
    `);

    await pool.query(`
      INSERT INTO seo_overrides (id, entity_type, entity_key, canonical_path, seo_payload, is_active)
      VALUES
        (
          'f5e8a2ca-7f60-4d0b-9000-154000000201',
          'homepage',
          'index',
          '/',
          '{
            "focusKeyword": "Şanlıurfa",
            "answerBlocks": [
              {
                "question": "Şanlıurfa nöbetçi eczane listesi nerede?",
                "answer": "/saglik/nobetci-eczaneler sayfasında ilçe bazlı güncel liste bulunur."
              },
              {
                "question": "Şanlıurfa otobüs saatleri nereden takip edilir?",
                "answer": "/ulasim/otobus-saatleri sayfasında şehir içi toplu taşıma saat bilgileri yer alır."
              }
            ]
          }'::jsonb,
          true
        )
      ON CONFLICT (entity_type, entity_key) DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DELETE FROM seo_overrides WHERE id LIKE 'f5e8a2ca-7f60-4d0b-9000-1540000002%';`);
    await pool.query(`DELETE FROM site_service_entries WHERE id LIKE 'f5e8a2ca-7f60-4d0b-9000-1540000001%';`);
    await pool.query(`DELETE FROM homepage_sections WHERE id LIKE 'f5e8a2ca-7f60-4d0b-9000-1540000000%';`);
    await pool.query(`DROP INDEX IF EXISTS idx_seo_overrides_entity;`);
    await pool.query(`DROP INDEX IF EXISTS idx_site_service_entries_group_sort;`);
    await pool.query(`DROP INDEX IF EXISTS idx_homepage_sections_active_sort;`);
    await pool.query(`DROP TABLE IF EXISTS seo_overrides;`);
    await pool.query(`DROP TABLE IF EXISTS site_service_entries;`);
    await pool.query(`DROP TABLE IF EXISTS homepage_sections;`);
  },
};
