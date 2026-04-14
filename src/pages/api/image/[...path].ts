// @ts-nocheck
import type { APIRoute } from 'astro';
import {
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
  IMAGE_SIZES,
} from '../../../lib/image-optimizer';

export const GET: APIRoute = async ({ request, params }) => {
  try {
    const url = new URL(request.url);
    const imagePath = params.path?.join('/') || '';
    
    // Validate source
    if (!validateImageSource(imagePath)) {
      return new Response('Invalid image source', { status: 400 });
    }
    
    // Parse options from query params
    const width = url.searchParams.get('w')
      ? parseInt(url.searchParams.get('w')!)
      : undefined;
    const height = url.searchParams.get('h')
      ? parseInt(url.searchParams.get('h')!)
      : undefined;
    const size = url.searchParams.get('size') || undefined;
    const quality = url.searchParams.get('q')
      ? parseInt(url.searchParams.get('q')!)
      : 80;
    const fit = (url.searchParams.get('fit') as any) || 'inside';
    
    // Get optimal format from Accept header
    const acceptHeader = request.headers.get('accept') || '';
    const format = url.searchParams.get('f') || getOptimalFormat(acceptHeader);
    
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
    
    // Generate cache key
    const cacheKey = generateCacheKey(imagePath, {
      width: targetWidth,
      height: targetHeight,
      format: format as any,
      quality,
      fit,
    });
    
    // Check cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      return new Response(cached.buffer, {
        headers: {
          'Content-Type': cached.contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': 'HIT',
        },
      });
    }
    
    // In production, fetch actual image from storage
    // For now, return a placeholder response
    const placeholderBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    // Get image metadata
    const metadata = await getImageMetadata(placeholderBuffer);
    
    // Calculate dimensions
    const dimensions = calculateDimensions(
      metadata.width,
      metadata.height,
      targetWidth,
      targetHeight,
      fit
    );
    
    // Optimize image
    const optimizedBuffer = await optimizeImage(placeholderBuffer, {
      width: dimensions.width,
      height: dimensions.height,
      format: format as any,
      quality,
      fit,
    });
    
    // Store in cache
    const contentType = getContentType(format as any);
    storeInCache(cacheKey, {
      buffer: optimizedBuffer,
      contentType,
      timestamp: Date.now(),
      size: optimizedBuffer.length,
    });
    
    // Return optimized image
    return new Response(optimizedBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'MISS',
        'X-Image-Width': dimensions.width.toString(),
        'X-Image-Height': dimensions.height.toString(),
      },
    });
  } catch (error) {
    console.error('Image optimization error:', error);
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
