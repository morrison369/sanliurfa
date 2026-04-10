import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = 'src/migrations';
const TRACKER_FILE = join(MIGRATIONS_DIR, 'migration-tracker.json');
const TRACKER_ALLOWED_STATUSES = new Set(['pending', 'applied', 'rolled_back', 'archived']);

function main(): void {
  const allMigrationFiles = readdirSync(MIGRATIONS_DIR);
  const migrationFiles = allMigrationFiles.filter((name) => /^\d{3}_.+\.ts$/.test(name));
  const nonVersionedFiles = allMigrationFiles
    .filter((name) => !/^\d{3}_.+\.ts$/.test(name))
    .filter((name) => name !== 'migration-tracker.json');
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
    migrations?: Array<{ file?: string; status?: string }>;
  };

  const pendingEntries = tracker.migrations ?? [];
  const trackerFiles = new Set<string>();
  for (const entry of pendingEntries) {
    if (!entry.file) {
      console.error('db-drift-check: migration tracker entry has no file field');
      process.exit(1);
    }
    if (trackerFiles.has(entry.file)) {
      console.error(`db-drift-check: duplicate tracker file entry: ${entry.file}`);
      process.exit(1);
    }
    trackerFiles.add(entry.file);

    if (!entry.status || !TRACKER_ALLOWED_STATUSES.has(entry.status)) {
      console.error(`db-drift-check: tracker entry has invalid status: ${entry.file}`);
      process.exit(1);
    }

    const candidate = join(MIGRATIONS_DIR, entry.file);
    if (!existsSync(candidate)) {
      console.error(`db-drift-check: tracker references missing file: ${entry.file}`);
      process.exit(1);
    }
    if (/^\d{3}_.+\.ts$/.test(entry.file)) {
      console.error(`db-drift-check: tracker must not reference versioned ts migration: ${entry.file}`);
      process.exit(1);
    }
  }

  for (const file of nonVersionedFiles) {
    if (!trackerFiles.has(file)) {
      console.error(`db-drift-check: non-versioned migration file missing from tracker: ${file}`);
      process.exit(1);
    }
  }

  console.log(
    `db-drift-check: OK (versioned_ts=${migrationFiles.length}, tracker_entries=${pendingEntries.length}, non_versioned=${nonVersionedFiles.length})`
  );
}

main();
