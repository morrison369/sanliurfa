import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const blockers: string[] = [];

const coreRuntimeFiles = [
  "src/lib/auth.ts",
  "src/lib/cache.ts",
  "src/middleware.ts",
];

for (const relativePath of coreRuntimeFiles) {
  const source = read(relativePath);
  const matches = source.match(/\bconsole\.(log|warn|error|info|debug)\s*\(/g);
  if (matches && matches.length > 0) {
    blockers.push(`${relativePath} contains raw console logging`);
  }

  if (!source.includes("logger.")) {
    blockers.push(`${relativePath} must use structured logger`);
  }
}

if (blockers.length > 0) {
  console.error("[runtime-logging] BLOCKED");
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log("[runtime-logging] ok: core runtime modules use structured logger only");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}
