import { existsSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

export { PUBLIC_UPLOAD_CACHE_CONTROL } from '../http/cache-policies';

const PUBLIC_UPLOADS_ROOT = resolve(process.cwd(), 'public', 'uploads');

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

export function getPublicUploadsRoot(): string {
  return PUBLIC_UPLOADS_ROOT;
}

export function normalizePublicUploadRequestPath(pathname: string): string {
  return String(pathname ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\0/g, '')
    .split('/')
    .filter(Boolean)
    .join('/');
}

export function resolvePublicUploadPath(pathname: string): string | null {
  const normalized = normalizePublicUploadRequestPath(pathname);
  if (!normalized) {
    return null;
  }

  const candidate = resolve(join(PUBLIC_UPLOADS_ROOT, normalized));
  if (!candidate.startsWith(PUBLIC_UPLOADS_ROOT + sep)) {
    return null;
  }

  return candidate;
}

export function getPublicUploadFileInfo(pathname: string): { diskPath: string; size: number } | null {
  const diskPath = resolvePublicUploadPath(pathname);
  if (!diskPath || !existsSync(diskPath)) {
    return null;
  }

  const stat = statSync(diskPath);
  if (!stat.isFile()) {
    return null;
  }

  return {
    diskPath,
    size: stat.size,
  };
}

export function getPublicUploadContentType(pathname: string): string {
  return CONTENT_TYPES[extname(pathname).toLowerCase()] || 'application/octet-stream';
}

export function createPublicUploadEntityTag(size: number, mtimeMs: number): string {
  return `W/"${size.toString(16)}-${Math.trunc(mtimeMs).toString(16)}"`;
}

export function getPublicUploadResponseMetadata(pathname: string): {
  diskPath: string;
  size: number;
  mtimeMs: number;
  lastModified: string;
  etag: string;
} | null {
  const diskPath = resolvePublicUploadPath(pathname);
  if (!diskPath || !existsSync(diskPath)) {
    return null;
  }

  const stat = statSync(diskPath);
  if (!stat.isFile()) {
    return null;
  }

  return {
    diskPath,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    lastModified: stat.mtime.toUTCString(),
    etag: createPublicUploadEntityTag(stat.size, stat.mtimeMs),
  };
}

export function isPublicUploadNotModified(
  headers: Pick<Headers, 'get'>,
  metadata: { etag: string; mtimeMs: number },
): boolean {
  const ifNoneMatch = headers.get('if-none-match');
  if (ifNoneMatch) {
    const candidates = ifNoneMatch.split(',').map((value) => value.trim());
    if (candidates.includes('*') || candidates.includes(metadata.etag)) {
      return true;
    }
  }

  const ifModifiedSince = headers.get('if-modified-since');
  if (!ifModifiedSince) {
    return false;
  }

  const modifiedSinceMs = Date.parse(ifModifiedSince);
  if (!Number.isFinite(modifiedSinceMs)) {
    return false;
  }

  return Math.trunc(metadata.mtimeMs / 1000) * 1000 <= modifiedSinceMs;
}
