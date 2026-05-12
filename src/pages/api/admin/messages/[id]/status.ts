// API: Update contact message status (Admin only) (PostgreSQL)
import type { APIRoute } from 'astro';
import { logger } from '../../../../../lib/logging';
import { problemJson, safeErrorDetail } from '../../../../../lib/api';
import { updateAdminMessageStatus } from '../../../../../lib/admin/message-status';

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const { id } = params;
    
    if (locals.user?.role !== 'admin') {
      return problemJson({
        status: 403,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/admin-messages-status-unauthorized',
        instance: '/api/admin/messages/{id}/status',
      });
    }

    const formData = await request.formData();
    const status = formData.get('status')?.toString();

    if (!status) {
      return problemJson({
        status: 400,
        title: 'Geçersiz Durum',
        detail: 'status zorunludur',
        type: '/problems/admin-messages-status-validation',
        instance: '/api/admin/messages/{id}/status',
      });
    }

    await updateAdminMessageStatus({
      id: String(id || ''),
      status,
      adminId: locals.user?.id || null,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    logger.error('Message status update error:', err);
    return problemJson({
      status: 500,
      title: 'Mesaj Durumu Güncellenemedi',
      detail: safeErrorDetail(err, 'server_error'),
      type: '/problems/admin-messages-status-failed',
      instance: '/api/admin/messages/{id}/status',
    });
  }
};
