import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export interface ParsedNodeVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface NodeVersionPolicy {
  major: number;
  minMinor: number;
  minPatch: number;
  maxMajorExclusive: number;
}

export const defaultNodePolicy: NodeVersionPolicy = {
  major: 22,
  minMinor: 13,
  minPatch: 0,
  maxMajorExclusive: 23
};

export function parseNodeVersion(version: string): ParsedNodeVersion {
  const match = version.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported Node version format: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

export function isSupportedNodeVersion(version: string, policy: NodeVersionPolicy = defaultNodePolicy): boolean {
  const parsed = parseNodeVersion(version);
  if (parsed.major !== policy.major) {
    return parsed.major > policy.major && parsed.major < policy.maxMajorExclusive;
  }

  if (parsed.minor > policy.minMinor) {
    return true;
  }

  if (parsed.minor < policy.minMinor) {
    return false;
  }

  return parsed.patch >= policy.minPatch;
}

export function buildNodeVersionError(version: string, policy: NodeVersionPolicy = defaultNodePolicy): string {
  return [
    `Node ${version} is outside the supported repo range.`,
    `Expected Node ${policy.major}.${policy.minMinor}.${policy.minPatch}+ and <${policy.maxMajorExclusive}.0.0.`,
    'Run `nvm use 22.13.0` (or equivalent) before phase delivery commands.'
  ].join(' ');
}

export function main(): void {
  const version = process.version;
  if (!isSupportedNodeVersion(version)) {
    throw new Error(buildNodeVersionError(version));
  }

  process.stdout.write(`Node version OK: ${version}\n`);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedFile === currentFile) {
  main();
}
