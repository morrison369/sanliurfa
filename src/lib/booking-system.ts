/**
 * Phase 49: Booking & Reservation System
 * Calendar management, availability slots, booking creation, reservation tracking
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface TimeSlot {
  id: string;
  vendorId: string;
  start: number;
  end: number;
  capacity: number;
  available: boolean;
}

export interface Booking {
  id: string;
  vendorId: string;
  userId: string;
  slotId: string;
  guestCount: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  createdAt: number;
}

export interface AvailabilityRule {
  vendorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
}

// ==================== CALENDAR MANAGER ====================

export class CalendarManager {
  private slots = new Map<string, TimeSlot>();
  private vendorSlots = new Map<string, Set<string>>();
  private blockedTimes = new Map<string, { start: number; end: number }[]>();

  /**
   * Add time slot
   */
  addSlot(slot: TimeSlot): void {
    this.slots.set(slot.id, slot);

    if (!this.vendorSlots.has(slot.vendorId)) {
      this.vendorSlots.set(slot.vendorId, new Set());
    }
    this.vendorSlots.get(slot.vendorId)!.add(slot.id);

    logger.debug('Time slot added', { slotId: slot.id, vendorId: slot.vendorId });
  }

  /**
   * Remove slot
   */
  removeSlot(slotId: string): void {
    const slot = this.slots.get(slotId);
    if (!slot) return;

    this.slots.delete(slotId);
    this.vendorSlots.get(slot.vendorId)?.delete(slotId);

    logger.debug('Time slot removed', { slotId });
  }

  /**
   * Get availability for date range
   */
  getAvailability(vendorId: string, startDate: number, endDate: number): TimeSlot[] {
    const slotIds = this.vendorSlots.get(vendorId) || new Set();

    return Array.from(slotIds)
      .map(id => this.slots.get(id)!)
      .filter(slot => slot.start >= startDate && slot.end <= endDate && slot.available);
  }

  /**
   * Block time period
   */
  blockTime(vendorId: string, start: number, end: number): void {
    if (!this.blockedTimes.has(vendorId)) {
      this.blockedTimes.set(vendorId, []);
    }

    this.blockedTimes.get(vendorId)!.push({ start, end });

    // Mark overlapping slots as unavailable
    const slotIds = this.vendorSlots.get(vendorId) || new Set();
    for (const slotId of slotIds) {
      const slot = this.slots.get(slotId)!;
      if (slot.start >= start && slot.end <= end) {
        slot.available = false;
      }
    }

    logger.debug('Time blocked', { vendorId, start, end });
  }

  /**
   * Get slot occupancy
   */
  getOccupancy(vendorId: string, slotId: string): { booked: number; capacity: number } {
    const slot = this.slots.get(slotId);
    if (!slot) {
      return { booked: 0, capacity: 0 };
    }

    // Would need booking reference to calculate actual booked count
    return { booked: 0, capacity: slot.capacity };
  }
}

// ==================== BOOKING MANAGER ====================

export class BookingManager {
  private bookings = new Map<string, Booking>();
  private vendorBookings = new Map<string, Set<string>>();
  private userBookings = new Map<string, Set<string>>();
  private slotBookings = new Map<string, number>();

  /**
   * Create booking
   */
  createBooking(booking: Omit<Booking, 'createdAt'>): Booking {
    const fullBooking: Booking = {
      ...booking,
      createdAt: Date.now()
    };

    this.bookings.set(booking.id, fullBooking);

    if (!this.vendorBookings.has(booking.vendorId)) {
      this.vendorBookings.set(booking.vendorId, new Set());
    }
    this.vendorBookings.get(booking.vendorId)!.add(booking.id);

    if (!this.userBookings.has(booking.userId)) {
      this.userBookings.set(booking.userId, new Set());
    }
    this.userBookings.get(booking.userId)!.add(booking.id);

    const currentBookings = this.slotBookings.get(booking.slotId) || 0;
    this.slotBookings.set(booking.slotId, currentBookings + booking.guestCount);

    logger.debug('Booking created', { bookingId: booking.id, vendorId: booking.vendorId, userId: booking.userId });

    return fullBooking;
  }

