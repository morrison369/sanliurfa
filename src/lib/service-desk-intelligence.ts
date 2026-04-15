/**
 * Phase 308: Service Desk Intelligence
 * Ticket management, resolution analytics, SLA compliance, agent performance
 */

import { logger } from './logger';

interface TicketRecord {
  ticketId: string;
  title: string;
  description: string;
  requesterId: string;
  requesterName: string;
  category: 'incident' | 'request' | 'problem' | 'change' | 'inquiry';
  priority: 'p1_critical' | 'p2_high' | 'p3_medium' | 'p4_low';
  assignedAgentId: string;
  assignedTeam: string;
  channel: 'email' | 'phone' | 'chat' | 'portal' | 'slack';
  slaTargetHours: number;
  slaDeadline: number;
  firstResponseAt?: number;
  firstResponseTimeMinutes?: number;
  resolvedAt?: number;
  resolutionTimeHours?: number;
  slaBreached: boolean;
  satisfactionScore?: number;    // 1-5
  reopenCount: number;
  tags: string[];
  status: 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed' | 'cancelled';
  createdAt: number;
}

interface AgentPerformanceRecord {
  recordId: string;
  agentId: string;
  agentName: string;
  team: string;
  period: string;
  ticketsHandled: number;
  ticketsResolved: number;
  resolutionRatePct: number;
  avgFirstResponseTimeMinutes: number;
  avgResolutionTimeHours: number;
  slaCompliancePct: number;
  customerSatisfactionAvg: number;   // 1-5
  fcr: number;                       // First Contact Resolution %
  reopenRatePct: number;
  escalationRatePct: number;
  productivityScore: number;         // composite 0-100
  recordedAt: number;
}

interface ServiceDeskMetricsRecord {
  recordId: string;
  period: string;
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionTimeHours: number;
  avgFirstResponseTimeMinutes: number;
  slaCompliancePct: number;
  firstContactResolutionPct: number;
  customerSatisfactionScore: number;  // 0-100
  backlogCount: number;
  escalationRatePct: number;
  ticketsByCategory: Record<string, number>;
  ticketsByPriority: Record<string, number>;
  calculatedAt: number;
}

interface KnowledgeBaseUtilizationRecord {
  recordId: string;
  period: string;
  articleViews: number;
  articleCreated: number;
  selfServiceDeflectionCount: number;  // tickets avoided via KB
  deflectionRatePct: number;
  avgArticleRating: number;
  outdatedArticlesCount: number;
  topViewedArticles: { title: string; views: number }[];
  calculatedAt: number;
}

class TicketManager {
  private tickets: Map<string, TicketRecord> = new Map();
  private counter = 0;

  private slaTargets: Record<TicketRecord['priority'], number> = {
    p1_critical: 4, p2_high: 8, p3_medium: 24, p4_low: 72
  };

  create(title: string, desc: string, requesterId: string, requesterName: string, category: TicketRecord['category'], priority: TicketRecord['priority'], agentId: string, team: string, channel: TicketRecord['channel'], tags: string[]): TicketRecord {
    const ticketId = `tkt-${Date.now()}-${++this.counter}`;
    const slaHours = this.slaTargets[priority];
    const record: TicketRecord = {
      ticketId, title, description: desc, requesterId, requesterName,
      category, priority, assignedAgentId: agentId, assignedTeam: team,
      channel, slaTargetHours: slaHours, slaDeadline: Date.now() + slaHours * 3600000,
      slaBreached: false, reopenCount: 0, tags, status: 'open', createdAt: Date.now()
    };
    this.tickets.set(ticketId, record);
    logger.debug('Ticket created', { ticketId, priority, category });
    return record;
  }

  firstResponse(ticketId: string): boolean {
    const t = this.tickets.get(ticketId);
    if (!t) return false;
    t.firstResponseAt = Date.now();
    t.firstResponseTimeMinutes = Math.round((Date.now() - t.createdAt) / 60000);
    t.status = 'in_progress';
    return true;
  }

  resolve(ticketId: string, satisfactionScore?: number): boolean {
    const t = this.tickets.get(ticketId);
    if (!t) return false;
    t.resolvedAt = Date.now();
    t.resolutionTimeHours = Math.round((Date.now() - t.createdAt) / 3600000 * 10) / 10;
    t.slaBreached = Date.now() > t.slaDeadline;
    t.satisfactionScore = satisfactionScore;
    t.status = 'resolved';
    return true;
  }

  getBreachedSLATickets(): TicketRecord[] {
    const now = Date.now();
    return Array.from(this.tickets.values())
      .filter(t => (t.status === 'open' || t.status === 'in_progress') && t.slaDeadline < now);
  }

  getTicketsByPriority(priority: TicketRecord['priority']): TicketRecord[] {
    return Array.from(this.tickets.values()).filter(t => t.priority === priority);
  }

  getOpenBacklog(): TicketRecord[] {
    return Array.from(this.tickets.values()).filter(t => t.status === 'open' || t.status === 'in_progress');
  }

  getTicket(id: string): TicketRecord | undefined {
    return this.tickets.get(id);
  }

  getAll(): TicketRecord[] {
    return Array.from(this.tickets.values());
  }
}

class AgentPerformanceAnalyzer {
  private records: AgentPerformanceRecord[] = [];
  private counter = 0;

