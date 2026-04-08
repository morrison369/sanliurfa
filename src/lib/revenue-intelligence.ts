/**
 * Phase 32: Revenue Intelligence & Metered Billing
 * Usage-based billing, revenue attribution, revenue forecasting
 */

import { logger } from './logging';

export interface MeterEvent {
  meterId: string;
  userId: string;
  quantity: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface UsageSummary {
  meterId: string;
  userId: string;
  totalUsage: number;
  billableAmount: number;
  period: string;
}

export interface RevenueAttribution {
  channel: string;
  campaignId?: string;
  revenue: number;
  conversions: number;
}

export class MeterBilling {
  private meters = new Map<string, { unitPrice: number; unit: string }>();
  private usage = new Map<string, MeterEvent[]>();

  defineMeter(meterId: string, unitPrice: number, unit: string): void {
    this.meters.set(meterId, { unitPrice, unit });
  }

  recordUsage(event: MeterEvent): void {
    if (!this.usage.has(event.meterId)) {
      this.usage.set(event.meterId, []);
    }
    this.usage.get(event.meterId)!.push(event);
  }

  getSummary(meterId: string, userId: string, period: string): UsageSummary {
    const meter = this.meters.get(meterId);
    if (!meter) throw new Error(`Meter not found: ${meterId}`);

    const events = this.usage.get(meterId) || [];
    const userEvents = events.filter(e => e.userId === userId);
    const totalUsage = userEvents.reduce((sum, e) => sum + e.quantity, 0);
    const billableAmount = totalUsage * meter.unitPrice;

    return { meterId, userId, totalUsage, billableAmount, period };
  }

  calculateBill(userId: string, period: string): number {
    let total = 0;
    for (const [meterId] of this.meters) {
      const summary = this.getSummary(meterId, userId, period);
      total += summary.billableAmount;
    }
    return total;
  }
}

export class RevenueAttributor {
  private attributions: RevenueAttribution[] = [];

  attributeRevenue(amount: number, channel: string, campaignId?: string): void {
    let attribution = this.attributions.find(a => a.channel === channel && a.campaignId === campaignId);
    if (!attribution) {
      attribution = { channel, campaignId, revenue: 0, conversions: 0 };
      this.attributions.push(attribution);
    }
    attribution.revenue += amount;
    attribution.conversions++;
  }

  getAttribution(period?: string): RevenueAttribution[] {
    return [...this.attributions];
  }

  getTopChannels(limit: number = 10): RevenueAttribution[] {
    return [...this.attributions].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  }
}

export class RevenueForecaster {
  private revenueHistory: { date: number; amount: number }[] = [];

  recordRevenue(amount: number, date: number): void {
    this.revenueHistory.push({ date, amount });
  }

  forecast(daysAhead: number): { date: number; predicted: number; confidence: number }[] {
    if (this.revenueHistory.length < 2) {
      return [];
    }

    // Simple linear regression forecast
    const sorted = [...this.revenueHistory].sort((a, b) => a.date - b.date);
    const n = sorted.length;
    const avgDate = sorted.reduce((sum, x) => sum + x.date, 0) / n;
    const avgRevenue = sorted.reduce((sum, x) => sum + x.amount, 0) / n;

    const slope = sorted.reduce((num, x) => num + (x.date - avgDate) * (x.amount - avgRevenue), 0) /
      sorted.reduce((den, x) => den + (x.date - avgDate) * (x.date - avgDate), 0) || 0;

    const dayMs = 24 * 60 * 60 * 1000;
    const forecast = [];
    const now = Date.now();

    for (let i = 1; i <= daysAhead; i++) {
      const date = now + i * dayMs;
      const predicted = avgRevenue + slope * (date - avgDate);
      forecast.push({ date, predicted: Math.max(0, predicted), confidence: 0.8 - (i * 0.05) });
    }

    return forecast;
  }

  getGrowthRate(windowDays: number = 30): number {
    if (this.revenueHistory.length < 2) return 0;

    const now = Date.now();
    const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
    const recent = this.revenueHistory.filter(x => x.date >= cutoff);

    if (recent.length < 2) return 0;

    const first = recent[0].amount;
    const last = recent[recent.length - 1].amount;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }
}

export const meterBilling = new MeterBilling();
export const revenueAttributor = new RevenueAttributor();
export const revenueForecaster = new RevenueForecaster();
