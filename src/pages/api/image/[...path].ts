import type { APIRoute } from 'astro';
import { logger } from '../../../lib/logging';
import {
  isPublicUploadPath,
  OPTIMIZED_STATIC_IMAGE_CACHE_CONTROL,
  PUBLIC_UPLOAD_CACHE_CONTROL,
} from '../../../lib/http/cache-policies';
import {
  type ImageFormat,
  type OptimizeOptions,
  generateCacheKey,
  getOptimalFormat,
  parseSize,
  calculateDimensions,
  getFromCache,
  storeInCache,
  getContentType,
  validateImageSource,
  optimizeImage,
  getImageMetadata,
} from '../../../lib/image-optimizer';

type ImageFit = Exclude<OptimizeOptions['fit'], undefined>;

const DEFAULT_IMAGE_QUALITY = 80;

const parseNumber = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseImageFit = (value: string | null): ImageFit | undefined => {
  if (!value) return undefined;
  return value === 'cover' ||
    value === 'contain' ||
    value === 'fill' ||
    value === 'inside' ||
    value === 'outside'
    ? value
    : undefined;
};

const parseImageFormat = (value: string | null, acceptHeader: string): ImageFormat => {
  if (value === 'webp' || value === 'jpeg' || value === 'png' || value === 'avif') {
    return value;
  }

  return getOptimalFormat(acceptHeader);
};

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const url = new URL(request.url);
    const imagePath = params.path || '';
    
    // Validate source
    if (!validateImageSource(imagePath)) {
      return new Response('Invalid image source', { status: 400 });
    }
    
    // Parse options from query params
    const width = parseNumber(url.searchParams.get('w'));
    const height = parseNumber(url.searchParams.get('h'));
    const size = url.searchParams.get('size');
    const quality = parseNumber(url.searchParams.get('q')) || DEFAULT_IMAGE_QUALITY;
    const fit = parseImageFit(url.searchParams.get('fit'));
    
    // Get optimal format from Accept header
    const acceptHeader = request.headers.get('accept') || '';
    const format = parseImageFormat(url.searchParams.get('f'), acceptHeader);
    
    // Handle size preset
    let targetWidth = width;
    let targetHeight = height;
    
    if (size) {
      const dimensions = parseSize(size);
      if (dimensions) {
        targetWidth = dimensions.width;
        targetHeight = dimensions.height;
      }
    }
    
    // Read image from local disk (public/uploads/photos/...)
    const { readFileSync, existsSync, statSync } = await import('fs');
    const { join, resolve, sep } = await import('path');

    // imagePath is something like "photos/places/some-file.jpg"
    // Serve from public/ directory
    const safePath = imagePath.replace(/\.\./g, '').replace(/^\//, '');
    const publicRoot = resolve(join(process.cwd(), 'public'));
    const diskPath = resolve(join(publicRoot, safePath));

    // HARD RULE #3 defense-in-depth: containment check after resolve()
    if (!diskPath.startsWith(publicRoot + sep) && diskPath !== publicRoot) {
      return new Response('Invalid image path', { status: 400 });
    }

    if (!existsSync(diskPath)) {
      return new Response('Image not found', { status: 404 });
    }

    const sourceStat = statSync(diskPath);
    const cacheKey = generateCacheKey(`${safePath}@${sourceStat.size}:${Math.trunc(sourceStat.mtimeMs)}`, {
      format,
      quality,
      ...(targetWidth !== undefined ? { width: targetWidth } : {}),
      ...(targetHeight !== undefined ? { height: targetHeight } : {}),
      ...(fit ? { fit } : {}),
    });
    const responseCacheControl = isPublicUploadPath(safePath)
      ? PUBLIC_UPLOAD_CACHE_CONTROL
      : OPTIMIZED_STATIC_IMAGE_CACHE_CONTROL;

    // Check cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      return new Response(cached.buffer as BodyInit, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': responseCacheControl,
          'X-Cache': 'HIT',
        },
      });
    }

    const sourceBuffer = readFileSync(diskPath);

    // Get image metadata
    const metadata = await getImageMetadata(sourceBuffer);

    // Calculate dimensions
    const dimensions = calculateDimensions(
      metadata.width,
      metadata.height,
      targetWidth,
      targetHeight,
      fit
    );

    // Optimize image
    const optimizedBuffer = await optimizeImage(sourceBuffer, {
      width: dimensions.width,
      height: dimensions.height,
      format,
      quality,
      ...(fit ? { fit } : {}),
    });
    
    // Store in cache
    const contentType = getContentType(format);
    storeInCache(cacheKey, {
      buffer: optimizedBuffer,
      contentType,
      timestamp: Date.now(),
      size: optimizedBuffer.length,
    });
    
    // Return optimized image
    return new Response(optimizedBuffer as BodyInit, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': responseCacheControl,
        'X-Cache': 'MISS',
        'X-Image-Width': dimensions.width.toString(),
        'X-Image-Height': dimensions.height.toString(),
      },
    });
  } catch (error) {
    logger.error('Image optimization error:', error);
    return new Response('Image processing failed', { status: 500 });
  }
};

// OPTIONS for CORS
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Accept-Encoding',
    },
  });
};

