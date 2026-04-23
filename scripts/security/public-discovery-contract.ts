import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PUBLIC_DISCOVERY_PATHS,
  buildRobotsTxt,
} from "../../src/lib/public-discovery";

const blockers: string[] = [];
const root = process.cwd();

const routeFiles: Record<string, string> = {
  "/rss.xml": "src/pages/rss.xml.ts",
  "/robots.txt": "src/pages/robots.txt.ts",
  "/sitemap.xml": "src/pages/sitemap.xml.ts",
  "/sitemap-index.xml": "src/pages/sitemap-index.xml.ts",
  "/blog/sitemap.xml": "src/pages/blog/sitemap.xml.ts",
};

const normalizeText = (value: string) => value.replace(/\r\n/g, "\n").trim();
const pathToPublicFile = (path: string) =>
  join(root, "public", path.replace(/^\//, ""));

for (const path of PUBLIC_DISCOVERY_PATHS) {
  const publicFile = pathToPublicFile(path);
  const routeFile = routeFiles[path] ? join(root, routeFiles[path]) : null;

  if (!existsSync(publicFile) && (!routeFile || !existsSync(routeFile))) {
    blockers.push(`missing public discovery route or file: ${path}`);
  }
}

const staticRobotsPath = join(root, "public/robots.txt");
const staticRobots = existsSync(staticRobotsPath)
  ? normalizeText(readFileSync(staticRobotsPath, "utf8"))
  : "";
const expectedRobots = normalizeText(buildRobotsTxt("https://sanliurfa.com"));

if (!staticRobots) {
  blockers.push("missing public/robots.txt fallback");
} else if (staticRobots !== expectedRobots) {
  blockers.push(
    "public/robots.txt fallback drifted from buildRobotsTxt('https://sanliurfa.com')",
  );
}

for (const required of [
  "Sitemap: https://sanliurfa.com/sitemap-index.xml",
  "Sitemap: https://sanliurfa.com/sitemap.xml",
  "Sitemap: https://sanliurfa.com/blog/sitemap.xml",
  "User-agent: OAI-SearchBot",
  "User-agent: GPTBot",
  "https://sanliurfa.com/llms.txt",
  "https://sanliurfa.com/ai.txt",
  "https://sanliurfa.com/humans.txt",
]) {
  if (!expectedRobots.includes(required)) {
    blockers.push(`robots contract missing required token: ${required}`);
  }
}

if (blockers.length > 0) {
  console.error("[public-discovery] BLOCKED");
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log(
  "[public-discovery] ok: discovery files and robots fallback are aligned",
);
