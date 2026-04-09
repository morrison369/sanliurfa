import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeChangelog, parseChangelogLine } from './phase-changelog-normalize';

export interface DoctorIssue {
  level: 'warn' | 'fail';
  message: string;
}

function readText(root: string, relativePath: string): string {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

export function findDoctorIssues(root: string = process.cwd()): DoctorIssue[] {
  const issues: DoctorIssue[] = [];

  if (!existsSync(resolve(root, 'PHASE_OPERATIONS_GUIDE.md'))) {
    issues.push({ level: 'fail', message: 'Missing PHASE_OPERATIONS_GUIDE.md in repo root.' });
  }

  if (!existsSync(resolve(root, 'docs/WORKTREE_SOURCE_OF_TRUTH.md'))) {
    issues.push({ level: 'fail', message: 'Missing docs/WORKTREE_SOURCE_OF_TRUTH.md.' });
  }

  if (existsSync(resolve(root, 'README.md'))) {
    const readme = readText(root, 'README.md');
    if (!readme.includes('Clean Worktree Politikası')) {
      issues.push({ level: 'warn', message: 'README.md is missing the clean worktree policy section.' });
    }
  }

  if (existsSync(resolve(root, 'PHASE_CHANGELOG.md'))) {
    const changelog = readText(root, 'PHASE_CHANGELOG.md');
    if (normalizeChangelog(changelog) !== changelog) {
      issues.push({ level: 'warn', message: 'PHASE_CHANGELOG.md is not normalized. Run npm run phase:changelog:normalize.' });
    }

    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const line of changelog.replace(/\r\n/g, '\n').split('\n')) {
      const parsed = parseChangelogLine(line);
      if (!parsed || parsed.type !== 'phase' || !/^Phase \d+-\d+:/.test(parsed.subject)) {
        continue;
      }

      if (seen.has(parsed.subject)) {
        duplicates.add(parsed.subject);
      }
      seen.add(parsed.subject);
    }

    if (duplicates.size > 0) {
      issues.push({
        level: 'warn',
        message: `Duplicate phase changelog subjects detected: ${Array.from(duplicates).join('; ')}`
      });
    }
  }

  return issues;
}

export function main(): void {
  const issues = findDoctorIssues();
  if (issues.length === 0) {
    process.stdout.write('phase-doctor: OK\n');
    return;
  }

  for (const issue of issues) {
    process.stdout.write(`${issue.level.toUpperCase()}: ${issue.message}\n`);
  }

  if (issues.some((issue) => issue.level === 'fail')) {
    process.exit(1);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
