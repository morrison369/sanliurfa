import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const criticalApiFiles = [
  'src/pages/api/auth/login.ts',
  'src/pages/api/auth/register.ts',
  'src/pages/api/auth/oauth/authorize.ts',
  'src/pages/api/auth/oauth/callback.ts',
  'src/pages/api/webhooks/stripe.ts',
  'src/pages/api/webhooks/replay.ts',
  'src/pages/api/webhooks/retry.ts',
  'src/pages/api/billing/webhook.ts',
];

function has(content: string, pattern: RegExp): boolean {
  return pattern.test(content);
}

function main(): void {
  const violations: string[] = [];

  for (const relativePath of criticalApiFiles) {
    const absolutePath = resolve(process.cwd(), relativePath);
    const content = readFileSync(absolutePath, 'utf8');

    const hasRequestId = has(content, /getRequestId\(/);
    const hasMetrics = has(content, /recordRequest\(/);

    if (!hasRequestId || !hasMetrics) {
      violations.push(
        `${relativePath} (getRequestId=${hasRequestId ? 'yes' : 'no'}, recordRequest=${hasMetrics ? 'yes' : 'no'})`
      );
    }
  }

  if (violations.length > 0) {
    throw new Error(`critical-observability-guard: FAIL\n${violations.join('\n')}`);
  }

  console.log(`critical-observability-guard: OK (files=${criticalApiFiles.length})`);
}

main();
