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

const requiredDiscoveryTokens: Record<string, string[]> = {
  "/llms.txt": [
    "https://sanliurfa.com",
    "Şanlıurfa",
    "Dil: Türkçe",
    "Sitemap index",
    "AI Crawler Politikası",
  ],
  "/ai.txt": [
    "Canonical: https://sanliurfa.com",
    "Language: tr-TR",
    "Primary keyword: Şanlıurfa",
    "Primary LLM source: https://sanliurfa.com/llms.txt",
  ],
  "/humans.txt": [
    "Canonical URL: https://sanliurfa.com",
    "Language: Turkish (tr-TR)",
    "Primary keyword: Şanlıurfa",
    "No public social media account is claimed in this file.",
  ],
};

const forbiddenDiscoveryTokens = [
  "@sanliurfa.com.tr",
  "@sanliurfa-com-tr",
  "@sanliurfa_comtr",
  "instagram.com/",
  "tiktok.com/",
  "youtube.com/",
  "twitter.com/",
  "x.com/",
];

const requiredRouteSourceTokens: Record<string, string[]> = {
  "/rss.xml": ["@astrojs/rss"],
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

  if (routeFile && existsSync(routeFile)) {
    const routeSource = readFileSync(routeFile, "utf8");

    for (const requiredToken of requiredRouteSourceTokens[path] || []) {
      if (!routeSource.includes(requiredToken)) {
        blockers.push(
          `${path} route missing required source token: ${requiredToken}`,
        );
      }
    }
  }

  if (existsSync(publicFile)) {
    const source = readFileSync(publicFile, "utf8");

    for (const requiredToken of requiredDiscoveryTokens[path] || []) {
      if (!source.includes(requiredToken)) {
        blockers.push(
          `${path} missing required discovery token: ${requiredToken}`,
        );
      }
    }

    for (const forbiddenToken of forbiddenDiscoveryTokens) {
      if (source.includes(forbiddenToken)) {
        blockers.push(
          `${path} contains forbidden unverified social token: ${forbiddenToken}`,
        );
      }
    }
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
