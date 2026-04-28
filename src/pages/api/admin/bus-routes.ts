import type { APIRoute } from 'astro';
import { apiResponse, safeErrorDetail } from '../../../lib/api';
import { query, queryMany, insert } from '../../../lib/postgres';
import { logger } from '../../../lib/logging';

function json(data: unknown, status = 200) {
  return apiResponse(data, status);
}

function isAdmin(locals: App.Locals) {
  return locals?.user?.role === 'admin';
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  const routeId = url.searchParams.get('routeId');

  try {
    if (routeId) {
      const [routeRows, schedules] = await Promise.all([
        queryMany(`SELECT * FROM bus_routes WHERE id = $1`, [routeId]),
        queryMany(
          `SELECT * FROM bus_schedules WHERE route_id = $1 ORDER BY day_type, direction, departure_time`,
          [routeId],
        ),
      ]);
      const route = routeRows[0];
      if (!route) return json({ error: 'Hat bulunamadı' }, 404);
      return json({ success: true, route, schedules });
    }

    const routes = await queryMany(
      `SELECT r.*,
              COUNT(s.id) FILTER (WHERE s.day_type = 'weekday') as weekday_count,
              COUNT(s.id) FILTER (WHERE s.day_type = 'weekend') as weekend_count
       FROM bus_routes r
       LEFT JOIN bus_schedules s ON s.route_id = r.id
       GROUP BY r.id
       ORDER BY r.route_no`,
      [],
    );
    return json({ success: true, routes });
  } catch (err) {
    logger.error('bus-routes GET failed', err instanceof Error ? err : new Error(String(err)));
    return json({ error: safeErrorDetail(err, 'Hatlar listelenemedi') }, 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!isAdmin(locals)) return json({ error: 'Unauthorized' }, 401);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: 'Geçersiz JSON' }, 400); }

  const { action } = body;

  try {
    if (action === 'add_route') {
      const { route_no, name, start_stop, end_stop, notes } = body;
      if (!route_no || !name) return json({ error: 'route_no ve name zorunlu' }, 400);
      const routeNoNum = parseInt(String(route_no), 10);
      if (!Number.isFinite(routeNoNum) || routeNoNum < 1) return json({ error: 'Geçersiz hat numarası' }, 400);
      if (typeof name === 'string' && name.length > 200) return json({ error: 'Hat adı 200 karakterden uzun olamaz' }, 400);
      if (typeof notes === 'string' && notes.length > 1000) return json({ error: 'Not 1000 karakterden uzun olamaz' }, 400);
      const row = await insert('bus_routes', { route_no: routeNoNum, name, start_stop: start_stop || null, end_stop: end_stop || null, notes: notes || null, is_active: true });
      return json({ success: true, route: row });
    }

    if (action === 'toggle_route') {
      const { routeId } = body;
      if (!routeId) return json({ error: 'routeId zorunlu' }, 400);
      await query(`UPDATE bus_routes SET is_active = NOT is_active WHERE id = $1`, [routeId]);
      return json({ success: true });
    }

    if (action === 'add_schedule') {
      const { routeId, day_type, direction, departure_time } = body;
      if (!routeId || !day_type || !direction || !departure_time) {
        return json({ error: 'routeId, day_type, direction, departure_time zorunlu' }, 400);
      }
      const VALID_DAY_TYPES = new Set(['weekday', 'weekend']);
      if (!VALID_DAY_TYPES.has(day_type as string)) return json({ error: 'Geçersiz gün tipi' }, 400);
      const VALID_DIRECTIONS = new Set(['outbound', 'inbound']);
      if (!VALID_DIRECTIONS.has(direction as string)) return json({ error: 'Geçersiz yön' }, 400);
      const row = await insert('bus_schedules', { route_id: routeId, day_type, direction, departure_time });
      return json({ success: true, schedule: row });
    }

    if (action === 'delete_schedule') {
      const { scheduleId } = body;
      if (!scheduleId) return json({ error: 'scheduleId zorunlu' }, 400);
      await query(`DELETE FROM bus_schedules WHERE id = $1`, [scheduleId]);
      return json({ success: true });
    }

    if (action === 'bulk_schedules') {
      // Replaces all schedules for a route+day_type+direction combination
      const { routeId, day_type, direction, times } = body;
      if (!routeId || !day_type || !direction || !Array.isArray(times)) {
        return json({ error: 'routeId, day_type, direction, times zorunlu' }, 400);
      }
      const VALID_DAY_TYPES_BULK = new Set(['weekday', 'weekend']);
      if (!VALID_DAY_TYPES_BULK.has(day_type as string)) return json({ error: 'Geçersiz gün tipi' }, 400);
      const VALID_DIRECTIONS_BULK = new Set(['outbound', 'inbound']);
      if (!VALID_DIRECTIONS_BULK.has(direction as string)) return json({ error: 'Geçersiz yön' }, 400);
      if (times.length > 200) return json({ error: 'times dizisi 200 öğeyi geçemez' }, 400);
      await query(
        `DELETE FROM bus_schedules WHERE route_id = $1 AND day_type = $2 AND direction = $3`,
        [routeId, day_type, direction],
      );
      for (const t of times) {
        if (typeof t === 'string' && /^\d{2}:\d{2}$/.test(t)) {
          await insert('bus_schedules', { route_id: routeId, day_type, direction, departure_time: t });
        }
      }
      return json({ success: true, message: `${times.length} sefer saati kaydedildi` });
    }

    return json({ error: `Bilinmeyen action: ${action}` }, 400);
  } catch (err) {
    logger.error('bus-routes POST failed', err instanceof Error ? err : new Error(String(err)));
    return json({ error: safeErrorDetail(err, 'İşlem başarısız oldu') }, 500);
  }
};
