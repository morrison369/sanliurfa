import { describe, it, expect } from 'vitest';
import * as budget from './budget';

describe('Performance Budget Module', () => {
  describe('defaultBudget', () => {
    it('should have defined limits', () => {
      expect(budget.defaultBudget.javascript).toBeGreaterThan(0);
      expect(budget.defaultBudget.css).toBeGreaterThan(0);
      expect(budget.defaultBudget.images).toBeGreaterThan(0);
      expect(budget.defaultBudget.total).toBeGreaterThan(0);
    });
  });

  describe('checkBudget', () => {
    it('should return withinBudget true when under limit', () => {
      const result = budget.checkBudget('javascript', 100);
      
      expect(result.withinBudget).toBe(true);
      expect(result.overage).toBe(0);
    });

    it('should return withinBudget false when over limit', () => {
      const result = budget.checkBudget('javascript', 500);
      
      expect(result.withinBudget).toBe(false);
      expect(result.overage).toBeGreaterThan(0);
    });

    it('should calculate correct overage', () => {
      const result = budget.checkBudget('css', 100, { ...budget.defaultBudget, css: 50 });
      
      expect(result.overage).toBe(50);
    });
  });

  describe('getBudgetRecommendations', () => {
    it('should provide recommendations for JavaScript violations', () => {
      const report: budget.BudgetReport = {
        timestamp: Date.now(),
        url: '/test',
        violations: [{
          type: 'javascript',
          actual: 500,
          budget: 300,
          overage: 200,
        }],
        withinBudget: false,
        scores: { javascript: 500, css: 0, images: 0, fonts: 0, total: 500, html: 0 },
      };

      const recommendations = budget.getBudgetRecommendations(report);
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('code splitting'))).toBe(true);
    });

    it('should provide recommendations for image violations', () => {
      const report: budget.BudgetReport = {
        timestamp: Date.now(),
        url: '/test',
        violations: [{
          type: 'images',
          actual: 700,
          budget: 500,
          overage: 200,
        }],
        withinBudget: false,
        scores: { javascript: 0, css: 0, images: 700, fonts: 0, total: 700, html: 0 },
      };

      const recommendations = budget.getBudgetRecommendations(report);
      
      expect(recommendations.some(r => r.includes('WebP') || r.includes('AVIF'))).toBe(true);
    });

    it('should deduplicate recommendations', () => {
      const report: budget.BudgetReport = {
        timestamp: Date.now(),
        url: '/test',
        violations: [
          { type: 'javascript', actual: 400, budget: 300, overage: 100 },
          { type: 'javascript', actual: 500, budget: 300, overage: 200 },
        ],
        withinBudget: false,
        scores: { javascript: 500, css: 0, images: 0, fonts: 0, total: 500, html: 0 },
      };

      const recommendations = budget.getBudgetRecommendations(report);
      const unique = [...new Set(recommendations)];
      
      expect(recommendations.length).toBe(unique.length);
    });
  });

  describe('createBudgetReportHTML', () => {
    it('should generate HTML report', () => {
      const report: budget.BudgetReport = {
        timestamp: Date.now(),
        url: '/test',
        violations: [],
        withinBudget: true,
        scores: { javascript: 100, css: 30, images: 200, fonts: 50, total: 380, html: 20 },
      };

      const html = budget.createBudgetReportHTML(report);
      
      expect(html).toContain('Performance Budget Report');
      expect(html).toContain('JavaScript');
      expect(html).toContain('CSS');
      expect(html).toContain('Images');
    });

    it('should include recommendations for violations', () => {
      const report: budget.BudgetReport = {
        timestamp: Date.now(),
        url: '/test',
        violations: [{
          type: 'javascript',
          actual: 500,
          budget: 300,
          overage: 200,
        }],
        withinBudget: false,
        scores: { javascript: 500, css: 0, images: 0, fonts: 0, total: 500, html: 0 },
      };

      const html = budget.createBudgetReportHTML(report);
      
      expect(html).toContain('Recommendations');
    });
  });
});
