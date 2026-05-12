import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { sendEmail } from '../../../lib/email';
import { logger } from '../../../lib/logging';
import { apiResponse, problemJson, HttpStatus } from '../../../lib/api';

// Rezervasyonları listele (işletme sahibi veya admin)
export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return problemJson({
        status: 401,
        title: 'Unauthorized',
        detail: 'Oturum açmanız gerekiyor',
        type: '/problems/reservations-list-unauthorized',
        instance: '/api/reservations',
      });
    }

    const url = new URL(context.request.url);
    const placeId = url.searchParams.get('placeId');
    const status = url.searchParams.get('status');
    const date = url.searchParams.get('date');

    let sql = `
      SELECT r.*, p.name as place_name, p.slug as place_slug
      FROM reservations r
      JOIN places p ON r.place_id = p.id
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    // Yetki: admin tüm rezervasyonları görür (placeId filter opsiyonel),
    // vendor sadece kendi mekanına ait olanları, diğer roller (user, moderator) erişemez
    // (rezervasyonlar guest-only — customer_email/phone PII içerir)
    if (auth.user.role === 'admin') {
      if (placeId) {
        sql += ` AND r.place_id = $${paramIndex}`;
        params.push(placeId);
        paramIndex++;
      }
    } else if (auth.user.role === 'vendor' && auth.placeId) {
      sql += ` AND r.place_id = $${paramIndex}`;
      params.push(auth.placeId);
      paramIndex++;
    } else {
      return problemJson({
        status: 403,
        title: 'Forbidden',
        detail: 'Rezervasyon listesini görüntüleme yetkiniz yok',
        type: '/problems/reservations-list-forbidden',
        instance: '/api/reservations',
      });
    }

    if (status) {
      const VALID_RESERVATION_STATUSES = new Set(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']);
      if (!VALID_RESERVATION_STATUSES.has(status)) {
        return problemJson({
          status: 400,
          title: 'Geçersiz İstek',
          detail: 'Geçersiz rezervasyon durumu',
          type: '/problems/reservations-status-invalid',
          instance: '/api/reservations',
        });
      }
      sql += ` AND r.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (date) {
      sql += ` AND r.reservation_date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    sql += ` ORDER BY r.reservation_date ASC, r.reservation_time ASC`;

    const result = await query(sql, params);

    return apiResponse({
      success: true,
      reservations: result.rows
    }, HttpStatus.OK);
  } catch (error) {
    logger.error('Reservations list error:', error);
    return problemJson({
      status: 500,
      title: 'Rezervasyonlar Alınamadı',
      detail: 'Sunucu hatası',
      type: '/problems/reservations-list-failed',
      instance: '/api/reservations',
    });
  }
};

// Yeni rezervasyon oluştur (herkes)
export const POST: APIRoute = async (context) => {
  try {
    const body = await context.request.json();
    const {
      placeId,
      customerName,
      customerEmail,
      customerPhone,
      reservationDate,
      reservationTime,
      partySize,
      specialRequests,
      occasion
    } = body;

    // Validasyon
    if (!placeId || !customerName || !customerPhone || !reservationDate || !reservationTime || !partySize) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Zorunlu alanlar eksik',
        type: '/problems/reservations-create-validation',
        instance: '/api/reservations',
      });
    }

    // Telefon validasyonu
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(customerPhone.replace(/\D/g, ''))) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Telefon numarası geçersiz',
        type: '/problems/reservations-create-phone-invalid',
        instance: '/api/reservations',
      });
    }

    if (customerName.length > 200) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'İsim 200 karakterden uzun olamaz', type: '/problems/reservations-create-name-too-long', instance: '/api/reservations' });
    if (customerEmail !== undefined && customerEmail !== null && (typeof customerEmail !== 'string' || customerEmail.length > 254)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'E-posta 254 karakterden uzun olamaz', type: '/problems/reservations-create-email-too-long', instance: '/api/reservations' });
    if (specialRequests !== undefined && specialRequests !== null && (typeof specialRequests !== 'string' || specialRequests.length > 1000)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Özel istek 1000 karakterden uzun olamaz', type: '/problems/reservations-create-requests-too-long', instance: '/api/reservations' });
    if (occasion !== undefined && occasion !== null && (typeof occasion !== 'string' || occasion.length > 200)) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Özel gün 200 karakterden uzun olamaz', type: '/problems/reservations-create-occasion-too-long', instance: '/api/reservations' });
    const partySizeNum = parseInt(String(partySize), 10);
    if (!Number.isFinite(partySizeNum) || partySizeNum < 1 || partySizeNum > 500) return problemJson({ status: 400, title: 'Geçersiz İstek', detail: 'Kişi sayısı 1-500 arasında olmalıdır', type: '/problems/reservations-create-partysize-invalid', instance: '/api/reservations' });

    // Tarih validasyonu
    const reservationDateObj = new Date(reservationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);

    if (reservationDateObj < today) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Rezervasyon tarihi geçmişte olamaz',
        type: '/problems/reservations-create-date-past',
        instance: '/api/reservations',
      });
    }

    if (reservationDateObj > maxDate) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Rezervasyon en fazla 3 ay sonrası için yapılabilir',
        type: '/problems/reservations-create-date-max',
        instance: '/api/reservations',
      });
    }

    // İşletme bilgilerini al
    const placeResult = await query(
      'SELECT name, accepts_reservations FROM places WHERE id = $1',
      [placeId]
    );

    if (placeResult.rows.length === 0) {
      return problemJson({
        status: 404,
        title: 'Bulunamadı',
        detail: 'Mekan bulunamadı',
        type: '/problems/reservations-create-place-not-found',
        instance: '/api/reservations',
      });
    }

    const place = placeResult.rows[0];
    if (!place.accepts_reservations) {
      return problemJson({
        status: 400,
        title: 'Geçersiz İstek',
        detail: 'Bu mekan rezervasyon kabul etmiyor',
        type: '/problems/reservations-create-place-not-accepting',
        instance: '/api/reservations',
      });
    }

    // Atomic INSERT WHERE NOT EXISTS — eliminates SELECT→INSERT race (HARD RULE #47)
    const reservationResult = await query(
      `INSERT INTO reservations (
        place_id, customer_name, customer_email, customer_phone,
        reservation_date, reservation_time, party_size, special_requests,
        occasion, status, created_at
      )
      SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM reservations
        WHERE place_id = $1 AND reservation_date = $5 AND reservation_time = $6
          AND customer_phone = $4 AND status IN ('pending', 'confirmed')
      )
      RETURNING *`,
      [placeId, customerName, customerEmail || null, customerPhone,
       reservationDate, reservationTime, partySizeNum, specialRequests || null,
       occasion || null]
    );

    if (reservationResult.rows.length === 0) {
      return problemJson({
        status: 409,
        title: 'Çakışma',
        detail: 'Bu tarih ve saat için mevcut rezervasyonunuz var',
        type: '/problems/reservations-create-conflict',
        instance: '/api/reservations',
      });
    }

    const reservation = reservationResult.rows[0];

    // İşletme sahibine bildirim emaili gönder
    const ownerResult = await query(
      `SELECT u.email FROM places p JOIN users u ON u.id = p.owner_id WHERE p.id = $1`,
      [placeId]
    );
    const ownerEmail = ownerResult.rows[0]?.email;
    if (ownerEmail) {
      const notifyResult = await sendEmail({
        to: ownerEmail,
        subject: `Yeni Rezervasyon - ${place.name}`,
        html: `<p><strong>${customerName}</strong> adına yeni rezervasyon:</p>
<ul>
  <li><strong>Tarih:</strong> ${reservationDate} ${reservationTime}</li>
  <li><strong>Kişi sayısı:</strong> ${partySize}</li>
  <li><strong>Telefon:</strong> ${customerPhone}</li>
  ${specialRequests ? `<li><strong>Not:</strong> ${specialRequests}</li>` : ''}
</ul>`,
      });
      if (!notifyResult.success) {
        logger.warn('Reservation owner notification email failed', { reservationId: reservation.id, ownerEmail, error: notifyResult.error });
      }
    }

    return apiResponse({
      success: true,
      message: 'Reservation created successfully',
      reservation: {
        id: reservation.id,
        confirmationCode: reservation.confirmation_code,
        placeName: place.name,
        reservationDate: reservation.reservation_date,
        reservationTime: reservation.reservation_time,
        partySize: reservation.party_size,
        status: reservation.status
      }
    }, HttpStatus.CREATED);
  } catch (error) {
    logger.error('Reservation creation error:', error);
    return problemJson({
      status: 500,
      title: 'Rezervasyon Oluşturulamadı',
      detail: 'Sunucu hatası',
      type: '/problems/reservations-create-failed',
      instance: '/api/reservations',
    });
  }
};
