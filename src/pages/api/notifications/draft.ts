/**
 * Admin - Save notification draft
 * POST: Create draft
 */

import type { APIRoute } from 'astro';
import { insert, query } from '../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../lib/api';
import { logger } from '../../../lib/logger';

export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = getRequestId(request);

  try {
    if (!locals.isAdmin) {
      return apiError(ErrorCode.FORBIDDEN, 'Admin access required', HttpStatus.FORBIDDEN, undefined, requestId);
    }

    const body = await request.json();
    const { title, message, url, target, segment } = body;

    if (!title || !message || typeof title !== 'string' || typeof message !== 'string') {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Başlık ve mesaj zorunludur', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    }
    if (title.length > 255) return apiError(ErrorCode.VALIDATION_ERROR, 'Başlık 255 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    if (message.length > 10000) return apiError(ErrorCode.VALIDATION_ERROR, 'Mesaj 10000 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    if (url !== undefined && url !== null && (typeof url !== 'string' || url.length > 500)) return apiError(ErrorCode.VALIDATION_ERROR, 'URL 500 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    if (segment !== undefined && segment !== null && (typeof segment !== 'string' || segment.length > 100)) return apiError(ErrorCode.VALIDATION_ERROR, 'Segment 100 karakterden uzun olamaz', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);
    const VALID_TARGETS = new Set(['all', 'premium', 'new', 'active', 'inactive']);
    if (target !== undefined && target !== null && (typeof target !== 'string' || !VALID_TARGETS.has(target))) return apiError(ErrorCode.VALIDATION_ERROR, 'Geçersiz hedef grubu', HttpStatus.UNPROCESSABLE_ENTITY, undefined, requestId);

    const id = crypto.randomUUID();
    await query(
      `INSERT INTO notification_drafts (id, title, message, url, target, segment, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [id, title, message, url || null, target || 'all', segment || null, locals.user?.id]
    ).catch(async () => {
      // Table may not exist yet — create and retry
      await query(`
        CREATE TABLE IF NOT EXISTS notification_drafts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          url VARCHAR(500),
          target VARCHAR(50) DEFAULT 'all',
          segment VARCHAR(100),
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`, []);
      await insert('notification_drafts', { id, title, message, url: url || null, target: target || 'all', segment: segment || null, created_by: locals.user?.id });
    });

    logger.info('Notification draft saved', { id });
    return apiResponse({ id }, HttpStatus.CREATED, requestId);
  } catch (error) {
    logger.error('Notification draft failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Taslak kaydedilemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
