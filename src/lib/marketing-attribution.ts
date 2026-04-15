/**
 * Phase 239: Marketing Attribution
 * Multi-touch attribution, channel contribution, campaign ROI, attribution modeling
 */

import { logger } from './logger';

interface TouchpointEvent {
  eventId: string;
  customerId: string;
  channel: string;
  campaign: string;
  touchOrder: number;
  timestamp: number;
  isConversion: boolean;
  conversionValue: number;
}

interface AttributionResult {
  attributionId: string;
  customerId: string;
  conversionValue: number;
  model: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'position_based' | 'data_driven';
  channelCredits: Record<string, number>;  // channel → credited value
  touchpointCount: number;
  calculatedAt: number;
}

interface ChannelContribution {
  contributionId: string;
  channel: string;
  period: string;
  totalConversions: number;
  totalRevenue: number;
  attributedRevenue: number;
  contributionPct: number;
  costSpend: number;
  roas: number;  // Return on Ad Spend
  capturedAt: number;
}

interface CampaignROI {
  roiId: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  attributedRevenue: number;
  roi: number;  // (revenue - spend) / spend * 100
  conversions: number;
  cpa: number;  // cost per acquisition
  period: string;
  calculatedAt: number;
}

class TouchpointEventCollector {
  private events: Map<string, TouchpointEvent[]> = new Map();
  private counter = 0;

  record(customerId: string, channel: string, campaign: string, isConversion: boolean, conversionValue = 0): TouchpointEvent {
    const existing = this.events.get(customerId) || [];
    const eventId = `tpevent-${Date.now()}-${++this.counter}`;
    const event: TouchpointEvent = {
      eventId, customerId, channel, campaign,
      touchOrder: existing.length + 1,
      timestamp: Date.now(), isConversion, conversionValue
    };
    existing.push(event);
    this.events.set(customerId, existing);
    return event;
  }

  getCustomerJourney(customerId: string): TouchpointEvent[] {
    return (this.events.get(customerId) || []).sort((a, b) => a.timestamp - b.timestamp);
  }

  getConversionJourneys(): Map<string, TouchpointEvent[]> {
    const result = new Map<string, TouchpointEvent[]>();
    for (const [id, events] of this.events.entries()) {
      if (events.some(e => e.isConversion)) result.set(id, events);
    }
    return result;
  }
}

class AttributionModelEngine {
  private results: AttributionResult[] = [];
  private counter = 0;

  attribute(customerId: string, journey: TouchpointEvent[], model: AttributionResult['model']): AttributionResult {
    const conversion = journey.find(e => e.isConversion);
    const conversionValue = conversion?.conversionValue || 0;
    const channelCredits: Record<string, number> = {};

    if (journey.length === 0) {
      const attributionId = `attr-${Date.now()}-${++this.counter}`;
      return { attributionId, customerId, conversionValue, model, channelCredits, touchpointCount: 0, calculatedAt: Date.now() };
    }

    const touches = journey.filter(e => !e.isConversion);
    if (model === 'first_touch' && touches.length > 0) {
      channelCredits[touches[0].channel] = conversionValue;
    } else if (model === 'last_touch' && touches.length > 0) {
      channelCredits[touches[touches.length - 1].channel] = conversionValue;
    } else if (model === 'linear') {
      const perTouch = touches.length > 0 ? conversionValue / touches.length : 0;
      for (const t of touches) channelCredits[t.channel] = (channelCredits[t.channel] || 0) + perTouch;
    } else if (model === 'time_decay') {
      const weights = touches.map((_, i) => Math.pow(2, i));
      const totalWeight = weights.reduce((s, w) => s + w, 0);
      touches.forEach((t, i) => { channelCredits[t.channel] = (channelCredits[t.channel] || 0) + (weights[i] / totalWeight) * conversionValue; });
    } else if (model === 'position_based') {
      if (touches.length === 1) {
        channelCredits[touches[0].channel] = conversionValue;
      } else {
        channelCredits[touches[0].channel] = (channelCredits[touches[0].channel] || 0) + conversionValue * 0.4;
        channelCredits[touches[touches.length - 1].channel] = (channelCredits[touches[touches.length - 1].channel] || 0) + conversionValue * 0.4;
        const middle = touches.slice(1, -1);
        const midCredit = middle.length > 0 ? (conversionValue * 0.2) / middle.length : 0;
        for (const t of middle) channelCredits[t.channel] = (channelCredits[t.channel] || 0) + midCredit;
      }
    }

    const attributionId = `attr-${Date.now()}-${++this.counter}`;
    const result: AttributionResult = {
      attributionId, customerId, conversionValue, model,
      channelCredits, touchpointCount: touches.length, calculatedAt: Date.now()
    };
    this.results.push(result);
    logger.debug('Attribution calculated', { customerId, model, conversionValue });
    return result;
  }

