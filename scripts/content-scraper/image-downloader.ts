/**
 * Content image downloader (Unsplash + Pexels)
 * Produces slug-based file names and normalized outputs.
 *
 * Usage:
 *   UNSPLASH_ACCESS_KEY=... PEXELS_API_KEY=... npx tsx scripts/content-scraper/image-downloader.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';

type Provider = 'unsplash' | 'pexels';
type Bucket = string;

type ImageCandidate = {
  id: string;
  provider: Provider;
  query: string;
  url: string;
  thumb: string;
  author: string;
  authorUrl?: string;
};

type ImageTarget = {
  slug: string;
  bucket: Bucket;
  title?: string;
  queries: string[];
};

type ManifestRecord = {
  slug: string;
  bucket: Bucket;
  provider: Provider;
  id: string;
  query: string;
  author: string;
  authorUrl: string;
  sourceUrl: string;
  thumbUrl: string;
  localPath: string;
  thumbnailPath: string;
  license: string;
  attributionText: string;
  downloadedAt: string;
};

const ENV_FILES = ['.env.local', '.env'];

function loadEnvFiles(): void {
  for (const envFile of ENV_FILES) {
    const envPath = join(process.cwd(), envFile);
    if (!existsSync(envPath)) continue;
    const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const separatorIndex = line.indexOf('=');
      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFiles();

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const PEXELS_KEY = process.env.PEXELS_API_KEY;
const PER_QUERY = Math.max(1, Number(process.env.IMAGE_FETCH_LIMIT || 4));
const OUTPUT_BASE = process.env.IMAGE_OUTPUT_BASE || './public/images';
const JPEG_QUALITY = Math.max(50, Math.min(95, Number(process.env.IMAGE_JPEG_QUALITY || 85)));
const MAIN_WIDTH = Math.max(800, Number(process.env.IMAGE_MAIN_WIDTH || 1200));
const THUMB_WIDTH = Math.max(200, Number(process.env.IMAGE_THUMB_WIDTH || 400));
const REQUEST_DELAY_MS = Math.max(0, Number(process.env.IMAGE_REQUEST_DELAY_MS || 350));
const MAX_RETRIES = Math.max(1, Number(process.env.IMAGE_MAX_RETRIES || 3));
const RETRY_BASE_MS = Math.max(100, Number(process.env.IMAGE_RETRY_BASE_MS || 600));

const CONTENT_DIR = join(process.cwd(), 'src', 'content');
const STATIC_QUERY_OVERRIDES: Record<string, string[]> = {
  gobeklitepe: ['Gobeklitepe', 'Sanliurfa archaeological site'],
  balikligol: ['Balikligol Urfa', 'Sanliurfa holy lake'],
  harran: ['Harran Turkey', 'Harran beehive houses'],
  halfeti: ['Halfeti Turkey', 'Rumkale Euphrates'],
  'urfa-kalesi': ['Sanliurfa Castle', 'Urfa Castle'],
  'mozaik-muzesi': ['Haleplibahce Mosaic Museum', 'Sanliurfa mosaic museum'],
  'eyyup-peygamber': ['Eyyup Peygamber Makami Sanliurfa'],
  'rizvaniye-camii': ['Rizvaniye Camii Sanliurfa'],
  'tarihi-yerler-rehberi': ['Sanliurfa historical places', 'Gobeklitepe']
};

const UNSPLASH_LICENSE = 'Unsplash License';
const PEXELS_LICENSE = 'Pexels License';
const providerLastCall: Record<Provider | 'image', number> = {
  unsplash: 0,
  pexels: 0,
  image: 0
};

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttleProvider(provider: Provider | 'image'): Promise<void> {
  const now = Date.now();
  const last = providerLastCall[provider];
  const delta = now - last;
  if (delta < REQUEST_DELAY_MS) {
    await sleep(REQUEST_DELAY_MS - delta);
  }
  providerLastCall[provider] = Date.now();
}

async function fetchWithRetry(
  provider: Provider | 'image',
  url: string,
  init?: RequestInit
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await throttleProvider(provider);
      const response = await fetch(url, init);

      if (response.ok) return response;

      const retriable = response.status === 429 || response.status >= 500;
      if (!retriable || attempt === MAX_RETRIES) {
        throw new Error(`${provider} request failed (${response.status})`);
      }

      const retryAfter = Number(response.headers.get('retry-after') || '0');
      const backoff = retryAfter > 0 ? retryAfter * 1000 : RETRY_BASE_MS * 2 ** (attempt - 1);
      await sleep(backoff);
    } catch (error) {
      lastError = error as Error;
      if (attempt === MAX_RETRIES) break;
      await sleep(RETRY_BASE_MS * 2 ** (attempt - 1));
    }
  }

  throw lastError || new Error(`${provider} request failed`);
}

async function fetchUnsplash(query: string): Promise<ImageCandidate[]> {
  if (!UNSPLASH_KEY) return [];

  const endpoint = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${PER_QUERY}&orientation=landscape`;
  const response = await fetchWithRetry('unsplash', endpoint, {
    headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` }
  });

  const data = await response.json();
  const results = Array.isArray(data?.results) ? data.results : [];
  return results
    .map((img: any) => ({
      id: `${img.id}`,
      provider: 'unsplash' as const,
      query,
      url: img?.urls?.regular || img?.urls?.full,
      thumb: img?.urls?.small || img?.urls?.thumb || '',
      author: img?.user?.name || 'Unknown',
      authorUrl: img?.user?.links?.html
    }))
    .filter((item) => Boolean(item.url));
}

function splitFrontmatter(content: string): { frontmatter: string; body: string } | null {
  const normalized = content.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return null;
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) return null;
  return {
    frontmatter: normalized.slice(4, end),
    body: normalized.slice(end + 5)
  };
}

function getFrontmatterField(frontmatter: string, key: string): string | undefined {
  const m = frontmatter.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm'));
  return m?.[1]?.trim();
}

function uniqueQueries(values: Array<string | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = (value || '').trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function discoverTargets(): ImageTarget[] {
  if (!existsSync(CONTENT_DIR)) return [];
  const targets: ImageTarget[] = [];

  for (const entry of readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const bucket = entry.name;
    const dir = join(CONTENT_DIR, bucket);

    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const filePath = join(dir, file);
      const raw = readFileSync(filePath, 'utf-8');
      const parsed = splitFrontmatter(raw);
      const fallbackSlug = basename(file, '.md');
      const slug = parsed ? getFrontmatterField(parsed.frontmatter, 'slug') || fallbackSlug : fallbackSlug;
      const title = parsed ? getFrontmatterField(parsed.frontmatter, 'title') : undefined;
      const overrideQueries = STATIC_QUERY_OVERRIDES[slug] || [];
      const slugWords = slug.replace(/-/g, ' ');

      const queries = uniqueQueries([
        ...overrideQueries,
        title ? `${title} Sanliurfa` : undefined,
        title,
        `${slugWords} Sanliurfa`,
        slugWords,
        'Sanliurfa'
      ]);

      targets.push({ slug, bucket, title, queries });
    }
  }

  return targets;
}

async function fetchPexels(query: string): Promise<ImageCandidate[]> {
  if (!PEXELS_KEY) return [];

  const endpoint = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${PER_QUERY}&orientation=landscape`;
  const response = await fetchWithRetry('pexels', endpoint, {
    headers: { Authorization: PEXELS_KEY }
  });

  const data = await response.json();
  const results = Array.isArray(data?.photos) ? data.photos : [];
  return results
    .map((img: any) => ({
      id: `${img.id}`,
      provider: 'pexels' as const,
      query,
      url: img?.src?.large2x || img?.src?.large || img?.src?.original,
      thumb: img?.src?.medium || img?.src?.small || '',
      author: img?.photographer || 'Unknown',
      authorUrl: img?.photographer_url
    }))
    .filter((item) => Boolean(item.url));
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetchWithRetry('image', url);
  return Buffer.from(await response.arrayBuffer());
}

async function writeOptimizedImages(
  buffer: Buffer,
  mainOutputPath: string,
  thumbOutputPath: string
): Promise<void> {
  const sharpMod = await import('sharp').catch(() => null);

  mkdirSync(dirname(mainOutputPath), { recursive: true });

  if (!sharpMod?.default) {
    writeFileSync(mainOutputPath, buffer);
    writeFileSync(thumbOutputPath, buffer);
    return;
  }

  await sharpMod.default(buffer)
    .resize({ width: MAIN_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(mainOutputPath);

  await sharpMod.default(buffer)
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toFile(thumbOutputPath);
}

function getLicense(provider: Provider): string {
  return provider === 'unsplash' ? UNSPLASH_LICENSE : PEXELS_LICENSE;
}

function getAttribution(candidate: ImageCandidate): string {
  const base = candidate.provider === 'unsplash' ? 'Unsplash' : 'Pexels';
  return `${candidate.author} (${base})`;
}

async function findBestCandidate(target: ImageTarget): Promise<ImageCandidate | null> {
  for (const query of target.queries) {
    try {
      const pexels = await fetchPexels(query);
      const unsplash = await fetchUnsplash(query);
      const preferred = [...pexels, ...unsplash];
      if (preferred.length > 0) {
        return preferred[0];
      }
    } catch {
      // Continue with next query.
    }
  }
  return null;
}

function toPublicPath(fsPath: string): string {
  return fsPath.replace(/\\/g, '/').replace(/^\.?\/?public\//, '/');
}

export async function downloadImages(): Promise<void> {
  if (!UNSPLASH_KEY && !PEXELS_KEY) {
    const manifestPath = join(OUTPUT_BASE, 'image-manifest.json');
    if (existsSync(manifestPath)) {
      const existingRaw = readFileSync(manifestPath, 'utf-8');
      const existing = JSON.parse(existingRaw);
      if (Array.isArray(existing) && existing.length > 0) {
        console.log('UNSPLASH_ACCESS_KEY/PEXELS_API_KEY bulunamadı, mevcut manifest kullanılacak.');
        console.log(`Manifest: ${manifestPath} (${existing.length} records)`);
        return;
      }
    }
    throw new Error(
      'UNSPLASH_ACCESS_KEY veya PEXELS_API_KEY ayarlanmamış. Ortam değişkenlerini tanımlayın.'
    );
  }

  const manifest: ManifestRecord[] = [];

  console.log('Image sources:');
  console.log(`  Unsplash: ${UNSPLASH_KEY ? 'enabled' : 'disabled'}`);
  console.log(`  Pexels: ${PEXELS_KEY ? 'enabled' : 'disabled'}`);
  console.log(`  Output: ${OUTPUT_BASE}`);
  console.log('');

  const targets = discoverTargets();
  if (targets.length === 0) {
    throw new Error('src/content altında işlenecek markdown içeriği bulunamadı.');
  }

  for (const target of targets) {
    const mainOutput = join(OUTPUT_BASE, target.bucket, `${target.slug}.jpg`);
    const thumbOutput = join(OUTPUT_BASE, target.bucket, `${target.slug}-thumb.jpg`);

    console.log(`Target: ${target.bucket}/${target.slug}${target.title ? ` (${target.title})` : ''}`);

    const candidate = await findBestCandidate(target);
    if (!candidate) {
      console.log('  No candidate found');
      console.log('');
      continue;
    }

    try {
      const buffer = await fetchImageBuffer(candidate.url);
      await writeOptimizedImages(buffer, mainOutput, thumbOutput);

      const localPath = toPublicPath(mainOutput);
      const thumbnailPath = toPublicPath(thumbOutput);
      const record: ManifestRecord = {
        slug: target.slug,
        bucket: target.bucket,
        provider: candidate.provider,
        id: candidate.id,
        query: candidate.query,
        author: candidate.author,
        authorUrl: candidate.authorUrl || '',
        sourceUrl: candidate.url,
        thumbUrl: candidate.thumb || '',
        localPath,
        thumbnailPath,
        license: getLicense(candidate.provider),
        attributionText: getAttribution(candidate),
        downloadedAt: new Date().toISOString()
      };
      manifest.push(record);

      console.log(`  Saved: ${localPath}`);
      console.log(`  Thumb: ${thumbnailPath}`);
      console.log(`  Source: ${candidate.provider}`);
    } catch (error) {
      console.log(`  Failed: ${(error as Error).message}`);
    }

    console.log('');
  }

  const manifestPath = join(OUTPUT_BASE, 'image-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Manifest: ${manifestPath} (${manifest.length} records)`);
}

const isDirectRun = (() => {
  try {
    return fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  downloadImages().catch((error) => {
    console.error(`Image download failed: ${(error as Error).message}`);
    process.exit(1);
  });
}
