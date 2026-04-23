import { fillRate, loadReport, percent, resolveReportPath } from './lib/image-fill-report';

const beforeArg = process.argv.find((arg) => arg.startsWith('--before-report='))?.split('=')[1];
const afterArg = process.argv.find((arg) => arg.startsWith('--after-report='))?.split('=')[1];
const outputJson = process.argv.includes('--json');

if (!beforeArg || !afterArg) {
  console.error('[images:report:compare] --before-report=<path> ve --after-report=<path> zorunludur.');
  process.exit(1);
}

const before = loadReport(beforeArg);
const after = loadReport(afterArg);
const beforeRate = fillRate(before);
const afterRate = fillRate(after);

const diff = {
  beforePath: resolveReportPath(beforeArg),
  afterPath: resolveReportPath(afterArg),
  scanned: after.totals.scanned - before.totals.scanned,
  filled: after.totals.filled - before.totals.filled,
  failed: after.totals.failed - before.totals.failed,
  fillRateDelta: afterRate - beforeRate,
};

if (outputJson) {
  console.log(
    JSON.stringify(
      {
        before: {
          totals: before.totals,
          fillRate: beforeRate,
        },
        after: {
          totals: after.totals,
          fillRate: afterRate,
        },
        diff,
      },
      null,
      2
    )
  );
  process.exit(0);
}

console.log(`[images:report:compare]
- before: ${diff.beforePath}
- after: ${diff.afterPath}
- before totals: scanned=${before.totals.scanned} filled=${before.totals.filled} failed=${before.totals.failed} fillRate=${percent(beforeRate)}
- after totals: scanned=${after.totals.scanned} filled=${after.totals.filled} failed=${after.totals.failed} fillRate=${percent(afterRate)}
- delta: scanned=${diff.scanned} filled=${diff.filled} failed=${diff.failed} fillRateDelta=${percent(diff.fillRateDelta)}`);
