import { execSync } from 'node:child_process';

const shouldRun = isTruthy(process.env.RUN_SOCIAL_SMOKE);

if (!shouldRun) {
  console.log('[social-smoke] skipped: set RUN_SOCIAL_SMOKE=true to run social smoke tests');
  process.exit(0);
}

console.log('[social-smoke] running: npm run test:social:smoke');
execSync('npm run test:social:smoke', { stdio: 'inherit' });
console.log('[social-smoke] ok');

function isTruthy(value: string | undefined): boolean {
  const normalized = (value || '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}
