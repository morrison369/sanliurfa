import type { AdminStatusLevel } from '../../lib/admin-status';

export function statusTone(level: AdminStatusLevel): string {
  if (level === 'healthy') return 'text-emerald-700';
  if (level === 'degraded') return 'text-amber-700';
  return 'text-red-700';
}

export function cardClassName(): string {
  return 'bg-white border border-gray-200 rounded-lg p-4';
}