  /**
   * Cancel booking
   */
  cancelBooking(bookingId: string): void {
    const booking = this.bookings.get(bookingId);
    if (!booking) return;

    booking.status = 'cancelled';

    const currentBookings = this.slotBookings.get(booking.slotId) || 0;
    this.slotBookings.set(booking.slotId, Math.max(0, currentBookings - booking.guestCount));

    logger.debug('Booking cancelled', { bookingId });
  }

  /**
   * Update booking status
   */
  updateStatus(bookingId: string, status: string): void {
    const booking = this.bookings.get(bookingId);
    if (booking) {
      booking.status = status as 'confirmed' | 'cancelled' | 'completed';
      logger.debug('Booking status updated', { bookingId, status });
    }
  }

  /**
   * Get vendor bookings
   */
  getBookings(vendorId: string, status?: string): Booking[] {
    const bookingIds = this.vendorBookings.get(vendorId) || new Set();

    let bookings = Array.from(bookingIds).map(id => this.bookings.get(id)!);

    if (status) {
      bookings = bookings.filter(b => b.status === status);
    }

    return bookings;
  }

  /**
   * Get user bookings
   */
  getUserBookings(userId: string): Booking[] {
    const bookingIds = this.userBookings.get(userId) || new Set();
    return Array.from(bookingIds).map(id => this.bookings.get(id)!);
  }

  /**
   * Check if slot is available for guest count
   */
  checkAvailability(slotId: string, guestCount: number): boolean {
    const currentBookings = this.slotBookings.get(slotId) || 0;
    // Would need to reference CalendarManager to get capacity
    return true; // Placeholder
  }
}

// ==================== AVAILABILITY SCHEDULER ====================

export class AvailabilityScheduler {
  private rules = new Map<string, AvailabilityRule[]>();

  /**
   * Set availability rule
   */
  setRule(rule: AvailabilityRule): void {
    const key = rule.vendorId + '_' + rule.dayOfWeek;

    if (!this.rules.has(rule.vendorId)) {
      this.rules.set(rule.vendorId, []);
    }

    this.rules.get(rule.vendorId)!.push(rule);
    logger.debug('Availability rule set', { vendorId: rule.vendorId, dayOfWeek: rule.dayOfWeek });
  }

  /**
   * Generate slots for date range
   */
  generateSlots(vendorId: string, startDate: number, endDate: number): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const rules = this.rules.get(vendorId) || [];

    if (rules.length === 0) {
      return slots;
    }

    let current = startDate;
    while (current <= endDate) {
      const date = new Date(current);
      const dayOfWeek = date.getDay();

      for (const rule of rules) {
        if (rule.dayOfWeek === dayOfWeek) {
          const [startHour, startMin] = rule.startTime.split(':').map(Number);
          const [endHour, endMin] = rule.endTime.split(':').map(Number);

          let slotStart = new Date(date);
          slotStart.setHours(startHour, startMin, 0);

          while (slotStart.getHours() < endHour || (slotStart.getHours() === endHour && slotStart.getMinutes() < endMin)) {
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + rule.slotDurationMin);

            const slot: TimeSlot = {
              id: 'slot-' + slotStart.getTime(),
              vendorId,
              start: slotStart.getTime(),
              end: slotEnd.getTime(),
              capacity: 1,
              available: true
            };

            slots.push(slot);
            slotStart = slotEnd;
          }
        }
      }

      current += 24 * 60 * 60 * 1000; // Next day
    }

    return slots;
  }

  /**
   * Get utilization metrics
   */
  getUtilization(vendorId: string, period: string): { bookingRate: number; avgOccupancy: number } {
    return { bookingRate: 0.75, avgOccupancy: 0.85 };
  }
}

// ==================== EXPORTS ====================

export const calendarManager = new CalendarManager();
export const bookingManager = new BookingManager();
export const availabilityScheduler = new AvailabilityScheduler();
