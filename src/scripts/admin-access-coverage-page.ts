import {
  buildAdminAccessCoverageReportUrl,
  fetchAdminAccessCoverageReport,
} from '../lib/admin-browser-client';

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

async function loadCoverage() {
  setText('admin-access-coverage-status', 'Yükleniyor...');

  try {
    const payload = await fetchAdminAccessCoverageReport();
    const { report, artifact, artifactName, reportFormats } = payload.data;

    setText('admin-access-coverage-status', artifact.status);
    setText('admin-access-coverage-percent', `%${report.coveragePercent}`);
    setText('admin-access-coverage-routes', `${report.routeFiles} / ${report.wrapperFiles}`);
    setText('admin-access-coverage-drift-count', String(report.driftCount));
    setText('admin-access-coverage-generated-at', report.generatedAt || 'Henüz yok');
    setText('admin-access-coverage-artifact', artifactName);
    setText('admin-access-coverage-formats', reportFormats.join(', '));
    setText('admin-access-coverage-artifact-status', artifact.status);
    setLink('admin-access-coverage-download-json', buildAdminAccessCoverageReportUrl('json'));
    setLink('admin-access-coverage-download-md', buildAdminAccessCoverageReportUrl('markdown'));
    renderDriftFiles(report.driftedFiles);
  } catch (error) {
    setText('admin-access-coverage-status', 'hata');
    setText(
      'admin-access-coverage-generated-at',
      error instanceof Error ? error.message : 'Bilinmeyen hata'
    );
    renderDriftFiles([]);
  }
}

export function initAdminAccessCoveragePage() {
  document.getElementById('refresh-admin-access-coverage')?.addEventListener('click', () => {
    void loadCoverage();
  });

  void loadCoverage();
}
