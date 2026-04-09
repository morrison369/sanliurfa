import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadPhaseBlockConfig, writeGeneratedPhaseFiles } from './phase-block-generator';

export interface PhaseBlockWriterArgs {
  configPath?: string;
}

export function parsePhaseBlockWriterArgs(argv: string[]): PhaseBlockWriterArgs {
  return {
    configPath: argv.find((value) => !value.startsWith('--'))
  };
}

export function main(): void {
  const parsed = parsePhaseBlockWriterArgs(process.argv.slice(2));
  if (!parsed.configPath) {
    throw new Error('Usage: tsx scripts/phase-block-writer.ts <config.json>');
  }

  const config = loadPhaseBlockConfig(parsed.configPath);
  writeGeneratedPhaseFiles(process.cwd(), config);
  process.stdout.write(`Wrote phase block files for ${config.start}-${config.end}.\n`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
