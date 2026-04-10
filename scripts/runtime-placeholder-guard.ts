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
  'src/lib/ai-ops.ts',
  'src/lib/anomaly-detection.ts',
  'src/lib/compliance-frameworks.ts',
  'src/lib/coverage-analytics.ts',
  'src/lib/deployment-pipelines.ts',
  'src/lib/disaster-recovery.ts',
  'src/lib/integration-platform.ts',
  'src/lib/infrastructure-automation.ts',
  'src/lib/gitops-infrastructure.ts',
  'src/lib/operations-control.ts',
  'src/lib/secrets-management.ts',
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
  'src/lib/webhook-queue.ts',
  'src/lib/multi-tenancy.ts',
  'src/lib/platform-intelligence.ts',
  'src/lib/policy-analytics.ts',
  'src/lib/policy-as-code.ts',
  'src/lib/security-compliance.ts',
  'src/lib/supply-chain-security.ts',
  'src/lib/vendor-analytics.ts',
  'src/lib/tax-compliance.ts',
  'src/lib/apm.ts',
  'src/lib/security-incidents.ts',
  'src/lib/two-factor.ts',
  'src/lib/utils.ts',
  'src/lib/invoicing-billing.ts',
  'src/lib/payment-billing.ts',
  'src/lib/payout-engine.ts',
  'src/lib/ml-pipelines.ts',
  'src/lib/nlp-engine.ts',
  'src/lib/personalization-engine.ts',
  'src/lib/collaboration.ts',
  'src/lib/decision-audit.ts',
  'src/lib/escalation-management.ts',
  'src/lib/data-quality.ts',
  'src/lib/inventory-warehouse.ts',
  'src/lib/marketing-automation.ts',
  'src/lib/geo-intelligence.ts',
  'src/lib/general-ledger.ts',
  'src/lib/hr-recruitment.ts',
  'src/lib/infrastructure-orchestration.ts',
  'src/lib/rewards.ts',
  'src/lib/rewards-catalog.ts',
  'src/lib/content-pipeline.ts'
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