  getChannelTotalCredit(channel: string): number {
    return this.results.reduce((s, r) => s + (r.channelCredits[channel] || 0), 0);
  }

  getResults(): AttributionResult[] {
    return [...this.results];
  }
}

class ChannelContributionTracker {
  private contributions: Map<string, ChannelContribution[]> = new Map();
  private counter = 0;

  record(channel: string, period: string, conversions: number, totalRevenue: number, attributedRevenue: number, costSpend: number): ChannelContribution {
    const contributionId = `chancontrib-${Date.now()}-${++this.counter}`;
    const contribution: ChannelContribution = {
      contributionId, channel, period, totalConversions: conversions,
      totalRevenue, attributedRevenue,
      contributionPct: totalRevenue > 0 ? (attributedRevenue / totalRevenue) * 100 : 0,
      costSpend, roas: costSpend > 0 ? attributedRevenue / costSpend : 0,
      capturedAt: Date.now()
    };
    const existing = this.contributions.get(channel) || [];
    existing.push(contribution);
    this.contributions.set(channel, existing);
    return contribution;
  }

  getTopROASChannels(limit = 5): ChannelContribution[] {
    return Array.from(this.contributions.values())
      .map(h => h[h.length - 1])
      .filter((c): c is ChannelContribution => !!c)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, limit);
  }

  getLatest(channel: string): ChannelContribution | undefined {
    const history = this.contributions.get(channel) || [];
    return history[history.length - 1];
  }
}

class CampaignROICalculator {
  private records: Map<string, CampaignROI> = new Map();
  private counter = 0;

  calculate(campaignId: string, campaignName: string, spend: number, attributedRevenue: number, conversions: number, period: string): CampaignROI {
    const roi = spend > 0 ? ((attributedRevenue - spend) / spend) * 100 : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;
    const roiId = `camproi-${Date.now()}-${++this.counter}`;
    const record: CampaignROI = {
      roiId, campaignId, campaignName, spend, attributedRevenue, roi, conversions, cpa, period, calculatedAt: Date.now()
    };
    this.records.set(campaignId, record);
    logger.debug('Campaign ROI calculated', { campaignId, roi: roi.toFixed(1), cpa });
    return record;
  }

  getTopROI(limit = 5): CampaignROI[] {
    return Array.from(this.records.values()).sort((a, b) => b.roi - a.roi).slice(0, limit);
  }

  getNegativeROI(): CampaignROI[] {
    return Array.from(this.records.values()).filter(r => r.roi < 0);
  }

  getRecord(campaignId: string): CampaignROI | undefined {
    return this.records.get(campaignId);
  }
}

export const touchpointEventCollector = new TouchpointEventCollector();
export const attributionModelEngine = new AttributionModelEngine();
export const channelContributionTracker = new ChannelContributionTracker();
export const campaignROICalculator = new CampaignROICalculator();

export { TouchpointEvent, AttributionResult, ChannelContribution, CampaignROI };
