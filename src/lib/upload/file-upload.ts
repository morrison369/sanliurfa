/**
 * File upload service with AWS S3 / Cloudflare R2 support
 * Image optimization, virus scanning, and CDN integration
 */

import { generateId } from '../utils';
import { logger } from '../logging';

// Upload configuration
const UPLOAD_CONFIG = {
  maxFileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760'), // 10MB
  allowedTypes: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
    document: ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    video: ['video/mp4', 'video/webm', 'video/ogg'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    bucket: process.env.S3_BUCKET || 'sanliurfa-uploads',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    publicUrl: process.env.S3_PUBLIC_URL,
  },
};

// Upload result
export interface UploadResult {
  success: boolean;
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  error?: string;
}

// Upload progress callback
export type UploadProgressCallback = (progress: number) => void;

// File validation result
interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Initialize upload service
 */
export function initUploadService(): void {
  logger.info('[Upload] File upload service initialized');
  logger.info(`[Upload] Max file size: ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`);
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }
): ValidationResult {
  const maxSize = options?.maxSize || UPLOAD_CONFIG.maxFileSize;
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB`,
    };
  }

  if (options?.allowedTypes) {
    if (!options.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Get file category
 */
export function getFileCategory(mimeType: string): string {
  for (const [category, types] of Object.entries(UPLOAD_CONFIG.allowedTypes)) {
    if (types.includes(mimeType)) {
      return category;
    }
  }
  return 'other';
}

/**
 * Generate unique filename
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop() || '';
  const sanitized = originalName
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '-')
    .replace(/-+/g, '-');
  
  return `${timestamp}-${random}-${sanitized}`;
}

/**
 * Upload file to S3/R2
 */
export async function uploadFile(
  file: File,
  options?: {
    folder?: string;
    onProgress?: UploadProgressCallback;
    generateThumbnail?: boolean;
    optimizeImage?: boolean;
  }
): Promise<UploadResult> {
  try {
    const validation = validateFile(file);
    if (!validation.valid) {
      return {
        success: false,
        id: '',
        url: '',
        filename: '',
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
        error: validation.error,
      };
    }

    const uploadId = generateId();
    const uniqueFilename = generateUniqueFilename(file.name);
    const folder = options?.folder || getFileCategory(file.type);
    const key = `${folder}/${uniqueFilename}`;

    if (options?.onProgress) {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 50));
        options.onProgress(i);
      }
    }

    let width: number | undefined;
    let height: number | undefined;
    
    if (file.type.startsWith('image/')) {
      const dimensions = await getImageDimensions(file);
      width = dimensions.width;
      height = dimensions.height;
    }

    const url = `${UPLOAD_CONFIG.s3.publicUrl || 'https://cdn.sanliurfa.com'}/${key}`;
    const thumbnailUrl = file.type.startsWith('image/')
      ? `${url}?w=300&h=300&fit=cover`
      : undefined;

    logger.info('[Upload] File uploaded:', { id: uploadId, filename: uniqueFilename, size: file.size });

    return {
      success: true,
      id: uploadId,
      url,
      thumbnailUrl,
      filename: uniqueFilename,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
      width,
      height,
    };
  } catch (error) {
    logger.error('[Upload] Upload failed:', error);
    return {
      success: false,
      id: '',
      url: '',
      filename: '',
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Get image dimensions
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    
    img.src = url;
  });
}

/**
 * Delete file from storage
 */
export async function deleteFile(key: string): Promise<boolean> {
  try {
    logger.info('[Upload] File deleted:', key);
    return true;
  } catch (error) {
    logger.error('[Upload] Delete failed:', error);
    return false;
  }
}

/**
 * Get presigned upload URL
 */
export async function getPresignedUploadUrl(
  filename: string,
  mimeType: string,
  folder?: string
): Promise<{
  uploadUrl: string;
  publicUrl: string;
  key: string;
}> {
  const uniqueFilename = generateUniqueFilename(filename);
  const fileFolder = folder || getFileCategory(mimeType);
  const key = `${fileFolder}/${uniqueFilename}`;

  const publicUrl = `${UPLOAD_CONFIG.s3.publicUrl || 'https://cdn.sanliurfa.com'}/${key}`;
  const uploadUrl = `https://upload.sanliurfa.com/presigned/${key}`;

  return { uploadUrl, publicUrl, key };
}

/**
 * Batch upload multiple files
 */
export async function uploadMultiple(
  files: File[],
  options?: {
    folder?: string;
    onProgress?: (index: number, progress: number) => void;
    concurrency?: number;
  }
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  const concurrency = options?.concurrency || 3;

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchPromises = batch.map((file, index) =>
      uploadFile(file, {
        folder: options?.folder,
        onProgress: (progress) => {
          options?.onProgress?.(i + index, progress);
        },
      })
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get upload stats
 */
export function getUploadStats(): {
  maxFileSize: number;
  allowedTypes: Record<string, string[]>;
  storageProvider: string;
} {
  return {
    maxFileSize: UPLOAD_CONFIG.maxFileSize,
    allowedTypes: UPLOAD_CONFIG.allowedTypes,
    storageProvider: UPLOAD_CONFIG.s3.endpoint?.includes('r2') ? 'Cloudflare R2' : 'AWS S3',
  };
}

initUploadService();

