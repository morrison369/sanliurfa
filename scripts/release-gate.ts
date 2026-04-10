import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getPerformanceOpsSummary } from '../src/lib/performance-ops-summary';

type StepResult = {
  step: string;
  command: string;
  advisory: boolean;
  status: 'passed' | 'failed';
};

const stepResults: StepResult[] = [];

function run(step: string, command: string): void {
  console.log(`\n[release-gate] ${step}`);
  try {
    execSync(command, { stdio: 'inherit' });
    stepResults.push({ step, command, advisory: false, status: 'passed' });
  } catch (error) {
    stepResults.push({ step, command, advisory: false, status: 'failed' });
    throw error;
  }
}

function runOptional(step: string, command: string): void {
  try {
    run(step, command);
    stepResults[stepResults.length - 1] = {
      step,
      command,
      advisory: true,
      status: 'passed'
    };
  } catch (error) {
    stepResults[stepResults.length - 1] = {
      step,
      command,
      advisory: true,
      status: 'failed'
    };
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[release-gate] advisory step failed: ${step} (${message})`);
  }
}

async function writeSummary(finalStatus: 'passed' | 'failed'): Promise<void> {
  const reportPath = resolve(process.cwd(), 'docs/reports/release-gate-summary.json');
  mkdirSync(resolve(process.cwd(), 'docs/reports'), { recursive: true });
  const performanceOptimization = await getPerformanceOpsSummary();
  writeFileSync(
    reportPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        finalStatus,
        blockingFailedSteps: stepResults.filter((step) => !step.advisory && step.status === 'failed').map((step) => step.step),
        advisoryFailedSteps: stepResults.filter((step) => step.advisory && step.status === 'failed').map((step) => step.step),
        steps: stepResults,
        performanceOptimization
      },
      null,
      2
    )}\n`,
    'utf8'
  );
}

async function main(): Promise<void> {
  try {
    run('Environment contract (local)', 'npm run env:contract:check');
    run('Repository stabilization checks', 'npm run repo:stabilize:check');
    run('Script surface budget', 'npm run script:surface:budget:check');
    run('Branch protection drift check', 'npm run branch:protection:drift:check');
    run('Security secret scan', 'npm run security:secrets:scan');
    run('HTTP timeout governance guard', 'npm run governance:http:timeout:check');
    run('Governance import guard', 'npm run governance:imports:check');
    run('Governance logging guard', 'npm run governance:logging:check');
    run('Governance frontend randomness guard', 'npm run governance:frontend:randomness:check');
    run('Governance runtime placeholder guard', 'npm run governance:runtime:placeholders:check');
    run('Governance legacy insecure usage guard', 'npm run governance:legacy:insecure:check');
    run('Governance cache redis prohibition guard', 'npm run governance:cache:redis:check');
    run('Governance queryMany prohibition guard', 'npm run governance:querymany:usage:check');
    run('Governance queryMany guard', 'npm run governance:querymany:check');
    run('Governance migration contract guard', 'npm run governance:migrations:contract:check');
    run('DB drift check', 'npm run db:drift:check');
    runOptional('DB test bootstrap', 'npm run db:test:bootstrap');
    runOptional('Migration status', 'npm run migrate:status');
    run('Migration dry-run', 'npm run migrate:dry-run');
    runOptional('Phase doctor', 'npm run phase:doctor');
    run('Dependency triage', 'npm run deps:audit:triage');
    run('TypeScript app gate', 'npm run typecheck:app');
    run('TypeScript experimental exclude prohibition gate', 'npm run typecheck:experimental:exclude:guard');
    run('TypeScript experimental gate', 'npm run typecheck:experimental');
    run('TypeScript weekly report', 'npm run typecheck:experimental:report');
    runOptional('TypeScript governance gate', 'npm run phase:check:tsconfig');
    run('Critical observability guard', 'npm run observability:critical:check');
    run('Critical unit smoke (blocking)', 'npm run test:critical:blocking');
    runOptional('Critical unit smoke (advisory)', 'npm run test:critical:advisory');
    run('E2E smoke', 'npm run test:e2e:smoke');
    run('Build', 'npm run build');
    run('Performance budget check', 'npm run performance:budget:check');
    run('SEO artifacts check', 'npm run seo:artifacts:check');
    await writeSummary('passed');
    console.log('\n[release-gate] OK');
  } catch (error) {
    await writeSummary('failed');
    throw error;
  }
}

main();
