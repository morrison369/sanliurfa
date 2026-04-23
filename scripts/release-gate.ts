import { execSync } from 'node:child_process';

function run(step: string, command: string): void {
  console.log(`\n[release-gate] ${step}`);
  execSync(command, { stdio: 'inherit' });
}

function main(): void {
  run('Repository stabilization checks', 'npm run repo:stabilize:check');
  run('Dependency triage', 'npm run deps:audit:triage');
  run('Release definition contract', 'npm run security:release-definition-contract');
  run('SEO template contract', 'npm run security:seo-template-contract');
  run('Turkish content quality contract', 'npm run security:turkish-content-quality-contract');
  run('Image slug contract', 'npm run security:image-slug-contract');
  run('Public readiness gate', 'npm run security:public-readiness');
  run('Build', 'npm run build');
  console.log('\n[release-gate] OK');
}

main();
