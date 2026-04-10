import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

type MigrationBudget = {
  max_nonconforming_files: number;
};

const MIGRATION_IMPORT_PATTERN = /import\s+type\s+\{\s*Migration\s*\}\s+from\s+['"]\.\.\/lib\/migrations['"]/;
const MIGRATION_TYPED_EXPORT_PATTERN = /export\s+const\s+\w+\s*:\s*Migration\s*=\s*\{/;

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function main(): void {
  const root = process.cwd();
  const budgetPath = resolve(root, 'config', 'migration-contract-budget.json');
  const migrationsDir = resolve(root, 'src', 'migrations');
  const budget = loadJson<MigrationBudget>(budgetPath);
  const files = readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith('.ts'))
    .map((entry) => join(migrationsDir, entry));

  const nonconforming = files.filter((file) => {
    const content = readFileSync(file, 'utf8');
    return !MIGRATION_IMPORT_PATTERN.test(content) || !MIGRATION_TYPED_EXPORT_PATTERN.test(content);
  });

  if (nonconforming.length > budget.max_nonconforming_files) {
    throw new Error(
      [
        `migration contract budget exceeded (${nonconforming.length}/${budget.max_nonconforming_files})`,
        ...nonconforming.slice(0, 20).map((file) => `- ${relative(root, file)}`),
      ].join('\n')
    );
  }

  console.log(
    `migration-contract-guard: OK (nonconforming=${nonconforming.length}/${budget.max_nonconforming_files})`
  );
}

main();
