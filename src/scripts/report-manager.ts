import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractReportManagerMessage,
  extractReportManagerReports,
  renderReportManager,
  type ReportManagerState,
} from '../lib/report-manager';

type ReportManagerRoot = HTMLElement & { dataset: DOMStringMap };

function readState(root: ReportManagerRoot): ReportManagerState {
  return {
    tab: root.dataset.tab === 'templates' ? 'templates' : 'reports',
    reports: [],
    selectedReportId: root.dataset.selectedReportId || null,
    loading: root.dataset.loading === 'true',
    error: root.dataset.error || null,
    exportFormat:
      root.dataset.exportFormat === 'json' || root.dataset.exportFormat === 'excel'
        ? root.dataset.exportFormat
        : 'csv',
  };
}

function setError(root: ReportManagerRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

async function loadReports(root: ReportManagerRoot) {
  const response = await fetch('/api/reports');
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(extractReportManagerMessage(payload, 'Raporlar yüklenemedi'));
  }
  return extractReportManagerReports(payload);
}

async function renderRoot(root: ReportManagerRoot) {
  const loading = root.querySelector<HTMLElement>('[data-report-manager-loading]');
  const content = root.querySelector<HTMLElement>('[data-report-manager-content]');
  if (!loading || !content) return;

  try {
    let reports: ReturnType<typeof extractReportManagerReports> = [];
    if ((root.dataset.tab || 'reports') === 'reports') {
      reports = await loadReports(root);
      if (!root.dataset.selectedReportId && reports[0]) root.dataset.selectedReportId = reports[0].id;
    }

    const state = readState(root);
    state.reports = reports;
    setElementHtml(content, renderReportManager(state));
    bindActions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Raporlar yüklenemedi');
    const state = readState(root);
    setElementHtml(content, renderReportManager(state));
    bindActions(root, content);
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

async function executeReport(root: ReportManagerRoot) {
  const reportId = root.dataset.selectedReportId;
  if (!reportId) return;

  try {
    root.dataset.loading = 'true';
    const response = await fetch(`/api/reports/${reportId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: root.dataset.exportFormat || 'csv' }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(extractReportManagerMessage(payload, 'Rapor çalıştırılamadı'));
    }
    setError(root, null);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Rapor çalıştırılamadı');
  } finally {
    delete root.dataset.loading;
    await renderRoot(root);
  }
}

async function exportReport(root: ReportManagerRoot) {
  const reportId = root.dataset.selectedReportId;
  if (!reportId) return;
  const format = root.dataset.exportFormat || 'csv';
  const response = await fetch(`/api/reports/${reportId}/export?format=${format}`);
  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {}
    throw new Error(extractReportManagerMessage(payload, 'Rapor indirilemedi'));
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `report.${format}`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

function bindActions(root: ReportManagerRoot, content: HTMLElement) {
  content.querySelectorAll<HTMLElement>('[data-report-manager-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      root.dataset.tab = button.dataset.reportManagerTab === 'templates' ? 'templates' : 'reports';
      void renderRoot(root);
    });
  });

  content.querySelectorAll<HTMLElement>('[data-report-manager-select]').forEach((button) => {
    button.addEventListener('click', () => {
      const reportId = button.dataset.reportManagerSelect;
      if (!reportId) return;
      root.dataset.selectedReportId = reportId;
      void renderRoot(root);
    });
  });

  content.querySelector<HTMLSelectElement>('[data-report-manager-format]')?.addEventListener('input', (event) => {
    const target = event.currentTarget as HTMLSelectElement;
    root.dataset.exportFormat = target.value;
  });

  content.querySelector<HTMLElement>('[data-report-manager-run]')?.addEventListener('click', () => {
    void executeReport(root);
  });

  content.querySelector<HTMLElement>('[data-report-manager-download]')?.addEventListener('click', async () => {
    try {
      await exportReport(root);
      setError(root, null);
    } catch (error) {
      setError(root, error instanceof Error ? error.message : 'Rapor indirilemedi');
      await renderRoot(root);
    }
  });
}

export function initReportManager() {
  const roots = Array.from(document.querySelectorAll<ReportManagerRoot>('[data-report-manager]'));
  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.tab = 'reports';
    root.dataset.exportFormat = 'csv';
    void renderRoot(root);
  }
}
