import {
  extractAnalyticsPanelData,
  renderAnalyticsPanel,
  type AnalyticsPanelData,
} from './analytics-panel';

export type AdminAnalyticsDashboardData = AnalyticsPanelData;

export function extractAdminAnalyticsDashboardData(payload: unknown): AdminAnalyticsDashboardData | null {
  return extractAnalyticsPanelData(payload);
}

export function renderAdminAnalyticsDashboard(options: {
  days: number;
  data: AdminAnalyticsDashboardData | null;
  error: string | null;
}): string {
  return renderAnalyticsPanel(options);
}
