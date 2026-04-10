import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

type Totals = {
  js: number;
  css: number;
  html: number;
  json: number;
  total: number;
};

interface PerfBudget {
  baseline: Totals;
  maxGrowthPercent: number;
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const next = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(next));
    } else if (entry.isFile()) {
      out.push(next);
    }
  }
  return out;
}

function buildTotals(clientDistDir: string): Totals {
  const files = walkFiles(clientDistDir);
  const totals: Totals = { js: 0, css: 0, html: 0, json: 0, total: 0 };

  for (const file of files) {
    const size = statSync(file).size;
    if (file.endsWith('.js')) totals.js += size;
    else if (file.endsWith('.css')) totals.css += size;
    else if (file.endsWith('.html')) totals.html += size;
    else if (file.endsWith('.json')) totals.json += size;
  }

  totals.total = totals.js + totals.css + totals.html + totals.json;
  return totals;
}

function main(): void {
  const distClientPath = resolve(process.cwd(), 'dist/client');
  const budgetPath = resolve(process.cwd(), 'docs/reports/performance-budget-baseline.json');
  const budget = JSON.parse(readFileSync(budgetPath, 'utf8')) as PerfBudget;
  const current = buildTotals(distClientPath);

  if (!Number.isFinite(budget.maxGrowthPercent) || budget.maxGrowthPercent < 0) {
    throw new Error('performance-budget-check: invalid maxGrowthPercent in docs/reports/performance-budget-baseline.json');
  }

  const multiplier = 1 + (budget.maxGrowthPercent / 100);
  const checks: Array<keyof Totals> = ['js', 'css', 'html', 'json', 'total'];

  for (const key of checks) {
    const baselineValue = budget.baseline[key];
    const currentValue = current[key];
    if (!Number.isFinite(baselineValue) || baselineValue <= 0) {
      throw new Error(`performance-budget-check: invalid baseline.${key}`);
    }
    const allowed = Math.floor(baselineValue * multiplier);
    if (currentValue > allowed) {
      throw new Error(
        `performance-budget-check: FAIL (${key}=${currentValue} > allowed=${allowed}, baseline=${baselineValue}, growth=${budget.maxGrowthPercent}%)`
      );
    }
  }

  console.log(
    `performance-budget-check: OK (js=${current.js}, css=${current.css}, html=${current.html}, json=${current.json}, total=${current.total}, growth=${budget.maxGrowthPercent}%)`
  );
}

main();
