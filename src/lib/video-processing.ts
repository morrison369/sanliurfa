/**
 * Video Processing Library
 * Video metadata, transcoding, thumbnails, streaming
 */

import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

export async function registerVideoMetadata(fileId: string, duration: number, width: number, height: number, frameRate: number, bitrate: number, videoCodec: string, audioCodec: string): Promise<any | null> {
  try {
    const result = await insert('video_metadata', {
      file_id: fileId,
      duration_seconds: duration,
      width: width,
      height: height,
      frame_rate: frameRate,
      bitrate_kbps: bitrate,
      codec_video: videoCodec,
      codec_audio: audioCodec,
      has_audio: true
    });

    await deleteCache(`sanliurfa:video:${fileId}`);
    logger.info('Video metadata registered', { fileId, duration, resolution: `${width}x${height}` });
    return result;
  } catch (error) {
    logger.error('Failed to register video metadata', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getVideoMetadata(fileId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:video:${fileId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const metadata = await queryOne(
      'SELECT * FROM video_metadata WHERE file_id = $1',
      [fileId]
    );

    if (metadata) {
      await setCache(cacheKey, JSON.stringify(metadata), 3600);
    }

    return metadata || null;
  } catch (error) {
    logger.error('Failed to get video metadata', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function createTranscodingJob(videoFileId: string, targetQuality: string, targetCodec: string, targetBitrate: number, targetResolution: string): Promise<any | null> {
  try {
    const result = await insert('transcoding_jobs', {
      video_file_id: videoFileId,
      target_quality: targetQuality,
      target_codec: targetCodec,
      target_bitrate_kbps: targetBitrate,
      target_resolution: targetResolution,
      status: 'queued',
      progress_percent: 0
    });

    logger.info('Transcoding job created', { videoFileId, quality: targetQuality, resolution: targetResolution });
    return result;
  } catch (error) {
    logger.error('Failed to create transcoding job', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getPendingTranscodingJobs(limit: number = 10): Promise<any[]> {
  try {
    return await queryRows(
      `SELECT * FROM transcoding_jobs
       WHERE status IN ('queued', 'processing')
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit]
    );
  } catch (error) {
    logger.error('Failed to get pending jobs', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function updateTranscodingProgress(jobId: string, progress: number, status: string): Promise<boolean> {
  try {
    const updateData: any = {
      progress_percent: Math.min(progress, 100),
      status: status
    };

    if (status === 'processing' && !updateData.started_at) {
      updateData.started_at = new Date();
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date();
    }

    await update('transcoding_jobs', { id: jobId }, updateData);
    return true;
  } catch (error) {
    logger.error('Failed to update transcoding progress', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function completeTranscodingJob(jobId: string, outputFileId: string): Promise<boolean> {
  try {
    await update('transcoding_jobs', { id: jobId }, {
      status: 'completed',
      output_file_id: outputFileId,
      completed_at: new Date()
    });

    logger.info('Transcoding job completed', { jobId, outputFileId });
    return true;
  } catch (error) {
    logger.error('Failed to complete transcoding job', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function registerVideoThumbnail(videoFileId: string, thumbnailUrl: string, timeSeconds: number, isPrimary: boolean = false): Promise<any | null> {
  try {
    const result = await insert('video_thumbnails', {
      video_file_id: videoFileId,
      thumbnail_url: thumbnailUrl,
      thumbnail_time_seconds: timeSeconds,
      is_primary: isPrimary
    });

    await deleteCache(`sanliurfa:thumbnails:${videoFileId}`);
    return result;
  } catch (error) {
    logger.error('Failed to register thumbnail', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getVideoThumbnails(videoFileId: string): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:thumbnails:${videoFileId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const thumbnails = await queryRows(
      'SELECT * FROM video_thumbnails WHERE video_file_id = $1 ORDER BY is_primary DESC, thumbnail_time_seconds ASC',
      [videoFileId]
    );

    await setCache(cacheKey, JSON.stringify(thumbnails), 3600);
    return thumbnails;
  } catch (error) {
    logger.error('Failed to get thumbnails', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function addVideoCaption(videoFileId: string, language: string, captionFileId: string, captionType: string, isDefault: boolean = false): Promise<any | null> {
  try {
    const result = await insert('video_captions', {
      video_file_id: videoFileId,
      language: language,
      caption_file_id: captionFileId,
      caption_type: captionType,
      is_default: isDefault
    });

    await deleteCache(`sanliurfa:captions:${videoFileId}`);
    return result;
  } catch (error) {
    logger.error('Failed to add caption', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getVideoCaptions(videoFileId: string): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:captions:${videoFileId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const captions = await queryRows(
      'SELECT * FROM video_captions WHERE video_file_id = $1 ORDER BY is_default DESC, language ASC',
      [videoFileId]
    );

    await setCache(cacheKey, JSON.stringify(captions), 3600);
    return captions;
  } catch (error) {
    logger.error('Failed to get captions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function configureVideoStreaming(videoFileId: string, adaptiveBitrate: boolean = true, drmEnabled: boolean = false, maxBitrate?: number, minBitrate?: number): Promise<boolean> {
  try {
    const qualityVariants = ['720p', '480p', '360p', '240p'];

    await insert('video_streaming_settings', {
      video_file_id: videoFileId,
      enable_adaptive_bitrate: adaptiveBitrate,
      enable_drm: drmEnabled,
      max_bitrate_kbps: maxBitrate,
      min_bitrate_kbps: minBitrate,
      quality_variants: qualityVariants,
      hls_enabled: true,
      dash_enabled: true,
      progressive_download_enabled: true
    });

    await deleteCache(`sanliurfa:video:${videoFileId}`);
    logger.info('Video streaming configured', { videoFileId, adaptiveBitrate, drmEnabled });
    return true;
  } catch (error) {
    logger.error('Failed to configure streaming', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getVideoStreamingSettings(videoFileId: string): Promise<any | null> {
  try {
    return await queryOne(
      'SELECT * FROM video_streaming_settings WHERE video_file_id = $1',
      [videoFileId]
    );
  } catch (error) {
    logger.error('Failed to get streaming settings', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getTranscodingStats(): Promise<any> {
  try {
    const stats = await queryRows(
      `SELECT
        status,
        COUNT(*) as count,
        AVG(progress_percent) as avg_progress
       FROM transcoding_jobs
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY status`,
      []
    );

    return stats;
  } catch (error) {
    logger.error('Failed to get transcoding stats', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
