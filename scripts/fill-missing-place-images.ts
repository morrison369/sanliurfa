import pg from 'pg';
import { fetchAndStoreProviderImage, hasImageProviderCredentials } from '../src/lib/image-providers';

const { Pool } = pg;

interface PlaceRow {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
}

const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = Math.max(1, Number.parseInt(limitArg?.split('=')[1] || '20', 10));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[images] DATABASE_URL tanımlı değil.');
  process.exit(1);
}

if (!hasImageProviderCredentials()) {
  console.error('[images] PEXELS_API_KEY veya UNSPLASH_ACCESS_KEY tanımlı değil.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 2,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
});

try {
  const places = await loadPlaces(limit);
  console.log(`[images] ${places.length} eksik mekan görseli bulundu. Mod: ${write ? 'write' : 'dry-run'}`);

  for (const place of places) {
    console.log(`[images] aranıyor: ${place.name} (${place.slug})`);

    if (!write) {
      continue;
    }

    const image = await fetchAndStoreProviderImage({
      query: place.name,
      slug: place.slug,
      category: place.category || undefined,
      folder: 'places',
    });

    if (!image) {
      console.log(`[images] bulunamadı: ${place.slug}`);
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
      [image.filePath, place.id]
    );

    console.log(`[images] kaydedildi: ${place.slug} -> ${image.filePath}`);
  }
} finally {
  await pool.end();
}

async function loadPlaces(max: number): Promise<PlaceRow[]> {
  const result = await pool.query<PlaceRow>(
    `SELECT id, name, slug, category
     FROM places
     WHERE COALESCE(image_url, '') = ''
     ORDER BY is_featured DESC NULLS LAST, created_at DESC
     LIMIT $1`,
    [max]
  );

  return result.rows;
}
