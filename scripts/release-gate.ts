import { execSync } from 'node:child_process';

function run(step: string, command: string): void {
  console.log(`\n[release-gate] ${step}`);
  execSync(command, { stdio: 'inherit' });
}

function runOptional(step: string, command: string): void {
  try {
    run(step, command);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[release-gate] advisory step failed: ${step} (${message})`);
  }
}

function main(): void {
  run('Environment contract (local)', 'npm run env:contract:check');
  run('Repository stabilization checks', 'npm run repo:stabilize:check');
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
  run('Phase doctor', 'npm run phase:doctor');
  run('Dependency triage', 'npm run deps:audit:triage');
  run('TypeScript app gate', 'npm run typecheck:app');
  run('TypeScript experimental exclude prohibition gate', 'npm run typecheck:experimental:exclude:guard');
  run('TypeScript experimental gate', 'npm run typecheck:experimental');
  run('TypeScript weekly report', 'npm run typecheck:experimental:report');
  run('TypeScript governance gate', 'npm run phase:check:tsconfig');
  run('Critical unit smoke', 'npm run test:unit -- src/lib/__tests__/report-engine-excel-smoke.test.ts');
  run('E2E smoke', 'npm run test:e2e:smoke');
  run('Build', 'npm run build');
  run('SEO artifacts check', 'npm run seo:artifacts:check');
  console.log('\n[release-gate] OK');
}

main();
