import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const blockers: string[] = [];

const cacheSource = read("src/lib/cache.ts");
const envSource = read("src/lib/env.ts");
const deploymentSource = read("src/lib/deployment.ts");
const redisClientSource = read("src/lib/redis-client.ts");
const envExample = read(".env.example");
const envProductionTemplate = read(".env.production.template");

assertContains(
  cacheSource,
  "const REDIS_DB = parseRedisDb(process.env.REDIS_DB, 15);",
  "cache layer must derive REDIS_DB with fallback 15",
);
assertContains(
  cacheSource,
  "const redisUrl = configuredRedisUrl || `redis://127.0.0.1:6379/${REDIS_DB}`;",
  "cache layer default redis URL must include REDIS_DB",
);
assertContains(
  cacheSource,
  "const LEGACY_KEY_PREFIX = 'sanliurfa:';",
  "cache layer must keep sanliurfa key prefix baseline",
);

assertContains(
  envSource,
  "REDIS_DB: number;",
  "env config must expose REDIS_DB",
);
assertContains(
  envSource,
  "const redisDb = parseRedisDb(readProcessEnv('REDIS_DB'), 15);",
  "env layer must parse REDIS_DB with fallback 15",
);
assertContains(
  envSource,
  "const redisUrl = readProcessEnv('REDIS_URL') || `redis://127.0.0.1:6379/${redisDb}`;",
  "env layer default redis URL must include redisDb",
);

assertContains(
  deploymentSource,
  "const REDIS_DB = parseRedisDb(process.env.REDIS_DB, 15);",
  "deployment layer must derive REDIS_DB with fallback 15",
);
assertContains(
  deploymentSource,
  "const DEFAULT_REDIS_URL = `redis://127.0.0.1:6379/${REDIS_DB}`;",
  "deployment layer default redis URL must include REDIS_DB",
);
assertContains(
  deploymentSource,
  "redisUrl: process.env.REDIS_URL || DEFAULT_REDIS_URL,",
  "deployment development redisUrl must use DEFAULT_REDIS_URL fallback",
);
if (/redis:\/\/(?:localhost|127\.0\.0\.1):6379\/0/.test(deploymentSource)) {
  blockers.push("deployment layer contains forbidden redis DB 0 fallback");
}

assertContains(
  redisClientSource,
  "export async function closeRedis(): Promise<void> {",
  "redis-client compatibility wrapper must expose closeRedis",
);
if (/export async function closeRedis[\s\S]*?quit\?\.\(/.test(redisClientSource)) {
  blockers.push("redis-client closeRedis must not quit shared singleton client");
}

assertEnvValue(".env.example", envExample, "REDIS_DB", "15");
assertEnvValue(".env.example", envExample, "REDIS_KEY_PREFIX", "sanliurfa:");
assertEnvValue(".env.production.template", envProductionTemplate, "REDIS_DB", "15");
assertEnvValue(".env.production.template", envProductionTemplate, "REDIS_KEY_PREFIX", "sanliurfa:");

if (blockers.length > 0) {
  console.error("[redis-isolation] BLOCKED");
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log("[redis-isolation] ok: redis DB and key prefix isolation are locked");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function assertContains(source: string, token: string, message: string): void {
  if (!source.includes(token)) {
    blockers.push(message);
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
