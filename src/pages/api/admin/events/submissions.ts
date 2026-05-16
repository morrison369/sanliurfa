import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/auth';
import { apiResponse, HttpStatus, problemJson, safeErrorDetail, safeIntParam } from '../../../../lib/api';
import { transaction, query } from '../../../../lib/postgres';
import { logger } from '../../../../lib/logging';
import { invalidateEvent } from '../../../../lib/cache/invalidation';
import { notifyEventSubmissionDecision } from '../../../../lib/email/submission-notifications';

type EventSubmissionRow = {
  id: string;
  status: string;
  title: string;
  description: string;
  category: string | null;
  location: string | null;
  start_date: string;
  end_date: string | null;
  image_url: string | null;
  organizer_name: string | null;
  organizer_email: string | null;
  is_free: boolean | null;
};

function createSlug(title: string): string {
  const trMap: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
    Ç: 'c',
    Ğ: 'g',
    İ: 'i',
    Ö: 'o',
    Ş: 's',
    Ü: 'u',
  };

  return title
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (char) => trMap[char] || char)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 100);
}

async function loadSubmission(id: string): Promise<EventSubmissionRow | null> {
  const result = await query<EventSubmissionRow>(
    `SELECT
       id, status, title, description, category, location,
       start_date, end_date, image_url, organizer_name, organizer_email, is_free
     FROM event_submissions
     WHERE id = $1`,
    [id],
  );

  return result.rows[0] || null;
}

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-event-submissions-unauthorized',
        instance: '/api/admin/events/submissions',
      });
    }

    const validStatuses = new Set(['all', 'pending', 'approved', 'rejected', 'archived']);
    const rawStatus = url.searchParams.get('status') || 'pending';
    const status = validStatuses.has(rawStatus) ? rawStatus : 'pending';
    const page = safeIntParam(url.searchParams.get('page'), 1, 1, 100_000);
    const limit = safeIntParam(url.searchParams.get('limit'), 25, 1, 250);
    const offset = (page - 1) * limit;

    const params: unknown[] = [];
    let whereClause = '';
    if (status !== 'all') {
      params.push(status);
      whereClause = `WHERE status = $${params.length}`;
    }

    const countSql = `SELECT COUNT(*)::int AS count FROM event_submissions ${whereClause}`;
    const listSql = `
      SELECT
        id, status, title, category, location, start_date, end_date,
        organizer_name, organizer_email, created_at, approved_at, admin_note, approved_event_id
      FROM event_submissions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const statsSql = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE status = 'archived')::int AS archived
      FROM event_submissions
    `;

    const [countResult, listResult, statsResult] = await Promise.all([
      query<{ count: number }>(countSql, params),
      query(listSql, [...params, limit, offset]),
      query(statsSql),
    ]);

    return apiResponse({
      submissions: listResult.rows,
      stats: statsResult.rows[0] || { pending: 0, approved: 0, rejected: 0, archived: 0 },
      pagination: {
        page,
        limit,
        total: Number(countResult.rows[0]?.count || 0),
      },
    }, HttpStatus.OK);
  } catch (error) {
    logger.error('Event submissions GET error', error);
    return problemJson({
      status: 500,
      title: 'Etkinlik Başvuruları Alınamadı',
      detail: safeErrorDetail(error, 'event_submission_fetch_failed'),
      type: '/problems/admin-event-submissions-fetch-failed',
      instance: '/api/admin/events/submissions',
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.user) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-event-submissions-unauthorized',
        instance: '/api/admin/events/submissions',
      });
    }
    const adminUserId = auth.user.id;

    const body = await request.json();
    const action = typeof body?.action === 'string' ? body.action : '';
    const id = typeof body?.id === 'string' ? body.id : '';
    const adminNote = typeof body?.adminNote === 'string' ? body.adminNote.trim() : '';

    if (!id || !action) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'id ve action gereklidir',
        type: '/problems/admin-event-submissions-validation',
        instance: '/api/admin/events/submissions',
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz Aksiyon',
        detail: 'Beklenen action: approve | reject',
        type: '/problems/admin-event-submissions-invalid-action',
        instance: '/api/admin/events/submissions',
      });
    }

    const submission = await loadSubmission(id);
    if (!submission) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Etkinlik başvurusu bulunamadı',
        type: '/problems/admin-event-submissions-not-found',
        instance: '/api/admin/events/submissions',
      });
    }

    if (submission.status !== 'pending') {
      return problemJson({
        status: 409,
        title: 'İşlem Çakışması',
        detail: `Sadece pending başvurular işlenebilir. Mevcut durum: ${submission.status}`,
        type: '/problems/admin-event-submissions-status-conflict',
        instance: '/api/admin/events/submissions',
      });
    }

    if (action === 'approve') {
      const approved = await transaction(async (client) => {
        const baseSlug = createSlug(submission.title) || `etkinlik-${Date.now().toString(36)}`;
        const slugCheck = await client.query('SELECT id FROM events WHERE slug = $1 LIMIT 1', [baseSlug]);
        const finalSlug =
          slugCheck.rows.length > 0
            ? `${baseSlug}-${Date.now().toString(36).slice(-4)}`
            : baseSlug;

        const eventResult = await client.query(
          `INSERT INTO events (
             title, slug, description, location, start_date, end_date,
             category, image_url, status, is_free, created_by, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'published', $9, $10, NOW(), NOW())
           RETURNING id, slug, status, title`,
          [
            submission.title,
            finalSlug,
            submission.description,
            submission.location,
            submission.start_date,
            submission.end_date,
            submission.category,
            submission.image_url,
            submission.is_free ?? true,
            adminUserId,
          ],
        );

        const event = eventResult.rows[0];

        const updateResult = await client.query(
          `UPDATE event_submissions
           SET status = 'approved',
               admin_note = $2,
               approved_event_id = $3,
               approved_at = NOW(),
               approved_by = $4,
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, status, approved_event_id`,
          [id, adminNote || null, event.id, adminUserId],
        );

        return {
          event,
          submission: updateResult.rows[0],
        };
      });

      await invalidateEvent(String(approved.event.id)).catch(() => null);

      if (submission.organizer_email) {
        notifyEventSubmissionDecision(
          String(submission.organizer_email),
          String(submission.organizer_name || 'Değerli Kullanıcı'),
          submission.title,
          true,
          adminNote || undefined,
        ).catch(() => null);
      }

      return apiResponse({
        success: true,
        submission: approved.submission,
        event: approved.event,
      }, HttpStatus.OK);
    }

    if (!adminNote) {
      return problemJson({
        status: 400,
        title: 'Açıklama Gerekli',
        detail: 'Reddetme için adminNote gereklidir',
        type: '/problems/admin-event-submissions-reject-note-required',
        instance: '/api/admin/events/submissions',
      });
    }

    const result = await query(
      `UPDATE event_submissions
       SET status = 'rejected',
           admin_note = $2,
           updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, status`,
      [id, adminNote],
    );

    if (!result.rows[0]) {
      return problemJson({
        status: 409,
        title: 'İşlem Çakışması',
        detail: 'Başvuru reject işlemine uygun değil',
        type: '/problems/admin-event-submissions-reject-conflict',
        instance: '/api/admin/events/submissions',
      });
    }

    if (submission.organizer_email) {
      notifyEventSubmissionDecision(
        String(submission.organizer_email),
        String(submission.organizer_name || 'Değerli Kullanıcı'),
        submission.title,
        false,
        adminNote,
      ).catch(() => null);
    }

    return apiResponse({ success: true, submission: result.rows[0] }, HttpStatus.OK);
  } catch (error) {
    logger.error('Event submissions POST error', error);
    return problemJson({
      status: 500,
      title: 'Etkinlik Başvurusu İşlenemedi',
      detail: safeErrorDetail(error, 'event_submission_action_failed'),
      type: '/problems/admin-event-submissions-action-failed',
      instance: '/api/admin/events/submissions',
    });
  }
};
