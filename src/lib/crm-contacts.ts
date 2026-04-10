/**
 * Phase 65: Contact & Lead Management
 * Contact database, lead scoring, segmentation, enrichment
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type ContactType = 'individual' | 'organization' | 'prospect';
export type LeadStatus = 'new' | 'qualified' | 'nurturing' | 'won' | 'lost';
export type ContactSource = 'website' | 'referral' | 'event' | 'marketplace' | 'social' | 'import';

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  email: string;
  phone?: string;
  company?: string;
  source: ContactSource;
  status: LeadStatus;
  score: number;
  createdAt: number;
  lastActivity?: number;
}

export interface Lead {
  contactId: string;
  title: string;
  description: string;
  value: number;
  stage: 'awareness' | 'interest' | 'consideration' | 'decision';
  owner: string;
  probability: number;
  expectedCloseDate: number;
  notes: string;
  createdAt: number;
}

export interface ContactSegment {
  id: string;
  name: string;
  criteria: Record<string, any>;
  count: number;
  createdAt: number;
}

// ==================== CONTACT MANAGER ====================

export class ContactManager {
  private contacts = new Map<string, Contact>();
  private contactCount = 0;

  /**
   * Create contact
   */
  createContact(contact: Omit<Contact, 'id' | 'createdAt'>): Contact {
    const id = 'contact-' + Date.now() + '-' + this.contactCount++;

    const newContact: Contact = {
      ...contact,
      id,
      createdAt: Date.now()
    };

    this.contacts.set(id, newContact);
    logger.info('Contact created', { contactId: id, email: contact.email });

    return newContact;
  }

  /**
   * Get contact
   */
  getContact(contactId: string): Contact | null {
    return this.contacts.get(contactId) || null;
  }

  /**
   * List contacts
   */
  listContacts(type?: ContactType, status?: LeadStatus): Contact[] {
    let contacts = Array.from(this.contacts.values());

    if (type) {
      contacts = contacts.filter(c => c.type === type);
    }

    if (status) {
      contacts = contacts.filter(c => c.status === status);
    }

    return contacts;
  }

  /**
   * Search contacts
   */
  searchContacts(query: string): Contact[] {
    const lower = query.toLowerCase();

    return Array.from(this.contacts.values()).filter(
      c => c.name.toLowerCase().includes(lower) || c.email.toLowerCase().includes(lower)
    );
  }

  /**
   * Update contact
   */
  updateContact(contactId: string, updates: Partial<Contact>): void {
    const contact = this.contacts.get(contactId);
    if (contact) {
      Object.assign(contact, updates);
      contact.lastActivity = Date.now();
      logger.debug('Contact updated', { contactId });
    }
  }

  /**
   * Merge contacts
   */
  mergeContacts(primaryId: string, secondaryId: string): void {
    const primary = this.contacts.get(primaryId);
    const secondary = this.contacts.get(secondaryId);

    if (primary && secondary) {
      primary.lastActivity = Math.max(primary.lastActivity || 0, secondary.lastActivity || 0);
      this.contacts.delete(secondaryId);
      logger.info('Contacts merged', { primaryId, secondaryId });
    }
  }

  /**
   * Delete contact
   */
  deleteContact(contactId: string): void {
    this.contacts.delete(contactId);
    logger.info('Contact deleted', { contactId });
  }
}

// ==================== LEAD MANAGER ====================

export class LeadManager {
  private leads = new Map<string, Lead>();

  /**
   * Create lead
   */
  createLead(lead: Omit<Lead, 'createdAt'>): Lead {
    const newLead: Lead = {
      ...lead,
      createdAt: Date.now()
    };

    this.leads.set(lead.contactId, newLead);
    logger.info('Lead created', { contactId: lead.contactId, value: lead.value });

    return newLead;
  }

  /**
   * Get lead
   */
  getLead(contactId: string): Lead | null {
    return this.leads.get(contactId) || null;
  }

