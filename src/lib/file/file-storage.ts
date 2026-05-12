/**
 * File storage utility
 * Saves uploaded files to local filesystem under public/uploads/
 */

import { randomBytes } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { logger } from '../logger';
import { getPublicAppUrl } from '../public-app-url';
import { sanitizeSlug } from '../security/xss';

/**
 * Dosya adını slug formatına çevirir.
 * 'Şanlıurfa Kalesi.JPG' → 'sanliurfa-kalesi.jpg'
 * - Türkçe karakterler ASCII karşılığına dönüştürülür
 * - Lowercase
 * - Boşluk ve özel karakterler hyphen
 * - Extension korunur (lowercase)
 */
export function slugifyFileName(name: string): string {
  const ext = extname(name).toLowerCase();
  const base = name.slice(0, name.length - ext.length);
  const slug = sanitizeSlug(base);
  return slug ? `${slug}${ext}` : `file${ext}`;
}

const BLOCKED_EXTENSIONS = new Set(['.exe', '.bat', '.sh', '.php', '.js', '.mjs', '.py', '.rb', '.pl', '.html', '.htm', '.svg', '.xml']);

export function validateImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  switch (mimeType) {
    case 'image/jpeg':
      return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    case 'image/png':
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    case 'image/webp':
      return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
             buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    case 'image/gif':
      return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
    default:
      return false;
  }
}

export function validateFileExtension(fileName: string): boolean {
  const ext = extname(fileName).toLowerCase();
  return !BLOCKED_EXTENSIONS.has(ext);
}

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads/photos';
const PUBLIC_URL_PREFIX = getPublicAppUrl();

/**
 * Save a File to the local filesystem and return its public path/URL
 */
export async function saveFile(
  file: File,
  folder: string,
  fileName?: string,
  preReadBuffer?: Buffer,
): Promise<{ filePath: string; publicUrl: string }> {
  // Slug formatına çevir: Türkçe → ASCII, lowercase, hyphen.
  // 'Şanlıurfa Kalesi.JPG' → 'sanliurfa-kalesi.jpg'
  // Final: '<timestamp>-<hex>-sanliurfa-kalesi.jpg'
  const slugified = slugifyFileName(file.name);
  const finalFileName =
    fileName || `${Date.now()}-${randomBytes(6).toString('hex')}-${slugified}`;

  const dirPath = join(process.cwd(), UPLOAD_DIR, folder);
  const fullPath = join(dirPath, finalFileName);

  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }

  const buffer = preReadBuffer ?? Buffer.from(await file.arrayBuffer());
  writeFileSync(fullPath, buffer);

  const publicPath = `/uploads/photos/${folder}/${finalFileName}`;
  logger.info('File saved', { folder, fileName: finalFileName });

  return {
    filePath: publicPath,
    publicUrl: `${PUBLIC_URL_PREFIX}${publicPath}`,
  };
}

/**
 * Delete a file from the local filesystem
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const fullPath = join(process.cwd(), filePath.startsWith('/') ? filePath.slice(1) : filePath);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
      logger.info('File deleted', { filePath });
      return true;
    }
    return false;
  } catch (error) {
    logger.error('File delete failed', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
