import { execSync } from 'node:child_process';

function run(command: string): string {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function main(): void {
  const status = run('git status --porcelain');
  const lines = status.split('\n').filter(Boolean);

  const deletedCritical = lines.filter((line) => {
    const path = line.slice(3);
    return line.startsWith(' D') && path.startsWith('src/pages/api/');
  });

  if (deletedCritical.length > 0) {
    console.error('repo-stabilization-check: FAIL');
    console.error('Critical API deletions detected:');
    for (const line of deletedCritical) {
      console.error(`- ${line.slice(3)}`);
    }
    process.exit(1);
  }

  const mixedLargeBatch = lines.length > 120;
  if (mixedLargeBatch) {
    console.warn(
      `repo-stabilization-check: WARN (${lines.length} file changes). Commit by domain recommended.`
    );
  } else {
    console.log('repo-stabilization-check: OK');
  }
}

main();
