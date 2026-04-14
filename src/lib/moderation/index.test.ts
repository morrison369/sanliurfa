import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkContent,
  submitForModeration,
  autoModerate,
  getModerationStats,
} from './index';
import { query } from '../postgres';

vi.mock('../postgres');
vi.mock('../webhooks', () => ({
  triggerWebhook: vi.fn().mockResolvedValue(undefined),
}));

describe('Content Moderation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkContent', () => {
    it('should approve clean content', async () => {
      const result = await checkContent('Harika bir mekan, kesinlikle tavsiye ederim!', 'review');
      
      expect(result.clean).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.severity).toBe('none');
    });

    it('should detect spam patterns', async () => {
      const result = await checkContent('Kazanmak için tıklayın: http://spam-site.com/win-prize', 'comment');
      
      expect(result.clean).toBe(false);
      expect(result.violations).toContain('Spam içerik tespit edildi');
      expect(result.severity).toBe('medium');
    });

    it('should detect excessive caps', async () => {
      const result = await checkContent('BU MEKAN HARİKA KESİNLİKLE GİTMELİSİNİZ!!!', 'review');
      
      expect(result.clean).toBe(false);
      expect(result.violations).toContain('Aşırı büyük harf kullanımı');
    });

    it('should detect word repetition', async () => {
      const result = await checkContent('çok çok çok çok çok çok güzel bir mekan', 'review');
      
      expect(result.clean).toBe(false);
      expect(result.violations.some(v => v.includes('tekrarı'))).toBe(true);
    });
  });

  describe('autoModerate', () => {
    it('should approve clean content', async () => {
      const result = await autoModerate('Normal bir yorum', '123', 'review', 'user1');
      
      expect(result.approved).toBe(true);
    });

    it('should auto-reject high severity content', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [{ id: 'queue1' }] } as any);
      
      const result = await autoModerate('VIAGRA ve CIALIS satışı için arayın!', '123', 'comment', 'user1');
      
      expect(result.approved).toBe(false);
      expect(result.reason).toContain('kurallara aykırı');
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation statistics', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [{
          pending: '5',
          approved: '50',
          rejected: '10',
          avg_process_time: '3600', // 1 hour in seconds
        }],
      } as any);

      const stats = await getModerationStats();

      expect(stats.pending).toBe(5);
      expect(stats.approved).toBe(50);
      expect(stats.rejected).toBe(10);
      expect(stats.avgProcessTime).toBe(60); // converted to minutes
    });
  });
});
