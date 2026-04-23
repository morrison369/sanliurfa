import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const blockers: string[] = [];

const advancedRateLimitSource = read("src/lib/advanced-rate-limit.ts");

assertContains(
  advancedRateLimitSource,
  "const key = prefixKey(`${this.config.keyPrefix}${identifier}`);",
  "advanced-rate-limit must prefix Redis keys with prefixKey(...)",
);
assertContains(
  advancedRateLimitSource,
  "if (!redis) {\n      return this.applyInMemoryFallback(identifier);\n    }",
  "advanced-rate-limit must apply in-memory fallback when Redis is unavailable",
);
assertContains(
  advancedRateLimitSource,
  "private applyInMemoryFallback(identifier: string): RateLimitResult",
  "advanced-rate-limit must define in-memory fallback for resilience",
);
assertContains(
  advancedRateLimitSource,
  "private cleanupFallbackWindowMap(nowMs: number): void",
  "sliding-window fallback cleanup must exist to bound memory usage",
);
assertContains(
  advancedRateLimitSource,
  "private cleanupFallbackBucketMap(nowSeconds: number): void",
  "token-bucket fallback cleanup must exist to bound memory usage",
);

if (blockers.length > 0) {
  console.error("[rate-limit-resilience] BLOCKED");
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log("[rate-limit-resilience] ok: advanced rate limiter resilience guards are locked");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function assertContains(source: string, token: string, message: string): void {
  if (!source.includes(token)) {
    blockers.push(message);
  }
}
