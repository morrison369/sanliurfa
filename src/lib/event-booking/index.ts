/**
 * Event Booking System
 * Ticket sales, reservations, and event management
 */

import { query } from '../postgres';

export interface EventTicket {
  id: string;
  eventId: string;
  userId: string;
  type: 'standard' | 'vip' | 'early_bird';
  price: number;
  quantity: number;
  status: 'reserved' | 'paid' | 'cancelled' | 'used';
  bookedAt: Date;
  qrCode?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  capacity: number;
  soldTickets: number;
  price: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
}

/**
 * Create event
 */
export async function createEvent(
  data: Omit<Event, 'id' | 'soldTickets'>
): Promise<Event> {
  const result = await query(
    `INSERT INTO events (title, description, start_date, end_date, location, capacity, price, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [data.title, data.description, data.startDate, data.endDate, 
     data.location, data.capacity, data.price, data.status]
  );
  return result.rows[0];
}

/**
 * Book tickets
 */
export async function bookTickets(
  eventId: string,
  userId: string,
  type: string,
  quantity: number
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  // Atomic CTE (HARD RULE #47): SELECT capacity → check → INSERT race-prone (over-booking).
  // UPDATE WHERE attendee_count + $1 <= capacity guarantees atomic capacity check.
  const result = await query(
    `WITH updated AS (
       UPDATE events
       SET attendee_count = attendee_count + $1
       WHERE id = $2 AND attendee_count + $1 <= capacity
       RETURNING id, price
     )
     INSERT INTO event_tickets (event_id, user_id, type, price, quantity, status, booked_at)
     SELECT id, $3, $4, price * $1, $1, 'reserved', NOW() FROM updated
     RETURNING id`,
    [quantity, eventId, userId, type]
  );

  if (result.rows.length === 0) {
    // Either event missing or no capacity — distinguish via secondary lookup
    const exists = await query(`SELECT 1 FROM events WHERE id = $1`, [eventId]);
    return { success: false, error: exists.rows.length === 0 ? 'Event not found' : 'Not enough tickets available' };
  }

  return { success: true, ticketId: result.rows[0].id };
}

/**
 * Get user's tickets
 */
export async function getUserTickets(userId: string): Promise<EventTicket[]> {
  const result = await query(
    `SELECT t.*, e.title as event_title, e.start_date, e.location
     FROM event_tickets t
     JOIN events e ON t.event_id = e.id
     WHERE t.user_id = $1
     ORDER BY t.booked_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Cancel ticket
 */
export async function cancelTicket(ticketId: string, userId: string): Promise<boolean> {
  const result = await query(
    `UPDATE event_tickets 
     SET status = 'cancelled', cancelled_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status != 'used'
     RETURNING quantity, event_id`,
    [ticketId, userId]
  );

  if (result.rows.length > 0) {
    // Restore capacity
    await query(
      `UPDATE events SET attendee_count = GREATEST(0, attendee_count - $1) WHERE id = $2`,
      [result.rows[0].quantity, result.rows[0].event_id]
    );
    return true;
  }

  return false;
}
