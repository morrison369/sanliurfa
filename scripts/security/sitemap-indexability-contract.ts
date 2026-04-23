import {
  NOINDEX_SITEMAP_PATHS,
  PUBLIC_STATIC_SITEMAP_ENTRIES,
} from "../../src/lib/sitemap-contract";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const blockers: string[] = [];
const staticPaths = new Set(
  PUBLIC_STATIC_SITEMAP_ENTRIES.map((entry) => entry.loc),
);

for (const path of NOINDEX_SITEMAP_PATHS) {
  if (staticPaths.has(path)) {
    blockers.push(
      `noindex path must not be in static sitemap entries: ${path}`,
    );
  }
}

for (const entry of PUBLIC_STATIC_SITEMAP_ENTRIES) {
  if (!entry.loc.startsWith("/")) {
    blockers.push(`static sitemap path must start with slash: ${entry.loc}`);
  }

  if (entry.loc.includes("?")) {
    blockers.push(
      `static sitemap path must not include query string: ${entry.loc}`,
    );
  }

  const routeFile = resolveStaticRouteFile(entry.loc);
  if (!routeFile) {
    blockers.push(
      `static sitemap path must resolve to Astro page: ${entry.loc}`,
    );
    continue;
  }

  const source = readFileSync(routeFile, "utf8");
  if (hasNoindexMarker(source)) {
    blockers.push(`static sitemap route must not be noindex: ${entry.loc}`);
  }
}

if (blockers.length > 0) {
  console.error("[sitemap-indexability] BLOCKED");
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log("[sitemap-indexability] ok: static sitemap entries are indexable");

function resolveStaticRouteFile(path: string): string | undefined {
  const cleanPath = path === "/" ? "" : path.replace(/^\//, "");
  const candidates =
    cleanPath.length === 0
      ? [join("src", "pages", "index.astro")]
      : [
          join("src", "pages", `${cleanPath}.astro`),
          join("src", "pages", cleanPath, "index.astro"),
        ];

  return candidates.find((candidate) => existsSync(candidate));
}

function hasNoindexMarker(source: string): boolean {
  return [
    /noindex\s*:\s*true/,
    /<Layout[^>]*\snoindex(?:\s|>|=)/,
    /<SEO[^>]*\snoindex(?:\s|>|=)/,
    /<meta\s+name=["']robots["'][^>]*noindex/i,
  ].some((pattern) => pattern.test(source));
}
