import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const scanRoots = [join(root, "src"), join(root, "scripts")];
const allowedExtensions = new Set([".ts", ".tsx", ".astro", ".js", ".mjs"]);

const forbiddenPatterns: Array<{ name: string; regex: RegExp }> = [
  {
    name: "dynamic bracket access",
    regex: /import\.meta\.env\s*\[/,
  },
  {
    name: "Object.keys over import.meta.env",
    regex: /Object\.keys\(\s*import\.meta\.env\s*\)/,
  },
  {
    name: "Object.entries over import.meta.env",
    regex: /Object\.entries\(\s*import\.meta\.env\s*\)/,
  },
  {
    name: "for..in over import.meta.env",
    regex:
      /for\s*\(\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s+in\s+import\.meta\.env/,
  },
];

const blockers: string[] = [];

for (const scanRoot of scanRoots) {
  for (const filePath of walkFiles(scanRoot)) {
    const source = readFileSync(filePath, "utf8");
    const lines = source.split(/\r?\n/);

    for (const pattern of forbiddenPatterns) {
      if (!pattern.regex.test(source)) {
        continue;
      }

      for (let i = 0; i < lines.length; i += 1) {
        if (pattern.regex.test(lines[i])) {
          blockers.push(
            `${relative(root, filePath)}:${i + 1} forbidden import.meta.env usage (${pattern.name})`,
          );
        }
      }
    }
  }
}

if (blockers.length > 0) {
  console.error("[env-access] BLOCKED");
  for (const blocker of blockers.slice(0, 30)) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log(
  "[env-access] ok: import.meta.env dynamic access patterns are not used",
);

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

function hasAllowedExtension(filePath: string): boolean {
  return [...allowedExtensions].some((ext) => filePath.endsWith(ext));
}
