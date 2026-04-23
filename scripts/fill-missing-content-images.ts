import pg from 'pg';
import { fetchAndStoreProviderImage, hasImageProviderCredentials } from '../src/lib/image-providers';

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

const args = new Set(process.argv.slice(2));
const typeArg = process.argv.find((arg) => arg.startsWith('--type='))?.split('=')[1] as ContentType | undefined;
const type: ContentType = typeArg && ['places', 'blog', 'events', 'all'].includes(typeArg) ? typeArg : 'all';
const write = args.has('--write');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
const limit = Math.max(1, Number.parseInt(limitArg || '25', 10));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[images:content] DATABASE_URL tanımlı değil.');
  process.exit(1);
}

if (!hasImageProviderCredentials()) {
  console.error('[images:content] PEXELS_API_KEY veya UNSPLASH_ACCESS_KEY tanımlı değil.');
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

try {
  console.log(`[images:content] Mod: ${write ? 'write' : 'dry-run'}, type=${type}, limit=${limit}`);

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
    console.log(`[images:content] places aranıyor: ${row.name} (${slug})`);

    if (!write) {
      continue;
    }

    try {
      const image = await fetchAndStoreProviderImage({
        query: row.name,
        slug,
        category,
        folder: 'places',
      });

      if (!image) {
        summary.failed += 1;
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
    } catch {
      summary.failed += 1;
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
    console.log(`[images:content] blog aranıyor: ${row.title} (${slug})`);

    if (!write) {
      continue;
    }

    try {
      const image = await fetchAndStoreProviderImage({
        query: row.title,
        slug,
        category,
        folder: 'blog',
      });

      if (!image) {
        summary.failed += 1;
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
    } catch {
      summary.failed += 1;
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
    console.log(`[images:content] events aranıyor: ${row.title} (${slug})`);

    if (!write) {
      continue;
    }

    try {
      const image = await fetchAndStoreProviderImage({
        query: row.title,
        slug,
        category,
        folder: 'events',
      });

      if (!image) {
        summary.failed += 1;
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
    } catch {
      summary.failed += 1;
    }
  }
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
