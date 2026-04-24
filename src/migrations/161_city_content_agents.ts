import type { Migration } from '../lib/migrations';

export const migration_161_city_content_agents: Migration = {
  version: '161_city_content_agents',
  description:
    'Add Şanlıurfa city content agent source registry, job log and draft queue',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS city_content_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_key TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        source_type TEXT NOT NULL,
        url TEXT NOT NULL,
        agent_key TEXT NOT NULL,
        trust_level TEXT NOT NULL DEFAULT 'official',
        refresh_policy TEXT NOT NULL DEFAULT 'admin_on_demand',
        is_active BOOLEAN NOT NULL DEFAULT true,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        last_checked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS city_content_agent_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_key TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        source_key TEXT,
        parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
        summary TEXT,
        error_message TEXT,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_by UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS city_content_drafts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        draft_type TEXT NOT NULL,
        entity_key TEXT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        source_key TEXT,
        source_url TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        seo_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        freshness_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        admin_notes TEXT,
        approved_by UUID,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT city_content_drafts_entity_unique UNIQUE (draft_type, entity_key)
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_city_content_sources_agent
      ON city_content_sources (agent_key, is_active);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_city_content_agent_jobs_agent_created
      ON city_content_agent_jobs (agent_key, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_city_content_drafts_status
      ON city_content_drafts (status, draft_type, updated_at DESC);
    `);

    await pool.query(`
      INSERT INTO city_content_sources (
        source_key, title, source_type, url, agent_key, trust_level, refresh_policy, metadata
      )
      VALUES
        (
          'sanliurfa-eczaci-odasi-nobetci',
          'Şanlıurfa Eczacı Odası Nöbetçi Eczaneler',
          'official_page',
          'https://sanliurfaeo.birodam.org.tr/index.php/nobetci-eczaneler/',
          'city-service-agent',
          'official',
          'admin_on_demand',
          '{"targetRoute":"/saglik/nobetci-eczaneler","contentType":"nobetci-eczane"}'::jsonb
        ),
        (
          'urfakart-ulasim',
          'Urfakart Şanlıurfa Ulaşım',
          'official_page',
          'https://www.urfakart.com/',
          'city-service-agent',
          'official',
          'admin_on_demand',
          '{"targetRoute":"/ulasim/otobus-saatleri","contentType":"otobus-saatleri"}'::jsonb
        ),
        (
          'sanliurfa-buyuksehir-etkinlik',
          'Şanlıurfa Büyükşehir Belediyesi Etkinlik Duyuruları',
          'official_page',
          'https://www.sanliurfa.bel.tr/',
          'culture-event-agent',
          'official',
          'admin_on_demand',
          '{"targetRoute":"/etkinlikler","contentType":"etkinlik"}'::jsonb
        ),
        (
          'sanliurfa-gap-havalimani',
          'Şanlıurfa GAP Havalimanı Uçuş Bilgileri',
          'official_reference',
          'https://www.dhmi.gov.tr/',
          'city-service-agent',
          'official',
          'admin_on_demand',
          '{"targetRoute":"/ulasim/ucak-saatleri","contentType":"ucak-saatleri"}'::jsonb
        ),
        (
          'pexels-sanliurfa-media',
          'Pexels Şanlıurfa Görsel Arama',
          'media_api',
          'https://www.pexels.com/api/',
          'image-import-agent',
          'licensed_provider',
          'admin_on_demand',
          '{"provider":"pexels","priority":1}'::jsonb
        ),
        (
          'unsplash-sanliurfa-media',
          'Unsplash Şanlıurfa Görsel Arama',
          'media_api',
          'https://unsplash.com/developers',
          'image-import-agent',
          'licensed_provider',
          'admin_on_demand',
          '{"provider":"unsplash","priority":2}'::jsonb
        )
      ON CONFLICT (source_key) DO UPDATE SET
        title = EXCLUDED.title,
        source_type = EXCLUDED.source_type,
        url = EXCLUDED.url,
        agent_key = EXCLUDED.agent_key,
        trust_level = EXCLUDED.trust_level,
        refresh_policy = EXCLUDED.refresh_policy,
        metadata = EXCLUDED.metadata,
        is_active = true,
        updated_at = NOW();
    `);
  },

  down: async (pool: any) => {
    await pool.query(`DROP INDEX IF EXISTS idx_city_content_drafts_status;`);
    await pool.query(`DROP INDEX IF EXISTS idx_city_content_agent_jobs_agent_created;`);
    await pool.query(`DROP INDEX IF EXISTS idx_city_content_sources_agent;`);
    await pool.query(`DROP TABLE IF EXISTS city_content_drafts;`);
    await pool.query(`DROP TABLE IF EXISTS city_content_agent_jobs;`);
    await pool.query(`DROP TABLE IF EXISTS city_content_sources;`);
  },
};
