export type AdminAccessCoverageReport = {
  generatedAt: string;
  routeFiles: number;
  wrapperFiles: number;
  driftCount: number;
  coveragePercent: number;
  driftedFiles: string[];
};

export function createAdminAccessCoverageReport(options: {
  generatedAt?: string;
  routeFiles: number;
  driftedFiles: string[];
}): AdminAccessCoverageReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const routeFiles = options.routeFiles;
  const driftCount = options.driftedFiles.length;
  const wrapperFiles = routeFiles - driftCount;

  return {
    generatedAt,
    routeFiles,
    wrapperFiles,
    driftCount,
    coveragePercent:
      routeFiles > 0 ? Number(((wrapperFiles / routeFiles) * 100).toFixed(2)) : 100,
    driftedFiles: options.driftedFiles,
  };
}

export function buildAdminAccessCoverageMarkdown(report: AdminAccessCoverageReport): string {
  return [
    '# Admin Access Coverage',
    `- Generated at: ${report.generatedAt}`,
    `- Route files: ${report.routeFiles}`,
    `- Wrapper files: ${report.wrapperFiles}`,
    `- Drift count: ${report.driftCount}`,
    `- Coverage: %${report.coveragePercent}`,
    `- First drift file: ${report.driftedFiles[0] || 'yok'}`,
    '',
    '## Drifted Files',
    ...(report.driftedFiles.length > 0 ? report.driftedFiles.map((filePath) => `- ${filePath}`) : ['- yok']),
    '',
  ].join('\n');
}
