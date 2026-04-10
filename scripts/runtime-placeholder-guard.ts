import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = [
  'src/lib/advanced-analytics.ts',
  'src/lib/ai-inventory-planning.ts',
  'src/lib/ai-chatbot.ts',
  'src/lib/crm-analytics.ts',
  'src/lib/customer-success-analytics.ts',
  'src/lib/demand-planning.ts',
  'src/lib/shipping-logistics.ts',
  'src/lib/reverse-logistics.ts',
  'src/lib/security-automation.ts',
  'src/lib/zero-trust-security.ts',
  'src/lib/advanced-observability.ts',
  'src/lib/testing-analytics.ts',
  'src/lib/semantic-intelligence.ts',
  'src/lib/chaos-engineering.ts',
  'src/lib/service-mesh.ts',
  'src/lib/threat-modeling.ts',
  'src/lib/financial-analytics.ts',
  'src/lib/financial-planning.ts',
  'src/lib/financial-reporting.ts',
  'src/lib/predictive-incidents.ts',
  'src/lib/crm-sales-pipeline.ts',
  'src/lib/customer-health.ts',
  'src/lib/performance-testing.ts',
  'src/lib/test-automation.ts',
  'src/lib/advanced-rate-limit.ts',
  'src/lib/api-gateway.ts',
  'src/lib/api-documentation.ts',
  'src/lib/developer-portal.ts',
  'src/lib/developer-platform.ts',
  'src/lib/distributed-cache.ts',
  'src/lib/background-jobs.ts',
  'src/lib/blog-webhooks.ts',
  'src/lib/event-bus.ts',
  'src/lib/job-queue.ts',
  'src/lib/api.ts',
  'src/lib/file-storage.ts',
  'src/lib/google-analytics.ts',
  'src/lib/security-headers.ts',
  'src/lib/data-governance.ts',
  'src/lib/logging.ts',
  'src/lib/webhook-queue.ts'
];

const PATTERNS = [
  { label: 'Math.random', regex: /Math\.random\s*\(/ },
  { label: 'simulated wording', regex: /\bsimulated\b/i },
  { label: 'placeholder wording', regex: /\bplaceholder\b/i },
  { label: 'mock asset wording', regex: /mock asset/i }
];

function main(): void {
  const root = process.cwd();
  const offenders: string[] = [];

  for (const relativePath of FILES) {
    const fullPath = resolve(root, relativePath);
    const content = readFileSync(fullPath, 'utf8');

    for (const pattern of PATTERNS) {
      if (pattern.regex.test(content)) {
        offenders.push(`${relativePath} -> ${pattern.label}`);
      }
    }
  }

  if (offenders.length > 0) {
    throw new Error([
      `runtime placeholder patterns detected (${offenders.length})`,
      ...offenders.map(entry => `- ${entry}`)
    ].join('\n'));
  }

  console.log(`runtime-placeholder-guard: OK (files=${FILES.length})`);
}

main();
