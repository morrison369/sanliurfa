import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface PhaseTsConfig {
  extends: string;
  include: string[];
  files: string[];
}

function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}

function main(): void {
  const root = process.cwd();
  const tsconfigPath = resolve(root, 'tsconfig.phase.json');
  const libPath = resolve(root, 'src/lib');
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8')) as PhaseTsConfig;

  const fixedEntries = (tsconfig.files ?? []).filter((entry) => !entry.match(/-v\d+\.ts$/));
  const vEntries = readdirSync(libPath)
    .filter((name) => name.endsWith('.ts') && /-v\d+\.ts$/.test(name))
    .map((name) => toPosixPath(`src/lib/${name}`))
    .sort((a, b) => {
      const aVer = Number((a.match(/-v(\d+)\.ts$/) ?? [])[1] ?? 0);
      const bVer = Number((b.match(/-v(\d+)\.ts$/) ?? [])[1] ?? 0);
      if (aVer !== bVer) return aVer - bVer;
      return a.localeCompare(b);
    });

  tsconfig.files = [...fixedEntries, ...vEntries];
  writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`, 'utf8');

  process.stdout.write(`Updated tsconfig.phase.json with ${tsconfig.files.length} files (${vEntries.length} versioned modules).\n`);
}

main();
