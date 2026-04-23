import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

type ImageProvider = 'pexels' | 'unsplash';

export interface ProviderImage {
  provider: ImageProvider;
  id: string;
  url: string;
  width?: number;
  height?: number;
  alt: string;
  creditName?: string;
  creditUrl?: string;
}

export interface StoredProviderImage extends ProviderImage {
  filePath: string;
  publicUrl: string;
}

interface FetchProviderImageOptions {
  query: string;
  slug: string;
  category?: string;
  folder?: string;
}

const SITE_URL = process.env.SITE_URL || 'https://sanliurfa.com';
const UPLOAD_DIR = process.env.PHOTO_UPLOAD_DIR || process.env.UPLOAD_DIR || 'public/uploads/photos';
const UPLOAD_PUBLIC_PATH = process.env.UPLOAD_PUBLIC_PATH || '/uploads/photos';
const PROVIDER_FETCH_TIMEOUT_MS = parsePositiveInt(process.env.IMAGE_PROVIDER_FETCH_TIMEOUT_MS, 8000);
const PROVIDER_RETRY_COUNT = parsePositiveInt(process.env.IMAGE_PROVIDER_RETRY_COUNT, 2);
const PROVIDER_RETRY_DELAY_MS = parsePositiveInt(process.env.IMAGE_PROVIDER_RETRY_DELAY_MS, 400);

export function hasImageProviderCredentials(): boolean {
  return Boolean(process.env.PEXELS_API_KEY || process.env.UNSPLASH_ACCESS_KEY);
}

export async function fetchAndStoreProviderImage(
  options: FetchProviderImageOptions
): Promise<StoredProviderImage | null> {
  const searchQuery = buildSanliurfaQuery(options.query, options.category);
  const image = await findProviderImage(searchQuery);

  if (!image) {
    return null;
  }

  return storeProviderImage({
    image,
    slug: options.slug,
    folder: options.folder || options.category || 'content',
  });
}

export async function findProviderImage(query: string): Promise<ProviderImage | null> {
  const pexels = await searchPexelsImage(query);
  if (pexels) {
    return pexels;
  }

  return searchUnsplashImage(query);
}

export async function searchPexelsImage(query: string): Promise<ProviderImage | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return null;
  }

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '1');
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('locale', 'tr-TR');

  const response = await fetchWithRetry(url.toString(), {
    headers: {
      Authorization: apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    photos?: Array<{
      id: number;
      width?: number;
      height?: number;
      alt?: string;
      url?: string;
      photographer?: string;
      photographer_url?: string;
      src?: { large2x?: string; large?: string; original?: string };
    }>;
  };
  const photo = data.photos?.[0];
  const imageUrl = photo?.src?.large2x || photo?.src?.large || photo?.src?.original;

  if (!photo || !imageUrl) {
    return null;
  }

  return {
    provider: 'pexels',
    id: String(photo.id),
    url: imageUrl,
    width: photo.width,
    height: photo.height,
    alt: photo.alt || `${query} görseli`,
    creditName: photo.photographer,
    creditUrl: photo.photographer_url || photo.url,
  };
}

export async function searchUnsplashImage(query: string): Promise<ProviderImage | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return null;
  }

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '1');
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('content_filter', 'high');

  const response = await fetchWithRetry(url.toString(), {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    results?: Array<{
      id: string;
      width?: number;
      height?: number;
      alt_description?: string | null;
      description?: string | null;
      links?: { html?: string };
      urls?: { regular?: string; full?: string };
      user?: { name?: string; links?: { html?: string } };
    }>;
  };
  const photo = data.results?.[0];
  const imageUrl = photo?.urls?.regular || photo?.urls?.full;

  if (!photo || !imageUrl) {
    return null;
  }

  return {
    provider: 'unsplash',
    id: photo.id,
    url: imageUrl,
    width: photo.width,
    height: photo.height,
    alt: photo.alt_description || photo.description || `${query} görseli`,
    creditName: photo.user?.name,
    creditUrl: photo.user?.links?.html || photo.links?.html,
  };
}

async function storeProviderImage(input: {
  image: ProviderImage;
  slug: string;
  folder: string;
}): Promise<StoredProviderImage> {
  const response = await fetchWithRetry(input.image.url, {
    headers: {
      Accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8',
      'User-Agent': 'sanliurfa.com image fetcher',
    },
  });

  if (!response.ok) {
    throw new Error('Görsel indirilemedi');
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) {
    throw new Error('Sağlayıcı görsel dosyası döndürmedi');
  }

  const optimized = await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize({
      width: 1600,
      height: 1000,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  const safeFolder = sanitizeSegment(input.folder);
  const safeSlug = sanitizeSegment(input.slug) || 'sanliurfa-gorsel';
  const fileName = `${safeSlug}.webp`;
  const relativeFolder = path.posix.join('provider', input.image.provider, safeFolder);
  const storageRoot = path.isAbsolute(UPLOAD_DIR) ? UPLOAD_DIR : path.join(process.cwd(), UPLOAD_DIR);
  const absoluteDir = path.join(storageRoot, ...relativeFolder.split('/'));
  const absolutePath = path.join(absoluteDir, fileName);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, optimized);

  const filePath = joinUrlPath(UPLOAD_PUBLIC_PATH, relativeFolder, fileName);

  return {
    ...input.image,
    filePath,
    publicUrl: `${SITE_URL.replace(/\/$/, '')}${filePath}`,
  };
}

function buildSanliurfaQuery(query: string, category?: string): string {
  const parts = [query, category, 'Şanlıurfa'].filter(Boolean);
  return [...new Set(parts)].join(' ');
}

function sanitizeSegment(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 140);
}

function joinUrlPath(...parts: string[]): string {
  return `/${parts
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')}`;
}

async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= PROVIDER_RETRY_COUNT; attempt += 1) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), PROVIDER_FETCH_TIMEOUT_MS);
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      if (response.ok) {
        return response;
      }

      if (!shouldRetryStatus(response.status) || attempt >= PROVIDER_RETRY_COUNT) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt >= PROVIDER_RETRY_COUNT) {
        break;
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }

    await delay(PROVIDER_RETRY_DELAY_MS * (attempt + 1));
  }

  throw lastError instanceof Error ? lastError : new Error('Image provider request failed');
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parsePositiveInt(rawValue: string | undefined, fallback: number): number {
  const parsed = Number.parseInt((rawValue || '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}
