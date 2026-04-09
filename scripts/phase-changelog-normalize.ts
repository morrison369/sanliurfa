import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface ParsedChangelogLine {
  date: string;
  type: 'phase' | 'chore';
  hash: string;
  subject: string;
}

export function parseChangelogLine(line: string): ParsedChangelogLine | null {
  const sanitized = line.replace(/[\u0000-\u001f\u007f]/g, '');
  const match = sanitized.match(/^- (\d{4}-\d{2}-\d{2}) \| (phase|chore) \| (.+?) \| (.+)$/);
  if (!match) {
    return null;
  }

  const [, date, type, rawHash, subject] = match;
  const hash = (rawHash.match(/[0-9a-f]{7,40}/i) ?? [])[0];
  if (!hash) {
    return null;
  }

  return {
    date,
    type: type as 'phase' | 'chore',
    hash: hash.toLowerCase(),
    subject: subject.trim()
  };
}

export function formatChangelogLine(entry: ParsedChangelogLine): string {
  return `- ${entry.date} | ${entry.type} | \`${entry.hash}\` | ${entry.subject}`;
}

export function normalizeChangelog(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const lastPhaseBySubject = new Map<string, ParsedChangelogLine>();
  const phasePlaceholderPrefix = '__PHASE__';
  const rewritten = lines.map((line) => {
    if (
      /^\s*-\s+\d{4}-\d{2}-\d{2}\s+\|\s+phase\s+\|\s+\$[A-Za-z_][A-Za-z0-9_]*\s+\|\s+Phase \d+-\d+:/.test(
        line.replace(/[\u0000-\u001f\u007f]/g, '')
      )
    ) {
      return '';
    }

    const parsed = parseChangelogLine(line);
    if (!parsed) {
      return line;
    }

    if (parsed.type === 'phase' && /^Phase \d+-\d+:/.test(parsed.subject)) {
      lastPhaseBySubject.set(parsed.subject, parsed);
      return `${phasePlaceholderPrefix}${parsed.subject}`;
    }

    return formatChangelogLine(parsed);
  });

  const normalizedLines = rewritten
    .filter((line, index, all) => {
      if (!line.startsWith(phasePlaceholderPrefix)) {
        return true;
      }

      return index === all.lastIndexOf(line);
    })
    .map((line) => {
      if (!line.startsWith(phasePlaceholderPrefix)) {
        return line;
      }

      const subject = line.slice(phasePlaceholderPrefix.length);
      const parsed = lastPhaseBySubject.get(subject);
      return parsed ? formatChangelogLine(parsed) : '';
    })
    .filter((line, index, all) => {
      if (!line) return false;
      if (line.startsWith('- ') && line.includes(' | chore | ')) {
        return all.indexOf(line) === index;
      }
      return true;
    });

  const joined = normalizedLines.join('\n').replace(/\n{3,}/g, '\n\n');
  return joined.endsWith('\n') ? joined : `${joined}\n`;
}

export function main(): void {
  const targetPath = resolve(process.cwd(), process.argv[2] ?? 'PHASE_CHANGELOG.md');
  if (!existsSync(targetPath)) {
    throw new Error(`Changelog file not found: ${targetPath}`);
  }

  const existing = readFileSync(targetPath, 'utf8');
  const normalized = normalizeChangelog(existing);
  if (normalized !== existing) {
    writeFileSync(targetPath, normalized, 'utf8');
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
