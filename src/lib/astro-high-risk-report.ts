import type { AstroHydrationEntry } from './astro-migration-report';

export interface HighRiskComponentMetrics {
  componentName: string;
  componentPath: string;
  pagePaths: string[];
  usageCount: number;
  lines: number;
  useStateCount: number;
  useEffectCount: number;
  fetchCount: number;
  typedClientCount: number;
  adminSurface: boolean;
}

export interface AstroHighRiskReportEntry extends HighRiskComponentMetrics {
  complexityScore: number;
  migrationPriority: 'first' | 'later' | 'last';
  recommendation: string;
}

export interface AstroHighRiskReport {
  generatedAt: string;
  totalHighRiskComponents: number;
  firstCount: number;
  laterCount: number;
  lastCount: number;
  entries: AstroHighRiskReportEntry[];
}

export function scoreHighRiskComponent(metrics: HighRiskComponentMetrics): number {
  const usagePenalty = Math.max(metrics.usageCount - 1, 0) * 15;
  const linePenalty = Math.ceil(metrics.lines / 40) * 5;
  const statePenalty = metrics.useStateCount * 3;
  const effectPenalty = metrics.useEffectCount * 4;
  const fetchPenalty = metrics.fetchCount * 4;
  const typedClientRelief = metrics.typedClientCount * -2;
  const adminPenalty = metrics.adminSurface ? 12 : 0;

  return (
    usagePenalty +
    linePenalty +
    statePenalty +
    effectPenalty +
    fetchPenalty +
    typedClientRelief +
    adminPenalty
  );
}

export function getHighRiskPriority(score: number): 'first' | 'later' | 'last' {
  if (score <= 35) {
    return 'first';
  }

  if (score <= 55) {
    return 'later';
  }

  return 'last';
}

export function buildHighRiskRecommendation(entry: AstroHighRiskReportEntry): string {
  if (entry.migrationPriority === 'first') {
    return `${entry.componentName} yüksek riskte olsa da sınırlı yüzey taşıyor; ilk yüksek-risk deneme adayı.`;
  }

  if (entry.migrationPriority === 'later') {
    return `${entry.componentName} taşınabilir ama önce daha dar yüzeyli adaylar bitmeli.`;
  }

  return `${entry.componentName} yoğun state/orchestration taşıyor; son dalgaya bırakılmalı.`;
}

export function createAstroHighRiskReport(options: {
  generatedAt?: string;
  entries: HighRiskComponentMetrics[];
}): AstroHighRiskReport {
  const entries = options.entries
    .map((metrics) => {
      const complexityScore = scoreHighRiskComponent(metrics);
      const migrationPriority = getHighRiskPriority(complexityScore);
      const entry: AstroHighRiskReportEntry = {
        ...metrics,
        complexityScore,
        migrationPriority,
        recommendation: '',
      };

      return {
        ...entry,
        recommendation: buildHighRiskRecommendation(entry),
      };
    })
    .sort((left, right) => left.complexityScore - right.complexityScore || left.componentName.localeCompare(right.componentName));

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    totalHighRiskComponents: entries.length,
    firstCount: entries.filter((entry) => entry.migrationPriority === 'first').length,
    laterCount: entries.filter((entry) => entry.migrationPriority === 'later').length,
    lastCount: entries.filter((entry) => entry.migrationPriority === 'last').length,
    entries,
  };
}

export function buildAstroHighRiskReportMarkdown(report: AstroHighRiskReport): string {
  return [
    '# Astro High Risk Migration Report',
    `- Generated at: ${report.generatedAt}`,
    `- Total high-risk components: ${report.totalHighRiskComponents}`,
    `- First candidates: ${report.firstCount}`,
    `- Later candidates: ${report.laterCount}`,
    `- Last candidates: ${report.lastCount}`,
    '',
    '## Ranked Entries',
    ...report.entries.map(
      (entry) =>
        `- [${entry.migrationPriority}] ${entry.componentName} | score=${entry.complexityScore} | usage=${entry.usageCount} | lines=${entry.lines} | state=${entry.useStateCount} | effect=${entry.useEffectCount} | fetch=${entry.fetchCount} | typed=${entry.typedClientCount} | admin=${entry.adminSurface ? 'yes' : 'no'}`,
    ),
    '',
  ].join('\n');
}

export function groupHighRiskEntries(entries: AstroHydrationEntry[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const entry of entries) {
    const existing = grouped.get(entry.componentName) ?? [];
    existing.push(entry.pagePath);
    grouped.set(entry.componentName, existing);
  }

  return grouped;
}