  analyze(agentId: string, name: string, team: string, period: string, handled: number, resolved: number, avgFRT: number, avgRT: number, slaCompliance: number, csat: number, fcr: number, reopenRate: number, escalationRate: number): AgentPerformanceRecord {
    const resolutionRate = handled > 0 ? Math.round((resolved / handled) * 100) : 0;
    const productivity =
      resolutionRate * 0.25 + slaCompliance * 0.25 + (csat / 5 * 100) * 0.2 + fcr * 0.15 + (100 - escalationRate) * 0.15;

    const recordId = `agentperf-${Date.now()}-${++this.counter}`;
    const record: AgentPerformanceRecord = {
      recordId, agentId, agentName: name, team, period,
      ticketsHandled: handled, ticketsResolved: resolved, resolutionRatePct: resolutionRate,
      avgFirstResponseTimeMinutes: avgFRT, avgResolutionTimeHours: avgRT,
      slaCompliancePct: slaCompliance, customerSatisfactionAvg: csat,
      fcr, reopenRatePct: reopenRate, escalationRatePct: escalationRate,
      productivityScore: Math.round(Math.max(0, Math.min(100, productivity)) * 10) / 10,
      recordedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getTopAgents(period: string, limit = 5): AgentPerformanceRecord[] {
    return this.records.filter(r => r.period === period)
      .sort((a, b) => b.productivityScore - a.productivityScore)
      .slice(0, limit);
  }

  getLowPerformers(threshold = 60): AgentPerformanceRecord[] {
    return this.records.filter(r => r.productivityScore < threshold);
  }

  getTeamAvgCsat(team: string): number {
    const teamRecords = this.records.filter(r => r.team === team);
    if (!teamRecords.length) return 0;
    return Math.round(teamRecords.reduce((s, r) => s + r.customerSatisfactionAvg, 0) / teamRecords.length * 10) / 10;
  }
}

class ServiceDeskMetricsEngine {
  private records: ServiceDeskMetricsRecord[] = [];
  private counter = 0;

  calculate(period: string, tickets: TicketRecord[]): ServiceDeskMetricsRecord {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

    const resolvedTickets = tickets.filter(t => t.resolutionTimeHours !== undefined);
    const avgRT = resolvedTickets.length > 0
      ? Math.round(resolvedTickets.reduce((s, t) => s + (t.resolutionTimeHours || 0), 0) / resolvedTickets.length * 10) / 10 : 0;

    const respondedTickets = tickets.filter(t => t.firstResponseTimeMinutes !== undefined);
    const avgFRT = respondedTickets.length > 0
      ? Math.round(respondedTickets.reduce((s, t) => s + (t.firstResponseTimeMinutes || 0), 0) / respondedTickets.length) : 0;

    const slaCompliance = resolved > 0 ? Math.round((tickets.filter(t => t.status === 'resolved' && !t.slaBreached).length / resolved) * 100) : 100;

    const ratedTickets = tickets.filter(t => t.satisfactionScore !== undefined);
    const avgCsat = ratedTickets.length > 0 ? ratedTickets.reduce((s, t) => s + (t.satisfactionScore || 0), 0) / ratedTickets.length : 0;

    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    tickets.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    });

    const recordId = `sdmetrics-${Date.now()}-${++this.counter}`;
    const record: ServiceDeskMetricsRecord = {
      recordId, period, totalTickets: total, openTickets: open, resolvedTickets: resolved,
      avgResolutionTimeHours: avgRT, avgFirstResponseTimeMinutes: avgFRT,
      slaCompliancePct: slaCompliance, firstContactResolutionPct: 0,
      customerSatisfactionScore: Math.round(avgCsat * 20),   // 1-5 → 0-100
      backlogCount: open, escalationRatePct: 0,
      ticketsByCategory: byCategory, ticketsByPriority: byPriority,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Service desk metrics calculated', { period, slaCompliance, avgRT });
    return record;
  }

  getLatest(): ServiceDeskMetricsRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getSLATrend(): number[] {
    return this.records.map(r => r.slaCompliancePct);
  }
}

class KnowledgeBaseAnalyzer {
  private records: KnowledgeBaseUtilizationRecord[] = [];
  private counter = 0;

  analyze(period: string, views: number, created: number, deflections: number, totalIncoming: number, avgRating: number, outdated: number, topArticles: { title: string; views: number }[]): KnowledgeBaseUtilizationRecord {
    const deflectionRate = totalIncoming > 0 ? Math.round((deflections / totalIncoming) * 100) : 0;
    const recordId = `kb-${Date.now()}-${++this.counter}`;
    const record: KnowledgeBaseUtilizationRecord = {
      recordId, period, articleViews: views, articleCreated: created,
      selfServiceDeflectionCount: deflections, deflectionRatePct: deflectionRate,
      avgArticleRating: avgRating, outdatedArticlesCount: outdated,
      topViewedArticles: topArticles.sort((a, b) => b.views - a.views).slice(0, 5),
      calculatedAt: Date.now()
    };
    this.records.push(record);
    return record;
  }

  getDeflectionTrend(): number[] {
    return this.records.map(r => r.deflectionRatePct);
  }

  getLatest(): KnowledgeBaseUtilizationRecord | undefined {
    return this.records[this.records.length - 1];
  }
}

export const ticketManager = new TicketManager();
export const agentPerformanceAnalyzer = new AgentPerformanceAnalyzer();
export const serviceDeskMetricsEngine = new ServiceDeskMetricsEngine();
export const knowledgeBaseAnalyzer = new KnowledgeBaseAnalyzer();

export { TicketRecord, AgentPerformanceRecord, ServiceDeskMetricsRecord, KnowledgeBaseUtilizationRecord };
