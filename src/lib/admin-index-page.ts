import type { AdminStatusLevel } from './admin-status';
import { formatAdminDateTime } from './admin-format';

export function getAdminIndexStatusBadgeClass(status: AdminStatusLevel) {
  return status === 'healthy'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : status === 'degraded'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
}

export function getAdminIndexRiskCardClass(status: AdminStatusLevel) {
  return status === 'healthy'
    ? 'bg-white dark:bg-gray-800 border border-transparent shadow-sm hover:shadow-md'
    : status === 'degraded'
      ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 shadow-sm hover:shadow-md'
      : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 shadow-md hover:shadow-lg';
}

export function formatAdminIndexGeneratedAt(value: string | null): string {
  return formatAdminDateTime(value, 'Henüz üretilmedi');
}
