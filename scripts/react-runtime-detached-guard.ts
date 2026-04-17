import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { evaluateReactRuntimeDetachedGuard } from '../src/lib/react-runtime-detached-guard';
import type { ReactSurfaceClassificationReport } from '../src/lib/react-surface-classification';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const reportPath = path.join(repoRoot, 'docs', 'reports', 'react-surface-classification.json');

if (!fs.existsSync(reportPath)) {
  console.error('react-runtime-detached-guard: missing docs/reports/react-surface-classification.json');
  process.exit(1);
}

const report = JSON.parse(
  fs.readFileSync(reportPath, 'utf8'),
) as ReactSurfaceClassificationReport;

const result = evaluateReactRuntimeDetachedGuard(report);

if (!result.ok) {
  console.error(`react-runtime-detached-guard: FAIL (${result.reasons.join('; ')})`);
  process.exit(1);
}

console.log(
  `react-runtime-detached-guard: OK (server_only=${report.serverOnlyCount}, migrate=${report.migrateCount}, dead=${report.deadCount}, keep=${report.keepCount})`,
);
