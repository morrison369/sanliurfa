import type {
  AdminAuditLogsData,
  AdminPerformanceOptimizationData,
} from '../types/admin-api';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`request-failed:${response.status}`);
  }

  return response.json() as Promise<T>;
}

export interface AdminAuditLogQuery {
  requestId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export function buildAdminAuditLogsUrl(query: AdminAuditLogQuery = {}): string {
  const params = new URLSearchParams();
  params.set('source', 'admin-ops');
  params.set('limit', String(query.limit ?? 100));
  if (query.requestId) params.set('requestId', query.requestId);
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  return `/api/admin/audit-logs?${params.toString()}`;
}

export async function fetchAdminAuditLogs(query: AdminAuditLogQuery = {}): Promise<AdminAuditLogsData> {
  const payload = await fetchJson<{ data: AdminAuditLogsData }>(buildAdminAuditLogsUrl(query));
  return payload.data;
}

export function buildAdminAuditLogsCsvUrl(query: AdminAuditLogQuery = {}): string {
  const params = new URLSearchParams(buildAdminAuditLogsUrl(query).split('?')[1] ?? '');
  params.set('format', 'csv');
  return `/api/admin/audit-logs?${params.toString()}`;
}

export async function fetchAdminPerformanceOptimization(): Promise<AdminPerformanceOptimizationData> {
  const payload = await fetchJson<{ data: { success: boolean; data: AdminPerformanceOptimizationData } }>(
    '/api/admin/performance/optimization'
  );
  return payload.data.data;
}
