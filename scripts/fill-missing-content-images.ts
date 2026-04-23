import pg from 'pg';
import {
  fetchAndStoreProviderImage,
  findProviderImage,
  hasImageProviderCredentials,
} from '../src/lib/image-providers';
import { loadLocalEnv } from './lib/load-local-env';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const { Pool } = pg;

type ContentType = 'places' | 'blog' | 'events' | 'all';

interface PlaceRow {
  id: string;
  name: string;
  slug: string | null;
  category?: string | null;
}

interface BlogRow {
  id: number;
  title: string;
  slug: string | null;
  category_name?: string | null;
}

interface EventRow {
  id: string;
  title: string;
  slug: string | null;
  category?: string | null;
}

type BucketKey = 'places' | 'blog' | 'events';

interface FailedItem {
  bucket: BucketKey;
  id: string;
  slug: string;
  title: string;
  attemptedQueries: string[];
  reason: string;
}

const args = new Set(process.argv.slice(2));
const typeArg = process.argv.find((arg) => arg.startsWith('--type='))?.split('=')[1] as ContentType | undefined;
const type: ContentType = typeArg && ['places', 'blog', 'events', 'all'].includes(typeArg) ? typeArg : 'all';
const write = args.has('--write');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
const limit = Math.max(1, Number.parseInt(limitArg || '25', 10));
const databaseUrlArg = process.argv.find((arg) => arg.startsWith('--database-url='))?.split('=')[1];
const reportJsonArg = process.argv.find((arg) => arg.startsWith('--report-json='))?.split('=')[1];
const queryModeArg = process.argv.find((arg) => arg.startsWith('--query-mode='))?.split('=')[1];
const probeOnDryRun = args.has('--probe-provider-on-dry-run');
const queryMode: 'strict' | 'expanded' = queryModeArg === 'expanded' ? 'expanded' : 'strict';
loadLocalEnv();
const databaseUrl = databaseUrlArg || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[images:content] DATABASE_URL tanımlı değil. --database-url=<postgresql://...> veya .env/.env.local kullanın.');
  process.exit(1);
}

if (!hasImageProviderCredentials()) {
  console.error(
    '[images:content] PEXELS_API_KEY veya UNSPLASH_ACCESS_KEY tanımlı değil. Anahtarları .env.local içine girin.'
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 2,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
});

const summary = {
  scanned: 0,
  filled: 0,
  failed: 0,
};
const bucketSummary: Record<'places' | 'blog' | 'events', { scanned: number; filled: number; failed: number }> = {
  places: { scanned: 0, filled: 0, failed: 0 },
  blog: { scanned: 0, filled: 0, failed: 0 },
  events: { scanned: 0, filled: 0, failed: 0 },
};
const failedItems: FailedItem[] = [];

try {
  console.log(
    `[images:content] Mod: ${write ? 'write' : 'dry-run'}, type=${type}, limit=${limit}, queryMode=${queryMode}, probeOnDryRun=${probeOnDryRun}`
  );

  if (type === 'all' || type === 'places') {
    await processPlaces(limit);
  }
  if (type === 'all' || type === 'blog') {
    await processBlog(limit);
  }
  if (type === 'all' || type === 'events') {
    await processEvents(limit);
  }

  console.log(
    `[images:content] bitti scanned=${summary.scanned} filled=${summary.filled} failed=${summary.failed}`
  );
  await maybeWriteReport();
} finally {
  await pool.end();
}

