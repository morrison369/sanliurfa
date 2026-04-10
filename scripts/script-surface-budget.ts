import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface BudgetFile {
  maxScripts: number;
}

function main(): void {
  const packageJsonPath = resolve(process.cwd(), 'package.json');
  const budgetPath = resolve(process.cwd(), 'docs/reports/script-surface-budget.json');

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { scripts?: Record<string, string> };
  const budget = JSON.parse(readFileSync(budgetPath, 'utf8')) as BudgetFile;

  const scriptCount = Object.keys(packageJson.scripts ?? {}).length;
  if (!Number.isFinite(budget.maxScripts) || budget.maxScripts <= 0) {
    throw new Error('script-surface-budget: invalid maxScripts in docs/reports/script-surface-budget.json');
  }

  if (scriptCount > budget.maxScripts) {
    throw new Error(
      `script-surface-budget: FAIL (current=${scriptCount}, max=${budget.maxScripts}). ` +
      'Add aliases/runners instead of new one-off scripts.'
    );
  }

  console.log(`script-surface-budget: OK (current=${scriptCount}, max=${budget.maxScripts})`);
}

main();
