import { buildCoverageAlert, type RuntimeStatus } from './admin-ops-pages';

export function buildCoverageAlertClass(status: RuntimeStatus, driftCount: number, firstDriftFile?: string) {
  const alert = buildCoverageAlert({ status, driftCount, firstDriftFile });
  const base = 'rounded-2xl border p-4 text-sm font-semibold block';

  if (alert.tone === 'blocked') {
    return {
      text: alert.text,
      className: `${base} border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200`,
    };
  }

  if (alert.tone === 'degraded') {
    return {
      text: alert.text,
      className: `${base} border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200`,
    };
  }

  return {
    text: alert.text,
    className: `${base} border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200`,
  };
}

export function buildCoverageSummaryText(status: RuntimeStatus, coveragePercent: number, driftCount: number) {
  return `Durum: ${status}. Kapsama %${coveragePercent}. Drift: ${driftCount}.`;
}

export function buildCoverageDriftFilesHtml(files: string[]) {
  if (files.length === 0) {
    return '<li class="text-green-700 dark:text-green-300">Drift yok.</li>';
  }

  return files
    .map(
      (filePath) =>
        `<li class="break-all rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">${filePath}</li>`
    )
    .join('');
}
