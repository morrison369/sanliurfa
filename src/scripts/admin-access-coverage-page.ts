import {
  buildAdminAccessCoverageReportUrl,
  fetchAdminAccessCoverageReport,
} from '../lib/admin-browser-client';
import {
  buildCoverageAlert,
  buildCoverageDelta,
  buildCoverageTrend,
  type CoverageHistoryEntry,
  type RuntimeStatus as CoverageStatus,
} from '../lib/admin-ops-pages';

const STORAGE_KEY = 'admin-access-coverage-history-v1';
const history: CoverageHistoryEntry[] = [];

function setText(id: string, value: string) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function setLink(id: string, href: string) {
  const element = document.getElementById(id) as HTMLAnchorElement | null;
  if (element) {
    element.href = href;
  }
}

function setAlert(status: CoverageStatus, driftCount: number, firstDriftFile?: string) {
  const element = document.getElementById('admin-access-coverage-alert');
  if (!element) return;

  element.className = 'rounded-2xl border p-4 text-sm font-semibold';
  const alert = buildCoverageAlert({ status, driftCount, firstDriftFile });

  if (alert.tone === 'blocked') {
    element.classList.add('block', 'border-red-200', 'bg-red-50', 'text-red-700', 'dark:border-red-900', 'dark:bg-red-950/40', 'dark:text-red-200');
  } else if (alert.tone === 'degraded') {
    element.classList.add('block', 'border-amber-200', 'bg-amber-50', 'text-amber-700', 'dark:border-amber-900', 'dark:bg-amber-950/40', 'dark:text-amber-200');
  } else {
    element.classList.add('block', 'border-green-200', 'bg-green-50', 'text-green-700', 'dark:border-green-900', 'dark:bg-green-950/40', 'dark:text-green-200');
  }

  element.textContent = alert.text;
}

function loadHistory() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      history.splice(0, history.length, ...parsed.slice(0, 20));
    }
  } catch {}
}

function persistHistory() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
  } catch {}
}

function renderDriftFiles(files: string[]) {
  const container = document.getElementById('admin-access-drift-files');
  if (!container) return;

  if (files.length === 0) {
    container.innerHTML = '<li class="text-green-700 dark:text-green-300">Drift yok.</li>';
    return;
  }

  container.innerHTML = files
    .map(
      (filePath) =>
        `<li class="break-all rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">${filePath}</li>`
    )
    .join('');
}

function renderTrend() {
  const trendLine = document.getElementById('admin-access-coverage-trend');
  if (!trendLine) return;
  trendLine.textContent = buildCoverageTrend(history);
}

async function loadCoverage() {
  setText('admin-access-coverage-summary', 'Coverage verileri yenileniyor.');
  setText('admin-access-coverage-status', 'Yükleniyor...');

  try {
    const payload = await fetchAdminAccessCoverageReport();
    const { report, artifact, artifactName, reportFormats } = payload.data;
    const refreshedAt = new Date().toISOString();

    history.unshift({
      status: artifact.status,
      driftCount: report.driftCount,
      coveragePercent: report.coveragePercent,
      refreshedAt,
    });
    history.splice(20);
    persistHistory();

    const previous = history[1];

    setText('admin-access-coverage-status', artifact.status);
    setText('admin-access-coverage-percent', `%${report.coveragePercent}`);
    setText('admin-access-coverage-routes', `${report.routeFiles} / ${report.wrapperFiles}`);
    setText('admin-access-coverage-drift-count', String(report.driftCount));
    setText('admin-access-coverage-generated-at', report.generatedAt || 'Henüz yok');
    setText('admin-access-coverage-artifact', artifactName);
    setText('admin-access-coverage-formats', reportFormats.join(', '));
    setText('admin-access-coverage-artifact-status', artifact.status);
    setText('admin-access-coverage-last-refresh', refreshedAt);
    setAlert(artifact.status, report.driftCount, report.driftedFiles[0]);
    setText(
      'admin-access-coverage-summary',
      `Durum: ${artifact.status}. Coverage %${report.coveragePercent}. Drift: ${report.driftCount}.`
    );

    if (!previous) {
      setText('admin-access-coverage-delta', buildCoverageDelta(undefined, history[0]!, history));
    } else {
      setText('admin-access-coverage-delta', buildCoverageDelta(previous, history[0]!, history));
    }

    setLink('admin-access-coverage-download-json', buildAdminAccessCoverageReportUrl('json'));
    setLink('admin-access-coverage-download-md', buildAdminAccessCoverageReportUrl('markdown'));
    renderDriftFiles(report.driftedFiles);
    renderTrend();
  } catch (error) {
    setText('admin-access-coverage-status', 'hata');
    setText(
      'admin-access-coverage-generated-at',
      error instanceof Error ? error.message : 'Bilinmeyen hata'
    );
    setAlert('blocked', 1, 'coverage-fetch-failed');
    setText('admin-access-coverage-summary', 'Coverage verisi alınamadı.');
    renderDriftFiles([]);
    renderTrend();
  }
}

export function initAdminAccessCoveragePage() {
  document.getElementById('refresh-admin-access-coverage')?.addEventListener('click', () => {
    void loadCoverage();
  });

  loadHistory();
  renderTrend();

  if (history.length > 1) {
    setText('admin-access-coverage-delta', buildCoverageDelta(history[1], history[0], history));
  }

  void loadCoverage();
  window.setInterval(() => {
    void loadCoverage();
  }, 60000);
}
