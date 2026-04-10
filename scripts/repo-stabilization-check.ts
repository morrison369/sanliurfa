import { execSync } from 'node:child_process';

function run(command: string): string {
  return execSync(command, { encoding: 'utf8' }).trim();
}

function extractPath(line: string): string {
  const raw = line.slice(3).trim();
  const renamed = raw.includes('->') ? raw.split('->').pop() : raw;
  return (renamed || raw).trim();
}

function main(): void {
  const status = run('git status --porcelain');
  const lines = status.split('\n').filter(Boolean);

  const deletedCritical = lines.filter((line) => {
    const path = extractPath(line);
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

  const rootSnapshotNoise = lines.filter((line) => {
    const path = extractPath(line);
    if (path.includes('/') || path.includes('\\')) {
      return false;
    }

    const upper = path.toUpperCase();
    return /^PHASE_[^_]+_.+\.(MD|TXT)$/.test(upper) || /^SESSION_.+\.(MD|TXT)$/.test(upper);
  });

  if (rootSnapshotNoise.length > 0) {
    console.error('repo-stabilization-check: FAIL');
    console.error('Root-level snapshot/report noise detected. Move these files to docs/archive/phases or docs/ops:');
    for (const line of rootSnapshotNoise) {
      console.error(`- ${extractPath(line)}`);
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
