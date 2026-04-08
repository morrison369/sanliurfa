/**
 * Phase 68: Customer Support & Service Management
 * Tickets, issue tracking, support queues, resolution, satisfaction
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory = 'technical' | 'billing' | 'general' | 'feature_request';

export interface SupportTicket {
  id: string;
  contactId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assignedTo?: string;
  createdAt: number;
  resolvedAt?: number;
  closedAt?: number;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  author: string;
  content: string;
  isPublic: boolean;
  createdAt: number;
  attachments?: string[];
}

export interface CustomerSatisfaction {
  ticketId: string;
  rating: number;
  feedback: string;
  timestamp: number;
}

// ==================== SUPPORT TICKET MANAGER ====================

export class SupportTicketManager {
  private tickets = new Map<string, SupportTicket>();
  private ticketCount = 0;

  /**
   * Create ticket
   */
  createTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt'>): SupportTicket {
    const id = 'ticket-' + Date.now() + '-' + this.ticketCount++;

    const newTicket: SupportTicket = {
      ...ticket,
      id,
      createdAt: Date.now()
    };

    this.tickets.set(id, newTicket);
    logger.info('Support ticket created', { ticketId: id, priority: ticket.priority });

    return newTicket;
  }

  /**
   * Get ticket
   */
  getTicket(ticketId: string): SupportTicket | null {
    return this.tickets.get(ticketId) || null;
  }

  /**
   * List tickets
   */
  listTickets(status?: TicketStatus, assignedTo?: string): SupportTicket[] {
    let tickets = Array.from(this.tickets.values());

    if (status) {
      tickets = tickets.filter(t => t.status === status);
    }

    if (assignedTo) {
      tickets = tickets.filter(t => t.assignedTo === assignedTo);
    }

    return tickets;
  }

  /**
   * Update ticket
   */
  updateTicket(ticketId: string, updates: Partial<SupportTicket>): void {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      Object.assign(ticket, updates);
      logger.debug('Support ticket updated', { ticketId });
    }
  }

  /**
   * Assign ticket
   */
  assignTicket(ticketId: string, agentId: string): void {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      ticket.assignedTo = agentId;
      ticket.status = 'in_progress';
      logger.info('Ticket assigned', { ticketId, agentId });
    }
  }

  /**
   * Escalate ticket
   */
  escalateTicket(ticketId: string, newPriority: TicketPriority): void {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      ticket.priority = newPriority;
      logger.info('Ticket escalated', { ticketId, priority: newPriority });
    }
  }

  /**
   * Resolve ticket
   */
  resolveTicket(ticketId: string, resolution: string): void {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      ticket.status = 'resolved';
      ticket.resolvedAt = Date.now();
      logger.info('Ticket resolved', { ticketId });
    }
  }

  /**
   * Close ticket
   */
  closeTicket(ticketId: string): void {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      ticket.status = 'closed';
      ticket.closedAt = Date.now();
      logger.info('Ticket closed', { ticketId });
    }
  }
}

// ==================== SUPPORT QUEUE ====================

export class SupportQueue {
  private tickets: Map<string, SupportTicket>;

  constructor() {
    this.tickets = new Map();
  }

  /**
   * Set tickets reference
   */
  setTickets(tickets: Map<string, SupportTicket>) {
    this.tickets = tickets;
  }

  /**
   * Get queue
   */
  getQueue(priority?: TicketPriority): SupportTicket[] {
    let tickets = Array.from(this.tickets.values())
      .filter(t => t.status === 'open' || t.status === 'waiting')
      .sort((a, b) => {
        const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      });

    if (priority) {
      tickets = tickets.filter(t => t.priority === priority);
    }

    return tickets;
  }

  /**
   * Get agent queue
   */
  getAgentQueue(agentId: string): SupportTicket[] {
    return Array.from(this.tickets.values())
      .filter(t => t.assignedTo === agentId && t.status !== 'closed')
      .sort((a, b) => {
        const priorityMap = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      });
  }

  /**
   * Get wait time
   */
  getWaitTime(ticketId: string): number {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return 0;

    return Math.round((Date.now() - ticket.createdAt) / (60 * 1000)); // In minutes
  }

  /**
   * Get queue metrics
   */
  getQueueMetrics(): { totalTickets: number; avgWaitTime: number; oldestTicket: number } {
    const openTickets = Array.from(this.tickets.values()).filter(
      t => t.status === 'open' || t.status === 'waiting'
    );

    if (openTickets.length === 0) {
      return { totalTickets: 0, avgWaitTime: 0, oldestTicket: 0 };
    }

    const waitTimes = openTickets.map(t => this.getWaitTime(t.id));
    const avgWaitTime = Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length);
    const oldestTicket = Math.max(...waitTimes);

    logger.debug('Queue metrics calculated', { totalTickets: openTickets.length });

    return { totalTickets: openTickets.length, avgWaitTime, oldestTicket };
  }

  /**
   * Route ticket
   */
  routeTicket(ticketId: string): string {
    // Placeholder: return a random agent
    return 'agent-' + Math.floor(Math.random() * 10);
  }
}

// ==================== CUSTOMER SATISFACTION MANAGER ====================

export class CustomerSatisfactionManager {
  private feedback = new Map<string, CustomerSatisfaction>();

  /**
   * Record feedback
   */
  recordFeedback(feedback: Omit<CustomerSatisfaction, 'timestamp'>): CustomerSatisfaction {
    const record: CustomerSatisfaction = {
      ...feedback,
      timestamp: Date.now()
    };

    this.feedback.set(feedback.ticketId, record);
    logger.info('Customer satisfaction recorded', { ticketId: feedback.ticketId, rating: feedback.rating });

    return record;
  }

  /**
   * Get ticket satisfaction
   */
  getTicketSatisfaction(ticketId: string): CustomerSatisfaction | null {
    return this.feedback.get(ticketId) || null;
  }

  /**
   * Calculate NPS
   */
  calculateNPS(period?: string): number {
    const feedbackArray = Array.from(this.feedback.values());

    if (feedbackArray.length === 0) return 0;

    const promoters = feedbackArray.filter(f => f.rating >= 9).length;
    const detractors = feedbackArray.filter(f => f.rating <= 6).length;

    const nps = ((promoters - detractors) / feedbackArray.length) * 100;

    logger.debug('NPS calculated', { nps });

    return Math.round(nps);
  }

  /**
   * Get agent rating
   */
  getAgentRating(agentId: string): { avgRating: number; totalRatings: number } {
    // Placeholder: return simulated values
    return {
      avgRating: Math.random() * 2 + 3.5,
      totalRatings: Math.floor(Math.random() * 100 + 20)
    };
  }

  /**
   * Get resolution metrics
   */
  getResolutionMetrics(): { avgResolutionTime: number; firstContactResolve: number; satisfactionScore: number } {
    const feedbackArray = Array.from(this.feedback.values());

    const avgRating = feedbackArray.length > 0 ? feedbackArray.reduce((sum, f) => sum + f.rating, 0) / feedbackArray.length : 0;

    return {
      avgResolutionTime: Math.round(Math.random() * 24 + 4), // Hours
      firstContactResolve: Math.round(Math.random() * 40 + 50), // Percentage
      satisfactionScore: Math.round(avgRating * 10)
    };
  }
}

// ==================== EXPORTS ====================

const supportTicketManager = new SupportTicketManager();
const supportQueue = new SupportQueue();
const customerSatisfactionManager = new CustomerSatisfactionManager();

supportQueue.setTickets(supportTicketManager['tickets']);

export { supportTicketManager, supportQueue, customerSatisfactionManager };
