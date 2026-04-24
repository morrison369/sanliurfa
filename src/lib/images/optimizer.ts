/**
 * Image Optimization
 * Compression, resizing, and format conversion
 */

import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, extname, basename } from 'path';
import sharp from 'sharp';

interface OptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

interface OptimizedImage {
  path: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

const UPLOAD_DIR = './public/uploads';
const CACHE_DIR = './.cache/images';

/**
 * Get optimized image path
 */
export function getOptimizedPath(
  originalPath: string,
  options: OptimizeOptions
): string {
  const dir = dirname(originalPath);
  const base = basename(originalPath, extname(originalPath));
  const size = options.width ? `-${options.width}w` : '';
  const format = options.format ? `.${options.format}` : extname(originalPath);
  
  return join(CACHE_DIR, dir.replace('./public/', ''), `${base}${size}${format}`);
}

/**
 * Check if optimized version exists
 */
export function hasOptimizedVersion(optimizedPath: string): boolean {
  return existsSync(optimizedPath);
}

/**
 * Optimize image using sharp
 */
export async function optimizeImage(
  inputPath: string,
  outputPath: string,
  options: OptimizeOptions
): Promise<OptimizedImage> {
  await mkdir(dirname(outputPath), { recursive: true });

  let pipeline = sharp(inputPath);

  if (options.width || options.height) {
    pipeline = pipeline.resize(options.width, options.height, {
      fit: (options.fit as any) || 'cover',
    });
  }

  const format = options.format || 'webp';
  pipeline = pipeline.toFormat(format as any, { quality: options.quality || 80 });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  await writeFile(outputPath, data);

  return {
    path: outputPath.replace('./public', ''),
    width: info.width,
    height: info.height,
    format: info.format,
    size: info.size,
  };
}

/**
 * Generate responsive image srcset
 */
export async function generateSrcSet(
  imagePath: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): Promise<{ srcset: string; sizes: string }> {
  const entries: string[] = [];
  
  for (const width of widths) {
    const optimized = getOptimizedPath(imagePath, { width, format: 'webp' });
    
    if (!hasOptimizedVersion(optimized)) {
      try {
        await optimizeImage(imagePath, optimized, { width, format: 'webp' });
      } catch {
        continue;
      }
    }
    
    entries.push(`${optimized.replace('./public', '')} ${width}w`);
  }
  
  return {
    srcset: entries.join(', '),
    sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  };
}

/**
 * Get placeholder for lazy loading
 */
export async function getPlaceholder(imagePath: string): Promise<string> {
  // Generate a tiny blur-up placeholder
  const placeholderPath = getOptimizedPath(imagePath, { width: 20, format: 'webp' });
  
  if (!hasOptimizedVersion(placeholderPath)) {
    await optimizeImage(imagePath, placeholderPath, { width: 20, format: 'webp', quality: 20 });
  }
  
  // Return as base64 data URL
  try {
    const buffer = await readFile(placeholderPath);
    return `data:image/webp;base64,${buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

/**
 * Image metadata
 */
export interface ImageMetadata {
  src: string;
  width: number;
  height: number;
  format: string;
  placeholder?: string;
  srcset?: string;
  sizes?: string;
}

/**
 * Get optimized image with all variants
 */
export async function getOptimizedImage(
  imagePath: string,
  options: OptimizeOptions = {}
): Promise<ImageMetadata> {
  const fullPath = join('./public', imagePath);
  
  // Generate main optimized version
  const optimizedPath = getOptimizedPath(fullPath, options);
  
  if (!hasOptimizedVersion(optimizedPath)) {
    await optimizeImage(fullPath, optimizedPath, options);
  }
  
  // Generate srcset for responsive images
  const { srcset, sizes } = await generateSrcSet(fullPath);
  
  // Get placeholder
  const placeholder = await getPlaceholder(fullPath);
  
  return {
    src: optimizedPath.replace('./public', ''),
    width: options.width || 800,
    height: options.height || 600,
    format: options.format || 'webp',
    placeholder,
    srcset,
    sizes,
  };
}

/**
 * Validate image upload
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Sadece JPEG, PNG, WebP ve GIF dosyaları yüklenebilir' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'Dosya boyutu 5MB\'dan küçük olmalıdır' };
  }
  
  return { valid: true };
}

/**
 * Process uploaded image
 */
export async function processUpload(
  file: Buffer,
  filename: string,
  _options: OptimizeOptions = {}
): Promise<OptimizedImage> {
  const uploadPath = join(UPLOAD_DIR, filename);
  
  // Ensure upload directory exists
  await mkdir(dirname(uploadPath), { recursive: true });
  
  // Save original
  await writeFile(uploadPath, file);
  
  // Create optimized versions
  const variants: OptimizedImage[] = [];
  const sizes = [800, 1200, 1600];
  
  for (const width of sizes) {
    const optimizedPath = getOptimizedPath(uploadPath, { width, format: 'webp' });
    const variant = await optimizeImage(uploadPath, optimizedPath, {
      width,
      format: 'webp',
      quality: 85,
    });
    variants.push(variant);
  }
  
  return variants[0]; // Return medium size as default
}
