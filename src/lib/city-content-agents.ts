import { query, queryOne } from './postgres';

export type CityContentAgentKey =
  | 'city-service-agent'
  | 'culture-event-agent'
  | 'place-enrichment-agent'
  | 'recipe-content-agent'
  | 'image-import-agent'
  | 'seo-geo-agent';

export type CityContentAgent = {
  key: CityContentAgentKey;
  title: string;
  purpose: string;
  outputType: string;
  autoPublish: false;
};

export class CityContentAgentError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'city_content_agent_error') {
    super(message);
    this.name = 'CityContentAgentError';
    this.status = status;
    this.code = code;
  }
}

export type CityContentSource = {
  id: string;
  source_key: string;
  title: string;
  source_type: string;
  url: string;
  agent_key: CityContentAgentKey;
  trust_level: string;
  refresh_policy: string;
  is_active: boolean;
  metadata: Record<string, any>;
  last_checked_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CityContentAgentJob = {
  id: string;
  agent_key: CityContentAgentKey;
  status: 'queued' | 'running' | 'completed' | 'failed';
  source_key?: string | null;
  parameters: Record<string, any>;
  summary?: string | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_by?: string | null;
  created_at: string;
};

export type CityContentDraft = {
  id: string;
  draft_type: string;
  entity_key: string;
  title: string;
  slug: string;
  source_key?: string | null;
  source_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  payload: Record<string, any>;
  seo_payload: Record<string, any>;
  freshness_payload: Record<string, any>;
  admin_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const CITY_CONTENT_AGENTS: CityContentAgent[] = [
  {
    key: 'city-service-agent',
    title: 'Şehir Servis Ajanı',
    purpose: 'Nöbetçi eczane, otobüs saatleri, uçak saatleri ve güncel şehir servisleri için kaynakları takip eder.',
    outputType: 'service-draft',
    autoPublish: false,
  },
  {
    key: 'culture-event-agent',
    title: 'Kültür ve Etkinlik Ajanı',
    purpose: 'Belediye, valilik ve kültür duyurularından etkinlik taslakları üretir.',
    outputType: 'event-draft',
    autoPublish: false,
  },
  {
    key: 'place-enrichment-agent',
    title: 'Mekan Zenginleştirme Ajanı',
    purpose: 'Mekanlara Şanlıurfa odaklı açıklama, FAQ, ziyaret ipucu ve schema önerisi üretir.',
    outputType: 'place-enrichment-draft',
    autoPublish: false,
  },
  {
    key: 'recipe-content-agent',
    title: 'Yemek Tarifleri Ajanı',
    purpose: 'Şanlıurfa yemek tarifleri için içerik, malzeme, adım ve SEO taslağı üretir.',
    outputType: 'recipe-draft',
    autoPublish: false,
  },
  {
    key: 'image-import-agent',
    title: 'Görsel İçe Aktarma Ajanı',
    purpose: 'Pexels öncelikli, Unsplash yedekli slug bazlı görsel arama ve import görevlerini yönetir.',
    outputType: 'media-task',
    autoPublish: false,
  },
  {
    key: 'seo-geo-agent',
    title: 'SEO/AEO/GEO/AIO Ajanı',
    purpose: 'Kritik sayfalar için kısa cevap, FAQ, schema, canonical ve llms.txt önerisi üretir.',
    outputType: 'seo-override-draft',
    autoPublish: false,
  },
];

export function isCityContentAgentKey(value: string): value is CityContentAgentKey {
  return CITY_CONTENT_AGENTS.some((agent) => agent.key === value);
}

const DEFAULT_TARGETS = [
  { slug: 'nobetci-eczaneler', title: 'Şanlıurfa Nöbetçi Eczaneler', route: '/saglik/nobetci-eczaneler', type: 'city-service' },
  { slug: 'otobus-saatleri', title: 'Şanlıurfa Otobüs Saatleri', route: '/ulasim/otobus-saatleri', type: 'city-service' },
  { slug: 'ucak-saatleri', title: 'Şanlıurfa Uçak Saatleri', route: '/ulasim/ucak-saatleri', type: 'city-service' },
  { slug: 'etkinlikler', title: 'Şanlıurfa Etkinlikleri', route: '/etkinlikler', type: 'event' },
  { slug: 'yemek-tarifleri', title: 'Şanlıurfa Yemek Tarifleri', route: '/yemek-tarifleri', type: 'recipe' },
  { slug: 'mekanlar', title: 'Şanlıurfa Mekanları', route: '/mekanlar', type: 'place' },
];

export function slugifyTr(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function ensureCityContentAgentTables(): Promise<void> {
  await query(`
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
  await query(`
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
  await query(`
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
  await query(`
    INSERT INTO city_content_sources (
      source_key, title, source_type, url, agent_key, trust_level, refresh_policy, metadata
    )
    VALUES
      ('sanliurfa-eczaci-odasi-nobetci', 'Şanlıurfa Eczacı Odası Nöbetçi Eczaneler', 'official_page', 'https://sanliurfaeo.birodam.org.tr/index.php/nobetci-eczaneler/', 'city-service-agent', 'official', 'admin_on_demand', '{"targetRoute":"/saglik/nobetci-eczaneler","contentType":"nobetci-eczane"}'::jsonb),
      ('urfakart-ulasim', 'Urfakart Şanlıurfa Ulaşım', 'official_page', 'https://www.urfakart.com/', 'city-service-agent', 'official', 'admin_on_demand', '{"targetRoute":"/ulasim/otobus-saatleri","contentType":"otobus-saatleri"}'::jsonb),
      ('sanliurfa-buyuksehir-etkinlik', 'Şanlıurfa Büyükşehir Belediyesi Etkinlik Duyuruları', 'official_page', 'https://www.sanliurfa.bel.tr/', 'culture-event-agent', 'official', 'admin_on_demand', '{"targetRoute":"/etkinlikler","contentType":"etkinlik"}'::jsonb),
      ('sanliurfa-gap-havalimani', 'Şanlıurfa GAP Havalimanı Uçuş Bilgileri', 'official_reference', 'https://www.dhmi.gov.tr/', 'city-service-agent', 'official', 'admin_on_demand', '{"targetRoute":"/ulasim/ucak-saatleri","contentType":"ucak-saatleri"}'::jsonb),
      ('pexels-sanliurfa-media', 'Pexels Şanlıurfa Görsel Arama', 'media_api', 'https://www.pexels.com/api/', 'image-import-agent', 'licensed_provider', 'admin_on_demand', '{"provider":"pexels","priority":1}'::jsonb),
      ('unsplash-sanliurfa-media', 'Unsplash Şanlıurfa Görsel Arama', 'media_api', 'https://unsplash.com/developers', 'image-import-agent', 'licensed_provider', 'admin_on_demand', '{"provider":"unsplash","priority":2}'::jsonb)
    ON CONFLICT (source_key) DO NOTHING;
  `);
}

export async function listCityContentSources(agentKey?: string): Promise<CityContentSource[]> {
  await ensureCityContentAgentTables();
  const result = agentKey
    ? await query<CityContentSource>(
        `SELECT * FROM city_content_sources WHERE agent_key = $1 ORDER BY title ASC`,
        [agentKey],
      )
    : await query<CityContentSource>(
        `SELECT * FROM city_content_sources ORDER BY agent_key ASC, title ASC`,
      );
  return result.rows;
}

export async function listCityContentJobs(limit = 20): Promise<CityContentAgentJob[]> {
  await ensureCityContentAgentTables();
  const result = await query<CityContentAgentJob>(
    `SELECT * FROM city_content_agent_jobs ORDER BY created_at DESC LIMIT $1`,
    [Math.max(1, Math.min(100, limit))],
  );
  return result.rows;
}

export async function listCityContentDrafts(options: {
  status?: string;
  draftType?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<CityContentDraft[]> {
  await ensureCityContentAgentTables();
  const where: string[] = [];
  const params: any[] = [];
  if (options.status) {
    params.push(options.status);
    where.push(`status = $${params.length}`);
  }
  if (options.draftType) {
    params.push(options.draftType);
    where.push(`draft_type = $${params.length}`);
  }

  const limit = Math.max(1, Math.min(500, Number(options.limit || 100)));
  const offset = Math.max(0, Number(options.offset || 0));
  params.push(limit, offset);

  const result = await query<CityContentDraft>(
    `SELECT * FROM city_content_drafts
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY updated_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function getCityContentDraftSummary(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}> {
  await ensureCityContentAgentTables();
  const [statusResult, typeResult] = await Promise.all([
    query<{ status: string; count: number }>(
      `SELECT status, COUNT(*)::int AS count FROM city_content_drafts GROUP BY status ORDER BY status ASC`,
    ),
    query<{ draft_type: string; count: number }>(
      `SELECT draft_type, COUNT(*)::int AS count FROM city_content_drafts GROUP BY draft_type ORDER BY draft_type ASC`,
    ),
  ]);

  const byStatus = Object.fromEntries(statusResult.rows.map((row) => [row.status, Number(row.count)]));
  const byType = Object.fromEntries(typeResult.rows.map((row) => [row.draft_type, Number(row.count)]));
  const total = Object.values(byStatus).reduce((sum, count) => sum + Number(count), 0);
  return { total, byStatus, byType };
}

async function createJob(
  agentKey: CityContentAgentKey,
  sourceKey: string | null,
  parameters: Record<string, any>,
  userId?: string | null,
): Promise<CityContentAgentJob> {
  const row = await queryOne<CityContentAgentJob>(
    `INSERT INTO city_content_agent_jobs (
       agent_key, status, source_key, parameters, started_at, created_by
     )
     VALUES ($1, 'running', $2, $3::jsonb, NOW(), $4)
     RETURNING *`,
    [agentKey, sourceKey, JSON.stringify(parameters), userId || null],
  );
  if (!row) throw new Error('Ajan işi oluşturulamadı');
  return row;
}

async function finishJob(id: string, status: 'completed' | 'failed', summary: string, error?: string) {
  await query(
    `UPDATE city_content_agent_jobs
     SET status = $2, summary = $3, error_message = $4, completed_at = NOW()
     WHERE id = $1`,
    [id, status, summary, error || null],
  );
}

async function fetchSourceDigest(source: CityContentSource): Promise<{ ok: boolean; digest: string }> {
  if (!/^https?:\/\//i.test(source.url)) return { ok: false, digest: 'Kaynak URL geçersiz.' };
  try {
    const res = await fetch(source.url, {
      headers: {
        'User-Agent': 'Sanliurfa.com content agent (+https://sanliurfa.com)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    const clean = text
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 900);
    return { ok: res.ok, digest: clean || `HTTP ${res.status} yanıtı alındı.` };
  } catch (error) {
    return { ok: false, digest: error instanceof Error ? error.message : 'Kaynak okunamadı.' };
  }
}

function buildSeoPayload(title: string, route: string, type: string) {
  const focusKeyword = 'Şanlıurfa';
  const answer = `${title}, Sanliurfa.com üzerinde Şanlıurfa odaklı güncel şehir rehberi deneyiminin parçasıdır. Bu sayfa kullanıcının hızlı karar vermesi için kısa cevap, güncel kaynak bilgisi, ilgili bağlantılar ve yerel bağlamla hazırlanır.`;
  return {
    focusKeyword,
    canonicalPath: route,
    title: `${title} | Sanliurfa.com`,
    description: `${title} hakkında güncel Şanlıurfa rehberi, pratik bilgiler ve doğrulanabilir kaynak özetleri.`,
    answerBlocks: [
      {
        question: `${title} nereden takip edilir?`,
        answer,
      },
    ],
    faq: [
      {
        question: `${title} bilgileri güncel mi?`,
        answer: 'Kaynak bilgisi admin onayından geçtikten sonra yayınlanır ve freshness alanıyla takip edilir.',
      },
      {
        question: 'Bu içerik neden Şanlıurfa odaklıdır?',
        answer: 'Sayfa; Şanlıurfa kullanıcılarının günlük ihtiyaç, gezi, kültür ve yerel hizmet aramalarına cevap vermek için hazırlanır.',
      },
    ],
    schemaType: type === 'event' ? 'Event' : type === 'recipe' ? 'Recipe' : 'WebPage',
  };
}

async function upsertDraft(input: {
  draftType: string;
  entityKey: string;
  title: string;
  slug: string;
  source?: CityContentSource | null;
  payload: Record<string, any>;
  seoPayload: Record<string, any>;
  freshnessPayload: Record<string, any>;
}): Promise<CityContentDraft> {
  const row = await queryOne<CityContentDraft>(
    `INSERT INTO city_content_drafts (
       draft_type, entity_key, title, slug, source_key, source_url, payload, seo_payload, freshness_payload, updated_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,NOW())
     ON CONFLICT (draft_type, entity_key)
     DO UPDATE SET
       title = EXCLUDED.title,
       slug = EXCLUDED.slug,
       source_key = EXCLUDED.source_key,
       source_url = EXCLUDED.source_url,
       status = 'pending',
       payload = EXCLUDED.payload,
       seo_payload = EXCLUDED.seo_payload,
       freshness_payload = EXCLUDED.freshness_payload,
       updated_at = NOW()
     RETURNING *`,
    [
      input.draftType,
      input.entityKey,
      input.title,
      input.slug,
      input.source?.source_key || null,
      input.source?.url || null,
      JSON.stringify(input.payload),
      JSON.stringify(input.seoPayload),
      JSON.stringify(input.freshnessPayload),
    ],
  );
  if (!row) throw new Error('Taslak yazılamadı');
  return row;
}

export async function runCityContentAgent(input: {
  agentKey: CityContentAgentKey;
  sourceKey?: string | null;
  userId?: string | null;
}): Promise<{ job: CityContentAgentJob; drafts: CityContentDraft[] }> {
  await ensureCityContentAgentTables();
  const agent = CITY_CONTENT_AGENTS.find((item) => item.key === input.agentKey);
  if (!agent) {
    throw new CityContentAgentError(`Bilinmeyen ajan: ${input.agentKey}`, 400, 'invalid_agent_key');
  }

  const sources = await listCityContentSources(input.agentKey);
  const selectedSources = input.sourceKey
    ? sources.filter((source) => source.source_key === input.sourceKey)
    : sources.filter((source) => source.is_active);

  if (input.sourceKey && selectedSources.length === 0) {
    throw new CityContentAgentError(
      `Kaynak bu ajana ait değil veya bulunamadı: ${input.sourceKey}`,
      400,
      'invalid_source_key',
    );
  }

  const job = await createJob(input.agentKey, input.sourceKey || null, { autoPublish: false }, input.userId);
  const drafts: CityContentDraft[] = [];

  try {
    if (input.agentKey === 'place-enrichment-agent' || input.agentKey === 'recipe-content-agent' || input.agentKey === 'seo-geo-agent') {
      if (input.sourceKey) {
        throw new CityContentAgentError(
          'Bu ajan kaynak URL ile değil, kritik Şanlıurfa sayfa hedefleriyle çalışır.',
          400,
          'source_not_supported_for_agent',
        );
      }
      const targets = DEFAULT_TARGETS.filter((target) => {
        if (input.agentKey === 'recipe-content-agent') return target.type === 'recipe';
        if (input.agentKey === 'place-enrichment-agent') return target.type === 'place';
        return true;
      });

      for (const target of targets) {
        drafts.push(
          await upsertDraft({
            draftType: agent.outputType,
            entityKey: target.slug,
            title: target.title,
            slug: target.slug,
            payload: {
              route: target.route,
              summary: `${target.title} sayfası için Şanlıurfa odaklı içerik, hızlı cevap ve iç link önerisi.`,
              requiredReview: true,
            },
            seoPayload: buildSeoPayload(target.title, target.route, target.type),
            freshnessPayload: {
              sourcePolicy: 'admin_review_required',
              generatedAt: new Date().toISOString(),
            },
          }),
        );
      }
    } else if (input.agentKey === 'image-import-agent') {
      if (selectedSources.length === 0) {
        throw new CityContentAgentError(
          'Görsel ajanı için aktif Pexels/Unsplash kaynağı bulunamadı.',
          409,
          'no_active_media_sources',
        );
      }

      const providers = selectedSources
        .map((source) => String(source.metadata?.provider || source.source_key))
        .sort((a, b) => (a === 'pexels' ? -1 : b === 'pexels' ? 1 : 0));

      for (const target of DEFAULT_TARGETS) {
        drafts.push(
          await upsertDraft({
            draftType: agent.outputType,
            entityKey: `media-${target.slug}`,
            title: `${target.title} Görsel Görevi`,
            slug: target.slug,
            source: selectedSources[0],
            payload: {
              route: target.route,
              providers,
              suggestedQueries: [`${target.title}`, `Şanlıurfa ${target.title}`, `${target.slug} Şanlıurfa`],
              fileNameRule: `${target.slug}.webp`,
              requiredReview: true,
              importEndpoint: '/api/admin/site/media/import',
              searchEndpoint: '/api/admin/site/media/search',
            },
            seoPayload: buildSeoPayload(`${target.title} görselleri`, target.route, target.type),
            freshnessPayload: {
              generatedAt: new Date().toISOString(),
              policy: 'licensed_provider_admin_import_required',
              providerPriority: providers,
            },
          }),
        );
      }
    } else {
      if (selectedSources.length === 0) {
        throw new CityContentAgentError(
          'Bu ajan için aktif kaynak bulunamadı. Önce admin kaynaklarını kontrol edin.',
          409,
          'no_active_sources',
        );
      }
      for (const source of selectedSources) {
        const digest = await fetchSourceDigest(source);
        await query(`UPDATE city_content_sources SET last_checked_at = NOW(), updated_at = NOW() WHERE source_key = $1`, [source.source_key]);
        const route = String(source.metadata?.targetRoute || '/');
        const contentType = String(source.metadata?.contentType || agent.outputType);
        const slug = slugifyTr(`${contentType}-${source.title}`);
        drafts.push(
          await upsertDraft({
            draftType: agent.outputType,
            entityKey: source.source_key,
            title: source.title,
            slug,
            source,
            payload: {
              route,
              sourceDigest: digest.digest,
              sourceOk: digest.ok,
              sourceType: source.source_type,
              requiredReview: true,
            },
            seoPayload: buildSeoPayload(source.title, route, contentType),
            freshnessPayload: {
              checkedAt: new Date().toISOString(),
              sourceOk: digest.ok,
              policy: source.refresh_policy,
            },
          }),
        );
      }
    }

    await finishJob(job.id, 'completed', `${drafts.length} taslak üretildi. Yayın için admin onayı gerekir.`);
    return { job: { ...job, status: 'completed' }, drafts };
  } catch (error) {
    await finishJob(job.id, 'failed', 'Ajan işi başarısız oldu.', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function approveCityContentDraft(id: string, userId?: string | null): Promise<CityContentDraft> {
  await ensureCityContentAgentTables();
  const row = await queryOne<CityContentDraft>(
    `UPDATE city_content_drafts
     SET status = 'approved', approved_by = $2, approved_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, userId || null],
  );
  if (!row) throw new CityContentAgentError('Taslak bulunamadı', 404, 'draft_not_found');
  return row;
}

export async function rejectCityContentDraft(id: string, note?: string | null): Promise<CityContentDraft> {
  await ensureCityContentAgentTables();
  const row = await queryOne<CityContentDraft>(
    `UPDATE city_content_drafts
     SET status = 'rejected', admin_notes = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, note || null],
  );
  if (!row) throw new CityContentAgentError('Taslak bulunamadı', 404, 'draft_not_found');
  return row;
}
