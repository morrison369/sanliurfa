import type {
  AdminAuditLogsData,
  AdminAnalyticsData,
  AdminRevenueData,
  AdminModerationActionsData,
  AdminModerationActionMutationData,
  AdminModerationFlagsData,
  AdminModerationFlagMutationData,
  AdminModerationQueueListData,
  AdminModerationQueueMutationData,
  AdminModerationReportsData,
  AdminModerationReportMutationData,
  AdminModerationStatsData,
  AdminReleaseGateSummaryData,
  AdminLoyaltyRewardsListData,
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

async function parseError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.error?.message === 'string') {
      return payload.error.message;
    }
    if (typeof payload?.error === 'string') {
      return payload.error;
    }
  } catch {
    // no-op
  }

  return `request-failed:${response.status}`;
}

async function postJson<T>(url: string, body: Record<string, unknown>, method = 'POST'): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
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

export async function fetchAdminAnalytics(days = 30, limit = 10): Promise<AdminAnalyticsData> {
  const payload = await fetchJson<{ data: AdminAnalyticsData }>(`/api/admin/analytics?days=${days}&limit=${limit}`);
  return payload.data;
}

export async function fetchAdminRevenue(): Promise<AdminRevenueData> {
  const payload = await fetchJson<{ data: AdminRevenueData }>('/api/admin/revenue');
  return payload.data;
}

export async function fetchAdminReleaseGateSummary(): Promise<AdminReleaseGateSummaryData> {
  const payload = await fetchJson<{ data: AdminReleaseGateSummaryData }>(
    '/api/admin/system/release-gate-summary'
  );
  return payload.data;
}

export async function fetchAdminLoyaltyRewards(): Promise<AdminLoyaltyRewardsListData> {
  const payload = await fetchJson<{ data: AdminLoyaltyRewardsListData }>(
    '/api/admin/loyalty/rewards'
  );
  return payload.data;
}

export async function fetchAdminVerifications(limit = 50): Promise<AdminVerificationsListData> {
  const payload = await fetchJson<{ data: AdminVerificationsListData }>(`/api/admin/verifications?limit=${limit}`);
  return payload.data;
}

export async function approveAdminVerification(id: string, reason?: string): Promise<AdminVerificationApproveData> {
  const payload = await postJson<{ data: AdminVerificationApproveData }>(
    `/api/admin/verifications/${id}/approve`,
    { reason: reason || '' }
  );
  return payload.data;
}

export async function rejectAdminVerification(id: string, reason: string): Promise<AdminVerificationRejectData> {
  const payload = await postJson<{ data: AdminVerificationRejectData }>(
    `/api/admin/verifications/${id}/reject`,
    { reason }
  );
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
  const payload = await postJson<{ data: AdminUserMutationData }>(`/api/admin/users/${id}`, body);
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
  const payload = await postJson<{ data: AdminModerationQueueMutationData }>(
    '/api/admin/moderation/queue',
    body
  );
  return payload.data;
}

export async function fetchAdminModerationStats(): Promise<AdminModerationStatsData> {
  const payload = await fetchJson<{ data: AdminModerationStatsData }>('/api/admin/moderation/stats');
  return payload.data;
}

export interface AdminModerationReportsQuery {
  status?: string;
  limit?: number;
  offset?: number;
}

export function buildAdminModerationReportsUrl(query: AdminModerationReportsQuery = {}): string {
  const params = new URLSearchParams();
  if (query.status) {
    params.set('status', query.status);
  }
  params.set('limit', String(query.limit ?? 50));
  params.set('offset', String(query.offset ?? 0));
  return `/api/admin/moderation/reports?${params.toString()}`;
}

export async function fetchAdminModerationReports(
  query: AdminModerationReportsQuery = {}
): Promise<AdminModerationReportsData> {
  const payload = await fetchJson<{ data: AdminModerationReportsData }>(
    buildAdminModerationReportsUrl(query)
  );
  return payload.data;
}

export async function updateAdminModerationReport(
  id: string,
  body: { status: string; resolution_note?: string }
): Promise<AdminModerationReportMutationData> {
  const payload = await postJson<{ data: AdminModerationReportMutationData }>(
    `/api/admin/moderation/reports?id=${encodeURIComponent(id)}`,
    body,
    'PUT'
  );
  return payload.data;
}

export async function fetchAdminModerationActions(userId: string): Promise<AdminModerationActionsData> {
  const payload = await fetchJson<{ data: AdminModerationActionsData }>(
    `/api/admin/moderation/actions?user_id=${encodeURIComponent(userId)}`
  );
  return payload.data;
}

export async function createAdminModerationAction(
  body: Record<string, unknown>
): Promise<AdminModerationActionMutationData> {
  const payload = await postJson<{ data: AdminModerationActionMutationData }>(
    '/api/admin/moderation/actions',
    body
  );
  return payload.data;
}

export interface AdminModerationFlagsQuery {
  status?: string;
  limit?: number;
  offset?: number;
}

export function buildAdminModerationFlagsUrl(query: AdminModerationFlagsQuery = {}): string {
  const params = new URLSearchParams();
  params.set('status', query.status ?? 'pending');
  params.set('limit', String(query.limit ?? 20));
  params.set('offset', String(query.offset ?? 0));
  return `/api/admin/moderation/flags?${params.toString()}`;
}

export async function fetchAdminModerationFlags(
  query: AdminModerationFlagsQuery = {}
): Promise<AdminModerationFlagsData> {
  const payload = await fetchJson<{ data: AdminModerationFlagsData }>(
    buildAdminModerationFlagsUrl(query)
  );
  return payload.data;
}

export async function reviewAdminModerationFlag(
  body: Record<string, unknown>
): Promise<AdminModerationFlagMutationData> {
  const payload = await postJson<{ data: AdminModerationFlagMutationData }>(
    '/api/admin/moderation/flags',
    body
  );
  return payload.data;
}
