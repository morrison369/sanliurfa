import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = 'src/migrations';
const TRACKER_FILE = join(MIGRATIONS_DIR, 'migration-tracker.json');

function main(): void {
  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(`migration-dry-run: missing directory: ${MIGRATIONS_DIR}`);
  }

  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{3}_.+\.ts$/.test(name))
    .sort((a, b) => a.localeCompare(b));

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
  const tracker = JSON.parse(trackerRaw) as { migrations?: Array<{ file?: string }> };
  const trackerMigrations = tracker.migrations ?? [];
  for (const entry of trackerMigrations) {
    if (!entry.file) {
      throw new Error('migration-dry-run: tracker entry missing file');
    }
    const target = join(MIGRATIONS_DIR, entry.file);
    if (!existsSync(target)) {
      throw new Error(`migration-dry-run: tracker references missing file ${entry.file}`);
    }
  }

  const latest = migrationFiles[migrationFiles.length - 1];
  console.log(
    `migration-dry-run: OK (versioned=${migrationFiles.length}, tracker_entries=${trackerMigrations.length}, latest=${latest})`
  );
}

main();
