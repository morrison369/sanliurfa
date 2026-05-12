/**
 * Unit Tests — ai/ai-inventory-planning.ts singleton class managers (Phase 58)
 *
 * - AIInventoryForecaster (forecast/detectAnomalies/getPredictionConfidence/updateModelPerformance)
 * - AutoReplenishment (enable/createOrder/listOrders/updateOrderStatus/getStats)
 * - PredictiveAlerts (generate/getAlert/dismissAlert/acknowledge/getHistory)
 *
 * Note: forecast() ve detectAnomalies() Math.random() kullanır — testler
 * deterministic property'leri (range/length/structure) kontrol eder, exact value değil.
 */

import { describe, it, expect } from 'vitest';
import {
  aiInventoryForecaster,
  autoReplenishment,
  predictiveAlerts,
} from '../ai/ai-inventory-planning';

describe('AIInventoryForecaster', () => {
  it('forecast — periods kadar AIForecast döner', () => {
    const result = aiInventoryForecaster.forecast('SKU-1', 7);
    expect(result).toHaveLength(7);
  });

  it('forecast — sku field her record\'da set', () => {
    const result = aiInventoryForecaster.forecast('SKU-2', 5);
    expect(result.every((r) => r.sku === 'SKU-2')).toBe(true);
  });

  it('forecast — predicted >= 0 (Math.max guard)', () => {
    const result = aiInventoryForecaster.forecast('SKU-3', 30);
    for (const f of result) {
      expect(f.predicted).toBeGreaterThanOrEqual(0);
    }
  });

  it('forecast — confidence >= 0.5 floor', () => {
    const result = aiInventoryForecaster.forecast('SKU-conf', 30);
    for (const f of result) {
      expect(f.confidence).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('forecast — anomalyScore [0, 0.3] aralığı', () => {
    const result = aiInventoryForecaster.forecast('SKU-anom', 10);
    for (const f of result) {
      expect(f.anomalyScore).toBeGreaterThanOrEqual(0);
      expect(f.anomalyScore).toBeLessThanOrEqual(0.3);
    }
  });

  it('forecast — timestamp i*86400000 increment (günlük)', () => {
    const result = aiInventoryForecaster.forecast('SKU-ts', 3);
    if (result.length >= 2) {
      const diff = result[1].timestamp - result[0].timestamp;
      expect(diff).toBe(86400000);
    }
  });

  it('forecast — periods=0 → boş array', () => {
    expect(aiInventoryForecaster.forecast('SKU-zero', 0)).toEqual([]);
  });

  it('detectAnomalies — pattern array döner', () => {
    const patterns = aiInventoryForecaster.detectAnomalies('SKU-A', 0.5);
    expect(Array.isArray(patterns)).toBe(true);
    for (const p of patterns) {
      expect(p.sku).toBe('SKU-A');
      expect(p.likelihood).toBeGreaterThan(0);
      expect(Array.isArray(p.possibleCauses)).toBe(true);
    }
  });

  it('getPredictionConfidence — default 0.85', () => {
    expect(aiInventoryForecaster.getPredictionConfidence('SKU-conf-default')).toBe(0.85);
  });

  it('updateModelPerformance + getPredictionConfidence — değer güncellenir', () => {
    aiInventoryForecaster.updateModelPerformance('SKU-update', 5);
    const conf = aiInventoryForecaster.getPredictionConfidence('SKU-update');
    expect(conf).not.toBe(0.85); // değişmiş olmalı
    expect(conf).toBeGreaterThanOrEqual(0.5);
    expect(conf).toBeLessThanOrEqual(0.99);
  });

  it('updateModelPerformance — clamp 0.5-0.99', () => {
    aiInventoryForecaster.updateModelPerformance('SKU-clamp-high', 1000); // çok yüksek delta
    expect(aiInventoryForecaster.getPredictionConfidence('SKU-clamp-high')).toBeLessThanOrEqual(0.99);

    aiInventoryForecaster.updateModelPerformance('SKU-clamp-low', -1000);
    expect(aiInventoryForecaster.getPredictionConfidence('SKU-clamp-low')).toBeGreaterThanOrEqual(0.5);
  });
});

describe('AutoReplenishment', () => {
  it('enableAutoReplenishment + createOrder — order döner', () => {
    autoReplenishment.enableAutoReplenishment('SKU-enable', 'vendor-1');
    const order = autoReplenishment.createOrder('SKU-enable');
    expect(order.sku).toBe('SKU-enable');
    expect(order.status).toBe('pending');
    expect(order.id).toMatch(/^reorder-\d+-[0-9a-f]+$/);
  });

  it('createOrder — quantity 100-600 arası (random)', () => {
    const order = autoReplenishment.createOrder('SKU-qty');
    expect(order.quantity).toBeGreaterThanOrEqual(100);
    expect(order.quantity).toBeLessThanOrEqual(600);
  });

  it('createOrder — targetDate now + 7 gün', () => {
    const before = Date.now();
    const order = autoReplenishment.createOrder('SKU-target');
    const expected = before + 7 * 86400000;
    expect(order.targetDate).toBeGreaterThanOrEqual(expected - 1000);
    expect(order.targetDate).toBeLessThanOrEqual(expected + 1000);
  });

  it('listOrders — boş status → tüm orders', () => {
    autoReplenishment.createOrder('SKU-list-1');
    const all = autoReplenishment.listOrders();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it('listOrders — status filter', () => {
    const order = autoReplenishment.createOrder('SKU-status-filter');
    const pending = autoReplenishment.listOrders('pending');
    expect(pending.some((o) => o.id === order.id)).toBe(true);
    expect(pending.every((o) => o.status === 'pending')).toBe(true);
  });

  it('updateOrderStatus — status değişir', () => {
    const order = autoReplenishment.createOrder('SKU-update-status');
    autoReplenishment.updateOrderStatus(order.id, 'ordered');
    const found = autoReplenishment.listOrders().find((o) => o.id === order.id);
    expect(found?.status).toBe('ordered');
  });

  it('updateOrderStatus — bilinmeyen → no-op', () => {
    expect(() => autoReplenishment.updateOrderStatus('non-existent', 'received')).not.toThrow();
  });

  it('getReplenishmentStats — totalOrders + avgTime + costSavings', () => {
    const stats = autoReplenishment.getReplenishmentStats('Q1');
    expect(stats.totalOrders).toBeGreaterThanOrEqual(0);
    expect(stats.avgTime).toBeGreaterThanOrEqual(3); // Math.random() * 7 + 3
    expect(stats.costSavings).toBeGreaterThanOrEqual(10000); // Math.random() * 50000 + 10000
  });
});

describe('PredictiveAlerts', () => {
  it('generateAlerts — array döner (random; 0-3 entry)', () => {
    const alerts = predictiveAlerts.generateAlerts('Q1');
    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts.length).toBeLessThanOrEqual(3);
  });

  it('generateAlerts — her alert id/type/sku/severity/message/timestamp set', () => {
    // Multiple try → en az birinde alert üretilir (0.6/0.7/0.8 cumulative ≈ 0.95 chance)
    let alerts: any[] = [];
    for (let i = 0; i < 20 && alerts.length === 0; i++) {
      alerts = predictiveAlerts.generateAlerts('Q-' + i);
    }
    if (alerts.length > 0) {
      const a = alerts[0];
      expect(a.id).toBeDefined();
      expect(['shortage', 'spike', 'anomaly', 'disruption']).toContain(a.type);
      expect(a.sku).toMatch(/^SKU-\d+$/);
      expect(['low', 'medium', 'high']).toContain(a.severity);
      expect(a.message).toBeTruthy();
      expect(a.timestamp).toBeGreaterThan(0);
    }
  });

  it('getAlert — alerts içinden id ile döner', () => {
    let alert: any = null;
    for (let i = 0; i < 30 && !alert; i++) {
      const generated = predictiveAlerts.generateAlerts('GET-' + i);
      if (generated.length > 0) alert = generated[0];
    }
    if (alert) {
      expect(predictiveAlerts.getAlert(alert.id)?.id).toBe(alert.id);
    }
  });

  it('getAlert — bilinmeyen → null', () => {
    expect(predictiveAlerts.getAlert('non-existent')).toBeNull();
  });

  it('dismissAlert — alert silinir', () => {
    let alert: any = null;
    for (let i = 0; i < 30 && !alert; i++) {
      const generated = predictiveAlerts.generateAlerts('DISMISS-' + i);
      if (generated.length > 0) alert = generated[0];
    }
    if (alert) {
      predictiveAlerts.dismissAlert(alert.id);
      expect(predictiveAlerts.getAlert(alert.id)).toBeNull();
    }
  });

  it('dismissAlert — bilinmeyen → no-op', () => {
    expect(() => predictiveAlerts.dismissAlert('non-existent')).not.toThrow();
  });

  it('acknowledgeAlert — exception fırlatmaz', () => {
    expect(() => predictiveAlerts.acknowledgeAlert('any-id', 'reordered')).not.toThrow();
  });

  it('getAlertHistory — sku yok → tümü', () => {
    const history = predictiveAlerts.getAlertHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it('getAlertHistory — sku filter', () => {
    const history = predictiveAlerts.getAlertHistory('SKU-NON-EXISTENT-FILTER');
    expect(history.every((a) => a.sku === 'SKU-NON-EXISTENT-FILTER')).toBe(true);
  });
});
