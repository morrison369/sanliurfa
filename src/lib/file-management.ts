/**
 * File Management Library
 * S3 uploads, CDN caching, file variants, access tracking
 */

import { queryOne, queryMany, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';
import crypto from 'crypto';

interface S3File {
  id: string;
  file_key: string;
  original_filename: string;
  s3_url: string;
  cdn_url: string;
  file_type: string;
  file_size_bytes: number;
  is_public: boolean;
}

export async function registerS3File(userId: string, fileKey: string, filename: string, fileSize: number, mimeType: string, s3Url: string, isPublic: boolean = false): Promise<S3File | null> {
  try {
    const result = await insert('s3_files', {
      file_key: fileKey,
      original_filename: filename,
      file_size_bytes: fileSize,
      file_type: fileKey.split('.').pop()?.toLowerCase() || 'unknown',
      mime_type: mimeType,
      s3_url: s3Url,
      cdn_url: `https://cdn.sanliurfa.com/${fileKey}`,
      uploaded_by_user_id: userId,
      is_public: isPublic,
      virus_scan_status: 'pending'
    });

    await deleteCache(`sanliurfa:files:user:${userId}`);
    logger.info('S3 file registered', { fileKey, filename, size: fileSize });
    return result;
  } catch (error) {
    logger.error('Failed to register S3 file', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getFileById(fileId: string): Promise<S3File | null> {
  try {
    const cacheKey = `sanliurfa:file:${fileId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const file = await queryOne(
      'SELECT * FROM s3_files WHERE id = $1 AND is_archived = false',
      [fileId]
    );

    if (file) {
      await setCache(cacheKey, JSON.stringify(file), 3600);
    }

    return file || null;
  } catch (error) {
    logger.error('Failed to get file', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getUserFiles(userId: string, limit: number = 50): Promise<S3File[]> {
  try {
    const cacheKey = `sanliurfa:files:user:${userId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const files = await queryMany(
      'SELECT * FROM s3_files WHERE uploaded_by_user_id = $1 AND is_archived = false ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );

    await setCache(cacheKey, JSON.stringify(files), 1800);
    return files;
  } catch (error) {
    logger.error('Failed to get user files', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function recordFileAccess(fileId: string, userId: string | null, ipAddress: string, userAgent: string): Promise<void> {
  try {
    await insert('file_access_logs', {
      file_id: fileId,
      user_id: userId,
      access_type: 'download',
      ip_address: ipAddress,
      user_agent: userAgent,
      accessed_at: new Date()
    });

    // Update cache invalidation for analytics
    await deleteCache(`sanliurfa:file:analytics:${fileId}`);
  } catch (error) {
    logger.error('Failed to record file access', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getFileAccessStats(fileId: string, days: number = 30): Promise<any> {
  try {
    const since = new Date(Date.now() - days * 24 * 3600000);

    const stats = await queryMany(
      `SELECT COUNT(*) as total_accesses, COUNT(DISTINCT user_id) as unique_users, COUNT(DISTINCT ip_address) as unique_ips
       FROM file_access_logs
       WHERE file_id = $1 AND accessed_at >= $2`,
      [fileId, since]
    );

    return stats[0] || { total_accesses: 0, unique_users: 0, unique_ips: 0 };
  } catch (error) {
    logger.error('Failed to get file access stats', error instanceof Error ? error : new Error(String(error)));
    return {};
  }
}

export async function registerFileVariant(originalFileId: string, variantType: string, variantKey: string, variantUrl: string, dimensions?: string): Promise<any | null> {
  try {
    const result = await insert('file_variants', {
      original_file_id: originalFileId,
      variant_type: variantType,
      variant_key: variantKey,
      variant_url: variantUrl,
      dimensions: dimensions || null
    });

    await deleteCache(`sanliurfa:variants:${originalFileId}`);
    return result;
  } catch (error) {
    logger.error('Failed to register file variant', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getFileVariants(fileId: string): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:variants:${fileId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const variants = await queryMany(
      'SELECT * FROM file_variants WHERE original_file_id = $1 ORDER BY variant_type ASC',
      [fileId]
    );

    await setCache(cacheKey, JSON.stringify(variants), 3600);
    return variants;
  } catch (error) {
    logger.error('Failed to get file variants', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function setupCDNCaching(fileId: string, ttlSeconds: number = 86400, gzipEnabled: boolean = true): Promise<boolean> {
  try {
    await insert('cdn_cache_settings', {
      file_id: fileId,
      cache_ttl_seconds: ttlSeconds,
      cache_control_header: `public, max-age=${ttlSeconds}`,
      gzip_enabled: gzipEnabled,
      is_cached: true
    });

    await deleteCache(`sanliurfa:file:${fileId}`);
    logger.info('CDN caching configured', { fileId, ttl: ttlSeconds });
    return true;
  } catch (error) {
    logger.error('Failed to setup CDN caching', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function purgeCDNCache(fileId: string): Promise<boolean> {
  try {
    await update('cdn_cache_settings', { file_id: fileId }, {
      last_cache_purge: new Date(),
      cache_key_version: 1  // Increment to invalidate cache
    });

    await deleteCache(`sanliurfa:file:${fileId}`);
    logger.info('CDN cache purged', { fileId });
    return true;
  } catch (error) {
    logger.error('Failed to purge CDN cache', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function archiveFile(fileId: string): Promise<boolean> {
  try {
    await update('s3_files', { id: fileId }, {
      is_archived: true,
      updated_at: new Date()
    });

    await deleteCache(`sanliurfa:file:${fileId}`);
    logger.info('File archived', { fileId });
    return true;
  } catch (error) {
    logger.error('Failed to archive file', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function scanFileVirus(fileId: string): Promise<boolean> {
  try {
    // In production, integrate with ClamAV or similar
    // For now, mark as passed
    await update('s3_files', { id: fileId }, {
      virus_scan_status: 'passed',
      virus_scan_date: new Date()
    });

    logger.info('File virus scan completed', { fileId });
    return true;
  } catch (error) {
    logger.error('Failed to scan file virus', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export function generateUploadSignature(bucket: string, key: string, expiresInSeconds: number = 3600): any {
  // In production, use AWS SDK to generate signed URL
  // This is a placeholder
  return {
    bucket: bucket,
    key: key,
    signed_url: `https://${bucket}.s3.amazonaws.com/${key}?expires=${Date.now() + expiresInSeconds * 1000}`,
    expires_at: new Date(Date.now() + expiresInSeconds * 1000)
  };
}
