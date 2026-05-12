/**
 * Unit Tests — marketing/marketing-automation.ts singleton class managers (Phase 52)
 *
 * - CampaignManager (createCampaign + schedule + send + getCampaigns vendor/type filter + recordEngagement)
 * - TemplateEngine (createTemplate + renderTemplate {{var}} replace + listTemplates + registerTemplate)
 * - EngagementAutomation (addRule + evaluateRules conditions array/range/equality + triggerAction + stats)
 *
 * Singleton state shared.
 */

import { describe, it, expect } from 'vitest';
import {
  campaignManager,
  templateEngine,
  engagementAutomation,
} from '../marketing/marketing-automation';

describe('CampaignManager', () => {
  it('createCampaign — id prefix + status draft + metrics init', () => {
    const VID = `vendor-${Date.now()}-1`;
    const c = campaignManager.createCampaign({
      name: 'Spring Sale',
      type: 'email',
      target: `${VID}:all`,
      content: 'Hello',
    });
    expect(c.id.startsWith('campaign-')).toBe(true);
    expect(c.status).toBe('draft');
    const metrics = campaignManager.getMetrics(c.id);
    expect(metrics.sent).toBe(0);
    expect(metrics.opened).toBe(0);
  });

  it('schedule — campaign status → scheduled', () => {
    const VID = `vendor-${Date.now()}-2`;
    const c = campaignManager.createCampaign({ name: 'X', type: 'sms', target: `${VID}:y`, content: 'C' });
    campaignManager.schedule(c.id, Date.now() + 60000);
    expect(c.status).toBe('scheduled');
  });

  it('send — campaign status → sent + metrics.sent randomized > 0', () => {
    const VID = `vendor-${Date.now()}-3`;
    const c = campaignManager.createCampaign({ name: 'X', type: 'push', target: `${VID}:y`, content: 'C' });
    campaignManager.send(c.id);
    expect(c.status).toBe('sent');
    const metrics = campaignManager.getMetrics(c.id);
    expect(metrics.sent).toBeGreaterThanOrEqual(1000);
    expect(metrics.sent).toBeLessThanOrEqual(11000);
  });

  it('getCampaigns — vendor filter (target.split(":")[0])', () => {
    const VID = `vendor-${Date.now()}-4`;
    campaignManager.createCampaign({ name: 'a', type: 'email', target: `${VID}:x`, content: 'c' });
    campaignManager.createCampaign({ name: 'b', type: 'sms', target: `${VID}:y`, content: 'c' });
    const list = campaignManager.getCampaigns(VID);
    expect(list.length).toBe(2);
  });

  it('getCampaigns — type filter', () => {
    const VID = `vendor-${Date.now()}-5`;
    campaignManager.createCampaign({ name: 'a', type: 'email', target: `${VID}:x`, content: 'c' });
    campaignManager.createCampaign({ name: 'b', type: 'sms', target: `${VID}:y`, content: 'c' });
    const emailOnly = campaignManager.getCampaigns(VID, 'email');
    expect(emailOnly).toHaveLength(1);
    expect(emailOnly[0].type).toBe('email');
  });

  it('getMetrics — bilinmeyen id → default 0 metrics', () => {
    const m = campaignManager.getMetrics('non-existent');
    expect(m).toEqual({ campaignId: 'non-existent', sent: 0, opened: 0, clicked: 0, converted: 0 });
  });

  it('recordEngagement — opened/clicked/converted counter artar', () => {
    const VID = `vendor-${Date.now()}-6`;
    const c = campaignManager.createCampaign({ name: 'x', type: 'email', target: `${VID}:y`, content: 'z' });
    campaignManager.recordEngagement(c.id, 'opened');
    campaignManager.recordEngagement(c.id, 'opened');
    campaignManager.recordEngagement(c.id, 'clicked');
    campaignManager.recordEngagement(c.id, 'converted');
    const m = campaignManager.getMetrics(c.id);
    expect(m.opened).toBe(2);
    expect(m.clicked).toBe(1);
    expect(m.converted).toBe(1);
  });
});

