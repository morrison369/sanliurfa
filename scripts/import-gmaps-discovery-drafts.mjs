#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = process.cwd();
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const inputFile = path.resolve(root, 'scripts/gmaps-discovery-queries.txt');
const reportFile = path.resolve(root, 'docs/gmaps-discovery-drafts-report.json');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').replace(/\\n/g, '\n').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && value && !process.env[key]) process.env[key] = value;
  }
}

for (const file of [
  path.join(root, '.env'),
  path.join(root, '.env.local'),
  path.join(root, '.env.production'),
  path.join(root, 'scripts/.env.scripts'),
]) {
  loadEnv(file);
}

function parseLine(line) {
  const [queryPart, idPart] = line.split('#!#');
  const query = String(queryPart || '').trim();
  const entityKey = String(idPart || '').trim();
  if (!query || !entityKey) return null;
  const title = query.replace(/\s+Şanlıurfa$/i, '').trim();
  return {
    draftType: 'place-discovery-draft',
    entityKey,
    title: `${title} aday keşfi`,
    slug: entityKey.replace(/^kategori-/, ''),
    payload: {
      query,
      source: 'kategoriler.txt',
      gmapsInputId: entityKey,
      requiredReview: true,
      autoPublish: false,
      nextStep: 'google-maps-scraper sonucu incelenip gerçek mekan olarak onaylanmalı',
    },
    seoPayload: {
      focusKeyword: `${title} Şanlıurfa`,
      intent: 'local-discovery',
      targetRoute: '/mekanlar',
      schemaType: 'LocalBusiness',
      visibleContentRequired: true,
    },
    freshnessPayload: {
      generatedAt: new Date().toISOString(),
      policy: 'admin_review_required',
      localStorageOnly: true,
    },
  };
}

async function ensureTables(client) {
  await client.query(`
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
}

async function countExistingDrafts(databaseUrl) {
  if (!databaseUrl) return null;
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
    application_name: 'sanliurfa-gmaps-discovery-drafts-count',
  });
  await client.connect();
  try {
    await ensureTables(client);
    const { rows } = await client.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
      FROM city_content_drafts
      WHERE draft_type = 'place-discovery-draft'
    `);
    return {
      total: Number(rows[0]?.total || 0),
      pending: Number(rows[0]?.pending || 0),
    };
  } finally {
    await client.end();
  }
}

async function main() {
  if (!fs.existsSync(inputFile)) {
    throw new Error('scripts/gmaps-discovery-queries.txt bulunamadı. Önce npm run gmaps:discovery-plan çalıştırın.');
  }

  const candidates = fs
    .readFileSync(inputFile, 'utf8')
    .split(/\r?\n/)
    .map((line) => parseLine(line.trim()))
    .filter(Boolean);

  const databaseUrl = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL;
  const existingBefore = await countExistingDrafts(databaseUrl);

  const report = {
    generatedAt: new Date().toISOString(),
    status: candidates.length > 0 ? 'ok' : 'blocked',
    mode: apply ? 'apply' : 'dry-run',
    inputFile: 'scripts/gmaps-discovery-queries.txt',
    candidateCount: candidates.length,
    existingDraftCount: existingBefore?.total ?? null,
    pendingDraftCount: existingBefore?.pending ?? null,
    insertedOrUpdatedCount: 0,
    policy: {
      autoPublish: false,
      draftStatus: 'pending',
      localStorageOnly: true,
    },
    sample: candidates.slice(0, 10).map((item) => ({
      entityKey: item.entityKey,
      title: item.title,
      query: item.payload.query,
    })),
  };

  if (apply) {
    if (!databaseUrl) throw new Error('DATABASE_URL veya PROD_DATABASE_URL gerekli');

    const client = new pg.Client({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 10000,
      application_name: 'sanliurfa-gmaps-discovery-drafts',
    });
    await client.connect();
    try {
      await ensureTables(client);
      await client.query('BEGIN');
      for (const item of candidates) {
        await client.query(
          `
          INSERT INTO city_content_drafts (
            draft_type, entity_key, title, slug, source_key, source_url,
            status, payload, seo_payload, freshness_payload, updated_at
          )
          VALUES ($1,$2,$3,$4,'google-maps-scraper','https://github.com/gosom/google-maps-scraper',
            'pending',$5::jsonb,$6::jsonb,$7::jsonb,NOW())
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
          `,
          [
            item.draftType,
            item.entityKey,
            item.title,
            item.slug,
            JSON.stringify(item.payload),
            JSON.stringify(item.seoPayload),
            JSON.stringify(item.freshnessPayload),
          ],
        );
      }
      await client.query('COMMIT');
      report.insertedOrUpdatedCount = candidates.length;
      const existingAfter = await client.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
        FROM city_content_drafts
        WHERE draft_type = 'place-discovery-draft'
      `);
      report.existingDraftCount = Number(existingAfter.rows[0]?.total || 0);
      report.pendingDraftCount = Number(existingAfter.rows[0]?.pending || 0);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      await client.end();
    }
  }

  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `gmaps-discovery-drafts: ${report.status.toUpperCase()} ` +
      `(mode=${report.mode}, candidates=${report.candidateCount}, existing=${report.existingDraftCount ?? 'unknown'}, upsert=${report.insertedOrUpdatedCount})`,
  );

  if (report.status !== 'ok') process.exit(1);
}

main().catch((error) => {
  console.error(`gmaps-discovery-drafts: ${error.message}`);
  process.exit(1);
});
