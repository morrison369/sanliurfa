import type { APIRoute } from 'astro';

import { problemJson } from '../../lib/api';
import { submitContactRequest } from '../../lib/contact/contact-submission';
import { logger } from '../../lib/logging';
import { query } from '../../lib/postgres';

export const POST: APIRoute = async context => {
  try {
    const body = await context.request.json();
    const result = await submitContactRequest({
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      subject: body.subject,
      message: body.message,
      type: body.type || 'general',
      placeId: body.placeId || body.place_id || null,
    });

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Contact form error:', error);
    return problemJson({
      status: 400,
      title: 'Destek Talebi Oluşturulamadı',
      detail: error instanceof Error && error.message ? error.message : 'Mesaj gönderilemedi.',
      type: '/problems/contact-create-failed',
      instance: '/api/contact',
    });
  }
};

export const GET: APIRoute = async context => {
  try {
    if (context.locals.user?.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/contact-list-unauthorized',
        instance: '/api/contact',
      });
    }

    const url = new URL(context.request.url);
    const status = url.searchParams.get('status') || 'open';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = 20;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT *
       FROM support_tickets
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );

    const countResult = await query('SELECT COUNT(*) FROM support_tickets WHERE status = $1', [
      status,
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        tickets: result.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].count, 10),
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    logger.error('List tickets error:', error);
    return problemJson({
      status: 500,
      title: 'Destek Talepleri Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/contact-list-failed',
      instance: '/api/contact',
    });
  }
};
