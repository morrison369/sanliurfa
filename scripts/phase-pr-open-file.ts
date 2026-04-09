import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOpenArgs, runGh, type PhasePrOpenOptions } from './phase-pr';

export interface PhasePrOpenFileOptions extends PhasePrOpenOptions {
  titleFile: string;
  bodyFile: string;
}

export function parsePhasePrOpenFileArgs(argv: string[]): PhasePrOpenFileOptions {
  const [repo, base, head, titleFile, bodyFile] = argv;
  if (!repo || !base || !head || !titleFile || !bodyFile) {
    throw new Error('Usage: tsx scripts/phase-pr-open-file.ts <repo> <base> <head> <titleFile> <bodyFile>');
  }

  const resolvedTitleFile = resolve(process.cwd(), titleFile);
  const resolvedBodyFile = resolve(process.cwd(), bodyFile);
  return {
    repo,
    base,
    head,
    titleFile: resolvedTitleFile,
    bodyFile: resolvedBodyFile,
    title: readFileSync(resolvedTitleFile, 'utf8').trim(),
    body: readFileSync(resolvedBodyFile, 'utf8')
  };
}

export function main(): void {
  const parsed = parsePhasePrOpenFileArgs(process.argv.slice(2));
  process.stdout.write(`${runGh(buildOpenArgs(parsed))}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
