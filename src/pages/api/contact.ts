import type { APIRoute } from 'astro';

import { apiResponse, problemJson, safeErrorDetail, HttpStatus, safeIntParam } from '../../lib/api';
import { submitContactRequest } from '../../lib/contact/contact-submission';
import { logger } from '../../lib/logging';
import { query } from '../../lib/postgres';

const VALID_CONTACT_TYPES = new Set(['general', 'business_inquiry', 'technical_support', 'complaint', 'suggestion', 'partnership']);

export const POST: APIRoute = async context => {
  try {
    const body = await context.request.json();

    if (!body.name || !body.email || !body.subject || !body.message) {
      return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Ad, e-posta, konu ve mesaj zorunludur', type: '/problems/contact-validation', instance: '/api/contact' });
    }
    if (typeof body.name !== 'string' || body.name.length > 200) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Ad 200 karakterden uzun olamaz', type: '/problems/contact-validation', instance: '/api/contact' });
    if (typeof body.email !== 'string' || body.email.length > 254) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'E-posta 254 karakterden uzun olamaz', type: '/problems/contact-validation', instance: '/api/contact' });
    if (body.phone !== undefined && body.phone !== null && (typeof body.phone !== 'string' || body.phone.length > 30)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Telefon 30 karakterden uzun olamaz', type: '/problems/contact-validation', instance: '/api/contact' });
    if (typeof body.subject !== 'string' || body.subject.length > 200) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Konu 200 karakterden uzun olamaz', type: '/problems/contact-validation', instance: '/api/contact' });
    if (typeof body.message !== 'string' || body.message.length > 5000) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Mesaj 5000 karakterden uzun olamaz', type: '/problems/contact-validation', instance: '/api/contact' });
    const contactType = body.type || 'general';
    if (!VALID_CONTACT_TYPES.has(contactType)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Geçersiz talep türü', type: '/problems/contact-validation', instance: '/api/contact' });

    const result = await submitContactRequest({
      name: body.name,
      email: body.email,
      phone: body.phone || null,
      subject: body.subject,
      message: body.message,
      type: contactType,
      placeId: body.placeId || body.place_id || null,
    });

    return apiResponse(result, HttpStatus.CREATED);
  } catch (error) {
    logger.error('Contact form error:', error);
    return problemJson({
      status: 400,
      title: 'Destek Talebi Oluşturulamadı',
      detail: safeErrorDetail(error, 'Mesaj gönderilemedi.'),
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
    const rawStatus = url.searchParams.get('status') || 'open';
    const VALID_CONTACT_STATUSES = new Set(['open', 'pending', 'resolved', 'closed']);
    if (!VALID_CONTACT_STATUSES.has(rawStatus)) {
      return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Geçersiz durum', type: '/problems/contact-list-status-invalid', instance: '/api/contact' });
    }
    const status = rawStatus;
    const page = safeIntParam(url.searchParams.get('page'), 1, 1, 1_000_000);
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

    return apiResponse({
      success: true,
      tickets: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count, 10),
      },
    }, HttpStatus.OK);
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
