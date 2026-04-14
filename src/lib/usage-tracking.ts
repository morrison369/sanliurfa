// Stub for usage-tracking module

export type QuotaFeature = 
  | 'search_requests'
  | 'api_calls'
  | 'storage'
  | 'email_notifications'
  | 'webhooks'
  | 'exports'
  | 'team_members'
  | 'places'
  | 'reviews'
  | 'messages';

export function checkQuota(userId: string, resource: QuotaFeature): boolean {
  return true;
}

export function getUsageStats(userId: string): Record<string, any> {
  return {};
}

export function trackUsage(userId: string, resource: QuotaFeature, amount: number): void {
  // Stub
}

export function getQuotaStatus(userId: string, resource?: QuotaFeature): any {
  return { used: 0, limit: 100, remaining: 100 };
}
