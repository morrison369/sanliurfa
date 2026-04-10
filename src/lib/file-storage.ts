/**
 * File storage utility
 * Handles file uploads to local filesystem or cloud storage
 */

import { logger } from './logging';
import { createClient } from '@supabase/supabase-js';

// Storage configuration
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local' | 's3' | 'supabase'
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads/photos';
const PUBLIC_URL_PREFIX = process.env.PUBLIC_SITE_URL || process.env.PUBLIC_URL || 'http://127.0.0.1:1111';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.PUBLIC_SUPABASE_ANON_KEY ||
  '';
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'place-photos';

function sanitizePathSegment(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/\\/g, '/');
  const normalized = trimmed
    .split('/')
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]/g, '-'))
    .filter(Boolean)
    .join('/');

  return normalized || fallback;
}

function buildFileName(file: File, fileName?: string): string {
  const sourceName = fileName || file.name || 'upload.bin';
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${sanitizePathSegment(sourceName, 'upload.bin')}`;
}

function normalizePublicBaseUrl(): string {
  return PUBLIC_URL_PREFIX.replace(/\/$/, '');
}

function normalizeLocalFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.startsWith('uploads/')) {
    return normalized;
  }
  return `uploads/photos/${normalized}`.replace(/\/{2,}/g, '/');
}

function normalizeSupabasePath(filePath: string): string {
  const normalized = filePath.trim();
  const publicPrefix = `/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/`;

  try {
    const asUrl = new URL(normalized);
    const marker = `${publicPrefix}`;
    const markerIndex = asUrl.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return asUrl.pathname.slice(markerIndex + marker.length).replace(/^\/+/, '');
    }
  } catch {
    // filePath is not a URL; continue with string normalization.
  }

  return normalized
    .replace(/^\/+/, '')
    .replace(new RegExp(`^${SUPABASE_STORAGE_BUCKET}/`), '');
}

function getSupabaseStorageClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase storage is not configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

/**
 * Save file and return public URL
 */
export async function saveFile(
  file: File,
  folder: string,
  fileName?: string
): Promise<{ filePath: string; publicUrl: string }> {
  if (STORAGE_TYPE === 'local') {
    return saveFileLocal(file, folder, fileName);
  } else if (STORAGE_TYPE === 's3') {
    return saveFileS3(file, folder, fileName);
  } else if (STORAGE_TYPE === 'supabase') {
    return saveFileSupabase(file, folder, fileName);
  } else {
    throw new Error(`Unknown storage type: ${STORAGE_TYPE}`);
  }
}

/**
 * Save file to local filesystem
 */
async function saveFileLocal(
  file: File,
  folder: string,
  fileName?: string
): Promise<{ filePath: string; publicUrl: string }> {
  try {
    // Dynamic import for Node.js fs module (only in server context)
    const fs = await import('fs');
    const path = await import('path');

    // Generate unique filename if not provided
    const safeFolder = sanitizePathSegment(folder, 'default');
    const finalFileName = buildFileName(file, fileName);

    // Create full directory path
    const dirPath = path.join(process.cwd(), UPLOAD_DIR, safeFolder);
    const filePath = path.join(dirPath, finalFileName);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Write file
    fs.writeFileSync(filePath, buffer);

    // Return public URL
    const publicPath = `/uploads/photos/${safeFolder}/${finalFileName}`;
    const publicUrl = `${normalizePublicBaseUrl()}${publicPath}`;

    logger.info('File saved locally', { folder: safeFolder, fileName: finalFileName });

    return {
      filePath: publicPath,
      publicUrl
    };
  } catch (error) {
    logger.error('Local file save failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Save file to AWS S3
 */
async function saveFileS3(
  file: File,
  folder: string,
  fileName?: string
): Promise<{ filePath: string; publicUrl: string }> {
  throw new Error(
    `S3 storage is not supported by the current runtime surface. Use STORAGE_TYPE=local or STORAGE_TYPE=supabase for ${folder}/${fileName || file.name}.`
  );
}

/**
 * Save file to Supabase Storage
 */
async function saveFileSupabase(
  file: File,
  folder: string,
  fileName?: string
): Promise<{ filePath: string; publicUrl: string }> {
  const supabase = getSupabaseStorageClient();
  const safeFolder = sanitizePathSegment(folder, 'default');
  const finalFileName = buildFileName(file, fileName);
  const storagePath = `${safeFolder}/${finalFileName}`;

  const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).upload(storagePath, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false
  });

  if (error) {
    logger.error('Supabase file save failed', error instanceof Error ? error : new Error(String(error)), {
      bucket: SUPABASE_STORAGE_BUCKET,
      storagePath
    });
    throw error;
  }

  const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(storagePath);

  return {
    filePath: storagePath,
    publicUrl: data.publicUrl
  };
}

/**
 * Delete file
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  if (STORAGE_TYPE === 'local') {
    return deleteFileLocal(filePath);
  } else if (STORAGE_TYPE === 's3') {
    return deleteFileS3(filePath);
  } else if (STORAGE_TYPE === 'supabase') {
    return deleteFileSupabase(filePath);
  }
  return false;
}

/**
 * Delete file from local filesystem
 */
async function deleteFileLocal(filePath: string): Promise<boolean> {
  try {
    const fs = await import('fs');
    const path = await import('path');

    const fullPath = path.join(process.cwd(), 'public', normalizeLocalFilePath(filePath).replace(/^uploads\//, 'uploads/'));

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info('File deleted locally', { filePath });
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Local file delete failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Delete file from S3
 */
async function deleteFileS3(filePath: string): Promise<boolean> {
  throw new Error(`S3 storage delete is not supported by the current runtime surface (${filePath})`);
}

/**
 * Delete file from Supabase
 */
async function deleteFileSupabase(filePath: string): Promise<boolean> {
  try {
    const supabase = getSupabaseStorageClient();
    const normalizedPath = normalizeSupabasePath(filePath);
    const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove([normalizedPath]);

    if (error) {
      logger.error('Supabase file delete failed', error instanceof Error ? error : new Error(String(error)), {
        bucket: SUPABASE_STORAGE_BUCKET,
        filePath: normalizedPath
      });
      return false;
    }

    logger.info('File deleted from Supabase', { bucket: SUPABASE_STORAGE_BUCKET, filePath: normalizedPath });
    return true;
  } catch (error) {
    logger.error('Supabase file delete failed', error instanceof Error ? error : new Error(String(error)), {
      filePath
    });
    return false;
  }
}
