import {
  buildAdminAccessCoverageReportUrl,
  fetchAdminAccessCoverageReport,
} from '../lib/admin-browser-client';
import {
  buildCoverageDelta,
  buildCoverageTrend,
  loadHistoryFromStorage,
  persistHistoryToStorage,
  prependHistoryEntry,
  type CoverageHistoryEntry,
  type RuntimeStatus as CoverageStatus,
} from '../lib/admin-ops-pages';
import {
  buildCoverageAlertClass,
  buildCoverageDriftFilesHtml,
  buildCoverageSummaryText,
} from '../lib/admin-access-coverage-page';
import { setElementClassName, setElementHtml, setLinkHref, setTextContent } from '../lib/admin-dom';
import { startAutoRefreshPage } from '../lib/admin-page-bootstrap';
import { formatAdminDateTime } from '../lib/admin-format';

const STORAGE_KEY = 'admin-access-coverage-history-v1';
const history: CoverageHistoryEntry[] = [];

function setAlert(status: CoverageStatus, driftCount: number, firstDriftFile?: string) {
  const element = document.getElementById('admin-access-coverage-alert');
  if (!element) return;
  const alert = buildCoverageAlertClass(status, driftCount, firstDriftFile);
  setElementClassName('admin-access-coverage-alert', alert.className);
  setTextContent('admin-access-coverage-alert', alert.text);
}

function loadHistory() {
  history.splice(0, history.length, ...loadHistoryFromStorage<CoverageHistoryEntry>(STORAGE_KEY, 20));
}

function persistHistory() {
  persistHistoryToStorage(STORAGE_KEY, history, 20);
}

function renderDriftFiles(files: string[]) {
  setElementHtml('admin-access-drift-files', buildCoverageDriftFilesHtml(files));
}

function renderTrend() {
  setTextContent('admin-access-coverage-trend', buildCoverageTrend(history));
}

async function loadCoverage() {
  setTextContent('admin-access-coverage-summary', 'Coverage verileri yenileniyor.');
  setTextContent('admin-access-coverage-status', 'Yükleniyor...');

  try {
    const payload = await fetchAdminAccessCoverageReport();
    const { report, artifact, artifactName, reportFormats } = payload.data;
    const refreshedAt = new Date().toISOString();

    prependHistoryEntry(history, {
      status: artifact.status,
      driftCount: report.driftCount,
      coveragePercent: report.coveragePercent,
      refreshedAt,
    }, 20);
    persistHistory();

    const previous = history[1];

    setTextContent('admin-access-coverage-status', artifact.status);
    setTextContent('admin-access-coverage-percent', `%${report.coveragePercent}`);
    setTextContent('admin-access-coverage-routes', `${report.routeFiles} / ${report.wrapperFiles}`);
    setTextContent('admin-access-coverage-drift-count', String(report.driftCount));
    setTextContent('admin-access-coverage-generated-at', formatAdminDateTime(report.generatedAt, 'Henüz yok'));
    setTextContent('admin-access-coverage-artifact', artifactName);
    setTextContent('admin-access-coverage-formats', reportFormats.join(', '));
    setTextContent('admin-access-coverage-artifact-status', artifact.status);
    setTextContent('admin-access-coverage-last-refresh', formatAdminDateTime(refreshedAt, '-'));
    setAlert(artifact.status, report.driftCount, report.driftedFiles[0]);
    setTextContent(
      'admin-access-coverage-summary',
      buildCoverageSummaryText(artifact.status, report.coveragePercent, report.driftCount)
    );

    if (!previous) {
      setTextContent('admin-access-coverage-delta', buildCoverageDelta(undefined, history[0]!, history));
    } else {
      setTextContent('admin-access-coverage-delta', buildCoverageDelta(previous, history[0]!, history));
    }

    setLinkHref('admin-access-coverage-download-json', buildAdminAccessCoverageReportUrl('json'));
    setLinkHref('admin-access-coverage-download-md', buildAdminAccessCoverageReportUrl('markdown'));
    renderDriftFiles(report.driftedFiles);
    renderTrend();
  } catch (error) {
    setTextContent('admin-access-coverage-status', 'hata');
    setTextContent(
      'admin-access-coverage-generated-at',
      error instanceof Error ? error.message : 'Bilinmeyen hata'
    );
    setAlert('blocked', 1, 'coverage-fetch-failed');
    setTextContent('admin-access-coverage-summary', 'Coverage verisi alınamadı.');
    renderDriftFiles([]);
    renderTrend();
  }
}

export function initAdminAccessCoveragePage() {
  loadHistory();
  startAutoRefreshPage({
    refreshButtonId: 'refresh-admin-access-coverage',
    initialRender: () => {
      renderTrend();
      if (history.length > 1) {
        setTextContent('admin-access-coverage-delta', buildCoverageDelta(history[1], history[0], history));
      }
    },
    refresh: () => {
      void loadCoverage();
    },
  });
}
