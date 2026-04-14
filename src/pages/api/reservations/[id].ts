import type { APIRoute } from 'astro';
import { query } from '../../../lib/postgres';
import { authenticateUser } from '../../../lib/auth/middleware';

// Rezervasyon detayı görüntüle
export const GET: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
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
      return new Response(JSON.stringify({ error: 'Reservation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const reservation = result.rows[0];

    // Yetki kontrolü
    if (auth.user.role === 'vendor' && auth.placeId !== reservation.place_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
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
    console.error('Reservation detail error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Rezervasyon güncelle (onaylama, reddetme, iptal)
export const PUT: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
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
      return new Response(JSON.stringify({ error: 'Reservation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const reservation = existingResult.rows[0];

    // Yetki kontrolü
    if (auth.user.role === 'vendor' && auth.placeId !== reservation.place_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Status güncelleme validasyonu
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (status && !validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
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
      return new Response(JSON.stringify({ error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const updateResult = await query(
      `UPDATE reservations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    const updatedReservation = updateResult.rows[0];

    // TODO: Müşteriye durum güncellemesi emaili gönder

    return new Response(JSON.stringify({
      success: true,
      message: 'Reservation updated successfully',
      reservation: updatedReservation
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Reservation update error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Rezervasyon sil (admin only)
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = await authenticateUser(context);
    if (!auth || auth.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = context.params;

    const result = await query(
      'DELETE FROM reservations WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Reservation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
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
    console.error('Reservation delete error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
