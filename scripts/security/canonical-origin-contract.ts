import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const blockers: string[] = [];

const middlewareSource = readSource("src/middleware.ts");
const envSource = readSource("src/lib/env.ts");
const discoverySource = readSource("src/lib/public-discovery.ts");
const siteSource = readSource("src/data/site.ts");

assertContains(
  middlewareSource,
  "const CANONICAL_ORIGIN = 'https://sanliurfa.com';",
  "middleware canonical origin must be https://sanliurfa.com",
);
assertContains(
  middlewareSource,
  "const CANONICAL_HOST = 'sanliurfa.com';",
  "middleware canonical host must be sanliurfa.com",
);
assertContains(
  middlewareSource,
  "origins.add('http://localhost:4321');",
  "middleware must allow localhost:4321 in non-production",
);
assertContains(
  middlewareSource,
  "origins.add('http://127.0.0.1:4321');",
  "middleware must allow 127.0.0.1:4321 in non-production",
);
assertContains(
  middlewareSource,
  "return `${CANONICAL_ORIGIN}${url.pathname}${url.search}`;",
  "middleware canonical redirect must preserve path and query",
);
assertNotContains(
  middlewareSource,
  "Access-Control-Allow-Origin': '*'",
  "middleware must not allow wildcard CORS origin",
);

assertContains(
  discoverySource,
  'const CANONICAL_SITE_URL = "https://sanliurfa.com";',
  "public discovery canonical URL must be https://sanliurfa.com",
);
if (
  !/SITE_URL:\s*readProcessEnv\(["']SITE_URL["']\)\s*\|\|\s*import\.meta\.env\.PUBLIC_SITE_URL\s*\|\|\s*["']https:\/\/sanliurfa\.com["']/.test(
    envSource,
  )
) {
  blockers.push("env default SITE_URL must be https://sanliurfa.com");
}
assertContains(
  siteSource,
  'url: "https://sanliurfa.com",',
  "site config canonical URL must be https://sanliurfa.com",
);

if (blockers.length > 0) {
  console.error("[canonical-origin] BLOCKED");
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log(
  "[canonical-origin] ok: canonical origin and host contract is locked",
);

function readSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function assertContains(source: string, token: string, message: string): void {
  if (!source.includes(token)) {
    blockers.push(message);
  }
}

function assertNotContains(
  source: string,
  token: string,
  message: string,
): void {
  if (source.includes(token)) {
    blockers.push(message);
  }
}
