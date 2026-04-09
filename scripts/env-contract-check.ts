const args = new Set(process.argv.slice(2));
const ciMode = args.has('--ci');

type ContractRule = {
  key: string;
  required: boolean;
};

const baseRules: ContractRule[] = [
  { key: 'DATABASE_URL', required: true },
  { key: 'READ_REPLICA_URL', required: false },
  { key: 'PUBLIC_SITE_URL', required: ciMode },
  { key: 'PORT', required: ciMode },
];

function hasValue(key: string): boolean {
  const value = process.env[key];
  return typeof value === 'string' && value.trim().length > 0;
}

function main(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const rule of baseRules) {
    if (rule.required && !hasValue(rule.key)) {
      missing.push(rule.key);
    }
    if (!rule.required && !hasValue(rule.key)) {
      warnings.push(rule.key);
    }
  }

  if (missing.length > 0) {
    console.error(`env-contract-check: missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  const modeLabel = ciMode ? 'ci' : 'local';
  if (warnings.length > 0) {
    console.log(`env-contract-check: OK (${modeLabel}) with optional-empty=${warnings.join(', ')}`);
    return;
  }
  console.log(`env-contract-check: OK (${modeLabel})`);
}

main();
