import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { logger } from '../../lib/logging';
import {
  getPublicUploadContentType,
  getPublicUploadResponseMetadata,
  isPublicUploadNotModified,
  PUBLIC_UPLOAD_CACHE_CONTROL,
} from '../../lib/uploads/public-upload-serving';

export const prerender = false;

function createHeaders(
  pathname: string,
  metadata: { size: number; etag: string; lastModified: string },
) {
  return {
    'Cache-Control': PUBLIC_UPLOAD_CACHE_CONTROL,
    'Content-Length': String(metadata.size),
    'Content-Type': getPublicUploadContentType(pathname),
    ETag: metadata.etag,
    'Last-Modified': metadata.lastModified,
  };
}

async function serveUpload(request: Request, pathname: string, includeBody: boolean) {
  const metadata = getPublicUploadResponseMetadata(pathname);
  if (!metadata) {
    return new Response('Not found', {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  const headers = createHeaders(pathname, metadata);
  if (isPublicUploadNotModified(request.headers, metadata)) {
    return new Response(null, {
      status: 304,
      headers,
    });
  }

  if (!includeBody) {
    return new Response(null, { headers });
  }

  try {
    const body = await readFile(metadata.diskPath);
    return new Response(body, { headers });
  } catch (error) {
    logger.error('Public upload read failed', error instanceof Error ? error : new Error(String(error)));
    return new Response('Upload read failed', {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}

export const GET: APIRoute = async ({ request, params }) => serveUpload(request, params.path ?? '', true);

export const HEAD: APIRoute = async ({ request, params }) => serveUpload(request, params.path ?? '', false);
