import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface PhaseCompatEntry {
  scriptName: string;
  command: string;
}

export interface PhaseCompatManifest {
  entries: PhaseCompatEntry[];
}

export function readPhaseCompatManifest(): PhaseCompatManifest {
  const manifestPath = resolve(process.cwd(), 'config', 'phase-compat-manifest.json');
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as PhaseCompatManifest;
}

export function getPhaseCompatMap(): Record<string, string> {
  return Object.fromEntries(readPhaseCompatManifest().entries.map((entry) => [entry.scriptName, entry.command]));
}

export function getPhaseCompatOrder(): string[] {
  return Object.keys(getPhaseCompatMap()).sort((a, b) => {
    const [aStart] = a.replace('test:phase:', '').split('-').map(Number);
    const [bStart] = b.replace('test:phase:', '').split('-').map(Number);
    return aStart - bStart;
  });
}

export function resolvePhaseCompatCommand(scriptName: string): string | null {
  const command = getPhaseCompatMap()[scriptName] ?? null;
  if (!command) {
    return null;
  }

  if (command.startsWith('vitest run ') && !command.includes('--passWithNoTests')) {
    return command.replace('vitest run ', 'vitest run --passWithNoTests ');
  }

  return command;
}
