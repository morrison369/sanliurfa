import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface PhaseTsConfig {
  extends: string;
  include: string[];
  files: string[];
}

export function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/');
}

export function buildVersionedEntries(libPath: string): string[] {
  return readdirSync(libPath)
    .filter((name) => name.endsWith('.ts') && /-v\d+\.ts$/.test(name))
    .map((name) => toPosixPath(`src/lib/${name}`))
    .sort((a, b) => {
      const aVer = Number((a.match(/-v(\d+)\.ts$/) ?? [])[1] ?? 0);
      const bVer = Number((b.match(/-v(\d+)\.ts$/) ?? [])[1] ?? 0);
      if (aVer !== bVer) return aVer - bVer;
      return a.localeCompare(b);
    });
}

export function buildExpectedFiles(existingFiles: string[], versionedEntries: string[]): string[] {
  const fixedEntries = existingFiles.filter((entry) => !entry.match(/-v\d+\.ts$/));
  return [...fixedEntries, ...versionedEntries];
}

export function main(): void {
  const root = process.cwd();
  const tsconfigPath = resolve(root, 'tsconfig.phase.json');
  const libPath = resolve(root, 'src/lib');
  const checkOnly = process.argv.includes('--check');
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8')) as PhaseTsConfig;

  const currentFiles = tsconfig.files ?? [];
  const versionedEntries = buildVersionedEntries(libPath);
  const expectedFiles = buildExpectedFiles(currentFiles, versionedEntries);
  const currentSerialized = JSON.stringify(currentFiles);
  const expectedSerialized = JSON.stringify(expectedFiles);
  const isDrifted = currentSerialized !== expectedSerialized;

  if (checkOnly) {
    if (isDrifted) {
      process.stderr.write('tsconfig.phase.json is out of sync. Run: npm run phase:sync:tsconfig\n');
      process.exit(1);
    }
    process.stdout.write(`tsconfig.phase.json is in sync (${currentFiles.length} files).\n`);
    return;
  }

  tsconfig.files = expectedFiles;
  writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`, 'utf8');
  process.stdout.write(`Updated tsconfig.phase.json with ${expectedFiles.length} files (${versionedEntries.length} versioned modules).\n`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
