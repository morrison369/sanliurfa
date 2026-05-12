/**
 * Image optimization utilities
 * Handles resizing, format conversion, and caching
 */

import sharp from 'sharp';

// Supported image formats
export type ImageFormat = 'webp' | 'jpeg' | 'png' | 'avif';

// Image size presets
export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 200 },
  medium: { width: 600, height: 400 },
  large: { width: 1200, height: 800 },
  hero: { width: 1920, height: 1080 },
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

// Image optimization options
export interface OptimizeOptions {
  width?: number;
  height?: number;
  format?: ImageFormat;
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

// Cache entry
interface CacheEntry {
  buffer: Buffer;
  contentType: string;
  timestamp: number;
  size: number;
}

// In-memory cache (use Redis in production)
const imageCache: Map<string, CacheEntry> = new Map();
const CACHE_MAX_SIZE = 100 * 1024 * 1024; // 100MB
const CACHE_MAX_ENTRIES = 1000;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let currentCacheSize = 0;

/**
 * Generate cache key for image
 */
export function generateCacheKey(
  src: string,
  options: OptimizeOptions
): string {
  const params = new URLSearchParams();
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.format) params.set('f', options.format);
  if (options.quality) params.set('q', options.quality.toString());
  if (options.fit) params.set('fit', options.fit);
  
  return `${src}?${params.toString()}`;
}

/**
 * Get optimal format based on Accept header
 */
export function getOptimalFormat(acceptHeader: string): ImageFormat {
  if (acceptHeader.includes('image/avif')) return 'avif';
  if (acceptHeader.includes('image/webp')) return 'webp';
  return 'jpeg';
}

/**
 * Parse size parameter
 */
export function parseSize(size: string): { width: number; height: number } | null {
  if (size in IMAGE_SIZES) {
    return IMAGE_SIZES[size as ImageSize];
  }
  
  // Parse custom size (e.g., "800x600")
  const match = size.match(/^(\d+)x(\d+)$/);
  if (match) {
    return {
      width: parseInt(match[1], 10),
      height: parseInt(match[2], 10),
    };
  }
  
  return null;
}

/**
 * Calculate dimensions maintaining aspect ratio
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
  targetHeight?: number,
  fit: OptimizeOptions['fit'] = 'inside'
): { width: number; height: number } {
  if (!targetWidth && !targetHeight) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const aspectRatio = originalWidth / originalHeight;
  
  if (targetWidth && !targetHeight) {
    return {
      width: targetWidth,
      height: Math.round(targetWidth / aspectRatio),
    };
  }
  
  if (!targetWidth && targetHeight) {
    return {
      width: Math.round(targetHeight * aspectRatio),
      height: targetHeight,
    };
  }
  
  // Both dimensions provided
  if (fit === 'cover') {
    const targetRatio = targetWidth! / targetHeight!;
    if (aspectRatio > targetRatio) {
      return {
        width: Math.round(targetHeight! * aspectRatio),
        height: targetHeight!,
      };
    } else {
      return {
        width: targetWidth!,
        height: Math.round(targetWidth! / aspectRatio),
      };
    }
  }
  
  if (fit === 'contain' || fit === 'inside') {
    const targetRatio = targetWidth! / targetHeight!;
    if (aspectRatio > targetRatio) {
      return {
        width: targetWidth!,
        height: Math.round(targetWidth! / aspectRatio),
      };
    } else {
      return {
        width: Math.round(targetHeight! * aspectRatio),
        height: targetHeight!,
      };
    }
  }
  
  return { width: targetWidth!, height: targetHeight! };
}

/**
 * Get image from cache
 */
export function getFromCache(key: string): CacheEntry | null {
  const entry = imageCache.get(key);
  
  if (!entry) return null;
  
  // Check TTL
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    imageCache.delete(key);
    currentCacheSize -= entry.size;
    return null;
  }
  
  return entry;
}

/**
 * Store image in cache
 */
export function storeInCache(key: string, entry: CacheEntry): void {
  // Check if adding this would exceed max size
  if (currentCacheSize + entry.size > CACHE_MAX_SIZE) {
    evictLRU();
  }
  
  // Check max entries
  if (imageCache.size >= CACHE_MAX_ENTRIES) {
    evictLRU();
  }
  
  imageCache.set(key, entry);
  currentCacheSize += entry.size;
}

