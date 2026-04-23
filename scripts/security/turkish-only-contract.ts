import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const pagesRoot = join(root, "src", "pages");
const blockers: string[] = [];

const forbiddenSourcePatterns: Array<{ name: string; regex: RegExp }> = [
  { name: "hreflang usage", regex: /hreflang\s*=/i },
  {
    name: "accept-language request header usage",
    regex:
      /headers\.get\(\s*["']accept-language["']\s*\)|["']Accept-Language["']\s*:/i,
  },
  { name: "english route prefix", regex: /\/en(?:\/|["'`?])/ },
  { name: "language route prefix /tr", regex: /\/tr(?:\/|["'`?])/ },
  { name: "html lang en", regex: /<html[^>]+lang=["']en["']/i },
];

const bannedPagePrefixDirs = [join(pagesRoot, "en"), join(pagesRoot, "tr")];

for (const bannedDir of bannedPagePrefixDirs) {
  if (existsPath(bannedDir)) {
    blockers.push(
      `banned language prefix directory exists: ${relative(root, bannedDir)}`,
    );
  }
}

for (const filePath of walkFiles(sourceRoot)) {
  if (!isScannableSource(filePath)) {
    continue;
  }

  const source = readFileSync(filePath, "utf8");
  const lines = source.split(/\r?\n/);

  for (const pattern of forbiddenSourcePatterns) {
    if (!pattern.regex.test(source)) {
      continue;
    }

    for (let i = 0; i < lines.length; i += 1) {
      if (pattern.regex.test(lines[i])) {
        blockers.push(
          `${relative(root, filePath)}:${i + 1} forbidden Turkish-only violation (${pattern.name})`,
        );
      }
    }
  }
}

if (blockers.length > 0) {
  console.error("[turkish-only] BLOCKED");
  for (const blocker of blockers.slice(0, 40)) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log(
  "[turkish-only] ok: Turkish-only routing and SEO contract is locked",
);

function existsPath(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

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
    files.push(fullPath);
  }

  return files;
}

function isScannableSource(filePath: string): boolean {
  return (
    filePath.endsWith(".ts") ||
    filePath.endsWith(".tsx") ||
    filePath.endsWith(".astro") ||
    filePath.endsWith(".js") ||
    filePath.endsWith(".mjs")
  );
}
