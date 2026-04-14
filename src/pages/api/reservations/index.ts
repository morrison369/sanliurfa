import type { APIRoute } from 'astro';
import { query, transaction } from '../../../lib/postgres';
import { authenticateUser, requireAuth } from '../../../lib/auth/middleware';

// Rezervasyonları listele (işletme sahibi veya admin)
export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
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
    console.error('Reservations list error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        fields: ['placeId', 'customerName', 'customerPhone', 'reservationDate', 'reservationTime', 'partySize']
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Telefon validasyonu
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(customerPhone.replace(/\D/g, ''))) {
      return new Response(JSON.stringify({ error: 'Invalid phone number' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Tarih validasyonu
    const reservationDateObj = new Date(reservationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);

    if (reservationDateObj < today) {
      return new Response(JSON.stringify({ error: 'Reservation date cannot be in the past' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (reservationDateObj > maxDate) {
      return new Response(JSON.stringify({ error: 'Reservation can only be made up to 3 months in advance' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // İşletme bilgilerini al
    const placeResult = await query(
      'SELECT name, accepts_reservations FROM places WHERE id = $1',
      [placeId]
    );

    if (placeResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Place not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const place = placeResult.rows[0];
    if (!place.accepts_reservations) {
      return new Response(JSON.stringify({ error: 'This place does not accept reservations' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
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
      return new Response(JSON.stringify({ 
        error: 'You already have a reservation for this date and time'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
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

    // TODO: İşletme sahibine email bildirimi gönder

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
    console.error('Reservation creation error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
