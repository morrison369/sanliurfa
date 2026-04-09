import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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
  if (/^Chore:\s+(update|normalize|finalize|refresh)\s+phase changelog\b/i.test(subject)) return null;
  if (/^Chore:/.test(subject)) return 'chore';
  return null;
}

export function buildChangelogLine(date: string, type: 'phase' | 'chore', hash: string, subject: string): string {
  return `- ${date} | ${type} | \`${hash}\` | ${subject}`;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function upsertChangelogEntry(existing: string, line: string, type: 'phase' | 'chore', subject: string): string {
  const normalized = existing.endsWith('\n') ? existing : `${existing}\n`;
  const lines = normalized.split('\n');
  const matcherPattern = '^\\- \\d{4}-\\d{2}-\\d{2} \\| ' + type + ' \\| `[^`]+` \\| ' + escapeRegExp(subject) + '$';
  const matcher = new RegExp(matcherPattern);
  const filtered = lines.filter((existingLine) => existingLine.length === 0 || !matcher.test(existingLine));
  const updated = filtered.join('\n').replace(/\n{3,}/g, '\n\n');
  const finalWithNewline = updated.endsWith('\n') ? updated : `${updated}\n`;
  const entry = `${line}\n`;
  if (finalWithNewline.includes(entry)) {
    return finalWithNewline;
  }

  return `${finalWithNewline}${entry}`;
}

export interface PhaseChangelogOptions {
  outPath: string;
  ref: string;
  date: string;
}

export function parseArgs(argv: string[]): PhaseChangelogOptions {
  const outIndex = argv.indexOf('--out');
  const refIndex = argv.indexOf('--ref');
  const positionalRef = argv.find((arg) => !arg.startsWith('--') && arg !== argv[outIndex + 1] && arg !== argv[refIndex + 1]);
  return {
    outPath: resolve(process.cwd(), outIndex >= 0 ? argv[outIndex + 1] : 'PHASE_CHANGELOG.md'),
    ref: refIndex >= 0 ? argv[refIndex + 1] : positionalRef || 'HEAD',
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
  const updated = upsertChangelogEntry(existing, line, type, commit.subject);

  if (updated !== existing) {
    writeFileSync(options.outPath, updated, 'utf8');
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
