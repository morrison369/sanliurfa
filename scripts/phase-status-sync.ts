import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface NextPhaseScope {
  phase: number;
  title: string;
}

export function buildClosedTaskBlock(taskId: string, rangeLabel: string, testFile: string, docFile: string): string {
  return `- \`${taskId}\` Phase ${rangeLabel} planning — closed\n  - completed with standard phase template (6 libs, 24 tests, docs, exports, gate green)\n  - tests: \`${testFile}\`\n  - docs: \`${docFile}\``;
}

export function replaceOpenTask(
  tracker: string,
  currentTaskId: string,
  currentRangeLabel: string,
  nextTaskId: string,
  nextRangeLabel: string,
  testFile: string,
  docFile: string
): string {
  const openBlock = [
    `- \`${currentTaskId}\` Phase ${currentRangeLabel} planning`,
    '  - Scope: define architecture, contracts, and acceptance gates for next 6-phase block.',
    '  - Owner: engineering',
    '  - Status: ready'
  ].join('\n');
  const closed = buildClosedTaskBlock(currentTaskId, currentRangeLabel, testFile, docFile);
  const nextOpen = `## Open\n- \`${nextTaskId}\` Phase ${nextRangeLabel} planning\n  - Scope: define architecture, contracts, and acceptance gates for next 6-phase block.\n  - Owner: engineering\n  - Status: ready`;
  return tracker.replace(openBlock, `${closed}\n\n${nextOpen}`);
}

export function appendCompletedPhase(memory: string, completedTitle: string): string {
  return memory.replace('## Open Tasks', `- \`${completedTitle}\`: complete\n\n## Open Tasks`);
}

export function replaceNextPhaseScope(memory: string, nextScopes: NextPhaseScope[]): string {
  const rendered = nextScopes.map((item) => `- \`Phase ${item.phase}\`: ${item.title}`).join('\n');
  return memory.replace(/## Next 6 Phases \(Planned Scope\)[\s\S]*?## Checkpoint Rule/, `## Next 6 Phases (Planned Scope)\n${rendered}\n\n## Checkpoint Rule`);
}

export function main(): void {
  const [mode, targetPath, ...args] = process.argv.slice(2);

  if (!mode || !targetPath) {
    process.stdout.write('Usage:\n');
    process.stdout.write('  tsx scripts/phase-status-sync.ts task <trackerPath> <currentTaskId> <currentRange> <nextTaskId> <nextRange> <testFile> <docFile>\n');
    process.stdout.write('  tsx scripts/phase-status-sync.ts scope <memoryPath> <phase:title;phase:title;...>\n');
    return;
  }

  const resolvedPath = resolve(targetPath);
  const source = readFileSync(resolvedPath, 'utf8');

  if (mode === 'task') {
    const [currentTaskId, currentRange, nextTaskId, nextRange, testFile, docFile] = args;
    const updated = replaceOpenTask(source, currentTaskId, currentRange, nextTaskId, nextRange, testFile, docFile);
    writeFileSync(resolvedPath, updated, 'utf8');
    return;
  }

  if (mode === 'scope') {
    const [serializedScopes = ''] = args;
    const scopes = serializedScopes.split(';').filter(Boolean).map((item) => {
      const [phase, ...titleParts] = item.split(':');
      return { phase: Number(phase), title: titleParts.join(':') };
    });
    const updated = replaceNextPhaseScope(source, scopes);
    writeFileSync(resolvedPath, updated, 'utf8');
    return;
  }

  throw new Error(`Unknown mode: ${mode}`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
