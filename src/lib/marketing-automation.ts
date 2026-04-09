/**
 * Phase 52: Marketing Automation
 * Campaign management, email/SMS marketing, notification automation, user engagement
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type CampaignType = 'email' | 'sms' | 'push' | 'in-app';

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  target: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
}

export interface CampaignMetrics {
  campaignId: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

export interface EngagementRule {
  trigger: string;
  action: string;
  condition: Record<string, any>;
}

// ==================== CAMPAIGN MANAGER ====================

export class CampaignManager {
  private campaigns = new Map<string, Campaign>();
  private campaignMetrics = new Map<string, CampaignMetrics>();
  private vendorCampaigns = new Map<string, Set<string>>();
  private schedules = new Map<string, number>();

  createCampaign(campaign: Omit<Campaign, 'id' | 'status'>): Campaign {
    const campaignId = 'campaign-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const fullCampaign: Campaign = { ...campaign, id: campaignId, status: 'draft' };
    this.campaigns.set(campaignId, fullCampaign);
    const vendorId = campaign.target.split(':')[0];
    if (!this.vendorCampaigns.has(vendorId)) {
      this.vendorCampaigns.set(vendorId, new Set());
    }
    this.vendorCampaigns.get(vendorId)!.add(campaignId);
    this.campaignMetrics.set(campaignId, { campaignId, sent: 0, opened: 0, clicked: 0, converted: 0 });
    logger.debug('Campaign created', { campaignId, type: campaign.type, name: campaign.name });
    return fullCampaign;
  }

  schedule(campaignId: string, sendAt: number): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.status = 'scheduled';
      this.schedules.set(campaignId, sendAt);
      logger.debug('Campaign scheduled', { campaignId, sendAt });
    }
  }

  send(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.status = 'sent';
      this.schedules.delete(campaignId);
      const metrics = this.campaignMetrics.get(campaignId);
      if (metrics) metrics.sent = Math.floor(Math.random() * 10000) + 1000;
      logger.info('Campaign sent', { campaignId, type: campaign.type });
    }
  }

  getCampaigns(vendorId: string, type?: CampaignType): Campaign[] {
    const campaignIds = this.vendorCampaigns.get(vendorId) || new Set();
    let campaigns = Array.from(campaignIds).map(id => this.campaigns.get(id)!);
    if (type) campaigns = campaigns.filter(c => c.type === type);
    return campaigns;
  }

  getMetrics(campaignId: string): CampaignMetrics {
    return this.campaignMetrics.get(campaignId) || { campaignId, sent: 0, opened: 0, clicked: 0, converted: 0 };
  }

  recordEngagement(campaignId: string, type: 'opened' | 'clicked' | 'converted'): void {
    const metrics = this.campaignMetrics.get(campaignId);
    if (metrics) {
      if (type === 'opened') metrics.opened++;
      else if (type === 'clicked') metrics.clicked++;
      else if (type === 'converted') metrics.converted++;
    }
  }
}

// ==================== TEMPLATE ENGINE ====================

export class TemplateEngine {
  private templates = new Map<string, { content: string; variables: string[] }>();
  private vendorTemplates = new Map<string, Set<string>>();

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  createTemplate(name: string, content: string, variables: string[]): string {
    const templateId = 'template-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    this.templates.set(templateId, { content, variables });
    logger.debug('Template created', { templateId, name, variables: variables.length });
    return templateId;
  }

  renderTemplate(templateId: string, data: Record<string, any>): string {
    const template = this.templates.get(templateId);
    if (!template) return '';
    let rendered = template.content;
    for (const variable of template.variables) {
      const escapedVariable = this.escapeRegExp(variable);
      const pattern = new RegExp(`{{\\s*${escapedVariable}\\s*}}`, 'g');
      rendered = rendered.replace(pattern, String(data[variable] || ''));
    }
    return rendered;
  }

  listTemplates(vendorId: string): { id: string; name: string }[] {
    const templateIds = this.vendorTemplates.get(vendorId) || new Set();
    return Array.from(templateIds).map(id => ({ id, name: 'Template ' + id.substr(0, 8) }));
  }

  registerTemplate(vendorId: string, templateId: string): void {
    if (!this.vendorTemplates.has(vendorId)) {
      this.vendorTemplates.set(vendorId, new Set());
    }
    this.vendorTemplates.get(vendorId)!.add(templateId);
  }
}

// ==================== ENGAGEMENT AUTOMATION ====================

export class EngagementAutomation {
  private rules: EngagementRule[] = [];
  private stats = { rulesTriggered: 0, actionsExecuted: 0, conversionRate: 0 };

  addRule(rule: EngagementRule): void {
    this.rules.push(rule);
    logger.debug('Engagement rule added', { trigger: rule.trigger, action: rule.action });
  }

  evaluateRules(userId: string, context: Record<string, any>): EngagementRule[] {
    const matching: EngagementRule[] = [];
    for (const rule of this.rules) {
      if (this.matchesCondition(rule.condition, context)) {
        matching.push(rule);
        this.stats.rulesTriggered++;
      }
    }
    return matching;
  }

  triggerAction(rule: EngagementRule, userId: string): void {
    logger.debug('Engagement action triggered', { userId, action: rule.action });
    this.stats.actionsExecuted++;
    if (rule.action === 'send_offer' || rule.action === 'send_reminder') {
      if (Math.random() > 0.7) {
        this.stats.conversionRate = (this.stats.actionsExecuted * 0.15) / (this.stats.actionsExecuted || 1);
      }
    }
  }

  getAutomationStats(): { rulesTriggered: number; actionsExecuted: number; conversionRate: number } {
    return { ...this.stats, conversionRate: Math.round(this.stats.conversionRate * 10000) / 100 };
  }

  private matchesCondition(condition: Record<string, any>, context: Record<string, any>): boolean {
    for (const [key, expectedValue] of Object.entries(condition)) {
      const contextValue = context[key];
      if (Array.isArray(expectedValue)) {
        if (!expectedValue.includes(contextValue)) return false;
      } else if (typeof expectedValue === 'object' && expectedValue !== null) {
        if (expectedValue.min !== undefined && contextValue < expectedValue.min) return false;
        if (expectedValue.max !== undefined && contextValue > expectedValue.max) return false;
      } else if (contextValue !== expectedValue) return false;
    }
    return true;
  }
}

// ==================== EXPORTS ====================

export const campaignManager = new CampaignManager();
export const templateEngine = new TemplateEngine();
export const engagementAutomation = new EngagementAutomation();
