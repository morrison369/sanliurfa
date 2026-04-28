import { describe, expect, it } from 'vitest';
import { isAllowlisted, scoreReviewContent } from '../review/review-antispam';

const config = {
  enabled: true,
  autoModerateThreshold: 55,
  hardBlockThreshold: 85,
  minLength: 20,
  repeatedCharLimit: 6,
  suspiciousKeywords: ['telegram', 'bedava', 'http://'],
  allowlist: ['u-allow', 'allow@example.com'],
};

describe('review anti-spam scoring', () => {
  it('keeps normal review below moderation threshold', () => {
    const result = scoreReviewContent('Mekan temizdi ve çalışanlar çok ilgiliydi, tekrar geleceğim.', config);
    expect(result.autoModerate).toBe(false);
    expect(result.hardBlocked).toBe(false);
  });

  it('flags suspicious short and keyword-heavy content', () => {
    const result = scoreReviewContent('BEDAVAAAAAA TELEGRAM http://x.co', config);
    expect(result.autoModerate).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('matches allowlist by user id or email', () => {
    expect(isAllowlisted(config, 'u-allow')).toBe(true);
    expect(isAllowlisted(config, 'ALLOW@EXAMPLE.COM')).toBe(true);
    expect(isAllowlisted(config, 'unknown')).toBe(false);
  });
});