/**
 * Evict least recently used entries
 */
function evictLRU(): void {
  const entries = Array.from(imageCache.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
  
  // Remove oldest 10%
  const toRemove = Math.ceil(entries.length * 0.1);
  for (let i = 0; i < toRemove; i++) {
    const [key, entry] = entries[i];
    imageCache.delete(key);
    currentCacheSize -= entry.size;
  }
}

/**
 * Clear image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
  currentCacheSize = 0;
}

/**
 * Get cache stats
 */
export function getCacheStats(): {
  entries: number;
  size: number;
  maxSize: number;
} {
  return {
    entries: imageCache.size,
    size: currentCacheSize,
    maxSize: CACHE_MAX_SIZE,
  };
}

/**
 * Generate responsive srcset
 */
export function generateSrcSet(
  src: string,
  widths: number[],
  format?: ImageFormat
): string {
  return widths
    .map((width) => {
      const params = new URLSearchParams();
      params.set('w', width.toString());
      if (format) params.set('f', format);
      return `${src}?${params.toString()} ${width}w`;
    })
    .join(', ');
}

/**
 * Generate sizes attribute
 */
export function generateSizes(breakpoints: Record<string, number>): string {
  return Object.entries(breakpoints)
    .map(([breakpoint, width]) => {
      if (breakpoint === 'default') return `${width}px`;
      return `(max-width: ${breakpoint}) ${width}px`;
    })
    .join(', ');
}

/**
 * Validate image source
 */
export function validateImageSource(src: string): boolean {
  // Check for path traversal
  if (src.includes('..') || src.startsWith('/')) {
    return false;
  }
  
  // Check allowed extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];
  const hasValidExtension = allowedExtensions.some((ext) =>
    src.toLowerCase().endsWith(ext)
  );
  
  return hasValidExtension;
}

/**
 * Get content type for format
 */
export function getContentType(format: ImageFormat): string {
  const types: Record<ImageFormat, string> = {
    webp: 'image/webp',
    jpeg: 'image/jpeg',
    png: 'image/png',
    avif: 'image/avif',
  };
  
  return types[format] || 'image/jpeg';
}

/**
 * Optimize image using sharp
 */
export async function optimizeImage(
  buffer: Buffer,
  options: OptimizeOptions
): Promise<Buffer> {
  let pipeline = sharp(buffer);

  if (options.width || options.height) {
    pipeline = pipeline.resize(options.width, options.height, {
      fit: (options.fit as any) || 'cover',
      position: options.position || 'center',
    });
  }

  const quality = options.quality || 80;
  const format = options.format || 'webp';
  pipeline = pipeline.toFormat(format as any, { quality });

  return pipeline.toBuffer();
}

/**
 * Generate a simple base64 low-res placeholder (10px wide)
 */
export async function generateBlurHash(buffer: Buffer): Promise<string> {
  try {
    const small = await sharp(buffer)
      .resize(10, 10, { fit: 'inside' })
      .toFormat('jpeg', { quality: 40 })
      .toBuffer();
    return `data:image/jpeg;base64,${small.toString('base64')}`;
  } catch {
    return 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
  }
}

/**
 * Get image metadata using sharp
 */
export async function getImageMetadata(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
}> {
  try {
    const meta = await sharp(buffer).metadata();
    return {
      width: meta.width || 0,
      height: meta.height || 0,
      format: meta.format || 'unknown',
      size: buffer.length,
    };
  } catch {
    return { width: 0, height: 0, format: 'unknown', size: buffer.length };
  }
}

/**
 * Create image URL with optimization params
 */
export function createImageUrl(
  src: string,
  options: OptimizeOptions
): string {
  const params = new URLSearchParams();
  
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.format) params.set('f', options.format);
  if (options.quality) params.set('q', options.quality.toString());
  
  return `/api/image/${src}?${params.toString()}`;
}

/**
 * Preload critical images
 */
export function getPreloadLinks(images: string[]): string {
  return images
    .map((src) => `<link rel="preload" href="${src}" as="image" />`)
    .join('\n');
}
