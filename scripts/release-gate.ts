import { execSync } from 'node:child_process';

function run(step: string, command: string): void {
  console.log(`\n[release-gate] ${step}`);
  execSync(command, { stdio: 'inherit' });
}

function main(): void {
  run('Repository stabilization checks', 'npm run repo:stabilize:check');
  run('Phase doctor', 'npm run phase:doctor');
  run('Dependency triage', 'npm run deps:audit:triage');
  run('TypeScript governance gate', 'npm run phase:check:tsconfig');
  run('Critical unit smoke', 'npm run test:unit -- src/lib/__tests__/report-engine-excel-smoke.test.ts');
  run('Build', 'npm run build');
  console.log('\n[release-gate] OK');
}

main();
