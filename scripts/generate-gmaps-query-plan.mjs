#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const docsDir = path.join(projectRoot, 'docs');

const args = process.argv.slice(2);
const argValue = (name, fallback = null) => {
  const direct = args.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const outputFile = path.resolve(projectRoot, argValue('--output', 'scripts/gmaps-queries.txt'));
const reportFile = path.resolve(docsDir, 'gmaps-query-plan-report.json');
const limit = Math.max(1, Number(argValue('--limit', process.env.GMAPS_QUERY_LIMIT || '500')));
const onlyMissing = args.includes('--only-missing');
const dryRun = args.includes('--dry-run');

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

for (const envFile of [
  path.join(projectRoot, '.env'),
  path.join(projectRoot, '.env.local'),
  path.join(projectRoot, '.env.production'),
  path.join(scriptDir, '.env.scripts'),
]) {
  loadEnv(envFile);
}

const databaseUrl = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL || '';

function cleanText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[#!#]+/g, ' ')
    .trim();
}

function normalizeSlug(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildQuery(place) {
  const parts = [
    place.name,
    place.category,
    place.district_name,
    place.address,
    'Şanlıurfa',
  ].filter(Boolean);
  return cleanText(parts.join(' '));
}

function uniqueBySlug(places) {
  const seen = new Set();
  const result = [];
  for (const place of places) {
    const slug = normalizeSlug(place.slug || place.name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    result.push({ ...place, slug });
  }
  return result;
}

async function readPlacesFromDb() {
  if (!databaseUrl) return { source: 'fallback', places: [] };

  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 8000,
    application_name: 'sanliurfa-gmaps-query-plan',
  });

  await client.connect();
  try {
    const { rows } = await client.query(
      `
      SELECT
        p.slug,
        p.name,
        p.category,
        p.address,
        d.name AS district_name,
        p.phone,
        p.website,
        p.rating,
        COALESCE(p.review_count, 0) AS review_count,
        p.thumbnail_url,
        p.images
      FROM places p
      LEFT JOIN districts d ON d.id = p.district_id
      WHERE p.slug IS NOT NULL
        AND p.name IS NOT NULL
        AND p.slug !~* '(smoke|test|demo|fixture|dummy)'
        AND p.name !~* '(smoke|test|demo|fixture|dummy)'
        AND COALESCE(p.status, 'active') = 'active'
        AND ($1::boolean = false OR (
          NULLIF(p.phone, '') IS NULL
          OR NULLIF(p.website, '') IS NULL
          OR COALESCE(p.review_count, 0) = 0
          OR NULLIF(p.thumbnail_url, '') IS NULL
          OR p.images IS NULL
          OR cardinality(p.images) = 0
        ))
      ORDER BY
        CASE
          WHEN COALESCE(p.review_count, 0) = 0 THEN 0
          WHEN NULLIF(p.thumbnail_url, '') IS NULL THEN 1
          ELSE 2
        END,
        p.updated_at ASC NULLS FIRST,
        p.name ASC
      LIMIT $2
      `,
      [onlyMissing, limit],
    );

    return { source: 'database', places: rows };
  } finally {
    await client.end();
  }
}

function readCuratedFallbackPlaces() {
  const modulePath = path.join(projectRoot, 'src/data/curated-place-fallbacks.ts');
  if (!fs.existsSync(modulePath)) return [];

  const text = fs.readFileSync(modulePath, 'utf8');
  const blocks = [...text.matchAll(/(\w[\w-]*)\s*:\s*\{([\s\S]*?)\n\s*\},/g)];
  const candidates = blocks
    .map(([, key, body]) => {
      const field = (name) => {
        const match = body.match(new RegExp(`${name}:\\s*['"\`](.*?)['"\`]`));
        return match?.[1] || '';
      };
      return {
        slug: field('slug') || key,
        name: field('name'),
        category: field('category_name'),
        district_name: field('district_name'),
        address: field('address') || field('description'),
        review_count: Number(body.match(/review_count:\s*(\d+)/)?.[1] || 0),
        thumbnail_url: field('images'),
      };
    })
    .filter((place) => place.slug && place.name);

  return uniqueBySlug(candidates);
}

function toInputLine(place) {
  const query = buildQuery(place);
  return query ? `${query} #!#${place.slug}` : '';
}

async function main() {
  fs.mkdirSync(docsDir, { recursive: true });

  let source = 'database';
  let places = [];
  let dbError = null;

  try {
    const db = await readPlacesFromDb();
    source = db.source;
    places = db.places;
  } catch (error) {
    source = 'fallback';
    dbError = error.message;
    places = [];
  }

  if (places.length === 0) {
    source = source === 'database' ? 'database-empty-fallback' : source;
    places = readCuratedFallbackPlaces();
  }

  places = uniqueBySlug(places).slice(0, limit);
  const lines = places.map(toInputLine).filter(Boolean);

  const report = {
    generatedAt: new Date().toISOString(),
    status: lines.length > 0 ? 'ok' : 'blocked',
    source,
    onlyMissing,
    outputFile: path.relative(projectRoot, outputFile).replace(/\\/g, '/'),
    queryCount: lines.length,
    dbAvailable: source === 'database',
    dbError,
    inputIdFormat: 'query #!#slug',
    policy: {
      localStorageOnly: true,
      sharedHostingSafe: true,
      recommendedConcurrency: 1,
      recommendedDepth: 1,
    },
    sample: lines.slice(0, 5),
  };

  if (!dryRun && lines.length > 0) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, `${lines.join('\n')}\n`, 'utf8');
  }

  fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(
    `gmaps-query-plan: ${report.status.toUpperCase()} ` +
      `(source=${source}, queries=${lines.length}, output=${report.outputFile})`,
  );

  if (dryRun) {
    for (const line of lines.slice(0, 20)) console.log(line);
  }

  if (report.status !== 'ok') process.exit(1);
}

main().catch((error) => {
  console.error(`gmaps-query-plan: ${error.message}`);
  process.exit(1);
});
