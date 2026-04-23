import {
  NOINDEX_SITEMAP_PATHS,
  PUBLIC_STATIC_SITEMAP_ENTRIES,
} from "../../src/lib/sitemap-contract";

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
}

if (blockers.length > 0) {
  console.error("[sitemap-indexability] BLOCKED");
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log("[sitemap-indexability] ok: static sitemap entries are indexable");
