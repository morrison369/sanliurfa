/**
 * Sharp Image Optimizer
 * Production-ready image processing with Sharp
 */

import type { OptimizeOptions, OptimizedImage, ImageMetadata } from './optimizer';

// Sharp will be dynamically imported to avoid issues when not installed
let sharp: any;

async function getSharp() {
  if (!sharp) {
    try {
      sharp = (await import('sharp')).default;
    } catch (error) {
      console.warn('Sharp not installed, using fallback');
      return null;
    }
  }
  return sharp;
}

interface SharpOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Optimize image using Sharp
 */
export async function optimizeWithSharp(
  inputBuffer: Buffer,
  options: SharpOptions
): Promise<{ buffer: Buffer; info: { width: number; height: number; size: number } } | null> {
  const s = await getSharp();
  if (!s) return null;

  try {
    let pipeline = s(inputBuffer);

    // Resize if dimensions specified
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: options.fit || 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert format
    switch (options.format) {
      case 'webp':
        pipeline = pipeline.webp({ quality: options.quality || 80 });
        break;
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality: options.quality || 85, progressive: true });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: options.quality || 90 });
        break;
      case 'avif':
        pipeline = pipeline.avif({ quality: options.quality || 75 });
        break;
    }

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    
    return {
      buffer: data,
      info: {
        width: info.width,
        height: info.height,
        size: data.length,
      },
    };
  } catch (error) {
    console.error('Sharp optimization error:', error);
    return null;
  }
}

/**
 * Generate multiple image variants
 */
export async function generateImageVariants(
  inputBuffer: Buffer,
  baseName: string
): Promise<OptimizedImage[]> {
  const s = await getSharp();
  if (!s) {
    // Fallback: return original
    return [{
      path: `${baseName}.original`,
      width: 0,
      height: 0,
      format: 'original',
      size: inputBuffer.length,
    }];
  }

  const variants: OptimizedImage[] = [];
  const sizes = [
    { width: 320, suffix: 'sm' },
    { width: 640, suffix: 'md' },
    { width: 960, suffix: 'lg' },
    { width: 1280, suffix: 'xl' },
    { width: 1920, suffix: '2xl' },
  ];
  const formats: ('webp' | 'jpeg')[] = ['webp', 'jpeg'];

  for (const size of sizes) {
    for (const format of formats) {
      const result = await optimizeWithSharp(inputBuffer, {
        width: size.width,
        format,
        quality: format === 'webp' ? 80 : 85,
      });

      if (result) {
        variants.push({
          path: `${baseName}-${size.suffix}.${format}`,
          width: result.info.width,
          height: result.info.height,
          format,
          size: result.info.size,
        });
      }
    }
  }

  return variants;
}

/**
 * Create blur placeholder
 */
export async function createBlurPlaceholder(inputBuffer: Buffer): Promise<string | null> {
  const s = await getSharp();
  if (!s) return null;

  try {
    const { data } = await s(inputBuffer)
      .resize(20, 20, { fit: 'inside' })
      .blur()
      .webp({ quality: 20 })
      .toBuffer();

    return `data:image/webp;base64,${data.toString('base64')}`;
  } catch (error) {
    console.error('Blur placeholder error:', error);
    return null;
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(inputBuffer: Buffer): Promise<{ width: number; height: number } | null> {
  const s = await getSharp();
  if (!s) return null;

  try {
    const metadata = await s(inputBuffer).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
    return null;
  } catch (error) {
    console.error('Metadata error:', error);
    return null;
  }
}

/**
 * Process uploaded image with Sharp
 */
export async function processImageUpload(
  file: Buffer,
  filename: string
): Promise<{ variants: OptimizedImage[]; placeholder?: string } | null> {
  const variants = await generateImageVariants(file, filename);
  const placeholder = await createBlurPlaceholder(file);
  
  return { variants, placeholder };
}
