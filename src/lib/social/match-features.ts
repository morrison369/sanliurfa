export interface SocialFeatureConfig {
  openAccess: boolean;
  tinderEnabled: boolean;
  autoConversationOnMatch: boolean;
  dailySwipeLimit: number;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

export function getSocialFeatureConfig(): SocialFeatureConfig {
  return {
    // Faz 1 varsayilan: tum sosyal ozellikler ucretsiz acik
    openAccess: parseBoolean(process.env.SOCIAL_OPEN_ACCESS, true),
    tinderEnabled: parseBoolean(process.env.SOCIAL_TINDER_ENABLED, true),
    autoConversationOnMatch: parseBoolean(process.env.SOCIAL_AUTO_CONVERSATION, true),
    dailySwipeLimit: parseNumber(process.env.SOCIAL_SWIPE_DAILY_LIMIT, 100),
  };
}

