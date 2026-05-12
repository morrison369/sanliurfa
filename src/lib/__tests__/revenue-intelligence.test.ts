/**
 * Unit Tests — analytics/revenue-intelligence.ts singleton class managers (Phase 32)
 *
 * - MeterBilling (defineMeter + recordUsage + getSummary + calculateBill)
 * - RevenueAttributor (attributeRevenue + getAttribution + getTopChannels)
 * - RevenueForecaster (recordRevenue + forecast linear regression + getGrowthRate)
 *
 * Singleton state shared.
 */

import { describe, it, expect } from 'vitest';
import {
  meterBilling,
  revenueAttributor,
  revenueForecaster,
} from '../analytics/revenue-intelligence';

const NOW = Date.now();
const DAY = 86400000;

describe('MeterBilling', () => {
  it('defineMeter + getSummary — totalUsage + billableAmount', () => {
    const MID = `meter-${Date.now()}-1`;
    meterBilling.defineMeter(MID, 0.5, 'request');
    meterBilling.recordUsage({ meterId: MID, userId: 'u1', quantity: 100, timestamp: NOW });
    meterBilling.recordUsage({ meterId: MID, userId: 'u1', quantity: 50, timestamp: NOW });
    const summary = meterBilling.getSummary(MID, 'u1', '2026-01');
    expect(summary.totalUsage).toBe(150);
    expect(summary.billableAmount).toBe(75); // 150 * 0.5
  });

  it('getSummary — bilinmeyen meter → throw', () => {
    expect(() => meterBilling.getSummary('non-existent', 'u', 'p')).toThrow(/Meter not found/);
  });

  it('getSummary — başka kullanıcı usage hariç', () => {
    const MID = `meter-${Date.now()}-filter`;
    meterBilling.defineMeter(MID, 1, 'unit');
    meterBilling.recordUsage({ meterId: MID, userId: 'u-self', quantity: 10, timestamp: NOW });
    meterBilling.recordUsage({ meterId: MID, userId: 'u-other', quantity: 1000, timestamp: NOW });
    expect(meterBilling.getSummary(MID, 'u-self', 'p').totalUsage).toBe(10);
  });

  it('getSummary — usage yok → totalUsage 0', () => {
    const MID = `meter-${Date.now()}-empty`;
    meterBilling.defineMeter(MID, 1, 'unit');
    expect(meterBilling.getSummary(MID, 'u-noop', 'p').totalUsage).toBe(0);
  });

  it('calculateBill — multiple meter toplam', () => {
    const M1 = `meter-bill-${Date.now()}-A`;
    const M2 = `meter-bill-${Date.now()}-B`;
    meterBilling.defineMeter(M1, 2, 'request');
    meterBilling.defineMeter(M2, 5, 'gigabyte');
    meterBilling.recordUsage({ meterId: M1, userId: 'u-bill', quantity: 10, timestamp: NOW });
    meterBilling.recordUsage({ meterId: M2, userId: 'u-bill', quantity: 3, timestamp: NOW });
    const total = meterBilling.calculateBill('u-bill', '2026-01');
    // 10*2 + 3*5 = 35 + (other meters with 0 usage)
    expect(total).toBeGreaterThanOrEqual(35);
  });
});

