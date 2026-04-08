/**
 * Get activities from a specific user
 * GET /api/feed/users/[userId]
 */

import type { APIRoute } from 'astro';
import { getUserActivities } from '../../../../lib/activity-feed';
import { getActivityDescription, getActivityIcon } from '../../../../lib/activity';
import { apiResponse, apiError, HttpStatus } from '../../../../lib/api';
import { logger } from '../../../../lib/logging';

export const GET: APIRoute = async (context) => {
  try {
    const { userId } = context.params;
    const { limit } = Object.fromEntries(context.url.searchParams);

    if (!userId) {
      return apiError(context, HttpStatus.BAD_REQUEST, 'User ID is required');
    }

    const activities = await getUserActivities(userId, limit ? parseInt(limit) : 20);

    const feed = activities.map((item) => ({
      ...item,
      description: getActivityDescription(item),
      icon: getActivityIcon(item),
      timeAgo: getTimeAgo(new Date(item.createdAt))
    }));

    return apiResponse(context, HttpStatus.OK, {
      success: true,
      data: feed,
      count: feed.length,
      userId
    });
  } catch (error) {
    logger.error('Failed to get user activities', error instanceof Error ? error : new Error(String(error)));
    return apiError(context, HttpStatus.INTERNAL_SERVER_ERROR, 'Failed to get user activities');
  }
};

/**
 * Format time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dakika önce`;
  if (hours < 24) return `${hours} saat önce`;
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;

  return `${Math.floor(days / 365)} yıl önce`;
}
