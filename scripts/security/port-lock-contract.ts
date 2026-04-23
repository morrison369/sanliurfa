import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const blockers: string[] = [];

const packageJson = JSON.parse(read("package.json")) as {
  scripts?: Record<string, string>;
};
const astroConfig = read("astro.config.mjs");
const ecosystemConfig = read("ecosystem.config.cjs");
const envSource = read("src/lib/env.ts");

const scripts = packageJson.scripts || {};
const requiredScripts: Record<string, string> = {
  dev: "4321",
  "dev:raw": "4321",
  "dev:wsl": "4321",
  preview: "4321",
  "dev:stop": "4321",
};

for (const [scriptName, requiredPort] of Object.entries(requiredScripts)) {
  const scriptValue = scripts[scriptName];
  if (!scriptValue) {
    blockers.push(`missing required script: ${scriptName}`);
    continue;
  }
  if (!scriptValue.includes(requiredPort)) {
    blockers.push(
      `script must include port ${requiredPort}: ${scriptName}=${scriptValue}`,
    );
  }
}

for (const [scriptName, scriptValue] of Object.entries(scripts)) {
  if (/(--port\s+|:)(1111|1112|1113|3000|6000)\b/.test(scriptValue)) {
    blockers.push(`script contains forbidden legacy port: ${scriptName}`);
  }
  if (/\bPORT=(1111|1112|1113|3000|6000)\b/.test(scriptValue)) {
    blockers.push(`script exports forbidden PORT value: ${scriptName}`);
  }
}

assertContains(
  astroConfig,
  "const appPort = Number(process.env.PORT || 4321);",
  "astro config appPort fallback must be 4321",
);
assertContains(
  astroConfig,
  "port: 4321,",
  "astro vite server/preview must use 4321",
);
assertContains(
  astroConfig,
  "strictPort: true,",
  "astro vite must keep strictPort enabled",
);

assertContains(
  ecosystemConfig,
  "PORT: 4321,",
  "ecosystem config must pin PORT=4321",
);
if (/PORT:\s*(1111|1112|1113|3000|6000)\b/.test(ecosystemConfig)) {
  blockers.push("ecosystem config contains forbidden legacy app PORT");
}

if (
  !/PORT:\s*parseInt\(readProcessEnv\(["']PORT["']\)\s*\|\|\s*["']4321["'],\s*10\)/.test(
    envSource,
  )
) {
  blockers.push("env default port must be 4321");
}

if (blockers.length > 0) {
  console.error("[port-lock] BLOCKED");
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log("[port-lock] ok: 4321 dev/prod port lock is enforced");

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function assertContains(source: string, token: string, message: string): void {
  if (!source.includes(token)) {
    blockers.push(message);
  }
}