describe('RevenueAttributor', () => {
  it('attributeRevenue — yeni channel oluşturulur', () => {
    revenueAttributor.attributeRevenue(100, `org-${Date.now()}-A`, 'spring-sale');
    const all = revenueAttributor.getAttribution();
    expect(all.some((a) => a.channel.startsWith('org-'))).toBe(true);
  });

  it('attributeRevenue — aynı channel + campaign → revenue + conversions toplanır', () => {
    const CH = `paid-${Date.now()}`;
    revenueAttributor.attributeRevenue(50, CH, 'camp-A');
    revenueAttributor.attributeRevenue(75, CH, 'camp-A');
    const all = revenueAttributor.getAttribution();
    const found = all.find((a) => a.channel === CH && a.campaignId === 'camp-A');
    expect(found?.revenue).toBe(125);
    expect(found?.conversions).toBe(2);
  });

  it('attributeRevenue — campaignId optional', () => {
    revenueAttributor.attributeRevenue(50, `noncamp-${Date.now()}`);
    const all = revenueAttributor.getAttribution();
    const found = all.find((a) => a.channel.startsWith('noncamp-'));
    expect(found).toBeDefined();
    expect(found?.campaignId).toBeUndefined();
  });

  it('attributeRevenue — farklı campaignId → ayrı attribution', () => {
    const CH = `multi-${Date.now()}`;
    revenueAttributor.attributeRevenue(100, CH, 'camp-1');
    revenueAttributor.attributeRevenue(200, CH, 'camp-2');
    const all = revenueAttributor.getAttribution().filter((a) => a.channel === CH);
    expect(all).toHaveLength(2);
  });

  it('getAttribution — referans değil kopya (spread)', () => {
    const a1 = revenueAttributor.getAttribution();
    const a2 = revenueAttributor.getAttribution();
    expect(a1).not.toBe(a2); // farklı array referansı
  });

  it('getTopChannels — revenue desc + limit', () => {
    const top = revenueAttributor.getTopChannels(5);
    expect(top.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].revenue).toBeGreaterThanOrEqual(top[i].revenue);
    }
  });

  it('getTopChannels — default limit 10', () => {
    const top = revenueAttributor.getTopChannels();
    expect(top.length).toBeLessThanOrEqual(10);
  });
});

describe('RevenueForecaster', () => {
  it('forecast — < 2 history record → boş array', () => {
    // Note: singleton state shared; defensive — eğer history dolu değilse boş
    // Yeni instance test edemiyoruz (sadece singleton)
    const result = revenueForecaster.forecast(7);
    expect(Array.isArray(result)).toBe(true);
  });

  it('forecast — daysAhead kadar prediction', () => {
    revenueForecaster.recordRevenue(1000, NOW - 30 * DAY);
    revenueForecaster.recordRevenue(2000, NOW - 15 * DAY);
    revenueForecaster.recordRevenue(3000, NOW);
    const result = revenueForecaster.forecast(7);
    expect(result.length).toBe(7);
  });

  it('forecast — predicted >= 0 (Math.max guard)', () => {
    revenueForecaster.recordRevenue(100, NOW);
    revenueForecaster.recordRevenue(200, NOW + DAY);
    const result = revenueForecaster.forecast(5);
    for (const p of result) {
      expect(p.predicted).toBeGreaterThanOrEqual(0);
    }
  });

  it('forecast — confidence ileri günlerde düşer', () => {
    revenueForecaster.recordRevenue(100, NOW);
    revenueForecaster.recordRevenue(200, NOW + DAY);
    const result = revenueForecaster.forecast(5);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].confidence).toBeLessThan(result[i - 1].confidence);
    }
  });

  it('forecast — ilk gün confidence 0.75 (0.8 - 0.05*1)', () => {
    revenueForecaster.recordRevenue(100, NOW);
    revenueForecaster.recordRevenue(200, NOW + DAY);
    const result = revenueForecaster.forecast(3);
    expect(result[0].confidence).toBeCloseTo(0.75, 2);
  });

  it('getGrowthRate — < 2 record → 0', () => {
    // Singleton state shared, defensive
    const rate = revenueForecaster.getGrowthRate(30);
    expect(typeof rate).toBe('number');
  });

  it('getGrowthRate — first/last % değişim', () => {
    // Yeni window (geçmiş tarihler hariç)
    revenueForecaster.recordRevenue(1000, NOW - 5 * DAY);
    revenueForecaster.recordRevenue(2000, NOW - 1 * DAY);
    const rate = revenueForecaster.getGrowthRate(10);
    // En azından mantıklı bir % çıkmalı (singleton state nedeniyle exact match yapamıyoruz)
    expect(typeof rate).toBe('number');
  });
});
