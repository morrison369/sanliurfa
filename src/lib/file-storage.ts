/**
 * File storage utility
 * Handles file uploads to local filesystem or cloud storage
 */

import { logger } from './logging';

// Storage configuration
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local' | 's3' | 'supabase'
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads/photos';
const PUBLIC_URL_PREFIX = process.env.PUBLIC_URL || 'http://localhost:3000';

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
    const finalFileName =
      fileName || `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

    // Create full directory path
    const dirPath = path.join(process.cwd(), UPLOAD_DIR, folder);
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
    const publicPath = `/uploads/photos/${folder}/${finalFileName}`;
    const publicUrl = `${PUBLIC_URL_PREFIX}${publicPath}`;

    logger.info('File saved locally', { folder, fileName: finalFileName });

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
 * Save file to AWS S3 (stub - implement as needed)
 */
async function saveFileS3(
  file: File,
  folder: string,
  fileName?: string
): Promise<{ filePath: string; publicUrl: string }> {
  // TODO: Implement S3 upload using AWS SDK
  // const s3 = new AWS.S3();
  // const params = {
  //   Bucket: process.env.S3_BUCKET,
  //   Key: `${folder}/${finalFileName}`,
  //   Body: buffer,
  //   ContentType: file.type,
  //   ACL: 'public-read'
  // };
  // const result = await s3.upload(params).promise();
  // return { filePath: result.Key, publicUrl: result.Location };

  throw new Error('S3 storage not yet implemented');
}

/**
 * Save file to Supabase Storage (stub - implement as needed)
 */
async function saveFileSupabase(
  file: File,
  folder: string,
  fileName?: string
): Promise<{ filePath: string; publicUrl: string }> {
  // TODO: Implement Supabase storage upload
  // const { supabase } = await import('./supabase');
  // const finalFileName = fileName || `${Date.now()}-${file.name}`;
  // const path = `${folder}/${finalFileName}`;
  // const { data, error } = await supabase.storage
  //   .from('place-photos')
  //   .upload(path, file, { cacheControl: '3600' });
  // if (error) throw error;
  // const { data: publicUrlData } = supabase.storage
  //   .from('place-photos')
  //   .getPublicUrl(path);
  // return { filePath: path, publicUrl: publicUrlData.publicUrl };

  throw new Error('Supabase storage not yet implemented');
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

    const fullPath = path.join(process.cwd(), filePath);

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
 * Delete file from S3 (stub)
 */
async function deleteFileS3(filePath: string): Promise<boolean> {
  // TODO: Implement S3 delete
  throw new Error('S3 delete not yet implemented');
}

/**
 * Delete file from Supabase (stub)
 */
async function deleteFileSupabase(filePath: string): Promise<boolean> {
  // TODO: Implement Supabase delete
  throw new Error('Supabase delete not yet implemented');
}
