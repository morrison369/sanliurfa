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
  { key: 'RESEND_API_KEY', required: false },
  { key: 'PUBLIC_GOOGLE_ANALYTICS_ID', required: false },
  { key: 'GOOGLE_ANALYTICS_ID', required: false },
];

const placeholderPatterns: Record<string, RegExp[]> = {
  RESEND_API_KEY: [/^re_x+$/i, /^YOUR_/i, /^CHANGEME$/i],
  PUBLIC_GOOGLE_ANALYTICS_ID: [/^G-XXXXXXXXXX$/i, /^G-X+$/i, /^YOUR_/i],
  GOOGLE_ANALYTICS_ID: [/^G-XXXXXXXXXX$/i, /^G-X+$/i, /^YOUR_/i],
};

function hasValue(key: string): boolean {
  const value = process.env[key];
  return typeof value === 'string' && value.trim().length > 0;
}

function isPlaceholder(key: string): boolean {
  const value = process.env[key]?.trim();
  if (!value) {
    return false;
  }

  return (placeholderPatterns[key] || []).some((pattern) => pattern.test(value));
}

function main(): void {
  const missing: string[] = [];
  const warnings: string[] = [];
  const placeholderWarnings: string[] = [];

  for (const rule of baseRules) {
    if (rule.required && !hasValue(rule.key)) {
      missing.push(rule.key);
    }
    if (!rule.required && !hasValue(rule.key)) {
      warnings.push(rule.key);
    }

    if (isPlaceholder(rule.key)) {
      placeholderWarnings.push(rule.key);
    }
  }

  if (missing.length > 0) {
    console.error(`env-contract-check: missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  const modeLabel = ciMode ? 'ci' : 'local';
  const messages: string[] = [];
  if (warnings.length > 0) {
    messages.push(`optional-empty=${warnings.join(', ')}`);
  }
  if (placeholderWarnings.length > 0) {
    messages.push(`placeholder-values=${placeholderWarnings.join(', ')}`);
  }

  if (messages.length > 0) {
    console.log(`env-contract-check: OK (${modeLabel}) with ${messages.join('; ')}`);
    return;
  }

  console.log(`env-contract-check: OK (${modeLabel})`);
}

main();
