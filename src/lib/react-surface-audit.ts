export interface ReactSurfaceAuditReport {
  tsxCount: number;
  hookCount: number;
  runtimeUsageCount: number;
  runtimeUsages: string[];
  deadTsxCount: number;
  deadTsx: string[];
  hookFiles: string[];
  canRemoveAstroReactIntegration: boolean;
  canRemoveReactPackages: boolean;
  blockers: string[];
}

export function summarizeReactSurfaceAudit(input: {
  tsxFiles: string[];
  hookFiles: string[];
  runtimeUsages: string[];
}): ReactSurfaceAuditReport {
  const deadTsx = [...input.tsxFiles].sort();
  const runtimeUsages = [...input.runtimeUsages].sort();
  const hookFiles = [...input.hookFiles].sort();

  const canRemoveAstroReactIntegration = runtimeUsages.length === 0;
  const canRemoveReactPackages = runtimeUsages.length === 0 && deadTsx.length === 0 && hookFiles.length === 0;

  const blockers: string[] = [];
  if (deadTsx.length > 0) blockers.push(`${deadTsx.length} adet kalan .tsx dosyasi React import ediyor`);
  if (hookFiles.length > 0) blockers.push(`${hookFiles.length} adet kalan hook/lib dosyasi React hook import ediyor`);
  if (runtimeUsages.length > 0) blockers.push(`${runtimeUsages.length} adet runtime kullanim noktasi hala React entegrasyonuna bagli`);

  return {
    tsxCount: input.tsxFiles.length,
    hookCount: hookFiles.length,
    runtimeUsageCount: runtimeUsages.length,
    runtimeUsages,
    deadTsxCount: deadTsx.length,
    deadTsx,
    hookFiles,
    canRemoveAstroReactIntegration,
    canRemoveReactPackages,
    blockers,
  };
}

export function buildReactSurfaceAuditMarkdown(report: ReactSurfaceAuditReport): string {
  const lines = [
    '# React Removal Audit',
    `- Generated at: ${new Date().toISOString()}`,
    `- TSX files: ${report.tsxCount}`,
    `- React hook/lib files: ${report.hookCount}`,
    `- Runtime React usages: ${report.runtimeUsageCount}`,
    `- Can remove @astrojs/react integration: ${report.canRemoveAstroReactIntegration ? 'yes' : 'no'}`,
    `- Can remove react/react-dom packages now: ${report.canRemoveReactPackages ? 'yes' : 'no'}`,
    '',
    '## Blockers',
  ];

  if (report.blockers.length === 0) {
    lines.push('- none');
  } else {
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
  }

  lines.push('', '## Runtime Usages');
  if (report.runtimeUsages.length === 0) {
    lines.push('- none');
  } else {
    for (const usage of report.runtimeUsages) lines.push(`- ${usage}`);
  }

  lines.push('', '## Remaining TSX Files');
  if (report.deadTsx.length === 0) {
    lines.push('- none');
  } else {
    for (const file of report.deadTsx) lines.push(`- ${file}`);
  }

  lines.push('', '## Remaining Hook Files');
  if (report.hookFiles.length === 0) {
    lines.push('- none');
  } else {
    for (const file of report.hookFiles) lines.push(`- ${file}`);
  }

  return `${lines.join('\n')}\n`;
}
