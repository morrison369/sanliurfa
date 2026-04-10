import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const MIGRATION_IMPORT_PATTERN = /import\s+type\s+\{\s*Migration\s*\}\s+from\s+['"]\.\.\/lib\/migrations['"]/;
const MIGRATION_TYPED_EXPORT_PATTERN = /export\s+const\s+\w+\s*:\s*Migration\s*=\s*\{/;

function main(): void {
  const root = process.cwd();
  const migrationsDir = resolve(root, 'src', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith('.ts'))
    .map((entry) => join(migrationsDir, entry));

  const nonconforming = files.filter((file) => {
    const content = readFileSync(file, 'utf8');
    return !MIGRATION_IMPORT_PATTERN.test(content) || !MIGRATION_TYPED_EXPORT_PATTERN.test(content);
  });

  if (nonconforming.length > 0) {
    throw new Error(
      [
        `migration contract drift detected (${nonconforming.length})`,
        ...nonconforming.slice(0, 20).map((file) => `- ${relative(root, file)}`),
      ].join('\n')
    );
  }

  console.log('migration-contract-guard: OK (nonconforming=0)');
}

main();
