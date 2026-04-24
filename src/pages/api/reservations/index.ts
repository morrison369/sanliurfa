import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';
import { sendEmail } from '../../../lib/email';
import { logger } from '../../../lib/logging';
import { problemJson } from '../../../lib/api';

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
    const params: any[] = [];
    let paramIndex = 1;

    // Yetki kontrolü
    if (auth.user.role === 'vendor' && auth.placeId) {
      sql += ` AND r.place_id = $${paramIndex}`;
      params.push(auth.placeId);
      paramIndex++;
    } else if (placeId && auth.user.role === 'admin') {
      sql += ` AND r.place_id = $${paramIndex}`;
      params.push(placeId);
      paramIndex++;
    }

    if (status) {
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

    return new Response(JSON.stringify({
      success: true,
      reservations: result.rows
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
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

    // Aynı gün/saat için mevcut rezervasyon kontrolü (telefon bazlı)
    const existingResult = await query(
      `SELECT id FROM reservations 
       WHERE place_id = $1 AND reservation_date = $2 AND reservation_time = $3 
       AND customer_phone = $4 AND status IN ('pending', 'confirmed')`,
      [placeId, reservationDate, reservationTime, customerPhone]
    );

    if (existingResult.rows.length > 0) {
      return problemJson({
        status: 409,
        title: 'Çakışma',
        detail: 'Bu tarih ve saat için mevcut rezervasyonunuz var',
        type: '/problems/reservations-create-conflict',
        instance: '/api/reservations',
      });
    }

    // Rezervasyon oluştur
    const reservationResult = await query(
      `INSERT INTO reservations (
        place_id, customer_name, customer_email, customer_phone,
        reservation_date, reservation_time, party_size, special_requests,
        occasion, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
      RETURNING *`,
      [placeId, customerName, customerEmail || null, customerPhone,
       reservationDate, reservationTime, partySize, specialRequests || null,
       occasion || null]
    );

    const reservation = reservationResult.rows[0];

    // İşletme sahibine bildirim emaili gönder
    const ownerResult = await query(
      `SELECT u.email FROM places p JOIN users u ON u.id = p.owner_id WHERE p.id = $1`,
      [placeId]
    );
    const ownerEmail = ownerResult.rows[0]?.email;
    if (ownerEmail) {
      await sendEmail({
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
    }

    return new Response(JSON.stringify({
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
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
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
