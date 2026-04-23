import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const blockers: string[] = [];

const envExample = read(".env.example");
const envProductionTemplate = read(".env.production.template");

validateEnvTemplate(".env.example", envExample);
validateEnvTemplate(".env.production.template", envProductionTemplate);

if (blockers.length > 0) {
  console.error("[env-template] BLOCKED");
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log("[env-template] ok: env templates are aligned with canonical host/port/redis prefix");

function validateEnvTemplate(fileLabel: string, source: string): void {
  assertEnvValue(fileLabel, source, "SITE_URL", "https://sanliurfa.com");
  assertEnvValue(fileLabel, source, "CORS_ORIGINS", "https://sanliurfa.com");
  assertEnvValue(fileLabel, source, "PORT", "4321");
  assertEnvValue(fileLabel, source, "REDIS_DB", "15");

  if (!/\bREDIS_KEY_PREFIX\s*=\s*sanliurfa:\s*$/m.test(source)) {
    blockers.push(`${fileLabel} must define REDIS_KEY_PREFIX=sanliurfa:`);
  }

  if (/\bPORT\s*=\s*(1111|1112|1113|3000|5433|6000)\b/m.test(source)) {
    blockers.push(`${fileLabel} contains forbidden legacy PORT value`);
  }
  if (/\bREDIS_DB\s*=\s*(?:1[6-9]|[2-9]\d+|-1)\b/m.test(source)) {
    blockers.push(`${fileLabel} contains out-of-range REDIS_DB`);
  }

  if (/\bSITE_URL\s*=\s*https?:\/\/(www\.)?sanliurfa\.com(\/)?\b/m.test(source)) {
    const rawMatch = source.match(/\bSITE_URL\s*=\s*([^\r\n]+)/m);
    const value = rawMatch?.[1]?.trim();
    if (value !== "https://sanliurfa.com") {
      blockers.push(`${fileLabel} SITE_URL must be exactly https://sanliurfa.com`);
    }
  }
}

function assertEnvValue(fileLabel: string, source: string, key: string, expectedValue: string): void {
  const match = source.match(new RegExp(`\\b${key}\\s*=\\s*([^\\r\\n]+)`, "m"));
  if (!match) {
    blockers.push(`${fileLabel} is missing ${key}`);
    return;
  }

  const actual = match[1].trim();
  if (actual !== expectedValue) {
    blockers.push(`${fileLabel} ${key} must be ${expectedValue} (found: ${actual})`);
  }
}

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}
