/**
 * Unit Tests — analytics/supply-chain-analytics.ts singleton class managers
 *
 * - SupplyChainMetrics (calculateLeadTime + getInventoryTurnover + getFulfillmentRate stochastic)
 * - SupplierAnalytics (recordSupplierMetric + getSupplierScore composite + identifyRisks + recommendAlternatives)
 * - OptimizationEngine (analyzeCosts + detectBottlenecks + optimizeNetworkDesign + simulateScenario + getImprovementPriorities)
 *
 * Note: Math.random() kullanımı yaygın → test invariant property kontrolleri.
 */

import { describe, it, expect } from 'vitest';
import {
  supplyChainMetrics,
  supplierAnalytics,
  optimizationEngine,
} from '../analytics/supply-chain-analytics';

describe('SupplyChainMetrics', () => {
  it('getMetrics — bilinmeyen → null', () => {
    expect(supplyChainMetrics.getMetrics('non-existent-period')).toBeNull();
  });

  it('calculateLeadTime — 2-16 gün arası', () => {
    for (let i = 0; i < 20; i++) {
      const lead = supplyChainMetrics.calculateLeadTime(`SKU-${i}`);
      expect(lead).toBeGreaterThanOrEqual(2);
      expect(lead).toBeLessThanOrEqual(16);
    }
  });

  it('getInventoryTurnover — 0-10 arası 2 ondalık', () => {
    for (let i = 0; i < 20; i++) {
      const turnover = supplyChainMetrics.getInventoryTurnover(`SKU-${i}`, 'Q1');
      expect(turnover).toBeGreaterThanOrEqual(0);
      expect(turnover).toBeLessThanOrEqual(10);
    }
  });

  it('getFulfillmentRate — 95-100% arası', () => {
    for (let i = 0; i < 20; i++) {
      const rate = supplyChainMetrics.getFulfillmentRate('Q1');
      expect(rate).toBeGreaterThanOrEqual(95);
      expect(rate).toBeLessThanOrEqual(100);
    }
  });
});

describe('SupplierAnalytics', () => {
  it('getSupplierScore — kayıtlı supplier composite formula', () => {
    supplierAnalytics.recordSupplierMetric('sup-score-1', {
      onTimeDelivery: 90,
      qualityScore: 95,
      costCompetitiveness: 80,
      reliability: 85,
    } as any);
    // 90*0.3 + 95*0.3 + 80*0.2 + 85*0.2 = 27 + 28.5 + 16 + 17 = 88.5 → 89
    expect(supplierAnalytics.getSupplierScore('sup-score-1')).toBe(89);
  });

  it('getSupplierScore — bilinmeyen → 0', () => {
    expect(supplierAnalytics.getSupplierScore('non-existent')).toBe(0);
  });

  it('compareSuppliers — score desc sıralı', () => {
    supplierAnalytics.recordSupplierMetric('sup-cmp-A', {
      onTimeDelivery: 95, qualityScore: 95, costCompetitiveness: 90, reliability: 95,
    } as any);
    supplierAnalytics.recordSupplierMetric('sup-cmp-B', {
      onTimeDelivery: 70, qualityScore: 70, costCompetitiveness: 70, reliability: 70,
    } as any);
    const cmp = supplierAnalytics.compareSuppliers('SKU-X');
    for (let i = 1; i < cmp.length; i++) {
      expect(cmp[i - 1].score).toBeGreaterThanOrEqual(cmp[i].score);
    }
  });

  it('identifyRisks — onTimeDelivery < 90 → "Delivery reliability risk"', () => {
    supplierAnalytics.recordSupplierMetric('sup-risk-1', {
      onTimeDelivery: 80, qualityScore: 99, costCompetitiveness: 90, reliability: 95,
    } as any);
    expect(supplierAnalytics.identifyRisks('sup-risk-1')).toContain('Delivery reliability risk');
  });

  it('identifyRisks — qualityScore < 95 → "Quality concerns"', () => {
    supplierAnalytics.recordSupplierMetric('sup-risk-q', {
      onTimeDelivery: 99, qualityScore: 80, costCompetitiveness: 90, reliability: 95,
    } as any);
    expect(supplierAnalytics.identifyRisks('sup-risk-q')).toContain('Quality concerns');
  });

  it('identifyRisks — reliability < 85 → "Performance inconsistency"', () => {
    supplierAnalytics.recordSupplierMetric('sup-risk-r', {
      onTimeDelivery: 99, qualityScore: 99, costCompetitiveness: 90, reliability: 70,
    } as any);
    expect(supplierAnalytics.identifyRisks('sup-risk-r')).toContain('Performance inconsistency');
  });

  it('identifyRisks — costCompetitiveness < 70 → "Cost competitiveness issues"', () => {
    supplierAnalytics.recordSupplierMetric('sup-risk-c', {
      onTimeDelivery: 99, qualityScore: 99, costCompetitiveness: 50, reliability: 95,
    } as any);
    expect(supplierAnalytics.identifyRisks('sup-risk-c')).toContain('Cost competitiveness issues');
  });

  it('identifyRisks — bilinmeyen → boş array', () => {
    expect(supplierAnalytics.identifyRisks('non-existent')).toEqual([]);
  });

  it('identifyRisks — sağlıklı supplier → boş array', () => {
    supplierAnalytics.recordSupplierMetric('sup-healthy', {
      onTimeDelivery: 99, qualityScore: 99, costCompetitiveness: 90, reliability: 95,
    } as any);
    expect(supplierAnalytics.identifyRisks('sup-healthy')).toEqual([]);
  });

  it('recommendAlternatives — kendisi hariç + ilk 3 + score desc', () => {
    const alternatives = supplierAnalytics.recommendAlternatives('sup-cmp-A');
    expect(alternatives.length).toBeLessThanOrEqual(3);
    expect(alternatives.every((a) => a.supplierId !== 'sup-cmp-A')).toBe(true);
    for (let i = 1; i < alternatives.length; i++) {
      expect(alternatives[i - 1].score).toBeGreaterThanOrEqual(alternatives[i].score);
    }
  });
});