async function processPlaces(max: number): Promise<void> {
  const rows = await pool.query<PlaceRow>(
    `SELECT id, name, slug, category
     FROM places
     WHERE COALESCE(image_url, '') = ''
     ORDER BY is_featured DESC NULLS LAST, created_at DESC
     LIMIT $1`,
    [max]
  );

  console.log(`[images:content] places eksik: ${rows.rowCount}`);
  for (const row of rows.rows) {
    const slug = safeSlug(row.slug || row.name);
    const category = row.category || 'mekan';
    summary.scanned += 1;
    bucketSummary.places.scanned += 1;
    console.log(`[images:content] places aranıyor: ${row.name} (${slug})`);

    if (!write) {
      if (probeOnDryRun) {
        const probe = await probeWithFallbacks(row.name, slug, category);
        if (probe.found) {
          summary.filled += 1;
          bucketSummary.places.filled += 1;
        } else {
          summary.failed += 1;
          bucketSummary.places.failed += 1;
          recordFailure('places', row.id, slug, row.name, probe.attemptedQueries, 'provider_not_found_dry_probe');
        }
      }
      continue;
    }

    try {
      const fallback = await fetchWithFallbacks({
        title: row.name,
        slug,
        category,
        folder: 'places',
      });
      const image = fallback.image;

      if (!image) {
        summary.failed += 1;
        bucketSummary.places.failed += 1;
        recordFailure('places', row.id, slug, row.name, fallback.attemptedQueries, 'provider_not_found');
        continue;
      }

      await pool.query(
        `UPDATE places
         SET image_url = $1,
             images = CASE
               WHEN images IS NULL THEN ARRAY[$1]
               WHEN NOT ($1 = ANY(images)) THEN array_prepend($1, images)
               ELSE images
             END,
             updated_at = NOW()
         WHERE id = $2`,
        [image.filePath, row.id]
      );

      summary.filled += 1;
      bucketSummary.places.filled += 1;
    } catch (error) {
      summary.failed += 1;
      bucketSummary.places.failed += 1;
      recordFailure(
        'places',
        row.id,
        slug,
        row.name,
        buildQueryCandidates(row.name, slug, category),
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

async function processBlog(max: number): Promise<void> {
  const rows = await pool.query<BlogRow>(
    `SELECT bp.id, bp.title, bp.slug, bc.name AS category_name
     FROM blog_posts bp
     LEFT JOIN blog_categories bc ON bc.id = bp.category_id
     WHERE bp.status = 'published'
       AND COALESCE(bp.featured_image, '') = ''
     ORDER BY bp.published_at DESC NULLS LAST, bp.created_at DESC
     LIMIT $1`,
    [max]
  );

  console.log(`[images:content] blog eksik: ${rows.rowCount}`);
  for (const row of rows.rows) {
    const slug = safeSlug(row.slug || row.title);
    const category = row.category_name || 'blog';
    summary.scanned += 1;
    bucketSummary.blog.scanned += 1;
    console.log(`[images:content] blog aranıyor: ${row.title} (${slug})`);

    if (!write) {
      if (probeOnDryRun) {
        const probe = await probeWithFallbacks(row.title, slug, category);
        if (probe.found) {
          summary.filled += 1;
          bucketSummary.blog.filled += 1;
        } else {
          summary.failed += 1;
          bucketSummary.blog.failed += 1;
          recordFailure('blog', String(row.id), slug, row.title, probe.attemptedQueries, 'provider_not_found_dry_probe');
        }
      }
      continue;
    }

    try {
      const fallback = await fetchWithFallbacks({
        title: row.title,
        slug,
        category,
        folder: 'blog',
      });
      const image = fallback.image;

      if (!image) {
        summary.failed += 1;
        bucketSummary.blog.failed += 1;
        recordFailure('blog', String(row.id), slug, row.title, fallback.attemptedQueries, 'provider_not_found');
        continue;
      }

      await pool.query(
        `UPDATE blog_posts
         SET featured_image = $1,
             thumbnail = COALESCE(NULLIF(thumbnail, ''), $1),
             updated_at = NOW()
         WHERE id = $2`,
        [image.filePath, row.id]
      );

      summary.filled += 1;
      bucketSummary.blog.filled += 1;
    } catch (error) {
      summary.failed += 1;
      bucketSummary.blog.failed += 1;
      recordFailure(
        'blog',
        String(row.id),
        slug,
        row.title,
        buildQueryCandidates(row.title, slug, category),
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

async function processEvents(max: number): Promise<void> {
  const rows = await pool.query<EventRow>(
    `SELECT id, title, slug, category
     FROM events
     WHERE COALESCE(image_url, '') = ''
     ORDER BY start_date ASC, created_at DESC
     LIMIT $1`,
    [max]
  );

  console.log(`[images:content] events eksik: ${rows.rowCount}`);
  for (const row of rows.rows) {
    const slug = safeSlug(row.slug || row.title);
    const category = row.category || 'etkinlik';
    summary.scanned += 1;
    bucketSummary.events.scanned += 1;
    console.log(`[images:content] events aranıyor: ${row.title} (${slug})`);

    if (!write) {
      if (probeOnDryRun) {
        const probe = await probeWithFallbacks(row.title, slug, category);
        if (probe.found) {
          summary.filled += 1;
          bucketSummary.events.filled += 1;
        } else {
          summary.failed += 1;
          bucketSummary.events.failed += 1;
          recordFailure('events', row.id, slug, row.title, probe.attemptedQueries, 'provider_not_found_dry_probe');
        }
      }
      continue;
    }

    try {
      const fallback = await fetchWithFallbacks({
        title: row.title,
        slug,
        category,
        folder: 'events',
      });
      const image = fallback.image;

      if (!image) {
        summary.failed += 1;
        bucketSummary.events.failed += 1;
        recordFailure('events', row.id, slug, row.title, fallback.attemptedQueries, 'provider_not_found');
        continue;
      }

      await pool.query(
        `UPDATE events
         SET image_url = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [image.filePath, row.id]
      );

      summary.filled += 1;
      bucketSummary.events.filled += 1;
    } catch (error) {
      summary.failed += 1;
      bucketSummary.events.failed += 1;
      recordFailure(
        'events',
        row.id,
        slug,
        row.title,
        buildQueryCandidates(row.title, slug, category),
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}

async function maybeWriteReport(): Promise<void> {
  if (!reportJsonArg) {
    return;
  }

  const now = new Date().toISOString();
  const payload = {
    generatedAt: now,
    mode: write ? 'write' : 'dry-run',
    type,
    limit,
    queryMode,
    dryRunProbeEnabled: !write && probeOnDryRun,
    totals: summary,
    buckets: bucketSummary,
    failures: failedItems,
  };

  const reportPath = path.isAbsolute(reportJsonArg)
    ? reportJsonArg
    : path.join(process.cwd(), reportJsonArg);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[images:content] rapor yazıldı: ${reportPath}`);
}

async function fetchWithFallbacks(input: {
  title: string;
  slug: string;
  category: string;
  folder: string;
}): Promise<{ image: Awaited<ReturnType<typeof fetchAndStoreProviderImage>>; attemptedQueries: string[] }> {
  const attempts = buildQueryCandidates(input.title, input.slug, input.category);
  for (const query of attempts) {
    const image = await fetchAndStoreProviderImage({
      query,
      slug: input.slug,
      category: input.category,
      folder: input.folder,
    });
    if (image) {
      return { image, attemptedQueries: attempts };
    }
  }

  return { image: null, attemptedQueries: attempts };
}

async function probeWithFallbacks(
  title: string,
  slug: string,
  category: string
): Promise<{ found: boolean; attemptedQueries: string[] }> {
  const attempts = buildQueryCandidates(title, slug, category).map((query) => `${query} Şanlıurfa`.trim());
  for (const query of attempts) {
    const candidate = await findProviderImage(query);
    if (candidate) {
      return { found: true, attemptedQueries: attempts };
    }
  }

  return { found: false, attemptedQueries: attempts };
}

function buildQueryCandidates(title: string, slug: string, category: string): string[] {
  const strict = [title];
  if (queryMode !== 'expanded') {
    return strict;
  }

  const expanded = [
    title,
    `${title} ${category}`,
    slugToWords(slug),
    `${slugToWords(slug)} ${category}`,
  ];
  return [...new Set(expanded.map((item) => item.trim()).filter(Boolean))];
}

function slugToWords(slug: string): string {
  return slug.replace(/-/g, ' ').trim();
}

function recordFailure(
  bucket: BucketKey,
  id: string,
  slug: string,
  title: string,
  attemptedQueries: string[],
  reason: string
): void {
  if (failedItems.length >= 250) {
    return;
  }

  failedItems.push({
    bucket,
    id,
    slug,
    title,
    attemptedQueries,
    reason,
  });
}

function safeSlug(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140);
}
