import fs from 'node:fs';
import path from 'node:path';

type ResolveImageInput = {
  category: string;
  slug?: string | null | undefined;
  explicit?: string | null | undefined;
  placeholder: string;
  thumb?: boolean;
  preferLocal?: boolean;
  allowExternalExplicit?: boolean;
};

const SAFE_CATEGORY_RE = /^[a-z0-9-]+$/;
const SAFE_SLUG_RE = /^[a-z0-9-]+$/;
const PUBLIC_ROOT = path.join(process.cwd(), 'public');
const DIST_CLIENT_ROOT = path.join(process.cwd(), 'dist', 'client');

type ManifestEntry = {
  slug?: string;
  bucket?: string;
  localPath?: string;
  thumbnailPath?: string;
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  places: ['places', 'mekanlar'],
  blog: ['blog'],
  'tarihi-yerler': ['tarihi-yerler', 'historical', 'gezilecek-yerler'],
  etkinlikler: ['etkinlikler', 'events'],
};

const MANIFEST_IMAGES = loadManifestImages();

function sanitizeSegment(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized;
}

function isAcceptableExplicit(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/images/') ||
    trimmed.startsWith('/uploads/')
  );
}

function isLocalExplicit(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('/images/') || trimmed.startsWith('/uploads/');
}

function normalizeWebPath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^public\//, '');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function publicAssetExists(value: string): boolean {
  if (!value.startsWith('/')) return false;
  const rel = value.replace(/^\//, '');
  return fs.existsSync(path.join(PUBLIC_ROOT, rel)) || fs.existsSync(path.join(DIST_CLIENT_ROOT, rel));
}

function readManifestEntries(filePath: string): ManifestEntry[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadManifestImages() {
  const bucketMap = new Map<string, string>();
  const bucketThumbMap = new Map<string, string>();
  const slugMap = new Map<string, string>();
  const slugThumbMap = new Map<string, string>();
  const manifestFiles = [
    path.join(PUBLIC_ROOT, 'images', 'image-manifest.json'),
    path.join(PUBLIC_ROOT, 'images', 'places', 'image-manifest.json'),
  ];

  for (const entry of manifestFiles.flatMap(readManifestEntries)) {
    const slug = sanitizeSegment(entry.slug);
    const bucket = sanitizeSegment(entry.bucket);
    const localPath = entry.localPath ? normalizeWebPath(entry.localPath) : '';
    const thumbnailPath = entry.thumbnailPath ? normalizeWebPath(entry.thumbnailPath) : '';
    if (!slug || !localPath) continue;
    if (!slugMap.has(slug)) slugMap.set(slug, localPath);
    if (thumbnailPath && !slugThumbMap.has(slug)) slugThumbMap.set(slug, thumbnailPath);
    if (bucket) bucketMap.set(`${bucket}:${slug}`, localPath);
    if (bucket && thumbnailPath) bucketThumbMap.set(`${bucket}:${slug}`, thumbnailPath);
  }

  return { bucketMap, bucketThumbMap, slugMap, slugThumbMap };
}

function resolveManifestImage(category: string, slug: string, thumb = false): string | null {
  const normalizedCategory = sanitizeSegment(category);
  const aliases = normalizedCategory
    ? [normalizedCategory, ...(CATEGORY_ALIASES[normalizedCategory] || [])]
    : [];

  for (const alias of aliases) {
    const match = thumb
      ? MANIFEST_IMAGES.bucketThumbMap.get(`${alias}:${slug}`) || MANIFEST_IMAGES.bucketMap.get(`${alias}:${slug}`)
      : MANIFEST_IMAGES.bucketMap.get(`${alias}:${slug}`);
    if (match) return match;
  }

  if (thumb) {
    return MANIFEST_IMAGES.slugThumbMap.get(slug) || MANIFEST_IMAGES.slugMap.get(slug) || null;
  }

  return MANIFEST_IMAGES.slugMap.get(slug) || null;
}

export function buildSlugImagePath(category: string, slug: string, thumb = false): string | null {
  const safeCategory = sanitizeSegment(category);
  const safeSlug = sanitizeSegment(slug);
  if (!safeCategory || !safeSlug) return null;
  if (!SAFE_CATEGORY_RE.test(safeCategory) || !SAFE_SLUG_RE.test(safeSlug)) return null;
  return `/images/${safeCategory}/${safeSlug}${thumb ? '-thumb' : ''}.jpg`;
}

export function resolveContentImage(input: ResolveImageInput): string {
  const slug = sanitizeSegment(input.slug || undefined);
  const manifestImage = slug ? resolveManifestImage(input.category, slug, input.thumb === true) : null;
  if (input.preferLocal && manifestImage && publicAssetExists(manifestImage)) {
    return manifestImage;
  }

  const explicit = sanitizeSegment(input.explicit || undefined);
  const allowExternalExplicit = input.allowExternalExplicit !== false;
  const explicitIsAllowed = allowExternalExplicit
    ? isAcceptableExplicit(explicit || '')
    : isLocalExplicit(explicit || '');

  if (explicit && explicitIsAllowed) {
    const trimmedExplicit = input.explicit!.trim();
    // Local path ama dosya yoksa placeholder'a düş — 404 görseli engelle
    if (isLocalExplicit(trimmedExplicit) && input.preferLocal && !publicAssetExists(trimmedExplicit)) {
      // fall through to slug-based or placeholder
    } else {
      return trimmedExplicit;
    }
  }

  if (manifestImage && publicAssetExists(manifestImage)) {
    return manifestImage;
  }

  if (slug) {
    const generated = buildSlugImagePath(input.category, slug, input.thumb === true);
    if (generated && publicAssetExists(generated)) return generated;
    if (generated && !input.preferLocal) return generated;
  }

  return input.placeholder;
}
