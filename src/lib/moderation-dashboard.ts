import { formatAdminDateTime } from './admin-format';

export type ModerationDashboardTab = 'overview' | 'reports' | 'actions';
export type ModerationReportFilter = 'pending' | 'under_review' | 'resolved' | 'all';

export interface ModerationStats {
  pending_reports: number;
  in_review_reports: number;
  resolved_reports: number;
  active_bans: number;
  total_warnings: number;
  queue_items: number;
}

export interface ModerationReport {
  id: string;
  content_type: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'under_review' | 'resolved' | string;
  created_at: string;
  reported_user_id: string | null;
}

export interface ModerationDashboardState {
  stats: ModerationStats | null;
  reports: ModerationReport[];
  loading: boolean;
  error: string | null;
  selectedTab: ModerationDashboardTab;
  reportFilter: ModerationReportFilter;
  actionModalOpen: boolean;
  actionForm: {
    report_id: string;
    target_user_id: string;
    action_type: 'warning' | 'content_removed' | 'suspend' | 'ban';
    reason: string;
    duration_days: number;
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function normalizeModerationDashboardTab(value: string | null | undefined): ModerationDashboardTab {
  return value === 'reports' || value === 'actions' ? value : 'overview';
}

export function normalizeModerationReportFilter(value: string | null | undefined): ModerationReportFilter {
  return value === 'pending' || value === 'under_review' || value === 'resolved' ? value : 'all';
}

export function createModerationDashboardState(): ModerationDashboardState {
  return {
    stats: null,
    reports: [],
    loading: true,
    error: null,
    selectedTab: 'overview',
    reportFilter: 'pending',
    actionModalOpen: false,
    actionForm: {
      report_id: '',
      target_user_id: '',
      action_type: 'warning',
      reason: '',
      duration_days: 7,
    },
  };
}

export function extractModerationStats(payload: unknown): ModerationStats | null {
  const root = asRecord(payload);
  const stats = asRecord(root?.stats);
  if (!stats) return null;

  return {
    pending_reports: asNumber(stats.pending_reports),
    in_review_reports: asNumber(stats.in_review_reports),
    resolved_reports: asNumber(stats.resolved_reports),
    active_bans: asNumber(stats.active_bans),
    total_warnings: asNumber(stats.total_warnings),
    queue_items: asNumber(stats.queue_items),
  };
}

export function extractModerationReports(payload: unknown): ModerationReport[] {
  const root = asRecord(payload);
  const items = Array.isArray(root?.data) ? (root?.data as unknown[]) : [];

  return items.map((entry) => {
    const item = asRecord(entry) ?? {};
    return {
      id: asString(item.id),
      content_type: asString(item.content_type),
      reason: asString(item.reason),
      description: asString(item.description) || null,
      status: asString(item.status) || 'pending',
      created_at: asString(item.created_at),
      reported_user_id: asString(item.reported_user_id) || null,
    } satisfies ModerationReport;
  }).filter((item) => item.id);
}

function statusLabel(status: string): string {
  if (status === 'pending') return 'Beklemede';
  if (status === 'under_review') return 'İncelemede';
  if (status === 'resolved') return 'Çözümlendi';
  return status;
}

function statusClass(status: string): string {
  if (status === 'pending') return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  if (status === 'under_review') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
  return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
}

export function renderModerationDashboard(state: ModerationDashboardState): string {
  if (state.loading && !state.stats) {
    return '<div class="text-center py-8">Moderasyon verileri yükleniyor...</div>';
  }

  const tabs = [
    ['overview', 'Özet'],
    ['reports', 'Raporlar'],
    ['actions', 'İşlemler'],
  ].map(([value, label]) => `
    <button type="button" data-moderation-tab="${value}" class="px-4 py-2 font-medium border-b-2 transition-colors ${state.selectedTab === value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 dark:text-gray-400'}">${label}</button>
  `).join('');

  const errorHtml = state.error
    ? `<div class="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">${escapeHtml(state.error)}</div>`
    : '';

  const overviewHtml = state.selectedTab === 'overview' && state.stats
    ? `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"><div class="text-3xl font-bold text-red-600">${state.stats.pending_reports}</div><div class="text-gray-600 dark:text-gray-400 text-sm">Bekleyen raporlar</div></div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"><div class="text-3xl font-bold text-yellow-600">${state.stats.in_review_reports}</div><div class="text-gray-600 dark:text-gray-400 text-sm">İncelemedeki raporlar</div></div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"><div class="text-3xl font-bold text-green-600">${state.stats.resolved_reports}</div><div class="text-gray-600 dark:text-gray-400 text-sm">Çözümlenen raporlar</div></div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"><div class="text-3xl font-bold text-orange-600">${state.stats.active_bans}</div><div class="text-gray-600 dark:text-gray-400 text-sm">Aktif yasaklamalar</div></div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"><div class="text-3xl font-bold text-blue-600">${state.stats.total_warnings}</div><div class="text-gray-600 dark:text-gray-400 text-sm">Toplam uyarılar</div></div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow"><div class="text-3xl font-bold text-purple-600">${state.stats.queue_items}</div><div class="text-gray-600 dark:text-gray-400 text-sm">Kuyruktaki kayıtlar</div></div>
      </div>
    `
    : '';

  const reportsHtml = state.selectedTab === 'reports'
    ? `
      <div class="space-y-4">
        <div class="flex gap-2">
          ${['all', 'pending', 'under_review', 'resolved'].map((status) => `
            <button type="button" data-moderation-filter="${status}" class="px-4 py-2 rounded-lg font-medium transition-colors ${state.reportFilter === status ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}">${status === 'all' ? 'Tümü' : statusLabel(status)}</button>
          `).join('')}
        </div>
        <div class="space-y-3">
          ${state.reports.length === 0
            ? '<div class="text-center py-8 text-gray-500 dark:text-gray-400">Gösterilecek rapor bulunmuyor.</div>'
            : state.reports.map((report) => `
              <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">${escapeHtml(report.content_type.charAt(0).toUpperCase() + report.content_type.slice(1))} - ${escapeHtml(report.reason)}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(formatAdminDateTime(report.created_at, '-'))}</p>
                  </div>
                  <span class="px-3 py-1 rounded-full text-sm font-medium ${statusClass(report.status)}">${statusLabel(report.status)}</span>
                </div>
                ${report.description ? `<p class="text-sm text-gray-700 dark:text-gray-300 mb-3">${escapeHtml(report.description)}</p>` : ''}
                <div class="flex gap-2">
                  ${report.status === 'pending' ? `
                    <button type="button" data-moderation-open-action="${report.id}" data-moderation-target-user="${report.reported_user_id ?? ''}" class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">İşlem uygula</button>
                    <button type="button" data-moderation-report-status="${report.id}:under_review" class="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">İncelemede işaretle</button>
                  ` : ''}
                  ${report.status === 'under_review' ? `<button type="button" data-moderation-report-status="${report.id}:resolved" class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">Çözümlendi işaretle</button>` : ''}
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    `
    : '';

  const actionsHtml = state.selectedTab === 'actions'
    ? `
      <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <p class="text-sm text-gray-600 dark:text-gray-400">Moderasyon işlemleri rapor kartlarındaki “İşlem uygula” düğmesiyle açılır.</p>
      </div>
    `
    : '';

  const modalHtml = state.actionModalOpen
    ? `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" data-moderation-modal>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Moderasyon işlemi uygula</h3>
          <form data-moderation-action-form class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">İşlem tipi</label>
              <select data-moderation-action-type class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                ${[
                  ['warning', 'Uyarı'],
                  ['content_removed', 'İçeriği kaldır'],
                  ['suspend', 'Askıya al'],
                  ['ban', 'Yasakla'],
                ].map(([value, label]) => `<option value="${value}" ${state.actionForm.action_type === value ? 'selected' : ''}>${label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Neden</label>
              <textarea data-moderation-action-reason rows="3" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">${escapeHtml(state.actionForm.reason)}</textarea>
            </div>
            ${['suspend', 'ban'].includes(state.actionForm.action_type)
              ? `<div><label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gün sayısı</label><input data-moderation-action-duration type="number" min="1" max="365" value="${state.actionForm.duration_days}" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>`
              : ''}
            <div class="flex gap-3">
              <button type="button" data-moderation-close-action class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">İptal et</button>
              <button type="submit" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">İşlemi uygula</button>
            </div>
          </form>
        </div>
      </div>
    `
    : '';

  return `<div class="space-y-6"><div class="flex border-b border-gray-200 dark:border-gray-700">${tabs}</div>${errorHtml}${overviewHtml}${reportsHtml}${actionsHtml}${modalHtml}</div>`;
}
