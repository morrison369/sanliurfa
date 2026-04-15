/**
 * Phase 188: Partner Portal
 * Portal content management, sandbox environments, support tickets, certifications
 */

import { logger } from './logger';

interface PortalContent {
  contentId: string;
  title: string;
  type: 'documentation' | 'tutorial' | 'announcement' | 'faq' | 'changelog';
  body: string;
  tags: string[];
  audienceRoles: string[];
  publishedAt: number;
  updatedAt: number;
  status: 'draft' | 'published' | 'archived';
}

interface SandboxEnvironment {
  sandboxId: string;
  partnerId: string;
  name: string;
  apiEndpoint: string;
  credentials: { clientId: string; clientSecret: string };
  quotaPerDay: number;
  usedToday: number;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'expired' | 'suspended';
}

interface SupportTicket {
  ticketId: string;
  partnerId: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'technical' | 'billing' | 'access' | 'general';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: number;
  resolvedAt?: number;
  assignedTo?: string;
}

interface PartnerCertification {
  certificationId: string;
  partnerId: string;
  name: string;
  level: 'associate' | 'professional' | 'expert';
  issuedAt: number;
  expiresAt: number;
  status: 'active' | 'expired' | 'revoked';
}

class PartnerPortalContentManager {
  private contents: Map<string, PortalContent> = new Map();
  private counter = 0;

  publish(title: string, type: PortalContent['type'], body: string, tags: string[] = [], audienceRoles: string[] = []): PortalContent {
    const contentId = `content-${Date.now()}-${++this.counter}`;
    const content: PortalContent = {
      contentId, title, type, body, tags, audienceRoles,
      publishedAt: Date.now(), updatedAt: Date.now(), status: 'published'
    };
    this.contents.set(contentId, content);
    logger.debug('Portal content published', { contentId, title, type });
    return content;
  }

  update(contentId: string, updates: Partial<Pick<PortalContent, 'title' | 'body' | 'tags'>>): PortalContent | undefined {
    const content = this.contents.get(contentId);
    if (content) {
      Object.assign(content, updates, { updatedAt: Date.now() });
      return content;
    }
    return undefined;
  }

