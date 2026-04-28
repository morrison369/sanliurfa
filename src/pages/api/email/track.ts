/**
 * Email Campaign Tracking
 * Open pixel and click link tracking for campaigns
 */

import type { APIRoute } from 'astro';
import { trackCampaignEvent } from '../../../lib/email/email-campaigns';
import { safeIntParam } from '../../../lib/api';
import { logger } from '../../../lib/logging';

// 1x1 transparent PNG pixel
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export const GET: APIRoute = async ({ url }) => {
  try {
    const campaignId = url.searchParams.get('cid');
    const userId = url.searchParams.get('uid');
    const eventType = url.searchParams.get('type');
    const linkUrl = url.searchParams.get('url');

    // Validate parameters
    if (!campaignId || !userId || !eventType) {
      logger.warn('Track request missing parameters', undefined, {
        hasCampaignId: !!campaignId,
        hasUserId: !!userId,
        hasEventType: !!eventType
      });
      return new Response(PIXEL, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      });
    }

    // Track the event
    const success = await trackCampaignEvent(
      safeIntParam(campaignId, 0, 1, 1_000_000),
      userId,
      eventType,
      linkUrl || undefined
    );

    if (!success) {
      logger.warn('Failed to track campaign event', undefined, {
        campaignId,
        userId,
        eventType
      });
    } else {
      logger.info('Campaign event tracked', {
        campaignId,
        userId,
        eventType
      });
    }

    // Handle different event types
    if (eventType === 'click' && linkUrl) {
      // Redirect to the link
      try {
        const decodedUrl = decodeURIComponent(linkUrl);
        // Validate URL is absolute (security measure)
        if (decodedUrl.startsWith('http://') || decodedUrl.startsWith('https://')) {
          return new Response(null, {
            status: 302,
            headers: {
              'Location': decodedUrl,
              'Cache-Control': 'no-store, no-cache'
            }
          });
        }
      } catch (error) {
        logger.warn('Invalid redirect URL', undefined, { linkUrl });
      }
    }

    // Return pixel for open tracking
    return new Response(PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    logger.error('Track endpoint error', error instanceof Error ? error : new Error(String(error)));

    // Always return pixel even on error
    return new Response(PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png'
      }
    });
  }
};
