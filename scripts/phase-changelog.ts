import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export interface GitCommitMeta {
  hash: string;
  subject: string;
}

export function runGit(args: string[]): string {
  const result = spawnSync('git', args, { encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  }
  return result.stdout.trim();
}

export function readCommitMeta(ref: string): GitCommitMeta {
  return {
    hash: runGit(['rev-parse', '--short', ref]),
    subject: runGit(['log', '-1', '--pretty=%s', ref])
  };
}

export function classifyCommit(subject: string): 'phase' | 'chore' | null {
  if (/^Phase\s+\d+-\d+:/.test(subject)) return 'phase';
  if (/^Chore:/.test(subject)) return 'chore';
  return null;
}

export function buildChangelogLine(date: string, type: 'phase' | 'chore', hash: string, subject: string): string {
  return `- ${date} | ${type} | \`${hash}\` | ${subject}`;
}

export function appendChangelogEntry(existing: string, line: string): string {
  const normalized = existing.endsWith('\n') ? existing : `${existing}\n`;
  const entry = `${line}\n`;
  if (normalized.includes(entry)) {
    return normalized;
  }

  return `${normalized}${entry}`;
}

export interface PhaseChangelogOptions {
  outPath: string;
  ref: string;
  date: string;
}

export function parseArgs(argv: string[]): PhaseChangelogOptions {
  const outIndex = argv.indexOf('--out');
  const refIndex = argv.indexOf('--ref');
  return {
    outPath: resolve(process.cwd(), outIndex >= 0 ? argv[outIndex + 1] : 'PHASE_CHANGELOG.md'),
    ref: refIndex >= 0 ? argv[refIndex + 1] : 'HEAD',
    date: new Date().toISOString().slice(0, 10)
  };
}

export function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const commit = readCommitMeta(options.ref);
  const type = classifyCommit(commit.subject);

  if (!type) {
    return;
  }

  if (!existsSync(options.outPath)) {
    writeFileSync(options.outPath, '# Phase Changelog\n\n', 'utf8');
  }

  const existing = readFileSync(options.outPath, 'utf8');
  const line = buildChangelogLine(options.date, type, commit.hash, commit.subject);
  const updated = appendChangelogEntry(existing, line);

  if (updated !== existing) {
    appendFileSync(options.outPath, `${line}\n`, 'utf8');
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