describe('TemplateEngine', () => {
  it('createTemplate — id prefix + content store', () => {
    const id = templateEngine.createTemplate('welcome', 'Merhaba {{name}}', ['name']);
    expect(id.startsWith('template-')).toBe(true);
  });

  it('renderTemplate — {{var}} replace + missing → empty string', () => {
    const id = templateEngine.createTemplate('greet', 'Hi {{name}}, you owe {{amount}}', ['name', 'amount']);
    const out = templateEngine.renderTemplate(id, { name: 'Ali', amount: 100 });
    expect(out).toBe('Hi Ali, you owe 100');
  });

  it('renderTemplate — eksik var → empty string', () => {
    const id = templateEngine.createTemplate('greet2', 'Hi {{name}}', ['name']);
    const out = templateEngine.renderTemplate(id, {});
    expect(out).toBe('Hi ');
  });

  it('renderTemplate — bilinmeyen template → boş string', () => {
    expect(templateEngine.renderTemplate('non-existent', {})).toBe('');
  });

  it('renderTemplate — whitespace inside {{ var }} eşleşir', () => {
    const id = templateEngine.createTemplate('ws', 'Hi {{ name }}', ['name']);
    expect(templateEngine.renderTemplate(id, { name: 'Veli' })).toBe('Hi Veli');
  });

  it('registerTemplate + listTemplates — vendor filter', () => {
    const VID = `vendor-tpl-${Date.now()}`;
    const id1 = templateEngine.createTemplate('a', 'x', []);
    const id2 = templateEngine.createTemplate('b', 'y', []);
    templateEngine.registerTemplate(VID, id1);
    templateEngine.registerTemplate(VID, id2);
    const list = templateEngine.listTemplates(VID);
    expect(list).toHaveLength(2);
  });
});

describe('EngagementAutomation', () => {
  it('addRule + evaluateRules — exact equality match', () => {
    engagementAutomation.addRule({ trigger: 't1', action: 'send_offer', condition: { plan: 'pro' } });
    const matched = engagementAutomation.evaluateRules('u1', { plan: 'pro' });
    expect(matched.length).toBeGreaterThanOrEqual(1);
  });

  it('evaluateRules — array condition .includes() match', () => {
    engagementAutomation.addRule({ trigger: 't2', action: 'send_reminder', condition: { country: ['TR', 'DE'] } });
    const matched = engagementAutomation.evaluateRules('u1', { country: 'TR' });
    expect(matched.some((r) => r.action === 'send_reminder')).toBe(true);
  });

  it('evaluateRules — range condition (min/max)', () => {
    engagementAutomation.addRule({
      trigger: 't3',
      action: 'tier_upgrade',
      condition: { score: { min: 50, max: 100 } },
    });
    const ok = engagementAutomation.evaluateRules('u1', { score: 75 });
    const tooLow = engagementAutomation.evaluateRules('u1', { score: 30 });
    expect(ok.some((r) => r.action === 'tier_upgrade')).toBe(true);
    expect(tooLow.some((r) => r.action === 'tier_upgrade')).toBe(false);
  });

  it('triggerAction — actionsExecuted counter artar', () => {
    const before = engagementAutomation.getAutomationStats().actionsExecuted;
    engagementAutomation.triggerAction({ trigger: 'x', action: 'send_offer', condition: {} }, 'u1');
    const after = engagementAutomation.getAutomationStats().actionsExecuted;
    expect(after).toBe(before + 1);
  });

  it('getAutomationStats — conversionRate yüzde formatı (decimals 2)', () => {
    const stats = engagementAutomation.getAutomationStats();
    expect(typeof stats.conversionRate).toBe('number');
    expect(stats.conversionRate).toBeGreaterThanOrEqual(0);
  });
});
