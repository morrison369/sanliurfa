import type {
  AdminAuditLogsData,
  AdminModerationQueueListData,
  AdminModerationQueueMutationData,
  AdminSubscriptionAnalyticsData,
  AdminUserDetailsData,
  AdminUserMutationData,
  AdminUsersListData,
  AdminVerificationApproveData,
  AdminVerificationRejectData,
  AdminVerificationsListData,
  AdminDashboardOverviewResponseData,
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

export async function fetchAdminDashboardOverview(days: number): Promise<AdminDashboardOverviewResponseData> {
  return fetchJson<AdminDashboardOverviewResponseData>(`/api/admin/dashboard/overview?days=${days}`);
}

export async function fetchAdminVerifications(limit = 50): Promise<AdminVerificationsListData> {
  const payload = await fetchJson<{ data: AdminVerificationsListData }>(`/api/admin/verifications?limit=${limit}`);
  return payload.data;
}

export async function approveAdminVerification(id: string, reason?: string): Promise<AdminVerificationApproveData> {
  const response = await fetch(`/api/admin/verifications/${id}/approve`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason: reason || '' }),
  });

  if (!response.ok) {
    throw new Error(`request-failed:${response.status}`);
  }

  const payload = (await response.json()) as { data: AdminVerificationApproveData };
  return payload.data;
}

export async function rejectAdminVerification(id: string, reason: string): Promise<AdminVerificationRejectData> {
  const response = await fetch(`/api/admin/verifications/${id}/reject`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error(`request-failed:${response.status}`);
  }

  const payload = (await response.json()) as { data: AdminVerificationRejectData };
  return payload.data;
}

export async function fetchAdminSubscriptionAnalytics(): Promise<AdminSubscriptionAnalyticsData> {
  const payload = await fetchJson<{ data: AdminSubscriptionAnalyticsData }>('/api/admin/subscriptions/analytics');
  return payload.data;
}

export interface AdminUsersQuery {
  search?: string;
  limit?: number;
  offset?: number;
}

export function buildAdminUsersUrl(query: AdminUsersQuery = {}): string {
  const params = new URLSearchParams();
  params.set('limit', String(query.limit ?? 50));
  params.set('offset', String(query.offset ?? 0));
  if (query.search) {
    params.set('search', query.search);
  }
  return `/api/admin/users?${params.toString()}`;
}

export async function fetchAdminUsers(query: AdminUsersQuery = {}): Promise<AdminUsersListData> {
  const payload = await fetchJson<{ data: AdminUsersListData }>(buildAdminUsersUrl(query));
  return payload.data;
}

export async function fetchAdminUserDetails(id: string): Promise<AdminUserDetailsData> {
  const payload = await fetchJson<{ data: AdminUserDetailsData }>(`/api/admin/users/${id}`);
  return payload.data;
}

export async function mutateAdminUser(id: string, body: Record<string, unknown>): Promise<AdminUserMutationData> {
  const response = await fetch(`/api/admin/users/${id}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`request-failed:${response.status}`);
  }

  const payload = (await response.json()) as { data: AdminUserMutationData };
  return payload.data;
}

export interface AdminModerationQueueQuery {
  status?: string;
  limit?: number;
  offset?: number;
}

export function buildAdminModerationQueueUrl(query: AdminModerationQueueQuery = {}): string {
  const params = new URLSearchParams();
  params.set('status', query.status ?? 'pending');
  params.set('limit', String(query.limit ?? 20));
  params.set('offset', String(query.offset ?? 0));
  return `/api/admin/moderation/queue?${params.toString()}`;
}

export async function fetchAdminModerationQueue(
  query: AdminModerationQueueQuery = {}
): Promise<AdminModerationQueueListData> {
  const payload = await fetchJson<{ data: AdminModerationQueueListData }>(
    buildAdminModerationQueueUrl(query)
  );
  return payload.data;
}

export async function mutateAdminModerationQueue(
  body: Record<string, unknown>
): Promise<AdminModerationQueueMutationData> {
  const response = await fetch('/api/admin/moderation/queue', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`request-failed:${response.status}`);
  }

  const payload = (await response.json()) as { data: AdminModerationQueueMutationData };
  return payload.data;
}
