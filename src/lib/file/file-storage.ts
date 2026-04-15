/**
 * File storage utility
 * Saves uploaded files to local filesystem under public/uploads/
 */

import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { logger } from '../logger';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads/photos';
const PUBLIC_URL_PREFIX = process.env.PUBLIC_APP_URL || '';

/**
 * Save a File to the local filesystem and return its public path/URL
 */
export async function saveFile(
  file: File,
  folder: string,
  fileName?: string
): Promise<{ filePath: string; publicUrl: string }> {
  const finalFileName =
    fileName || `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const dirPath = join(process.cwd(), UPLOAD_DIR, folder);
  const fullPath = join(dirPath, finalFileName);

  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
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