describe('OptimizationEngine', () => {
  it('analyzeCosts — recommendation array (0-2 entry)', () => {
    const recs = optimizationEngine.analyzeCosts('Q1');
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeLessThanOrEqual(2);
  });

  it('analyzeCosts — her recommendation type/description/impact/effort', () => {
    let recs: any[] = [];
    for (let i = 0; i < 30 && recs.length === 0; i++) {
      recs = optimizationEngine.analyzeCosts('Q' + i);
    }
    if (recs.length > 0) {
      const r = recs[0];
      expect(r.type).toBe('cost');
      expect(r.description).toBeTruthy();
      expect(r.impact).toBeTruthy();
      expect(['low', 'medium', 'high']).toContain(r.effort);
    }
  });

  it('detectBottlenecks — report array (0-1 entry)', () => {
    const reports = optimizationEngine.detectBottlenecks();
    expect(Array.isArray(reports)).toBe(true);
    expect(reports.length).toBeLessThanOrEqual(1);
  });

  it('detectBottlenecks — warehouse default "Main Warehouse"', () => {
    let reports: any[] = [];
    for (let i = 0; i < 30 && reports.length === 0; i++) {
      reports = optimizationEngine.detectBottlenecks();
    }
    if (reports.length > 0) {
      expect(reports[0].location).toBe('Main Warehouse');
    }
  });

  it('detectBottlenecks — custom warehouseId', () => {
    let reports: any[] = [];
    for (let i = 0; i < 30 && reports.length === 0; i++) {
      reports = optimizationEngine.detectBottlenecks('warehouse-east-1');
    }
    if (reports.length > 0) {
      expect(reports[0].location).toBe('warehouse-east-1');
    }
  });

  it('optimizeNetworkDesign — 2 fixed recommendation (efficiency + cost)', () => {
    const recs = optimizationEngine.optimizeNetworkDesign();
    expect(recs).toHaveLength(2);
    const types = recs.map((r) => r.type);
    expect(types).toContain('efficiency');
    expect(types).toContain('cost');
  });

  it('simulateScenario — costSavings 5000-25000 + riskLevel 0-50', () => {
    for (let i = 0; i < 10; i++) {
      const result = optimizationEngine.simulateScenario({});
      expect(result.costSavings).toBeGreaterThanOrEqual(5000);
      expect(result.costSavings).toBeLessThanOrEqual(25000);
      expect(result.riskLevel).toBeGreaterThanOrEqual(0);
      expect(result.riskLevel).toBeLessThanOrEqual(50);
    }
  });

  it('getImprovementPriorities — 3 fixed recommendation', () => {
    const recs = optimizationEngine.getImprovementPriorities();
    expect(recs).toHaveLength(3);
    expect(recs.map((r) => r.type)).toEqual(['efficiency', 'quality', 'cost']);
  });
});
