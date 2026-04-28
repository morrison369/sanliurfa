/**
 * Events Management Library
 * Handle event creation, browsing, search, and RSVP management
 */

import { query, queryOne, queryMany } from '../postgres';
import { getCache, setCache, deleteCache } from '../cache';
import { logger } from '../logger';
import { resolveContentImage } from '../content-images';

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  place_id?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  organizer?: string;
  category?: string;
  capacity?: number;
  image_url?: string;
  is_online?: boolean;
  is_free?: boolean;
  price?: number;
  view_count?: number;
  status?: string;
  attendee_count?: number;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

function normalizeEventImage(row: any): string {
  return resolveContentImage({
    category: 'etkinlikler',
    slug: row?.slug,
    explicit: row?.image_url,
    placeholder: '/images/placeholder-event.jpg',
  });
}

function toEvent(row: any): Event {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    place_id: row.place_id,
    start_date: row.start_date,
    end_date: row.end_date,
    location: row.location,
    organizer: row.organizer,
    category: row.category,
    capacity: row.capacity,
    image_url: normalizeEventImage(row),
    is_online: row.is_online,
    is_free: row.is_free,
    price: row.price,
    view_count: row.view_count,
    status: row.status,
    attendee_count: row.attendee_count,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string): Promise<Event | null> {
  try {
    const cacheKey = `event:${eventId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return cached as any;
    }

    const result = await queryOne(
      'SELECT * FROM events WHERE id = $1',
      [eventId]
    );

    if (!result) {
      return null;
    }

    await query(
      'UPDATE events SET view_count = view_count + 1 WHERE id = $1',
      [eventId]
    );

    const event: Event = toEvent(result);

    await setCache(cacheKey, JSON.stringify(event), 600);

    return event;
  } catch (error) {
    logger.error('Failed to get event', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get events with filtering and pagination
 */
export async function getEvents(
  limit: number = 20,
  offset: number = 0,
  filters?: { category?: string; status?: string; placeId?: string }
): Promise<{ events: Event[]; total: number }> {
  try {
    const cacheKey = `events:list:${limit}:${offset}:${JSON.stringify(filters || {})}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return cached as any;
    }

    let whereClause = 'WHERE status = $1';
    const params: any[] = ['active'];

    if (filters?.category) {
      whereClause += ` AND category = $${params.length + 1}`;
      params.push(filters.category);
    }

    if (filters?.placeId) {
      whereClause += ` AND place_id = $${params.length + 1}`;
      params.push(filters.placeId);
    }

    const countResult = await queryOne(
      `SELECT COUNT(*) as count FROM events ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0');

    const results = await queryMany(
      `SELECT * FROM events ${whereClause}
       ORDER BY start_date ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const events: Event[] = results.map((r: any) => toEvent(r));

    const result = { events, total };
    await setCache(cacheKey, JSON.stringify(result), 300);

    return result;
  } catch (error) {
    logger.error('Failed to get events', error instanceof Error ? error : new Error(String(error)));
    return { events: [], total: 0 };
  }
}

/**
 * Search events
 */
export async function searchEvents(queryText: string, limit: number = 20): Promise<Event[]> {
  try {
    const results = await queryMany(
      `SELECT * FROM events
       WHERE status = 'active'
         AND (title ILIKE $1 OR description ILIKE $1)
       ORDER BY start_date ASC
       LIMIT $2`,
      [`%${queryText}%`, limit]
    );

    return results.map((r: any) => toEvent(r));
  } catch (error) {
    logger.error('Failed to search events', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Toggle RSVP for an event
 */
export async function toggleRsvp(eventId: string, userId: string): Promise<boolean> {
  try {
    // Atomic INSERT — ON CONFLICT means "already attending" → toggle off
    const inserted = await queryOne<{ id: string }>(
      `INSERT INTO event_attendees (event_id, user_id, status)
       VALUES ($1, $2, 'attending')
       ON CONFLICT (event_id, user_id) DO NOTHING
       RETURNING id`,
      [eventId, userId]
    );

    if (inserted) {
      await query('UPDATE events SET attendee_count = attendee_count + 1 WHERE id = $1', [eventId]);
    } else {
      const deleted = await query(
        'DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );
      if ((deleted.rowCount ?? 0) > 0) {
        await query('UPDATE events SET attendee_count = GREATEST(0, attendee_count - 1) WHERE id = $1', [eventId]);
      }
    }

    await deleteCache(`event:${eventId}`);
    await deleteCache(`event:attendees:${eventId}`);

    logger.info('RSVP toggled', { eventId, userId });
    return true;
  } catch (error) {
    logger.error('Failed to toggle RSVP', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get all attendees for an event
 */
export async function getEventAttendees(eventId: string): Promise<EventAttendee[]> {
  try {
    const cacheKey = `event:attendees:${eventId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return cached as any;
    }

    const results = await queryMany(
      `SELECT * FROM event_attendees
       WHERE event_id = $1
       ORDER BY created_at DESC`,
      [eventId]
    );

    const attendees: EventAttendee[] = results.map((r: any) => ({
      id: r.id,
      event_id: r.event_id,
      user_id: r.user_id,
      status: r.status,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    await setCache(cacheKey, JSON.stringify(attendees), 300);

    return attendees;
  } catch (error) {
    logger.error('Failed to get attendees', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Check if user has RSVPd
 */
export async function hasUserRsvpd(eventId: string, userId: string): Promise<boolean> {
  try {
    const result = await queryOne(
      'SELECT id FROM event_attendees WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    return !!result;
  } catch (error) {
    logger.error('Failed to check RSVP', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(limit: number = 10): Promise<Event[]> {
  try {
    const cacheKey = `events:upcoming:${limit}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return cached as any;
    }

    const results = await queryMany(
      `SELECT * FROM events
       WHERE status = 'active' AND start_date > NOW()
       ORDER BY start_date ASC
       LIMIT $1`,
      [limit]
    );

    const events: Event[] = results.map((r: any) => toEvent(r));

    await setCache(cacheKey, JSON.stringify(events), 3600);

    return events;
  } catch (error) {
    logger.error('Failed to get upcoming events', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
