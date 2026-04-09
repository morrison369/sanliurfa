import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface NextPhaseScope {
  phase: number;
  title: string;
}

export interface MemorySyncConfig {
  currentPhase: string;
  lastCompleted: string;
  completedTitle: string;
  optionalKickoff: string;
  nextScopes: NextPhaseScope[];
  checkpoint: string;
}

export function buildClosedTaskBlock(taskId: string, rangeLabel: string, testFile: string, docFile: string): string {
  return `- \`${taskId}\` Phase ${rangeLabel} planning — closed\n  - completed with standard phase template (6 libs, 24 tests, docs, exports, gate green)\n  - tests: \`${testFile}\`\n  - docs: \`${docFile}\``;
}

export function normalizeTrackerOpenHeaders(tracker: string): string {
  const marker = '## Open';
  const positions: number[] = [];
  let offset = tracker.indexOf(marker);
  while (offset !== -1) {
    positions.push(offset);
    offset = tracker.indexOf(marker, offset + marker.length);
  }

  if (positions.length <= 1) {
    return tracker;
  }

  let updated = tracker;
  for (let index = positions.length - 2; index >= 0; index -= 1) {
    updated = `${updated.slice(0, positions[index])}${updated.slice(positions[index] + marker.length + 1)}`;
  }

  return updated.replace(/\n{3,}/g, '\n\n').trimEnd();
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
  const replaced = tracker.replace(openBlock, `${closed}\n\n${nextOpen}`);
  return normalizeTrackerOpenHeaders(replaced);
}

export function appendCompletedPhase(memory: string, completedTitle: string): string {
  const completedLine = `- \`${completedTitle}\`: complete`;
  if (memory.includes(completedLine)) {
    return memory;
  }

  return memory.replace('## Open Tasks', `${completedLine}\n\n## Open Tasks`);
}

export function replaceCurrentPhaseWindow(memory: string, currentPhase: string): string {
  return memory.replace(/- Active window: `Phase .*` \(planned\)/, `- Active window: \`${currentPhase}\` (planned)`);
}

export function replaceLastCompletedPhase(memory: string, lastCompleted: string): string {
  return memory.replace(/- Last completed: `Phase .*`/, `- Last completed: \`${lastCompleted}\``);
}

export function replaceOptionalKickoff(memory: string, optionalKickoff: string): string {
  const kickoffLine = `- Optional: ${optionalKickoff}.`;
  if (memory.includes(kickoffLine)) {
    return memory;
  }

  if (/- Optional: Phase .* scope definition and kickoff\./.test(memory)) {
    return memory.replace(/- Optional: Phase .* scope definition and kickoff\./, kickoffLine);
  }

  return memory.replace('## Open Tasks', `## Open Tasks\n${kickoffLine}`);
}

export function replaceNextPhaseScope(memory: string, nextScopes: NextPhaseScope[]): string {
  const rendered = nextScopes.map((item) => `- \`Phase ${item.phase}\`: ${item.title}`).join('\n');
  return memory.replace(/## Next 6 Phases \(Planned Scope\)[\s\S]*?## Checkpoint Rule/, `## Next 6 Phases (Planned Scope)\n${rendered}\n\n## Checkpoint Rule`);
}

export function formatCheckpointLine(checkpoint: string): string {
  const trimmed = checkpoint.trim();
  const match = trimmed.match(/^Checkpoint\s+(\d+-\d+):\s*(.+)$/);
  if (!match) {
    return `- \`${trimmed}\``;
  }

  const [, range, message] = match;
  return `- \`Checkpoint ${range}\`: ${message}`;
}

export function appendCheckpoint(memory: string, checkpoint: string): string {
  const checkpointLine = formatCheckpointLine(checkpoint);
  if (memory.includes(checkpointLine)) {
    return memory;
  }

  return memory.replace('## Blockers', `${checkpointLine}\n\n## Blockers`);
}

export function normalizeMemoryFormatting(memory: string): string {
  return memory
    .replace(/\n{3,}/g, '\n\n')
    .replace(/- \`Checkpoint (\d+-\d+):([^`]+)\`/g, (_whole, range, message) => `- \`Checkpoint ${range}\`:${message}`)
    .trimEnd();
}

export function syncMemory(memory: string, config: MemorySyncConfig): string {
  let updated = replaceCurrentPhaseWindow(memory, config.currentPhase);
  updated = replaceLastCompletedPhase(updated, config.lastCompleted);
  updated = appendCompletedPhase(updated, config.completedTitle);
  updated = replaceOptionalKickoff(updated, config.optionalKickoff);
  updated = replaceNextPhaseScope(updated, config.nextScopes);
  updated = appendCheckpoint(updated, config.checkpoint);
  return normalizeMemoryFormatting(updated);
}

export function main(): void {
  const [mode, targetPath, ...args] = process.argv.slice(2);

  if (!mode || !targetPath) {
    process.stdout.write('Usage:\n');
    process.stdout.write('  tsx scripts/phase-status-sync.ts task <trackerPath> <currentTaskId> <currentRange> <nextTaskId> <nextRange> <testFile> <docFile>\n');
    process.stdout.write('  tsx scripts/phase-status-sync.ts scope <memoryPath> <phase:title;phase:title;...>\n');
    process.stdout.write('  tsx scripts/phase-status-sync.ts memory <memoryPath> <currentPhase> <lastCompleted> <completedTitle> <optionalKickoff> <phase:title;phase:title;...> <checkpoint>\n');
    return;
  }

  const resolvedPath = resolve(targetPath);
  const source = readFileSync(resolvedPath, 'utf8');

  if (mode === 'task') {
    const [currentTaskId, currentRange, nextTaskId, nextRange, testFile, docFile] = args;
    const updated = replaceOpenTask(source, currentTaskId, currentRange, nextTaskId, nextRange, testFile, docFile);
    writeFileSync(resolvedPath, `${updated}\n`, 'utf8');
    return;
  }

  if (mode === 'scope') {
    const [serializedScopes = ''] = args;
    const scopes = serializedScopes.split(';').filter(Boolean).map((item) => {
      const [phase, ...titleParts] = item.split(':');
      return { phase: Number(phase), title: titleParts.join(':') };
    });
    const updated = replaceNextPhaseScope(source, scopes);
    writeFileSync(resolvedPath, `${normalizeMemoryFormatting(updated)}\n`, 'utf8');
    return;
  }

  if (mode === 'memory') {
    const [currentPhase, lastCompleted, completedTitle, optionalKickoff, serializedScopes = '', checkpoint] = args;
    const scopes = serializedScopes.split(';').filter(Boolean).map((item) => {
      const [phase, ...titleParts] = item.split(':');
      return { phase: Number(phase), title: titleParts.join(':') };
    });
    const updated = syncMemory(source, {
      currentPhase,
      lastCompleted,
      completedTitle,
      optionalKickoff,
      nextScopes: scopes,
      checkpoint
    });
    writeFileSync(resolvedPath, `${updated}\n`, 'utf8');
    return;
  }

  throw new Error(`Unknown mode: ${mode}`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
