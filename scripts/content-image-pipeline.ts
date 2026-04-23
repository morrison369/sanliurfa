import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadLocalEnv } from './lib/load-local-env';

loadLocalEnv();

const databaseUrlArg = process.argv.find((arg) => arg.startsWith('--database-url='))?.split('=')[1];
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
const queryModeArg = process.argv.find((arg) => arg.startsWith('--query-mode='))?.split('=')[1];
const limit = Math.max(1, Number.parseInt(limitArg || '100', 10));
const queryMode = queryModeArg === 'expanded' ? 'expanded' : 'strict';
const databaseUrl = databaseUrlArg || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('[images:pipeline] DATABASE_URL bulunamadı. --database-url=<postgresql://...> verin.');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportDir = path.join(process.cwd(), '.tmp', 'image-fill');
const dryRunReport = path.join(reportDir, `dry-run-${timestamp}.json`);
const writeReport = path.join(reportDir, `write-${timestamp}.json`);

await mkdir(reportDir, { recursive: true });

runFill({
  write: false,
  reportJson: dryRunReport,
});

runFill({
  write: true,
  reportJson: writeReport,
});

console.log(`[images:pipeline] tamamlandı
- dry-run report: ${dryRunReport}
- write report: ${writeReport}`);

function runFill(input: { write: boolean; reportJson: string }): void {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = [
    'run',
    'images:content:fill',
    '--',
    `--limit=${limit}`,
    '--type=all',
    `--query-mode=${queryMode}`,
    `--database-url=${databaseUrl}`,
    `--report-json=${input.reportJson}`,
  ];

  if (input.write) {
    args.push('--write');
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