  search(query: string, type?: PortalContent['type']): PortalContent[] {
    const q = query.toLowerCase();
    return Array.from(this.contents.values()).filter(c =>
      c.status === 'published' &&
      (!type || c.type === type) &&
      (c.title.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  getByType(type: PortalContent['type']): PortalContent[] {
    return Array.from(this.contents.values()).filter(c => c.type === type && c.status === 'published');
  }

  archive(contentId: string): boolean {
    const content = this.contents.get(contentId);
    if (content) { content.status = 'archived'; return true; }
    return false;
  }
}

class PartnerSandboxManager {
  private sandboxes: Map<string, SandboxEnvironment> = new Map();
  private counter = 0;

  provision(partnerId: string, name: string, quotaPerDay: number = 1000, durationDays: number = 30): SandboxEnvironment {
    const sandboxId = `sandbox-${Date.now()}-${++this.counter}`;
    const sandbox: SandboxEnvironment = {
      sandboxId, partnerId, name,
      apiEndpoint: `https://sandbox.api.platform/${sandboxId}`,
      credentials: {
        clientId: `client-${sandboxId}`,
        clientSecret: `secret-${Math.random().toString(36).substring(7)}`
      },
      quotaPerDay, usedToday: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + durationDays * 24 * 60 * 60 * 1000,
      status: 'active'
    };
    this.sandboxes.set(sandboxId, sandbox);
    logger.debug('Sandbox provisioned', { sandboxId, partnerId, quotaPerDay });
    return sandbox;
  }

  consumeQuota(sandboxId: string): boolean {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox || sandbox.status !== 'active') return false;
    if (sandbox.usedToday >= sandbox.quotaPerDay) return false;
    sandbox.usedToday++;
    return true;
  }

  resetDailyQuota(sandboxId: string): void {
    const sandbox = this.sandboxes.get(sandboxId);
    if (sandbox) sandbox.usedToday = 0;
  }

  getSandbox(sandboxId: string): SandboxEnvironment | undefined {
    return this.sandboxes.get(sandboxId);
  }

  getPartnerSandboxes(partnerId: string): SandboxEnvironment[] {
    return Array.from(this.sandboxes.values()).filter(s => s.partnerId === partnerId);
  }

  getExpiredSandboxes(): SandboxEnvironment[] {
    return Array.from(this.sandboxes.values()).filter(s => s.expiresAt <= Date.now() && s.status === 'active');
  }
}

class PartnerSupportTicketManager {
  private tickets: Map<string, SupportTicket> = new Map();
  private counter = 0;

  create(partnerId: string, subject: string, description: string, priority: SupportTicket['priority'], category: SupportTicket['category']): SupportTicket {
    const ticketId = `ticket-${Date.now()}-${++this.counter}`;
    const ticket: SupportTicket = {
      ticketId, partnerId, subject, description, priority, category,
      status: 'open', createdAt: Date.now()
    };
    this.tickets.set(ticketId, ticket);
    logger.debug('Support ticket created', { ticketId, partnerId, priority, category });
    return ticket;
  }

  assign(ticketId: string, assignedTo: string): SupportTicket | undefined {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      ticket.assignedTo = assignedTo;
      ticket.status = 'in_progress';
      return ticket;
    }
    return undefined;
  }

  resolve(ticketId: string): SupportTicket | undefined {
    const ticket = this.tickets.get(ticketId);
    if (ticket) {
      ticket.status = 'resolved';
      ticket.resolvedAt = Date.now();
      return ticket;
    }
    return undefined;
  }

  getOpenTickets(priority?: SupportTicket['priority']): SupportTicket[] {
    return Array.from(this.tickets.values()).filter(t =>
      (t.status === 'open' || t.status === 'in_progress') && (!priority || t.priority === priority)
    );
  }

  getAvgResolutionTime(): number {
    const resolved = Array.from(this.tickets.values()).filter(t => t.resolvedAt);
    if (!resolved.length) return 0;
    return resolved.reduce((sum, t) => sum + (t.resolvedAt! - t.createdAt), 0) / resolved.length;
  }
}

class PartnerCertificationTracker {
  private certifications: Map<string, PartnerCertification[]> = new Map();
  private counter = 0;

  issue(partnerId: string, name: string, level: PartnerCertification['level'], validityDays: number = 365): PartnerCertification {
    const certificationId = `cert-${Date.now()}-${++this.counter}`;
    const cert: PartnerCertification = {
      certificationId, partnerId, name, level,
      issuedAt: Date.now(),
      expiresAt: Date.now() + validityDays * 24 * 60 * 60 * 1000,
      status: 'active'
    };
    const existing = this.certifications.get(partnerId) || [];
    existing.push(cert);
    this.certifications.set(partnerId, existing);
    logger.debug('Certification issued', { certificationId, partnerId, name, level });
    return cert;
  }

  revoke(certificationId: string): boolean {
    for (const certs of this.certifications.values()) {
      const cert = certs.find(c => c.certificationId === certificationId);
      if (cert) { cert.status = 'revoked'; return true; }
    }
    return false;
  }

  getPartnerCertifications(partnerId: string): PartnerCertification[] {
    return (this.certifications.get(partnerId) || []).filter(c => c.status === 'active');
  }

  getExpiringSoon(daysThreshold: number): PartnerCertification[] {
    const threshold = Date.now() + daysThreshold * 24 * 60 * 60 * 1000;
    return Array.from(this.certifications.values()).flat()
      .filter(c => c.status === 'active' && c.expiresAt <= threshold);
  }
}

export const partnerPortalContentManager = new PartnerPortalContentManager();
export const partnerSandboxManager = new PartnerSandboxManager();
export const partnerSupportTicketManager = new PartnerSupportTicketManager();
export const partnerCertificationTracker = new PartnerCertificationTracker();

export { PortalContent, SandboxEnvironment, SupportTicket, PartnerCertification };
