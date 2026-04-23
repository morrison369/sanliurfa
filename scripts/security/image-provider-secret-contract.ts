import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const blockers: string[] = [];

const scanRoots = [join(root, "src"), join(root, "scripts"), join(root, "docs")];
const allowedExtensions = new Set([".ts", ".tsx", ".astro", ".md", ".js", ".mjs"]);

const imageProviderSource = readFileSync(
  join(root, "src/lib/image-providers.ts"),
  "utf8",
);

assertContains(
  imageProviderSource,
  "process.env.PEXELS_API_KEY",
  "image provider must read PEXELS key from process.env",
);
assertContains(
  imageProviderSource,
  "process.env.UNSPLASH_ACCESS_KEY",
  "image provider must read Unsplash access key from process.env",
);
assertContains(
  imageProviderSource,
  "Authorization: apiKey",
  "Pexels authorization header must come from env key variable",
);
assertContains(
  imageProviderSource,
  "Authorization: `Client-ID ${accessKey}`",
  "Unsplash authorization header must come from env key variable",
);

const credentialPatterns: Array<{ name: string; regex: RegExp }> = [
  {
    name: "unsplash access key literal assignment",
    regex: /\bUNSPLASH_ACCESS_KEY\b\s*[:=]\s*["'`][A-Za-z0-9_-]{20,}["'`]/g,
  },
  {
    name: "unsplash secret key literal assignment",
    regex: /\bUNSPLASH_SECRET_KEY\b\s*[:=]\s*["'`][A-Za-z0-9_-]{20,}["'`]/g,
  },
  {
    name: "pexels key literal assignment",
    regex: /\bPEXELS_API_KEY\b\s*[:=]\s*["'`][A-Za-z0-9_-]{20,}["'`]/g,
  },
  {
    name: "unsplash client-id bearer literal",
    regex: /Client-ID\s+[A-Za-z0-9_-]{20,}/g,
  },
];

for (const scanRoot of scanRoots) {
  for (const filePath of walkFiles(scanRoot)) {
    const source = readFileSync(filePath, "utf8");
    const rel = relative(root, filePath);

    for (const pattern of credentialPatterns) {
      const matches = [...source.matchAll(pattern.regex)];
      for (const match of matches) {
        const token = match[0];
        if (isAllowedPlaceholder(token)) {
          continue;
        }
        blockers.push(`${rel} contains ${pattern.name}`);
      }
    }
  }
}

if (blockers.length > 0) {
  console.error("[image-provider-secret] BLOCKED");
  for (const blocker of blockers.slice(0, 40)) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log("[image-provider-secret] ok: provider credentials are env-only");

function walkFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    if (entry === "node_modules" || entry === "dist" || entry === ".git") {
      continue;
    }
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (hasAllowedExtension(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function hasAllowedExtension(path: string): boolean {
  return [...allowedExtensions].some((ext) => path.endsWith(ext));
}

function isAllowedPlaceholder(token: string): boolean {
  const normalized = token.toLowerCase();
  return (
    normalized.includes("your_") ||
    normalized.includes("<") ||
    normalized.includes("placeholder") ||
    normalized.includes("change_me")
  );
}

function assertContains(source: string, token: string, message: string): void {
  if (!source.includes(token)) {
    blockers.push(message);
  }
}
