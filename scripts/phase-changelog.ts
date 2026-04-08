import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function runGit(args: string[]): string {
  const result = spawnSync('git', args, { encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  }
  return result.stdout.trim();
}

function main(): void {
  const outPath = resolve(process.cwd(), 'PHASE_CHANGELOG.md');
  const commitHash = runGit(['rev-parse', '--short', 'HEAD']);
  const subject = runGit(['log', '-1', '--pretty=%s']);
  const date = new Date().toISOString().slice(0, 10);
  const isPhase = /^Phase\s+\d+-\d+:/.test(subject);
  const isChore = /^Chore:/.test(subject);

  if (!isPhase && !isChore) {
    return;
  }

  const type = isPhase ? 'phase' : 'chore';

  if (!existsSync(outPath)) {
    writeFileSync(outPath, '# Phase Changelog\n\n', 'utf8');
  }

  const line = `- ${date} | ${type} | \`${commitHash}\` | ${subject}\n`;
  const existing = readFileSync(outPath, 'utf8');
  if (!existing.includes(line)) {
    appendFileSync(outPath, line, 'utf8');
  }
}

main();
