/**
 * Social Sharing System
 * Share content across platforms
 */

import { query } from '../postgres';
import { logger } from '../logging';

export type SharePlatform = 'facebook' | 'twitter' | 'whatsapp' | 'telegram' | 'email' | 'copy';

export interface ShareData {
  url: string;
  title: string;
  description?: string;
  image?: string;
  hashtags?: string[];
}

export interface ShareEvent {
  id: string;
  contentType: 'place' | 'blog' | 'review' | 'collection' | 'event';
  contentId: string;
  platform: SharePlatform;
  userId?: string;
  sharedAt: Date;
}

export interface ShareCount {
  contentType: string;
  contentId: string;
  total: number;
  byPlatform: Record<SharePlatform, number>;
}

export function generateShareUrl(platform: SharePlatform, data: ShareData): string {
  const encodedUrl = encodeURIComponent(data.url);
  const encodedTitle = encodeURIComponent(data.title);
  const encodedDesc = encodeURIComponent(data.description || '');
  const hashtags = data.hashtags?.join(',') || '';

  switch (platform) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&hashtags=${hashtags}`;
    
    case 'whatsapp':
      return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    
    case 'telegram':
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
    
    case 'email':
      return `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`;
    
    case 'copy':
      return data.url;
    
    default:
      return data.url;
  }
}

export async function trackShare(
  contentType: ShareEvent['contentType'],
  contentId: string,
  platform: SharePlatform,
  userId?: string
): Promise<void> {
  await query(
    `INSERT INTO social_shares (content_type, content_id, platform, user_id, shared_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [contentType, contentId, platform, userId || null]
  );

  // Update share count cache
  await query(
    `INSERT INTO share_counts (content_type, content_id, platform, count, updated_at)
     VALUES ($1, $2, $3, 1, NOW())
     ON CONFLICT (content_type, content_id, platform) 
     DO UPDATE SET count = share_counts.count + 1, updated_at = NOW()`,
    [contentType, contentId, platform]
  );
}

export async function getShareCounts(
  contentType: ShareEvent['contentType'],
  contentId: string
): Promise<ShareCount> {
  const result = await query(
    `SELECT platform, count FROM share_counts WHERE content_type = $1 AND content_id = $2`,
    [contentType, contentId]
  );

  const byPlatform: Record<string, number> = {};
  let total = 0;

  result.rows.forEach(row => {
    byPlatform[row.platform] = parseInt(row.count, 10);
    total += parseInt(row.count, 10);
  });

  return { contentType, contentId, total, byPlatform };
}

export async function getPopularContent(
  contentType: ShareEvent['contentType'],
  limit = 10,
  days = 30
): Promise<Array<{ contentId: string; shares: number }>> {
  const result = await query(
    `SELECT content_id, COUNT(*) as shares
     FROM social_shares
     WHERE content_type = $1 AND shared_at > NOW() - ($3 * INTERVAL '1 day')
     GROUP BY content_id
     ORDER BY shares DESC
     LIMIT $2`, [contentType, limit, days]);

  return result.rows.map(row => ({
    contentId: row.content_id,
    shares: parseInt(row.shares, 10),
  }));
}

export function generateOpenGraphTags(data: ShareData): Record<string, string> {
  return {
    'og:title': data.title,
    'og:description': data.description || '',
    'og:url': data.url,
    'og:image': data.image || '',
    'og:type': 'article',
    'twitter:card': 'summary_large_image',
    'twitter:title': data.title,
    'twitter:description': data.description || '',
    'twitter:image': data.image || '',
  };
}

export function generateShareMeta(data: ShareData): string {
  const tags = generateOpenGraphTags(data);
  return Object.entries(tags)
    .map(([key, value]) => `<meta property="${key}" content="${escapeHtml(value)}">`)
    .join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function getUserShareStats(userId: string): Promise<{
  totalShares: number;
  byPlatform: Record<string, number>;
}> {
  const result = await query(
    `SELECT platform, COUNT(*) as count
     FROM social_shares
     WHERE user_id = $1
     GROUP BY platform`,
    [userId]
  );

  const byPlatform: Record<string, number> = {};
  let totalShares = 0;

  result.rows.forEach(row => {
    byPlatform[row.platform] = parseInt(row.count, 10);
    totalShares += parseInt(row.count, 10);
  });

  return { totalShares, byPlatform };
}

// Client-side share function (can be called from browser)
export async function shareContent(
  platform: SharePlatform,
  data: ShareData,
  contentType: ShareEvent['contentType'],
  contentId: string
): Promise<boolean> {
  const shareUrl = generateShareUrl(platform, data);

  if (platform === 'copy') {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Track the share
      await fetch('/api/social/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, contentId, platform }),
      });
      return true;
    } catch {
      return false;
    }
  }

  // Open share window for social platforms
  const width = 600;
  const height = 400;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popup = window.open(
    shareUrl,
    'share',
    `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0`
  );

  if (popup) {
    // Track the share
    fetch('/api/social/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType, contentId, platform }),
    }).catch((err) => logger.error('Social share tracking failed', err));
    return true;
  }

  return false;
}
