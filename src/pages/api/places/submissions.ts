/**
 * GET /api/places/submissions  — User's own submitted places (or admin: all pending)
 * POST /api/places/submissions — Submit / draft / update / submitForReview
 */

import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { requireAuth } from '../../../lib/auth';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';
import { assertPlaceStatusTransition } from '../../../lib/place/lifecycle';
import { recordPlaceLifecycleEvent } from '../../../lib/place/lifecycle-events';

// ─── GET ──────────────────────────────────────────────────────────────────────

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/places-submissions-unauthorized',
        instance: '/api/places/submissions',
      });
    }

    const id     = url.searchParams.get('id');
    const status = url.searchParams.get('status');

    // Single submission
    if (id) {
      const result = await query(
        `SELECT p.*, d.name AS district_name FROM places p
         LEFT JOIN districts d ON d.id = p.district_id
         WHERE p.id = $1`,
        [id]
      );
      const submission = result.rows[0];
      if (!submission) {
        return problemJson({
          status: 404,
          title: 'Bulunamadı',
          detail: 'Başvuru bulunamadı',
          type: '/problems/places-submissions-not-found',
          instance: '/api/places/submissions',
        });
      }
      if (submission.owner_id !== auth.user.id && auth.user.role !== 'admin') {
        return problemJson({
          status: 403,
          title: 'Forbidden',
          detail: 'Yetkisiz',
          type: '/problems/places-submissions-forbidden',
          instance: '/api/places/submissions',
        });
      }
      return new Response(JSON.stringify({ submission }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Admin: all pending submissions
    if (status === 'pending' && auth.user.role === 'admin') {
      const result = await query(
        `SELECT p.id, p.name, p.description, p.address, p.category, p.status,
                p.created_at, u.full_name AS owner_name, u.email AS owner_email
         FROM places p
         LEFT JOIN users u ON u.id = p.owner_id
         WHERE p.status IN ('pending', 'needs_info')
         ORDER BY p.created_at ASC`
      );
      return new Response(JSON.stringify({ submissions: result.rows }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // User's own submissions
    const result = await query(
      `SELECT id, name, description, address, category, status, created_at
       FROM places
       WHERE owner_id = $1 AND status IN ('pending', 'draft', 'active', 'rejected', 'needs_info')
       ORDER BY created_at DESC`,
      [auth.user.id]
    );
    return new Response(JSON.stringify({ submissions: result.rows }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Submissions GET error:', error);
    return problemJson({
      status: 500,
      title: 'Başvurular Alınamadı',
      detail: 'Başvurular alınamadı',
      type: '/problems/places-submissions-get-failed',
      instance: '/api/places/submissions',
    });
  }
};

// ─── POST ─────────────────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/places-submissions-unauthorized',
        instance: '/api/places/submissions',
      });
    }

    const body = await request.json();
    const {
      action = 'submit',
      submissionId,
      name, category, description, shortDescription,
      address, latitude, longitude, phone, website, email,
      openingHours, features = [], priceRange, photos = [],
    } = body;

    // UPDATE existing submission
    if (action === 'update' && submissionId) {
      await query(
        `UPDATE places SET
           name = COALESCE($1, name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           short_description = COALESCE($4, short_description),
           address = COALESCE($5, address),
           latitude = COALESCE($6, latitude),
           longitude = COALESCE($7, longitude),
           phone = COALESCE($8, phone),
           website = COALESCE($9, website),
           email = COALESCE($10, email),
           opening_hours = COALESCE($11, opening_hours),
           tags = COALESCE($12, tags),
           price_range = COALESCE($13, price_range),
           images = COALESCE($14, images),
           updated_at = NOW()
         WHERE id = $15 AND owner_id = $16 AND status IN ('draft', 'needs_info')`,
        [name, category, description, shortDescription, address,
         latitude, longitude, phone, website, email,
         openingHours, features.length ? features : null,
         priceRange, photos.length ? photos : null,
         submissionId, auth.user.id]
      );
      const result = await query(`SELECT * FROM places WHERE id = $1`, [submissionId]);
      return new Response(JSON.stringify({ success: true, submission: result.rows[0] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // SUBMIT FOR REVIEW (draft → pending)
    if (action === 'submitForReview' && submissionId) {
      const current = await query(`SELECT status FROM places WHERE id = $1 AND owner_id = $2`, [submissionId, auth.user.id]);
      const currentStatus = current.rows[0]?.status;
      const transition = assertPlaceStatusTransition(currentStatus, 'pending', auth.user.role === 'admin' ? 'admin' : 'user');
      if (!transition.ok) {
        return problemJson({
          status: 400,
          title: 'Geçersiz Durum Geçişi',
          detail: 'error' in transition ? transition.error : 'Geçersiz durum geçişi',
          type: '/problems/places-submissions-transition-invalid',
          instance: '/api/places/submissions',
        });
      }
      await query(
        `UPDATE places SET status = 'pending', updated_at = NOW()
         WHERE id = $1 AND owner_id = $2`,
        [submissionId, auth.user.id]
      );
      await recordPlaceLifecycleEvent({
        placeId: submissionId,
        fromStatus: currentStatus || null,
        toStatus: 'pending',
        actorUserId: auth.user.id,
        reason: 'submitForReview',
      }).catch(() => null);
      const result = await query(`SELECT * FROM places WHERE id = $1`, [submissionId]);
      return new Response(JSON.stringify({ success: true, submission: result.rows[0] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate for new submission
    if (!name || !category || !description || !address) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'name, category, description, address zorunludur',
        type: '/problems/places-submissions-validation',
        instance: '/api/places/submissions',
      });
    }

    // Duplicate check
    const dupeResult = await query(
      `SELECT id, name, address FROM places
       WHERE LOWER(name) = LOWER($1) AND status != 'deleted'
       LIMIT 3`,
      [name]
    );
    if (dupeResult.rows.length > 0) {
      return new Response(
        JSON.stringify({ warning: 'Benzer mekan mevcut', duplicates: dupeResult.rows, proceed: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const newStatus = action === 'draft' ? 'draft' : 'pending';
    const slug = name.toLowerCase()
      .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
      .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
      + '-' + Date.now();

    const result = await query(
      `INSERT INTO places
         (name, slug, category, description, short_description, address,
          latitude, longitude, phone, website, email, opening_hours,
          tags, price_range, images, owner_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [name, slug, category, description, shortDescription || null,
       address, latitude || null, longitude || null,
       phone || null, website || null, email || null, openingHours || null,
       features.length ? features : null, priceRange || null,
       photos.length ? photos : null, auth.user.id, newStatus]
    );
    const created = result.rows[0];
    if (created?.id) {
      await recordPlaceLifecycleEvent({
        placeId: created.id,
        fromStatus: null,
        toStatus: newStatus,
        actorUserId: auth.user.id,
        reason: action === 'draft' ? 'draft_create' : 'submit_create',
      }).catch(() => null);
    }

    return new Response(
      JSON.stringify({
        success: true,
        submission: created,
        message: action === 'draft' ? 'Taslak kaydedildi' : 'Başvuru incelemeye gönderildi',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Submissions POST error:', error);
    return problemJson({
      status: 400,
      title: 'Başvuru İşlemi Başarısız',
      detail: 'Başvuru işlemi başarısız',
      type: '/problems/places-submissions-post-failed',
      instance: '/api/places/submissions',
    });
  }
};
