/**
 * GET /api/places/[id]/availability?date=YYYY-MM-DD
 * Returns available reservation time slots for a place on a given date
 */

import type { APIRoute } from 'astro';
import { query } from '../../../../lib/postgres';
import { apiResponse, apiError, HttpStatus, ErrorCode, getRequestId } from '../../../../lib/api';
import { logger } from '../../../../lib/logger';

export const GET: APIRoute = async ({ request, params, url }) => {
  const requestId = getRequestId({ request } as any);

  try {
    const { id } = params;
    if (!id) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Place ID zorunludur', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    const dateStr = url.searchParams.get('date');
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return apiError(ErrorCode.VALIDATION_ERROR, 'Geçerli tarih gerekli (YYYY-AA-GG)', HttpStatus.BAD_REQUEST, undefined, requestId);
    }

    // Get place reservation settings
    const place = await query(
      `SELECT id, name, reservation_required, max_party_size, min_party_size
       FROM places WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (place.rows.length === 0) {
      return apiError(ErrorCode.NOT_FOUND, 'Mekan bulunamadı', HttpStatus.NOT_FOUND, undefined, requestId);
    }

    // Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();

    // Get place hours for that day
    const hours = await query(
      `SELECT open_time, close_time, is_closed
       FROM place_hours WHERE place_id = $1 AND day_of_week = $2`,
      [id, dayOfWeek]
    ).catch(() => ({ rows: [] as any[] }));

    if (hours.rows[0]?.is_closed) {
      return apiResponse({ available: false, slots: [], reason: 'Kapalı' }, HttpStatus.OK, requestId);
    }

    // Get existing reservations for that date
    const existing = await query(
      `SELECT reservation_time, party_size FROM reservations
       WHERE place_id = $1 AND reservation_date = $2 AND status NOT IN ('cancelled', 'no_show')`,
      [id, dateStr]
    ).catch(() => ({ rows: [] as any[] }));

    // Generate 30-min slots between open_time and close_time (default 10:00-22:00)
    const openTime = hours.rows[0]?.open_time ? String(hours.rows[0].open_time).slice(0, 5) : '10:00';
    const closeTime = hours.rows[0]?.close_time ? String(hours.rows[0].close_time).slice(0, 5) : '22:00';

    const slots: string[] = [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    const reservedTimes = new Set(existing.rows.map((r: any) => String(r.reservation_time).slice(0, 5)));

    for (let m = openMinutes; m < closeMinutes - 30; m += 30) {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const min = (m % 60).toString().padStart(2, '0');
      const slot = `${h}:${min}`;
      if (!reservedTimes.has(slot)) {
        slots.push(slot);
      }
    }

    return apiResponse({ available: slots.length > 0, slots, date: dateStr }, HttpStatus.OK, requestId);
  } catch (error) {
    logger.error('Availability check failed', error instanceof Error ? error : new Error(String(error)));
    return apiError(ErrorCode.INTERNAL_ERROR, 'Müsaitlik kontrol edilemedi', HttpStatus.INTERNAL_SERVER_ERROR, undefined, requestId);
  }
};
