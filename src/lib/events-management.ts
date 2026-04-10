/**
 * Events Management Library
 * Handle event creation, browsing, search, and RSVP management
 */

import { query, queryOne, queryRows, insert } from './postgres';
import { getCache, setCache, deleteCache } from './cache';
import { logger } from './logging';

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

/**
 * Get event by ID
 */
export async function getEventById(eventId: string): Promise<Event | null> {
  try {
    const cacheKey = `sanliurfa:event:${eventId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
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

    const event: Event = {
      id: result.id,
      title: result.title,
      slug: result.slug,
      description: result.description,
      place_id: result.place_id,
      start_date: result.start_date,
      end_date: result.end_date,
      location: result.location,
      organizer: result.organizer,
      category: result.category,
      capacity: result.capacity,
      image_url: result.image_url,
      is_online: result.is_online,
      is_free: result.is_free,
      price: result.price,
      view_count: result.view_count,
      status: result.status,
      attendee_count: result.attendee_count,
      created_at: result.created_at,
      updated_at: result.updated_at
    };

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
    const cacheKey = `sanliurfa:events:list:${limit}:${offset}:${JSON.stringify(filters || {})}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
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

    const results = await queryRows(
      `SELECT * FROM events ${whereClause}
       ORDER BY start_date ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const events: Event[] = results.map((r: any) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      place_id: r.place_id,
      start_date: r.start_date,
      end_date: r.end_date,
      location: r.location,
      organizer: r.organizer,
      category: r.category,
      capacity: r.capacity,
      image_url: r.image_url,
      is_online: r.is_online,
      is_free: r.is_free,
      price: r.price,
      view_count: r.view_count,
      status: r.status,
      attendee_count: r.attendee_count,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

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
    const results = await queryRows(
      `SELECT * FROM events
       WHERE status = 'active'
         AND (title ILIKE $1 OR description ILIKE $1)
       ORDER BY start_date ASC
       LIMIT $2`,
      [`%${queryText}%`, limit]
    );

    return results.map((r: any) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      place_id: r.place_id,
      start_date: r.start_date,
      end_date: r.end_date,
      location: r.location,
      organizer: r.organizer,
      category: r.category,
      capacity: r.capacity,
      image_url: r.image_url,
      is_online: r.is_online,
      is_free: r.is_free,
      price: r.price,
      view_count: r.view_count,
      status: r.status,
      attendee_count: r.attendee_count,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
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
    const existing = await queryOne(
      'SELECT id FROM event_attendees WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );

    if (existing) {
      await query(
        'DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2',
        [eventId, userId]
      );

      await query(
        'UPDATE events SET attendee_count = attendee_count - 1 WHERE id = $1',
        [eventId]
      );
    } else {
      await insert('event_attendees', {
        event_id: eventId,
        user_id: userId,
        status: 'attending'
      });

      await query(
        'UPDATE events SET attendee_count = attendee_count + 1 WHERE id = $1',
        [eventId]
      );
    }

    await deleteCache(`sanliurfa:event:${eventId}`);
    await deleteCache(`sanliurfa:event:attendees:${eventId}`);

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
    const cacheKey = `sanliurfa:event:attendees:${eventId}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const results = await queryRows(
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
    const cacheKey = `sanliurfa:events:upcoming:${limit}`;
    const cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const results = await queryRows(
      `SELECT * FROM events
       WHERE status = 'active' AND start_date > NOW()
       ORDER BY start_date ASC
       LIMIT $1`,
      [limit]
    );

    const events: Event[] = results.map((r: any) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      place_id: r.place_id,
      start_date: r.start_date,
      end_date: r.end_date,
      location: r.location,
      organizer: r.organizer,
      category: r.category,
      capacity: r.capacity,
      image_url: r.image_url,
      is_online: r.is_online,
      is_free: r.is_free,
      price: r.price,
      view_count: r.view_count,
      status: r.status,
      attendee_count: r.attendee_count,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    await setCache(cacheKey, JSON.stringify(events), 3600);

    return events;
  } catch (error) {
    logger.error('Failed to get upcoming events', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
