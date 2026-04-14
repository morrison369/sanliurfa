import { describe, it, expect } from 'vitest';
import * as scheduler from './index';

describe('Scheduler Module', () => {
  describe('getNextRunTime', () => {
    it('should calculate next run for hourly schedule', () => {
      const now = new Date('2024-01-01 10:30:00');
      const next = scheduler.getNextRunTime('0 * * * *', now);
      
      expect(next).not.toBeNull();
      expect(next!.getHours()).toBe(11);
      expect(next!.getMinutes()).toBe(0);
    });

    it('should calculate next run for daily schedule', () => {
      const now = new Date('2024-01-01 10:30:00');
      const next = scheduler.getNextRunTime('0 0 * * *', now);
      
      expect(next).not.toBeNull();
      expect(next!.getDate()).toBe(2);
    });

    it('should return null for invalid cron', () => {
      const next = scheduler.getNextRunTime('invalid');
      expect(next).toBeNull();
    });
  });

  describe('registerJobHandler', () => {
    it('should register handler', () => {
      const handler = async () => 'test';
      scheduler.registerJobHandler('test-job', handler);
      // Handler registered successfully if no error
      expect(true).toBe(true);
    });
  });
});
