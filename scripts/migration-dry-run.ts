import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = 'src/migrations';
const TRACKER_FILE = join(MIGRATIONS_DIR, 'migration-tracker.json');
const TRACKER_ALLOWED_STATUSES = new Set(['pending', 'applied', 'rolled_back', 'archived']);

function main(): void {
  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(`migration-dry-run: missing directory: ${MIGRATIONS_DIR}`);
  }

  const allMigrationFiles = readdirSync(MIGRATIONS_DIR).sort((a, b) => a.localeCompare(b));
  const migrationFiles = allMigrationFiles
    .filter((name) => /^\d{3}_.+\.ts$/.test(name))
    .sort((a, b) => a.localeCompare(b));
  const nonVersionedFiles = allMigrationFiles
    .filter((name) => !/^\d{3}_.+\.ts$/.test(name))
    .filter((name) => name !== 'migration-tracker.json');

  if (migrationFiles.length === 0) {
    throw new Error('migration-dry-run: no versioned migration files found');
  }

  const versions = migrationFiles.map((name) => Number.parseInt(name.slice(0, 3), 10));
  for (let i = 1; i < versions.length; i += 1) {
    if (versions[i] === versions[i - 1]) {
      throw new Error(`migration-dry-run: duplicate version ${versions[i]}`);
    }
    if (versions[i] < versions[i - 1]) {
      throw new Error(`migration-dry-run: non-monotonic version order at ${versions[i - 1]} -> ${versions[i]}`);
    }
  }

  if (!existsSync(TRACKER_FILE)) {
    throw new Error(`migration-dry-run: missing tracker file: ${TRACKER_FILE}`);
  }

  const trackerRaw = readFileSync(TRACKER_FILE, 'utf8');
  const tracker = JSON.parse(trackerRaw) as { migrations?: Array<{ file?: string; status?: string }> };
  const trackerMigrations = tracker.migrations ?? [];
  const trackerFiles = new Set<string>();
  for (const entry of trackerMigrations) {
    if (!entry.file) {
      throw new Error('migration-dry-run: tracker entry missing file');
    }
    if (trackerFiles.has(entry.file)) {
      throw new Error(`migration-dry-run: duplicate tracker file entry ${entry.file}`);
    }
    trackerFiles.add(entry.file);
    if (!entry.status || !TRACKER_ALLOWED_STATUSES.has(entry.status)) {
      throw new Error(`migration-dry-run: invalid tracker status for ${entry.file}`);
    }
    const target = join(MIGRATIONS_DIR, entry.file);
    if (!existsSync(target)) {
      throw new Error(`migration-dry-run: tracker references missing file ${entry.file}`);
    }
    if (/^\d{3}_.+\.ts$/.test(entry.file)) {
      throw new Error(`migration-dry-run: tracker must not reference versioned ts migration ${entry.file}`);
    }
  }

  for (const file of nonVersionedFiles) {
    if (!trackerFiles.has(file)) {
      throw new Error(`migration-dry-run: non-versioned migration missing from tracker ${file}`);
    }
  }

  const latest = migrationFiles[migrationFiles.length - 1];
  console.log(
    `migration-dry-run: OK (versioned=${migrationFiles.length}, tracker_entries=${trackerMigrations.length}, non_versioned=${nonVersionedFiles.length}, latest=${latest})`
  );
}

main();
