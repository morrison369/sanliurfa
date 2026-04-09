import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export interface PhasePrOpenOptions {
  repo: string;
  base: string;
  head: string;
  title: string;
  body: string;
}

export interface PhasePrViewOptions {
  repo: string;
  prNumber: number;
}

export interface ParsedPhasePrCommand {
  mode: 'open' | 'view';
  open?: PhasePrOpenOptions;
  view?: PhasePrViewOptions;
}

export function parsePhasePrArgs(argv: string[]): ParsedPhasePrCommand {
  const [mode, ...rest] = argv;
  if (mode !== 'open' && mode !== 'view') {
    throw new Error('Usage: tsx scripts/phase-pr.ts <open|view> ...');
  }

  const readValue = (flag: string): string | undefined => {
    const index = rest.indexOf(flag);
    return index >= 0 ? rest[index + 1] : undefined;
  };

  if (mode === 'open') {
    const bodyFile = readValue('--body-file');
    const body = bodyFile ? readFileSync(resolve(process.cwd(), bodyFile), 'utf8') : readValue('--body') || '';
    const repo = readValue('--repo');
    const base = readValue('--base');
    const head = readValue('--head');
    const title = readValue('--title');

    if (!repo || !base || !head || !title) {
      throw new Error('Usage: tsx scripts/phase-pr.ts open --repo <owner/name> --base <base> --head <head> --title <title> [--body <body> | --body-file <path>]');
    }

    return {
      mode,
      open: { repo, base, head, title, body }
    };
  }

  const repo = readValue('--repo');
  const prRaw = readValue('--pr');
  if (!repo || !prRaw) {
    throw new Error('Usage: tsx scripts/phase-pr.ts view --repo <owner/name> --pr <number>');
  }

  return {
    mode,
    view: {
      repo,
      prNumber: Number(prRaw)
    }
  };
}

export function buildOpenArgs(options: PhasePrOpenOptions): string[] {
  return [
    'api',
    `repos/${options.repo}/pulls`,
    '-f', `title=${options.title}`,
    '-f', `head=${options.head}`,
    '-f', `base=${options.base}`,
    '-f', `body=${options.body}`
  ];
}

export function buildViewArgs(options: PhasePrViewOptions): string[] {
  return ['pr', 'view', String(options.prNumber), '--repo', options.repo, '--json', 'state,mergeCommit,url'];
}

export function runGh(args: string[]): string {
  const result = spawnSync('gh', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `gh ${args.join(' ')} failed`);
  }

  return result.stdout.trim();
}

export function main(): void {
  const parsed = parsePhasePrArgs(process.argv.slice(2));
  if (parsed.mode === 'open' && parsed.open) {
    process.stdout.write(`${runGh(buildOpenArgs(parsed.open))}\n`);
    return;
  }

  if (parsed.mode === 'view' && parsed.view) {
    process.stdout.write(`${runGh(buildViewArgs(parsed.view))}\n`);
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
