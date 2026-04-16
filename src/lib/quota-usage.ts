export interface QuotaItem {
  feature: string;
  current: number;
  limit: number | null;
  remaining: number | null;
  percentageUsed: number;
  resetDate: string | null;
  message: string;
}

export interface QuotaResponse {
  success: boolean;
  tier: { name: string; level: number } | null;
  quotas: QuotaItem[];
  summary: {
    totalQuotas: number;
    limitedQuotas: number;
    unlimitedQuotas: number;
  };
}

export function getQuotaProgressColor(percentage: number): string {
  if (percentage >= 100) return 'bg-red-500';
  if (percentage >= 80) return 'bg-yellow-500';
  if (percentage >= 50) return 'bg-blue-500';
  return 'bg-green-500';
}

export function getQuotaWarningClass(percentage: number): string {
  if (percentage >= 100) {
    return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
  }

  if (percentage >= 80) {
    return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
  }

  return '';
}

export function formatQuotaResetDate(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('tr-TR');
}
