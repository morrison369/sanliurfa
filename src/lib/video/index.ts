/**
 * Video Processing & Streaming
 * Task 126: Video Processing
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface VideoUpload {
  id: string;
  placeId: string;
  userId: string;
  originalUrl: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  variants: VideoVariant[];
  duration: number;
  thumbnailUrl?: string;
  createdAt: Date;
}

export interface VideoVariant {
  quality: '240p' | '360p' | '480p' | '720p' | '1080p';
  url: string;
  width: number;
  height: number;
  bitrate: number;
  size: number;
}

// Video processing configuration
const VIDEO_CONFIG = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedFormats: ['mp4', 'mov', 'webm'],
  variants: [
    { quality: '1080p' as const, width: 1920, height: 1080, bitrate: 4000000 },
    { quality: '720p' as const, width: 1280, height: 720, bitrate: 2500000 },
    { quality: '480p' as const, width: 854, height: 480, bitrate: 1000000 },
    { quality: '360p' as const, width: 640, height: 360, bitrate: 500000 },
  ],
};

/**
 * Upload and process video
 */
export async function uploadVideo(
  file: Buffer,
  metadata: { placeId: string; userId: string; filename: string }
): Promise<VideoUpload> {
  const id = generateId();
  
  // Validate
  if (file.length > VIDEO_CONFIG.maxFileSize) {
    throw new Error('Dosya boyutu 100MB dan büyük olamaz');
  }

  const ext = metadata.filename.split('.').pop()?.toLowerCase();
  if (!ext || !VIDEO_CONFIG.allowedFormats.includes(ext)) {
    throw new Error('Desteklenmeyen video formatı');
  }

  const upload: VideoUpload = {
    id,
    placeId: metadata.placeId,
    userId: metadata.userId,
    originalUrl: `/uploads/videos/original/${id}.${ext}`,
    status: 'uploading',
    variants: [],
    duration: 0,
    createdAt: new Date(),
  };

  await db.execute(sql`
    INSERT INTO videos (id, place_id, user_id, original_url, status, variants, duration, created_at)
    VALUES (${upload.id}, ${upload.placeId}, ${upload.userId}, ${upload.originalUrl}, ${upload.status}, '[]', ${upload.duration}, ${upload.createdAt})
  `);

  // Queue for processing
  await queueVideoProcessing(id, file);

  return upload;
}

/**
 * Queue video processing job
 */
async function queueVideoProcessing(videoId: string, file: Buffer): Promise<void> {
  await db.execute(sql`
    INSERT INTO video_processing_queue (id, video_id, status, created_at)
    VALUES (${generateId()}, ${videoId}, 'pending', ${new Date()})
  `);

  // In production, this would trigger a background worker
  console.log(`[Video] Queued processing for ${videoId}`);
}

/**
 * Get video with optimal variant for user's connection
 */
export async function getVideoForPlayback(
  videoId: string,
  options: { maxQuality?: string; bandwidth?: number }
): Promise<VideoUpload | null> {
  const result = await db.execute(sql`SELECT * FROM videos WHERE id = ${videoId}`);
  if (!result.rows[0]) return null;

  const video = mapVideoFromRow(result.rows[0]);

  // Select best variant based on bandwidth
  if (options.bandwidth && video.variants.length > 0) {
    const suitableVariant = video.variants
      .filter(v => v.bitrate <= options.bandwidth! * 0.8)
      .sort((a, b) => b.bitrate - a.bitrate)[0];
    
    if (suitableVariant) {
      video.variants = [suitableVariant, ...video.variants.filter(v => v !== suitableVariant)];
    }
  }

  return video;
}

/**
 * Generate HLS playlist
 */
export function generateHLSPlaylist(video: VideoUpload): string {
  const lines = ['#EXTM3U'];
  
  for (const variant of video.variants) {
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${variant.bitrate},RESOLUTION=${variant.width}x${variant.height}`);
    lines.push(variant.url.replace('.mp4', '.m3u8'));
  }

  return lines.join('\n');
}

/**
 * Get video thumbnail
 */
export async function getVideoThumbnail(videoId: string, time?: number): Promise<string | null> {
  const result = await db.execute(sql`SELECT thumbnail_url FROM videos WHERE id = ${videoId}`);
  return result.rows[0]?.thumbnail_url as string || null;
}

/**
 * Delete video
 */
export async function deleteVideo(videoId: string): Promise<void> {
  const video = await db.execute(sql`SELECT variants FROM videos WHERE id = ${videoId}`);
  const variants = JSON.parse(video.rows[0]?.variants as string || '[]');

  // Delete files (in production, would use storage API)
  console.log(`[Video] Deleting ${variants.length} variants for ${videoId}`);

  await db.execute(sql`DELETE FROM videos WHERE id = ${videoId}`);
}

function mapVideoFromRow(row: any): VideoUpload {
  return {
    id: row.id,
    placeId: row.place_id,
    userId: row.user_id,
    originalUrl: row.original_url,
    status: row.status,
    variants: JSON.parse(row.variants || '[]'),
    duration: parseFloat(row.duration || '0'),
    thumbnailUrl: row.thumbnail_url,
    createdAt: new Date(row.created_at),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
