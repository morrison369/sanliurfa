import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadLocalEnv } from './lib/load-local-env';
import { fillRate, loadReport, percent } from './lib/image-fill-report';

loadLocalEnv();

const databaseUrlArg = process.argv.find((arg) => arg.startsWith('--database-url='))?.split('=')[1];
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
const queryModeArg = process.argv.find((arg) => arg.startsWith('--query-mode='))?.split('=')[1];
const typeArg = process.argv.find((arg) => arg.startsWith('--type='))?.split('=')[1];
const concurrencyArg = process.argv.find((arg) => arg.startsWith('--concurrency='))?.split('=')[1];
const dryRunOnly = process.argv.includes('--dry-run-only');
const writeOnly = process.argv.includes('--write-only');
const minFillRateArg = process.argv.find((arg) => arg.startsWith('--min-fill-rate='))?.split('=')[1];
const skipDryRunProbe = process.argv.includes('--skip-dry-run-probe');
const limit = Math.max(1, Number.parseInt(limitArg || '100', 10));
const concurrency = clampConcurrency(concurrencyArg ? Number.parseInt(concurrencyArg, 10) : 3);
const queryMode = queryModeArg === 'expanded' ? 'expanded' : 'strict';
const type = normalizeType(typeArg);
const minFillRate = clampRate(minFillRateArg ? Number.parseFloat(minFillRateArg) : 0);
const databaseUrl = databaseUrlArg || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[images:pipeline] DATABASE_URL bulunamadı. --database-url=<postgresql://...> verin.');
  process.exit(1);
}

if (dryRunOnly && writeOnly) {
  console.error('[images:pipeline] --dry-run-only ve --write-only birlikte kullanılamaz.');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportDir = path.join(process.cwd(), '.tmp', 'image-fill');
const dryRunReport = path.join(reportDir, `dry-run-${timestamp}.json`);
const writeReport = path.join(reportDir, `write-${timestamp}.json`);

await mkdir(reportDir, { recursive: true });

if (!writeOnly) {
  runFill({
    write: false,
    reportJson: dryRunReport,
    probeOnDryRun: !skipDryRunProbe,
    concurrency,
  });
  runSummary(dryRunReport);
}

if (!dryRunOnly) {
  runFill({
    write: true,
    reportJson: writeReport,
    probeOnDryRun: false,
    concurrency,
  });
  runSummary(writeReport);
  enforceMinFillRate(writeReport);
}

if (!dryRunOnly && !writeOnly) {
  runCompare(dryRunReport, writeReport);
}

console.log(`[images:pipeline] tamamlandı
- dry-run report: ${dryRunOnly ? 'skip' : dryRunReport}
- write report: ${writeOnly ? 'skip' : writeReport}
- type=${type}
- minFillRate=${percent(minFillRate)}
- dryRunProbe=${skipDryRunProbe ? 'off' : 'on'}
- concurrency=${concurrency}`);

function runFill(input: { write: boolean; reportJson: string; probeOnDryRun: boolean; concurrency: number }): void {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = [
    'run',
    'images:content:fill',
    '--',
    `--limit=${limit}`,
    `--type=${type}`,
    `--query-mode=${queryMode}`,
    `--concurrency=${input.concurrency}`,
    `--database-url=${databaseUrl}`,
    `--report-json=${input.reportJson}`,
  ];

  if (input.write) {
    args.push('--write');
  } else if (input.probeOnDryRun) {
    args.push('--probe-provider-on-dry-run');
  }

  const result = spawnSync(npmCommand, args, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runSummary(reportJson: string): void {
  const result = runTsxScript('scripts/image-fill-report-summary.ts', [`--report-json=${reportJson}`]);

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCompare(beforeReport: string, afterReport: string): void {
  const result = runTsxScript('scripts/image-fill-report-compare.ts', [
    `--before-report=${beforeReport}`,
    `--after-report=${afterReport}`,
  ]);

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function enforceMinFillRate(reportJson: string): void {
  if (minFillRate <= 0) {
    return;
  }

  const report = loadReport(reportJson);
  const actualRate = fillRate(report);
  if (actualRate + Number.EPSILON < minFillRate) {
    console.error(
      `[images:pipeline] min fill rate sağlanamadı. expected=${percent(minFillRate)} actual=${percent(actualRate)}`
    );
    process.exit(2);
  }
}

function runTsxScript(scriptPath: string, args: string[]) {
  const nodeCommand = process.platform === 'win32' ? 'node.exe' : 'node';
  return spawnSync(nodeCommand, ['./node_modules/tsx/dist/cli.mjs', scriptPath, ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });
}

function clampRate(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 100) {
    return 100;
  }
  return value;
}

function clampConcurrency(value: number): number {
  if (!Number.isFinite(value)) {
    return 3;
  }
  if (value < 1) {
    return 1;
  }
  if (value > 10) {
    return 10;
  }
  return value;
}

function normalizeType(value: string | undefined): 'places' | 'blog' | 'events' | 'all' {
  if (value === 'places' || value === 'blog' || value === 'events' || value === 'all') {
    return value;
  }
  return 'all';
}
