import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { sendEmail } from '../../../lib/email';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';

// Rezervasyon detayı görüntüle
export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/reservations-detail-unauthorized',
        instance: `/api/reservations/${context.params.id}`,
      });
    }

    const { id } = context.params;

    const result = await query(
      `SELECT r.*, p.name as place_name, p.slug as place_slug
       FROM reservations r
       JOIN places p ON r.place_id = p.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Rezervasyon bulunamadı',
        type: '/problems/reservations-detail-not-found',
        instance: `/api/reservations/${id}`,
      });
    }

    const reservation = result.rows[0];

    // Yetki kontrolü
    if (auth.user.role === 'vendor' && auth.placeId !== reservation.place_id) {
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Bu rezervasyon için yetkiniz yok',
        type: '/problems/reservations-detail-forbidden',
        instance: `/api/reservations/${id}`,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      reservation
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Reservation detail error:', error);
    return problemJson({
      status: 500,
      title: 'Rezervasyon Detayı Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/reservations-detail-failed',
      instance: `/api/reservations/${context.params.id}`,
    });
  }
};

// Rezervasyon güncelle (onaylama, reddetme, iptal)
export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/reservations-update-unauthorized',
        instance: `/api/reservations/${context.params.id}`,
      });
    }

    const { id } = context.params;
    const body = await context.request.json();
    const { status, notes, tableNumber } = body;

    // Mevcut rezervasyonu al
    const existingResult = await query(
      'SELECT * FROM reservations WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Rezervasyon bulunamadı',
        type: '/problems/reservations-update-not-found',
        instance: `/api/reservations/${id}`,
      });
    }

    const reservation = existingResult.rows[0];

    // Yetki kontrolü
    if (auth.user.role === 'vendor' && auth.placeId !== reservation.place_id) {
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Bu rezervasyon için yetkiniz yok',
        type: '/problems/reservations-update-forbidden',
        instance: `/api/reservations/${id}`,
      });
    }

    // Status güncelleme validasyonu
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (status && !validStatuses.includes(status)) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Geçersiz rezervasyon durumu',
        type: '/problems/reservations-update-status-invalid',
        instance: `/api/reservations/${id}`,
      });
    }

    // Güncelleme sorgusu oluştur
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;

      // Status değişikliği zamanı
      updates.push(`status_updated_at = NOW()`);
      
      // Onaylandığında confirmation_sent güncelle
      if (status === 'confirmed') {
        updates.push(`confirmation_sent = true`);
      }
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(notes);
      paramIndex++;
    }

    if (tableNumber !== undefined) {
      updates.push(`table_number = $${paramIndex}`);
      params.push(tableNumber);
      paramIndex++;
    }

    if (updates.length === 0) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Güncellenecek alan yok',
        type: '/problems/reservations-update-no-fields',
        instance: `/api/reservations/${id}`,
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const updateResult = await query(
      `UPDATE reservations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const updatedReservation = updateResult.rows[0];

    // Müşteriye durum güncellemesi emaili gönder
    const r = updatedReservation;
    if (r.customer_email && r.status) {
      const statusLabels: Record<string, string> = {
        confirmed: 'Onaylandı',
        cancelled: 'İptal Edildi',
        completed: 'Tamamlandı',
        rejected: 'Reddedildi',
      };
      const label = statusLabels[r.status];
      if (label) {
        await sendEmail({
          to: r.customer_email,
          subject: `Rezervasyon Durumu: ${label}`,
          html: `<p>Sayın ${r.customer_name}, rezervasyonunuzun durumu güncellendi:</p>
<ul>
  <li><strong>Durum:</strong> ${label}</li>
  <li><strong>Tarih:</strong> ${r.reservation_date} ${r.reservation_time}</li>
  <li><strong>Kişi sayısı:</strong> ${r.party_size}</li>
</ul>`,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Reservation updated successfully',
      reservation: updatedReservation
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Reservation update error:', error);
    return problemJson({
      status: 500,
      title: 'Rezervasyon Güncellenemedi',
      detail: 'Sunucu hatası',
      type: '/problems/reservations-update-failed',
      instance: `/api/reservations/${context.params.id}`,
    });
  }
};

// Rezervasyon sil (admin only)
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Admin yetkisi gerekli',
        type: '/problems/reservations-delete-unauthorized',
        instance: `/api/reservations/${context.params.id}`,
      });
    }

    const { id } = context.params;

    const result = await query(
      'DELETE FROM reservations WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Rezervasyon bulunamadı',
        type: '/problems/reservations-delete-not-found',
        instance: `/api/reservations/${id}`,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Reservation deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Reservation delete error:', error);
    return problemJson({
      status: 500,
      title: 'Rezervasyon Silinemedi',
      detail: 'Sunucu hatası',
      type: '/problems/reservations-delete-failed',
      instance: `/api/reservations/${context.params.id}`,
    });
  }
};
