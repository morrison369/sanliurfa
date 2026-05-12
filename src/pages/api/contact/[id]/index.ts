import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { authenticateUser } from '../../../../lib/auth/middleware';
import { logger } from '../../../../lib/logging';
import { apiResponse, problemJson, HttpStatus } from '../../../../lib/api';

export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/contact-ticket-unauthorized',
        instance: `/api/contact/${context.params.id}`,
      });
    }

    const { id } = context.params;

    const result = await query(
      `SELECT t.*, p.name as place_name
       FROM support_tickets t
       LEFT JOIN places p ON t.place_id = p.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Talep bulunamadı',
        type: '/problems/contact-ticket-not-found',
        instance: `/api/contact/${id}`,
      });
    }

    const responses = await query(
      `SELECT r.*, u.name as responder_name
       FROM ticket_responses r
       LEFT JOIN users u ON r.responder_id = u.id
       WHERE r.ticket_id = $1
       ORDER BY r.created_at ASC`,
      [id]
    );

    return apiResponse({
      success: true,
      ticket: result.rows[0],
      responses: responses.rows
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Get ticket error:', error);
    return problemJson({
      status: 500,
      title: 'Talep Detayı Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/contact-ticket-get-failed',
      instance: `/api/contact/${context.params.id}`,
    });
  }
};

export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/contact-ticket-unauthorized',
        instance: `/api/contact/${context.params.id}`,
      });
    }

    const { id } = context.params;
    const body = await context.request.json();

    const VALID_TICKET_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed']);
    if (body.status !== undefined && body.status !== null && (typeof body.status !== 'string' || !VALID_TICKET_STATUSES.has(body.status))) {
      return problemJson({
        status: 422,
        title: 'Geçersiz Durum',
        detail: 'Geçersiz talep durumu',
        type: '/problems/contact-ticket-invalid-status',
        instance: `/api/contact/${id}`,
      });
    }

    const result = await query(
      `UPDATE support_tickets
       SET status = $1, updated_at = NOW(), assigned_to = $2
       WHERE id = $3
       RETURNING *`,
      [body.status, auth.user.id, id]
    );

    return apiResponse({
      success: true,
      ticket: result.rows[0]
    }, HttpStatus.OK);

  } catch (error) {
    logger.error('Update ticket error:', error);
    return problemJson({
      status: 500,
      title: 'Talep Güncellenemedi',
      detail: 'Sunucu hatası',
      type: '/problems/contact-ticket-update-failed',
      instance: `/api/contact/${context.params.id}`,
    });
  }
};

export const POST: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/contact-ticket-unauthorized',
        instance: `/api/contact/${context.params.id}`,
      });
    }

    const { id } = context.params;
    const body = await context.request.json();

    if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'message alanı zorunludur',
        type: '/problems/contact-ticket-message-required',
        instance: `/api/contact/${id}`,
      });
    }
    if (body.message.length > 5000) {
      return problemJson({
        status: 422,
        title: 'Çok Uzun',
        detail: 'Yanıt mesajı 5000 karakteri aşamaz',
        type: '/problems/contact-ticket-message-too-long',
        instance: `/api/contact/${id}`,
      });
    }

    const VALID_TICKET_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed']);
    if (body.status !== undefined && body.status !== null && (typeof body.status !== 'string' || !VALID_TICKET_STATUSES.has(body.status))) {
      return problemJson({
        status: 422,
        title: 'Geçersiz Durum',
        detail: 'Geçersiz talep durumu',
        type: '/problems/contact-ticket-invalid-status',
        instance: `/api/contact/${id}`,
      });
    }

    await query(
      `INSERT INTO ticket_responses (ticket_id, responder_id, message)
       VALUES ($1, $2, $3)`,
      [id, auth.user.id, body.message]
    );

    if (body.status) {
      await query(
        `UPDATE support_tickets
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [body.status, id]
      );
    }

    return apiResponse({
      success: true,
      message: 'Reply added'
    }, HttpStatus.CREATED);

  } catch (error) {
    logger.error('Add reply error:', error);
    return problemJson({
      status: 500,
      title: 'Yanıt Eklenemedi',
      detail: 'Sunucu hatası',
      type: '/problems/contact-ticket-reply-failed',
      instance: `/api/contact/${context.params.id}`,
    });
  }
};
