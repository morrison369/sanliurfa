/**
 * Admin Moderation API
 * GET  /api/admin/moderation?type=reviews|submissions
 * POST /api/admin/moderation — moderate reviews or place submissions
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { requireRole } from '../../../lib/auth';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus, safeErrorDetail } from '../../../lib/api';
import { assertPlaceStatusTransition } from '../../../lib/place/lifecycle';
import { recordPlaceLifecycleEvent } from '../../../lib/place/lifecycle-events';

// ─── GET ──────────────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-moderation-unauthorized',
        instance: '/api/admin/moderation',
      });
    }

    const type = url.searchParams.get('type');

    if (type === 'reviews') {
      const [pendingResult, statsResult] = await Promise.all([
        query(
          `SELECT r.id, r.place_id, r.user_id, r.title, r.content, r.rating,
                  r.status, r.created_at, r.images,
                  u.full_name AS user_name, p.name AS place_name
           FROM reviews r
           JOIN users u ON u.id = r.user_id
           JOIN places p ON p.id = r.place_id
           WHERE r.status IN ('pending', 'flagged')
           ORDER BY r.created_at ASC
           LIMIT 50`
        ),
        query(
          `SELECT
             COUNT(*) FILTER (WHERE status = 'active')   AS approved,
             COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
             COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
             COUNT(*) FILTER (WHERE status = 'flagged')  AS flagged
           FROM reviews`
        ),
      ]);

      return apiResponse({ pending: pendingResult.rows, stats: statsResult.rows[0] }, HttpStatus.OK);
    }

    if (type === 'submissions') {
      const statsResult = await query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending')    AS pending,
           COUNT(*) FILTER (WHERE status = 'active')     AS approved,
           COUNT(*) FILTER (WHERE status = 'rejected')   AS rejected,
           COUNT(*) FILTER (WHERE status = 'needs_info') AS needs_info,
           COUNT(*) FILTER (WHERE status = 'draft')      AS drafts
         FROM places
         WHERE owner_id IS NOT NULL`
      );

      return apiResponse({ stats: statsResult.rows[0] }, HttpStatus.OK);
    }

    return apiResponse({ error: 'type parametresi gereklidir: reviews|submissions' }, HttpStatus.BAD_REQUEST);
  } catch (error) {
    logger.error('Moderation GET error:', error);
    return problemJson({
      status: 500,
      title: 'Moderasyon Verisi Alınamadı',
      detail: safeErrorDetail(error, 'moderation_fetch_failed'),
      type: '/problems/admin-moderation-fetch-failed',
      instance: '/api/admin/moderation',
    });
  }
};

// ─── POST ─────────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-moderation-unauthorized',
        instance: '/api/admin/moderation',
      });
    }

    const body = await request.json();
    const { type, action, id, reason, notes } = body;

    if (!type || !action || !id) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'type, action ve id gereklidir',
        type: '/problems/admin-moderation-validation',
        instance: '/api/admin/moderation',
      });
    }

    if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > 1000)) {
      return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'reason 1000 karakterden uzun olamaz', type: '/problems/admin-moderation-reason-too-long', instance: '/api/admin/moderation' });
    }
    if (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > 2000)) {
      return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'notes 2000 karakterden uzun olamaz', type: '/problems/admin-moderation-notes-too-long', instance: '/api/admin/moderation' });
    }

    // ── Review moderation ─────────────────────────────────────────────────────
    if (type === 'review') {
      const statusMap: Record<string, string> = {
        approve:  'active',
        reject:   'rejected',
        flag:     'flagged',
        delete:   'deleted',
      };

      if (!statusMap[action]) {
        return apiResponse({ error: 'Geçersiz action' }, HttpStatus.BAD_REQUEST);
      }

      if (action === 'reject' && !reason) {
        return apiResponse({ error: 'Reddetme için reason gereklidir' }, HttpStatus.BAD_REQUEST);
      }

      const result = await query(
        `UPDATE reviews
         SET status = $1, is_moderated = true,
             moderated_at = NOW(), moderated_by = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, status`,
        [statusMap[action], auth.user.id, id]
      );

      if (!result.rows[0]) {
        return apiResponse({ error: 'Yorum bulunamadı' }, HttpStatus.NOT_FOUND);
      }

      return apiResponse({ success: true, review: result.rows[0] }, HttpStatus.OK);
    }

    // ── Submission (place) moderation ─────────────────────────────────────────
    if (type === 'submission') {
      const VALID_SUBMISSION_ACTIONS = new Set(['approve', 'reject', 'requestInfo']);
      if (!VALID_SUBMISSION_ACTIONS.has(action)) {
        return apiResponse({ error: 'Geçersiz submission action. Beklenen: approve | reject | requestInfo' }, HttpStatus.BAD_REQUEST);
      }
      if (action === 'approve') {
        const existing = await query(`SELECT status FROM places WHERE id = $1`, [id]);
        const currentStatus = existing.rows[0]?.status;
        const transition = assertPlaceStatusTransition(currentStatus, 'active', 'admin');
        if (!transition.ok) {
          return problemJson({
            status: 400,
            title: 'Geçersiz Durum Geçişi',
            detail: 'error' in transition ? transition.error : 'Geçersiz durum geçişi',
            type: '/problems/admin-moderation-submission-transition-invalid',
            instance: '/api/admin/moderation',
          });
        }
        const result = await query(
          `UPDATE places SET status = 'active', updated_at = NOW()
           WHERE id = $1 AND status IN ('pending', 'needs_info')
           RETURNING id, name, status`,
          [id]
        );
        if (!result.rows[0]) {
          return apiResponse({ error: 'Başvuru bulunamadı' }, HttpStatus.NOT_FOUND);
        }
        await recordPlaceLifecycleEvent({
          placeId: String(id),
          fromStatus: currentStatus || null,
          toStatus: 'active',
          actorUserId: auth.user.id,
          reason: 'admin_approve',
        }).catch(() => null);
        return apiResponse({ success: true, submission: result.rows[0] }, HttpStatus.OK);
      }

      if (action === 'reject') {
        if (!reason) {
          return apiResponse({ error: 'Reddetme için reason gereklidir' }, HttpStatus.BAD_REQUEST);
        }
        const existing = await query(`SELECT status FROM places WHERE id = $1`, [id]);
        const currentStatus = existing.rows[0]?.status;
        const transition = assertPlaceStatusTransition(currentStatus, 'rejected', 'admin');
        if (!transition.ok) {
          return problemJson({
            status: 400,
            title: 'Geçersiz Durum Geçişi',
            detail: 'error' in transition ? transition.error : 'Geçersiz durum geçişi',
            type: '/problems/admin-moderation-submission-transition-invalid',
            instance: '/api/admin/moderation',
          });
        }
        const result = await query(
          `UPDATE places SET status = 'rejected', updated_at = NOW()
           WHERE id = $1
           RETURNING id, name, status`,
          [id]
        );
        await recordPlaceLifecycleEvent({
          placeId: String(id),
          fromStatus: currentStatus || null,
          toStatus: 'rejected',
          actorUserId: auth.user.id,
          reason: reason || 'admin_reject',
          ...(notes ? { metadata: { notes } } : {}),
        }).catch(() => null);
        return apiResponse({ success: true, submission: result.rows[0], reason }, HttpStatus.OK);
      }

      if (action === 'requestInfo') {
        if (!reason) {
          return apiResponse({ error: 'Bilgi için reason gereklidir' }, HttpStatus.BAD_REQUEST);
        }
        const existing = await query(`SELECT status FROM places WHERE id = $1`, [id]);
        const currentStatus = existing.rows[0]?.status;
        const transition = assertPlaceStatusTransition(currentStatus, 'needs_info', 'admin');
        if (!transition.ok) {
          return problemJson({
            status: 400,
            title: 'Geçersiz Durum Geçişi',
            detail: 'error' in transition ? transition.error : 'Geçersiz durum geçişi',
            type: '/problems/admin-moderation-submission-transition-invalid',
            instance: '/api/admin/moderation',
          });
        }
        const result = await query(
          `UPDATE places SET status = 'needs_info', updated_at = NOW()
           WHERE id = $1
           RETURNING id, name, status`,
          [id]
        );
        await recordPlaceLifecycleEvent({
          placeId: String(id),
          fromStatus: currentStatus || null,
          toStatus: 'needs_info',
          actorUserId: auth.user.id,
          reason: reason || 'admin_request_info',
          ...(notes ? { metadata: { notes } } : {}),
        }).catch(() => null);
        return apiResponse({ success: true, submission: result.rows[0], requestedInfo: reason }, HttpStatus.OK);
      }
    }

    return apiResponse({ error: 'Geçersiz type veya action' }, HttpStatus.BAD_REQUEST);
  } catch (error) {
    logger.error('Moderation POST error:', error);
    return problemJson({
      status: 400,
      title: 'Moderasyon İşlemi Başarısız',
      detail: safeErrorDetail(error, 'moderation_action_failed'),
      type: '/problems/admin-moderation-action-failed',
      instance: '/api/admin/moderation',
    });
  }
};
