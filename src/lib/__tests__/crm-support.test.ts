import { describe, expect, it } from 'vitest';
import { CustomerSatisfactionManager, SupportQueue, SupportTicketManager } from '../crm-support';

describe('crm-support', () => {
  it('routes tickets deterministically and calculates resolution metrics from actual tickets', () => {
    const manager = new SupportTicketManager();
    const queue = new SupportQueue();
    const satisfaction = new CustomerSatisfactionManager();

    const ticket = manager.createTicket({
      contactId: 'contact-1',
      subject: 'Billing issue',
      description: 'Invoice mismatch',
      status: 'open',
      priority: 'high',
      category: 'billing'
    });

    queue.setTickets(manager.getTicketStore());
    satisfaction.setTickets(manager.getTicketStore());

    const agentId = queue.routeTicket(ticket.id);
    manager.assignTicket(ticket.id, agentId);
    manager.resolveTicket(ticket.id, 'fixed');

    satisfaction.recordFeedback({
      ticketId: ticket.id,
      rating: 9,
      feedback: 'Fast response'
    });

    expect(agentId.startsWith('agent-billing-')).toBe(true);
    expect(satisfaction.getAgentRating(agentId).avgRating).toBe(9);
    expect(satisfaction.getResolutionMetrics().satisfactionScore).toBe(90);
  });
});
