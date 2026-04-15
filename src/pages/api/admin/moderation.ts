/**
 * Admin Moderation API
 * GET  /api/admin/moderation?type=reviews|submissions
 * POST /api/admin/moderation — moderate reviews or place submissions
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { requireRole } from '../../../lib/auth';
import { logger } from '../../../lib/logging';

// ─── GET ──────────────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

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

      return new Response(
        JSON.stringify({ pending: pendingResult.rows, stats: statsResult.rows[0] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
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

      return new Response(
        JSON.stringify({ stats: statsResult.rows[0] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'type parametresi gereklidir: reviews|submissions' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Moderation GET error:', error);
    return new Response(JSON.stringify({ error: 'Moderation verisi alınamadı' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// ─── POST ─────────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const body = await request.json();
    const { type, action, id, reason, notes } = body;

    if (!type || !action || !id) {
      return new Response(
        JSON.stringify({ error: 'type, action ve id gereklidir' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
        return new Response(JSON.stringify({ error: 'Geçersiz action' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      if (action === 'reject' && !reason) {
        return new Response(JSON.stringify({ error: 'Reddetme için reason gereklidir' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
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
        return new Response(JSON.stringify({ error: 'Yorum bulunamadı' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({ success: true, review: result.rows[0] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── Submission (place) moderation ─────────────────────────────────────────
    if (type === 'submission') {
      if (action === 'approve') {
        const result = await query(
          `UPDATE places SET status = 'active', updated_at = NOW()
           WHERE id = $1 AND status IN ('pending', 'needs_info')
           RETURNING id, name, status`,
          [id]
        );
        if (!result.rows[0]) {
          return new Response(JSON.stringify({ error: 'Başvuru bulunamadı' }), {
            status: 404, headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({ success: true, submission: result.rows[0] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'reject') {
        if (!reason) {
          return new Response(JSON.stringify({ error: 'Reddetme için reason gereklidir' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          });
        }
        const result = await query(
          `UPDATE places SET status = 'rejected', updated_at = NOW()
           WHERE id = $1
           RETURNING id, name, status`,
          [id]
        );
        return new Response(
          JSON.stringify({ success: true, submission: result.rows[0], reason }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (action === 'requestInfo') {
        if (!reason) {
          return new Response(JSON.stringify({ error: 'Bilgi için reason gereklidir' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
          });
        }
        const result = await query(
          `UPDATE places SET status = 'needs_info', updated_at = NOW()
           WHERE id = $1
           RETURNING id, name, status`,
          [id]
        );
        return new Response(
          JSON.stringify({ success: true, submission: result.rows[0], requestedInfo: reason }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(JSON.stringify({ error: 'Geçersiz type veya action' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Moderation POST error:', error);
    return new Response(JSON.stringify({ error: 'Moderasyon işlemi başarısız' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }
};
