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
    '# React Kaldırma Audit Raporu',
    `- Uretilme zamani: ${new Date().toISOString()}`,
    `- TSX dosyalari: ${report.tsxCount}`,
    `- React hook/lib dosyalari: ${report.hookCount}`,
    `- Runtime React kullanimlari: ${report.runtimeUsageCount}`,
    `- @astrojs/react entegrasyonu kaldirilabilir mi: ${report.canRemoveAstroReactIntegration ? 'evet' : 'hayir'}`,
    `- react/react-dom paketleri simdi kaldirilabilir mi: ${report.canRemoveReactPackages ? 'evet' : 'hayir'}`,
    '',
    '## Blokorler',
  ];

  if (report.blockers.length === 0) {
    lines.push('- yok');
  } else {
    for (const blocker of report.blockers) lines.push(`- ${blocker}`);
  }

  lines.push('', '## Runtime Kullanimlari');
  if (report.runtimeUsages.length === 0) {
    lines.push('- yok');
  } else {
    for (const usage of report.runtimeUsages) lines.push(`- ${usage}`);
  }

  lines.push('', '## Kalan TSX Dosyalari');
  if (report.deadTsx.length === 0) {
    lines.push('- yok');
  } else {
    for (const file of report.deadTsx) lines.push(`- ${file}`);
  }

  lines.push('', '## Kalan Hook Dosyalari');
  if (report.hookFiles.length === 0) {
    lines.push('- yok');
  } else {
    for (const file of report.hookFiles) lines.push(`- ${file}`);
  }

  return `${lines.join('\n')}\n`;
}