  /**
   * List leads
   */
  listLeads(status?: LeadStatus, owner?: string): Lead[] {
    let leads = Array.from(this.leads.values());

    if (status) {
      leads = leads.filter(l => {
        const contact = this.leads.get(l.contactId);
        // Simulate status check through value/stage
        return l.stage !== 'awareness';
      });
    }

    if (owner) {
      leads = leads.filter(l => l.owner === owner);
    }

    return leads;
  }

  /**
   * Update lead
   */
  updateLead(contactId: string, updates: Partial<Lead>): void {
    const lead = this.leads.get(contactId);
    if (lead) {
      Object.assign(lead, updates);
      logger.debug('Lead updated', { contactId });
    }
  }

  /**
   * Score lead
   */
  scoreLead(contactId: string): number {
    const lead = this.leads.get(contactId);
    if (!lead) return 0;

    let score = 0;
    score += lead.value * 0.5;
    score += lead.probability * 50;

    const stageScores: Record<string, number> = {
      awareness: 10,
      interest: 30,
      consideration: 60,
      decision: 100
    };

    score += stageScores[lead.stage] || 0;

    logger.debug('Lead scored', { contactId, score });

    return Math.min(100, score);
  }

  /**
   * Qualify lead
   */
  qualifyLead(contactId: string): void {
    const lead = this.leads.get(contactId);
    if (lead) {
      lead.stage = 'consideration';
      logger.info('Lead qualified', { contactId });
    }
  }

  /**
   * Close lead
   */
  closeLead(contactId: string, won: boolean): void {
    const lead = this.leads.get(contactId);
    if (lead) {
      lead.stage = won ? 'decision' : 'awareness';
      logger.info('Lead closed', { contactId, won });
    }
  }
}

// ==================== CONTACT SEGMENTATION ====================

export class ContactSegmentation {
  private segments = new Map<string, ContactSegment>();
  private segmentCount = 0;

  /**
   * Create segment
   */
  createSegment(segment: Omit<ContactSegment, 'id' | 'count' | 'createdAt'>): ContactSegment {
    const id = 'segment-' + Date.now() + '-' + this.segmentCount++;

    const newSegment: ContactSegment = {
      ...segment,
      id,
      count: 0,
      createdAt: Date.now()
    };

    this.segments.set(id, newSegment);
    logger.info('Segment created', { segmentId: id, name: segment.name });

    return newSegment;
  }

  /**
   * Get segment
   */
  getSegment(segmentId: string): ContactSegment | null {
    return this.segments.get(segmentId) || null;
  }

  /**
   * List segments
   */
  listSegments(): ContactSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Get contacts that match a segment's live criteria
   */
  getSegmentContacts(segmentId: string): Contact[] {
    const segment = this.segments.get(segmentId);
    if (!segment) return [];

    return Array.from(contactManager.listContacts()).filter((contact) => {
      return Object.entries(segment.criteria).every(([key, expectedValue]) => {
        const actualValue = (contact as Record<string, any>)[key];

        if (Array.isArray(expectedValue)) {
          return expectedValue.includes(actualValue);
        }

        if (expectedValue && typeof expectedValue === 'object' && !Array.isArray(expectedValue)) {
          if ('min' in expectedValue && typeof actualValue === 'number' && actualValue < expectedValue.min) {
            return false;
          }

          if ('max' in expectedValue && typeof actualValue === 'number' && actualValue > expectedValue.max) {
            return false;
          }

          if ('includes' in expectedValue && typeof actualValue === 'string') {
            return actualValue.toLowerCase().includes(String(expectedValue.includes).toLowerCase());
          }
        }

        return actualValue === expectedValue;
      });
    });
  }

  /**
   * Update segment criteria
   */
  updateSegmentCriteria(segmentId: string, criteria: Record<string, any>): void {
    const segment = this.segments.get(segmentId);
    if (segment) {
      segment.criteria = criteria;
      logger.debug('Segment criteria updated', { segmentId });
    }
  }

  /**
   * Delete segment
   */
  deleteSegment(segmentId: string): void {
    this.segments.delete(segmentId);
    logger.info('Segment deleted', { segmentId });
  }
}

// ==================== EXPORTS ====================

export const contactManager = new ContactManager();
export const leadManager = new LeadManager();
export const contactSegmentation = new ContactSegmentation();
