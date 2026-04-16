export interface ReportManagerItem {
  id: string;
  name: string;
  report_type?: string;
  format: string;
  is_active: boolean;
}

export interface ReportManagerState {
  tab: 'reports' | 'templates';
  reports: ReportManagerItem[];
  selectedReportId: string | null;
  loading: boolean;
  error: string | null;
  exportFormat: 'csv' | 'json' | 'excel';
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};
  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    const nestedData = 'data' in outerData ? (outerData as { data?: unknown }).data : undefined;
    if (Array.isArray(nestedData)) return { data: nestedData };
    if (nestedData && typeof nestedData === 'object') return nestedData as Record<string, unknown>;
    return outerData as Record<string, unknown>;
  }
  return payload as Record<string, unknown>;
}

export function extractReportManagerReports(payload: unknown): ReportManagerItem[] {
  const data = resolveEnvelopeData(payload);
  const reports = Array.isArray(data.data)
    ? data.data
    : Array.isArray(data.reports)
      ? data.reports
      : [];
  return reports as ReportManagerItem[];
}

export function extractReportManagerMessage(payload: unknown, fallback: string): string {
  const data = resolveEnvelopeData(payload);
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  if (payload && typeof payload === 'object') {
    const error = 'error' in payload ? (payload as { error?: unknown }).error : undefined;
    if (typeof error === 'string' && error.trim()) return error;
    if (error && typeof error === 'object') {
      const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
      if (typeof message === 'string' && message.trim()) return message;
    }
  }
  return fallback;
}

function renderError(message: string): string {
  return `<div class="rounded border border-red-200 bg-red-50 p-4 text-red-800">${message}</div>`;
}

function renderTabs(tab: 'reports' | 'templates'): string {
  const tabClass = (key: 'reports' | 'templates') =>
    tab === key
      ? 'border-blue-600 text-blue-600'
      : 'border-transparent text-gray-600';

  return `
    <div class="flex space-x-2 border-b border-gray-200">
      <button type="button" data-report-manager-tab="reports" class="border-b-2 px-4 py-2 font-medium transition ${tabClass('reports')}">📊 Reports</button>
      <button type="button" data-report-manager-tab="templates" class="border-b-2 px-4 py-2 font-medium transition ${tabClass('templates')}">📋 Templates</button>
    </div>
  `;
}

function renderReportList(state: ReportManagerState): string {
  if (state.loading) {
    return `<div class="space-y-2">${Array.from({ length: 3 })
      .map(() => '<div class="h-16 animate-pulse rounded bg-gray-200"></div>')
      .join('')}</div>`;
  }

  if (state.reports.length === 0) {
    return '<p class="text-gray-600">No reports yet</p>';
  }

  return `
    <div class="space-y-3">
      ${state.reports
        .map(
          (report) => `
            <div data-report-manager-select="${report.id}" class="cursor-pointer rounded border p-4 ${
              state.selectedReportId === report.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }">
              <div class="flex items-start justify-between">
                <div>
                  <p class="font-semibold">${report.name}</p>
                  <p class="text-sm text-gray-600">${report.report_type ?? ''} • ${report.format}</p>
                </div>
                <span class="rounded px-2 py-1 text-xs ${report.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
                  ${report.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderExportOptions(state: ReportManagerState): string {
  if (!state.selectedReportId) return '';

  return `
    <div class="rounded border bg-gray-50 p-4">
      <h3 class="mb-3 font-semibold">Export Options</h3>
      <div class="flex space-x-2">
        <select data-report-manager-format class="rounded border border-gray-300 px-3 py-2">
          <option value="csv" ${state.exportFormat === 'csv' ? 'selected' : ''}>CSV</option>
          <option value="json" ${state.exportFormat === 'json' ? 'selected' : ''}>JSON</option>
          <option value="excel" ${state.exportFormat === 'excel' ? 'selected' : ''}>Excel</option>
        </select>
        <button type="button" data-report-manager-run class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 ${state.loading ? 'opacity-50' : ''}">
          Run
        </button>
        <button type="button" data-report-manager-download class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">
          Download
        </button>
      </div>
    </div>
  `;
}

export function renderReportManager(state: ReportManagerState): string {
  return `
    <div class="space-y-6">
      ${renderTabs(state.tab)}
      ${state.error ? renderError(state.error) : ''}
      ${
        state.tab === 'reports'
          ? `
            <div class="space-y-4">
              <h2 class="text-2xl font-bold">Reports</h2>
              ${renderReportList(state)}
              ${renderExportOptions(state)}
            </div>
          `
          : `
            <div class="space-y-4">
              <h2 class="text-2xl font-bold">Export Templates</h2>
              <p class="text-gray-600">Manage your custom export templates</p>
            </div>
          `
      }
    </div>
  `;
}
