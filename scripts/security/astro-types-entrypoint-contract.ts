import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const blockers: string[] = [];

const envDtsPath = join(root, "src/env.d.ts");
if (!existsSync(envDtsPath)) {
  blockers.push("missing src/env.d.ts");
} else {
  const envDtsSource = readFileSync(envDtsPath, "utf8");
  if (!envDtsSource.includes("/// <reference types=\"astro/client\" />")) {
    blockers.push("src/env.d.ts must include /// <reference types=\"astro/client\" />");
  }
}

const tsconfigSource = readFileSync(join(root, "tsconfig.json"), "utf8");
if (!tsconfigSource.includes("\"extends\": \"astro/tsconfigs/strict\"")) {
  blockers.push("tsconfig.json must extend astro/tsconfigs/strict");
}

if (blockers.length > 0) {
  console.error("[astro-types-entrypoint] BLOCKED");
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log("[astro-types-entrypoint] ok: Astro type entrypoint is locked");
