import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as predictions from './index';
import { query } from '../postgres';

vi.mock('../postgres', () => ({
  query: vi.fn(),
}));

describe('Predictions Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('movingAverageForecast', () => {
    it('should return empty for insufficient data', () => {
      const data = [
        { date: new Date(), value: 10 },
      ];
      
      const result = predictions.movingAverageForecast(data, 5, 7);
      
      expect(result.predictions).toEqual([]);
      expect(result.trend).toBe('stable');
    });

    it('should generate predictions', () => {
      const data = Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000),
        value: 10 + i,
      }));
      
      const result = predictions.movingAverageForecast(data, 3, 7);
      
      expect(result.predictions.length).toBe(3);
      expect(result.predictions[0]).toHaveProperty('date');
      expect(result.predictions[0]).toHaveProperty('value');
      expect(result.predictions[0]).toHaveProperty('confidence');
      expect(result.predictions[0].confidence).toHaveProperty('lower');
      expect(result.predictions[0].confidence).toHaveProperty('upper');
    });

    it('should detect upward trend', () => {
      const data = Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000),
        value: i * 10, // Strong upward trend
      }));
      
      const result = predictions.movingAverageForecast(data, 3, 7);
      
      expect(result.trend).toBe('up');
    });
  });

  describe('linearRegressionForecast', () => {
    it('should return empty for insufficient data', () => {
      const data = [{ date: new Date(), value: 10 }];
      
      const result = predictions.linearRegressionForecast(data, 5);
      
      expect(result.predictions).toEqual([]);
    });

    it('should generate linear predictions', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        date: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000),
        value: 50 + i * 5,
      }));
      
      const result = predictions.linearRegressionForecast(data, 3);
      
      expect(result.predictions.length).toBe(3);
      expect(result.predictions[0].value).toBeGreaterThan(0);
    });

    it('should handle flat data as stable trend', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        date: new Date(Date.now() - (9 - i) * 24 * 60 * 60 * 1000),
        value: 100, // Flat
      }));
      
      const result = predictions.linearRegressionForecast(data, 3);
      
      expect(result.trend).toBe('stable');
    });
  });

  describe('detectAnomalies', () => {
    it('should detect spikes', () => {
      const data = [
        { date: new Date('2024-01-01'), value: 10 },
        { date: new Date('2024-01-02'), value: 12 },
        { date: new Date('2024-01-03'), value: 11 },
        { date: new Date('2024-01-04'), value: 10 },
        { date: new Date('2024-01-05'), value: 10 },
        { date: new Date('2024-01-06'), value: 12 },
        { date: new Date('2024-01-07'), value: 11 },
        { date: new Date('2024-01-08'), value: 10 },
        { date: new Date('2024-01-09'), value: 10 },
        { date: new Date('2024-01-10'), value: 200 }, // Spike
      ];
      
      const result = predictions.detectAnomalies(data, 2);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(r => r.type === 'spike')).toBe(true);
    });

    it('should detect drops', () => {
      const data = [
        { date: new Date('2024-01-01'), value: 100 },
        { date: new Date('2024-01-02'), value: 95 },
        { date: new Date('2024-01-03'), value: 100 },
        { date: new Date('2024-01-04'), value: 95 },
        { date: new Date('2024-01-05'), value: 100 },
        { date: new Date('2024-01-06'), value: 95 },
        { date: new Date('2024-01-07'), value: 100 },
        { date: new Date('2024-01-08'), value: 95 },
        { date: new Date('2024-01-09'), value: 100 },
        { date: new Date('2024-01-10'), value: 2 }, // Drop
      ];
      
      const result = predictions.detectAnomalies(data, 2);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(r => r.type === 'drop')).toBe(true);
    });

    it('should return empty for normal data', () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        date: new Date(Date.now() - (19 - i) * 24 * 60 * 60 * 1000),
        value: 100 + Math.random() * 10, // Small variations
      }));
      
      const result = predictions.detectAnomalies(data, 3);
      
      expect(result.length).toBe(0);
    });
  });

  describe('predictReviewHelpfulness', () => {
    it('should return default for missing review', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] } as any);
      
      const result = await predictions.predictReviewHelpfulness('non-existent');
      
      expect(result.helpfulnessScore).toBe(0.5);
      expect(result.factors).toEqual({});
    });

    it('should calculate helpfulness score', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [{
          content: 'Bu restoran çok güzel ve lezzetli yemekleri var. 5 yıldız!',
          rating: 5,
          created_at: new Date(),
          user_total_reviews: 15,
          user_helpfulness: 100,
        }],
      } as any);
      
      const result = await predictions.predictReviewHelpfulness('review-1');
      
      expect(result.helpfulnessScore).toBeGreaterThan(0);
      expect(result.helpfulnessScore).toBeLessThanOrEqual(1);
      expect(result.factors).toHaveProperty('length');
      expect(result.factors).toHaveProperty('detail');
      expect(result.factors).toHaveProperty('userHistory');
    });
  });
});
