import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = 'src/migrations';
const TRACKER_FILE = join(MIGRATIONS_DIR, 'migration-tracker.json');

function main(): void {
  const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((name) => /^\d{3}_.+\.ts$/.test(name));
  const numericVersions = migrationFiles
    .map((name) => Number.parseInt(name.slice(0, 3), 10))
    .filter((value) => Number.isFinite(value));

  const uniqueVersions = new Set<number>();
  for (const version of numericVersions) {
    if (uniqueVersions.has(version)) {
      console.error(`db-drift-check: duplicate migration version detected: ${version}`);
      process.exit(1);
    }
    uniqueVersions.add(version);
  }

  if (!existsSync(TRACKER_FILE)) {
    console.error('db-drift-check: migration-tracker.json missing');
    process.exit(1);
  }

  const tracker = JSON.parse(readFileSync(TRACKER_FILE, 'utf8')) as {
    migrations?: Array<{ file?: string }>;
  };

  const pendingEntries = tracker.migrations ?? [];
  for (const entry of pendingEntries) {
    if (!entry.file) {
      console.error('db-drift-check: migration tracker entry has no file field');
      process.exit(1);
    }
    const candidate = join(MIGRATIONS_DIR, entry.file);
    if (!existsSync(candidate)) {
      console.error(`db-drift-check: tracker references missing file: ${entry.file}`);
      process.exit(1);
    }
  }

  console.log(
    `db-drift-check: OK (versioned_ts=${migrationFiles.length}, tracker_entries=${pendingEntries.length})`
  );
}

main();
