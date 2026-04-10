import { describe, expect, it } from 'vitest';
import { OperationalTransformation, PresenceManager } from '../collaboration';
import { decisionAuditor, decisionReplayEngine } from '../decision-audit';
import { slaManager } from '../escalation-management';
import { AnomalyDetector } from '../data-quality';
import { inventoryOptimizer } from '../inventory-warehouse';
import { campaignManager, engagementAutomation, templateEngine } from '../marketing-automation';

describe('Runtime determinism wave 10', () => {
  it('keeps collaboration identifiers and colors stable for the same inputs', () => {
    const ot = new OperationalTransformation();
    const change = ot.applyLocalChange('user-1', {
      userId: 'user-1',
      type: 'update',
      path: 'document.title',
      value: { text: 'Sanliurfa' }
    });

    expect(change.id).toMatch(/^change-/);
    expect(change.version).toBe(0);

    const presence = new PresenceManager();
    presence.updatePresence('user-1', { username: 'oguz' });
    const firstColor = presence.getActiveUsers()[0]?.color;
    presence.updatePresence('user-1', { cursorPosition: { x: 12, y: 34 } });
    const secondColor = presence.getActiveUsers()[0]?.color;

    expect(firstColor).toBe(secondColor);
  });

  it('keeps decision replay, SLA compliance and pattern anomalies deterministic', () => {
    const record = decisionAuditor.recordDecision(
      'policy-1',
      'allow',
      { role: 'admin', location: 'sanliurfa' },
      'system',
      'policy matched'
    );

    const replayA = decisionReplayEngine.replayDecision(record.decisionId, record, { version: 2, rules: ['allow-admin'] });
    const replayB = decisionReplayEngine.replayDecision(record.decisionId, record, { version: 2, rules: ['allow-admin'] });
    expect(replayA).toEqual(replayB);

    expect(slaManager.checkSLACompliance('issue-1')).toBe(slaManager.checkSLACompliance('issue-1'));

    const detector = new AnomalyDetector();
    const dataset = [{ status: 'ok' }, { status: 'ok' }, { status: 'warning' }, { status: 'ok' }];
    expect(detector.detectPatternAnomalies(dataset, 'status')).toEqual(
      detector.detectPatternAnomalies(dataset, 'status')
    );
  });

  it('keeps inventory turnover and marketing automation behavior deterministic', () => {
    expect(inventoryOptimizer.analyzeTurnover('sku-1', '2026-Q2')).toEqual(
      inventoryOptimizer.analyzeTurnover('sku-1', '2026-Q2')
    );

    const campaign = campaignManager.createCampaign({
      name: 'Spring Offer',
      type: 'email',
      target: 'vendor-1:active-users',
      content: 'Discount'
    });
    campaignManager.send(campaign.id);
    expect(campaignManager.getMetrics(campaign.id)).toEqual(campaignManager.getMetrics(campaign.id));

    const templateA = templateEngine.createTemplate('Welcome', 'Hello {{name}}', ['name']);
    const templateB = templateEngine.createTemplate('Welcome', 'Hello {{name}}', ['name']);
    expect(templateA).not.toBe(templateB);
    expect(templateA).toMatch(/^template-/);
    expect(templateB).toMatch(/^template-/);

    engagementAutomation.addRule({
      trigger: 'signup',
      action: 'send_offer',
      condition: { plan: 'premium' }
    });

    const matching = engagementAutomation.evaluateRules('user-1', { plan: 'premium' });
    expect(matching).toHaveLength(1);

    engagementAutomation.triggerAction(matching[0], 'user-1');
    const statsA = engagementAutomation.getAutomationStats();
    engagementAutomation.triggerAction(matching[0], 'user-1');
    const statsB = engagementAutomation.getAutomationStats();

    expect(statsA.rulesTriggered).toBeGreaterThan(0);
    expect(statsB.actionsExecuted).toBe(statsA.actionsExecuted + 1);
    expect(statsB.conversionRate).toBeGreaterThanOrEqual(statsA.conversionRate);
  });
});
