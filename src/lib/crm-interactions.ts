/**
 * Phase 67: Customer Interactions & Communication
 * Call logs, email tracking, meetings, communication history, timeline
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type InteractionType = 'call' | 'email' | 'meeting' | 'task' | 'note' | 'sms' | 'social';
export type InteractionStatus = 'scheduled' | 'completed' | 'cancelled' | 'pending';

export interface Interaction {
  id: string;
  contactId: string;
  type: InteractionType;
  status: InteractionStatus;
  subject: string;
  description: string;
  duration?: number;
  participants: string[];
  scheduledAt?: number;
  completedAt?: number;
  createdAt: number;
  createdBy: string;
}

export interface CommunicationLog {
  id: string;
  contactId: string;
  direction: 'inbound' | 'outbound';
  channel: 'email' | 'phone' | 'sms' | 'chat';
  content: string;
  status: 'sent' | 'received' | 'failed';
  timestamp: number;
  sender: string;
}

export interface ContactTimeline {
  contactId: string;
  events: Array<{ type: string; title: string; timestamp: number }>;
}

// ==================== INTERACTION MANAGER ====================

export class InteractionManager {
  private interactions = new Map<string, Interaction>();
  private interactionCount = 0;

  /**
   * Create interaction
   */
  createInteraction(interaction: Omit<Interaction, 'id' | 'createdAt'>): Interaction {
    const id = 'interaction-' + Date.now() + '-' + this.interactionCount++;

    const newInteraction: Interaction = {
      ...interaction,
      id,
      createdAt: Date.now()
    };

    this.interactions.set(id, newInteraction);
    logger.info('Interaction created', { interactionId: id, type: interaction.type });

    return newInteraction;
  }

  /**
   * Get interaction
   */
  getInteraction(interactionId: string): Interaction | null {
    return this.interactions.get(interactionId) || null;
  }

  /**
   * List interactions
   */
  listInteractions(contactId: string, type?: InteractionType): Interaction[] {
    let interactions = Array.from(this.interactions.values()).filter(i => i.contactId === contactId);

    if (type) {
      interactions = interactions.filter(i => i.type === type);
    }

    return interactions;
  }

  /**
   * Update interaction
   */
  updateInteraction(interactionId: string, updates: Partial<Interaction>): void {
    const interaction = this.interactions.get(interactionId);
    if (interaction) {
      Object.assign(interaction, updates);
      logger.debug('Interaction updated', { interactionId });
    }
  }

  /**
   * Complete interaction
   */
  completeInteraction(interactionId: string): void {
    const interaction = this.interactions.get(interactionId);
    if (interaction) {
      interaction.status = 'completed';
      interaction.completedAt = Date.now();
      logger.info('Interaction completed', { interactionId });
    }
  }

  /**
   * Log call
   */
  logCall(contactId: string, duration: number, notes: string, owner: string): Interaction {
    return this.createInteraction({
      contactId,
      type: 'call',
      status: 'completed',
      subject: 'Phone Call',
      description: notes,
      duration,
      participants: [owner],
      completedAt: Date.now(),
      createdBy: owner
    });
  }

  /**
   * Schedule task
   */
  scheduleTask(contactId: string, subject: string, dueDate: number, owner: string): Interaction {
    return this.createInteraction({
      contactId,
      type: 'task',
      status: 'scheduled',
      subject,
      description: subject,
      participants: [owner],
      scheduledAt: dueDate,
      createdBy: owner
    });
  }
}

// ==================== COMMUNICATION TRACKER ====================

export class CommunicationTracker {
  private logs: CommunicationLog[] = [];
  private logCount = 0;

  /**
   * Log email
   */
  logEmail(contactId: string, direction: 'inbound' | 'outbound', content: string, sender: string): CommunicationLog {
    const log: CommunicationLog = {
      id: 'log-' + Date.now() + '-' + this.logCount++,
      contactId,
      direction,
      channel: 'email',
      content,
      status: direction === 'outbound' ? 'sent' : 'received',
      timestamp: Date.now(),
      sender
    };

    this.logs.push(log);
    logger.debug('Email logged', { contactId, direction });

    return log;
  }

  /**
   * Log call
   */
  logCall(contactId: string, duration: number): CommunicationLog {
    const log: CommunicationLog = {
      id: 'log-' + Date.now() + '-' + this.logCount++,
      contactId,
      direction: 'outbound',
      channel: 'phone',
      content: `Call duration: ${duration}s`,
      status: 'sent',
      timestamp: Date.now(),
      sender: 'user'
    };

    this.logs.push(log);
    logger.debug('Call logged', { contactId });

    return log;
  }

  /**
   * Log SMS
   */
  logSMS(contactId: string, direction: 'inbound' | 'outbound', content: string): CommunicationLog {
    const log: CommunicationLog = {
      id: 'log-' + Date.now() + '-' + this.logCount++,
      contactId,
      direction,
      channel: 'sms',
      content,
      status: direction === 'outbound' ? 'sent' : 'received',
      timestamp: Date.now(),
      sender: 'user'
    };

    this.logs.push(log);
    logger.debug('SMS logged', { contactId });

    return log;
  }

  /**
   * Get contact communication
   */
  getContactCommunication(contactId: string, days?: number): CommunicationLog[] {
    let communication = this.logs.filter(l => l.contactId === contactId);

    if (days) {
      const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
      communication = communication.filter(l => l.timestamp >= threshold);
    }

    return communication;
  }

  /**
   * Get last interaction
   */
  getLastInteraction(contactId: string): CommunicationLog | null {
    const communication = this.logs
      .filter(l => l.contactId === contactId)
      .sort((a, b) => b.timestamp - a.timestamp);

    return communication.length > 0 ? communication[0] : null;
  }

  /**
   * Get interaction frequency
   */
  getInteractionFrequency(contactId: string, period: number): { count: number; channels: Record<string, number> } {
    const threshold = Date.now() - period * 24 * 60 * 60 * 1000;
    const communication = this.logs.filter(l => l.contactId === contactId && l.timestamp >= threshold);

    const channels: Record<string, number> = { email: 0, phone: 0, sms: 0, chat: 0 };

    communication.forEach(log => {
      channels[log.channel]++;
    });

    logger.debug('Interaction frequency calculated', { contactId, count: communication.length });

    return { count: communication.length, channels };
  }
}

// ==================== TIMELINE MANAGER ====================

export class TimelineManager {
  private timelines = new Map<string, ContactTimeline>();

  /**
   * Get contact timeline
   */
  getContactTimeline(contactId: string): ContactTimeline {
    if (!this.timelines.has(contactId)) {
      this.timelines.set(contactId, { contactId, events: [] });
    }

    return this.timelines.get(contactId)!;
  }

  /**
   * Get timeline events
   */
  getTimelineEvents(contactId: string, startDate: number, endDate: number): Array<any> {
    const timeline = this.getContactTimeline(contactId);

    return timeline.events.filter(e => e.timestamp >= startDate && e.timestamp <= endDate);
  }

  /**
   * Add event
   */
  addEvent(contactId: string, event: { type: string; title: string }): void {
    const timeline = this.getContactTimeline(contactId);

    timeline.events.push({
      ...event,
      timestamp: Date.now()
    });

    logger.debug('Timeline event added', { contactId, eventType: event.type });
  }
}

// ==================== EXPORTS ====================

export const interactionManager = new InteractionManager();
export const communicationTracker = new CommunicationTracker();
export const timelineManager = new TimelineManager();
