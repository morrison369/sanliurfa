import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface VulnerabilityMeta {
  severity: 'info' | 'low' | 'moderate' | 'high' | 'critical';
  isDirect?: boolean;
  fixAvailable?: boolean | { name?: string; version?: string; isSemVerMajor?: boolean };
}

interface AuditMetadata {
  vulnerabilities?: {
    info?: number;
    low?: number;
    moderate?: number;
    high?: number;
    critical?: number;
    total?: number;
  };
}

interface AuditReport {
  vulnerabilities?: Record<string, VulnerabilityMeta>;
  metadata?: AuditMetadata;
}

export interface DependencyTriageSummary {
  total: number;
  high: string[];
  moderate: string[];
  direct: string[];
  transitive: string[];
  fixAvailable: string[];
  noFixAvailable: string[];
}

export function summarizeAudit(report: AuditReport): DependencyTriageSummary {
  const vulnerabilities = report.vulnerabilities ?? {};
  const names = Object.keys(vulnerabilities).sort();

  const summary: DependencyTriageSummary = {
    total: report.metadata?.vulnerabilities?.total ?? names.length,
    high: [],
    moderate: [],
    direct: [],
    transitive: [],
    fixAvailable: [],
    noFixAvailable: []
  };

  for (const name of names) {
    const vulnerability = vulnerabilities[name];
    if (vulnerability.severity === 'high' || vulnerability.severity === 'critical') {
      summary.high.push(name);
    } else if (vulnerability.severity === 'moderate') {
      summary.moderate.push(name);
    }

    if (vulnerability.isDirect) {
      summary.direct.push(name);
    } else {
      summary.transitive.push(name);
    }

    if (vulnerability.fixAvailable) {
      summary.fixAvailable.push(name);
    } else {
      summary.noFixAvailable.push(name);
    }
  }

  return summary;
}

export function renderDependencyTriage(summary: DependencyTriageSummary): string {
  const renderList = (label: string, values: string[]) => `${label}=${values.length ? values.join(', ') : 'none'}`;

  return [
    'dependency-triage',
    `total=${summary.total}`,
    renderList('high', summary.high),
    renderList('moderate', summary.moderate),
    renderList('direct', summary.direct),
    renderList('transitive', summary.transitive),
    renderList('fixAvailable', summary.fixAvailable),
    renderList('noFixAvailable', summary.noFixAvailable),
    'policy=runtime-first, no dependency upgrades inside phase delivery PRs'
  ].join('\n');
}

function readAuditReport(argv: string[]): AuditReport {
  const fileArgIndex = argv.indexOf('--file');
  if (fileArgIndex >= 0) {
    const filePath = argv[fileArgIndex + 1];
    if (!filePath) {
      throw new Error('Missing value after --file');
    }

    const resolved = resolve(process.cwd(), filePath);
    if (!existsSync(resolved)) {
      throw new Error(`Audit file not found: ${resolved}`);
    }

    return JSON.parse(readFileSync(resolved, 'utf8')) as AuditReport;
  }

  try {
    const output = execSync('npm audit --json', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return JSON.parse(output) as AuditReport;
  } catch (error) {
    const stdout = typeof error === 'object' && error && 'stdout' in error ? String((error as { stdout?: string }).stdout ?? '') : '';
    if (!stdout.trim()) {
      throw error;
    }
    return JSON.parse(stdout) as AuditReport;
  }
}

export function main(): void {
  const report = readAuditReport(process.argv.slice(2));
  const summary = summarizeAudit(report);
  process.stdout.write(`${renderDependencyTriage(summary)}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
