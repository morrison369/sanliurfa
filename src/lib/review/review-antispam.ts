import { getSiteSetting } from '../site-content';

export type ReviewAntiSpamConfig = {
  enabled: boolean;
  autoModerateThreshold: number;
  hardBlockThreshold: number;
  minLength: number;
  repeatedCharLimit: number;
  suspiciousKeywords: string[];
  allowlist?: string[];
};

export type ReviewAntiSpamResult = {
  score: number;
  hardBlocked: boolean;
  autoModerate: boolean;
  reasons: string[];
};

const DEFAULT_CONFIG: ReviewAntiSpamConfig = {
  enabled: true,
  autoModerateThreshold: 55,
  hardBlockThreshold: 85,
  minLength: 20,
  repeatedCharLimit: 6,
  suspiciousKeywords: ['telegram', 'whatsapp', 'bedava', 'free money', 'http://', 'https://'],
  allowlist: [],
};

export async function getReviewAntiSpamConfig(): Promise<ReviewAntiSpamConfig> {
  return getSiteSetting<ReviewAntiSpamConfig>('reviews.antiSpam', DEFAULT_CONFIG);
}

export function isAllowlisted(config: ReviewAntiSpamConfig, identity: string | null | undefined): boolean {
  if (!identity) return false;
  const normalized = identity.trim().toLowerCase();
  if (!normalized) return false;
  const allowlist = Array.isArray(config.allowlist) ? config.allowlist : [];
  return allowlist.map((x) => x.trim().toLowerCase()).includes(normalized);
}

function countRepeatedChars(input: string): number {
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < input.length; i += 1) {
    if (input[i] === input[i - 1]) {
      run += 1;
      if (run > maxRun) maxRun = run;
    } else {
      run = 1;
    }
  }
  return maxRun;
}

export function scoreReviewContent(content: string, config: ReviewAntiSpamConfig): ReviewAntiSpamResult {
  const text = (content || '').trim();
  const lower = text.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (!config.enabled) {
    return { score: 0, autoModerate: false, hardBlocked: false, reasons: [] };
  }

  if (text.length < config.minLength) {
    score += 35;
    reasons.push('short_content');
  }

  const repeatedRun = countRepeatedChars(text);
  if (repeatedRun >= config.repeatedCharLimit) {
    score += 25;
    reasons.push('repeated_characters');
  }

  const uppercaseRatio =
    text.length > 0
      ? text.replace(/[^A-ZÇĞİÖŞÜ]/g, '').length / Math.max(1, text.replace(/\s/g, '').length)
      : 0;
  if (uppercaseRatio >= 0.7 && text.length >= 12) {
    score += 20;
    reasons.push('excessive_uppercase');
  }

  const suspiciousHits = config.suspiciousKeywords.filter((k) => lower.includes(k.toLowerCase()));
  if (suspiciousHits.length > 0) {
    score += Math.min(30, suspiciousHits.length * 12);
    reasons.push('suspicious_keywords');
  }

  const autoModerate = score >= config.autoModerateThreshold;
  const hardBlocked = score >= config.hardBlockThreshold;

  return { score, autoModerate, hardBlocked, reasons };
}
