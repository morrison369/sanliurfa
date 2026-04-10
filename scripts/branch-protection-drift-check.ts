import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type CheckSet = {
  requiredChecks: string[];
  protectedBranchPushChecks: string[];
};

function readText(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function parseRequiredChecks(markdown: string): CheckSet {
  const lines = markdown.split(/\r?\n/);
  const checks: CheckSet = {
    requiredChecks: [],
    protectedBranchPushChecks: []
  };
  let activeSection: keyof CheckSet | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^Required checks:?$/i.test(line)) {
      activeSection = 'requiredChecks';
      continue;
    }

    if (/^Protected branch push checks:?$/i.test(line)) {
      activeSection = 'protectedBranchPushChecks';
      continue;
    }

    if (
      activeSection &&
      (/^Recommended advisory checks:?$/i.test(line) ||
        /^Operasyon notları:?$/i.test(line) ||
        /^Operational note:?$/i.test(line))
    ) {
      activeSection = null;
      continue;
    }

    if (activeSection) {
      const bulletMatch = line.match(/^[-*]\s+`?([^`]+?)`?$/);
      if (bulletMatch) {
        checks[activeSection].push(bulletMatch[1].trim());
      }
    }
  }

  return checks;
}

function parseCiJobNames(yaml: string): string[] {
  const lines = yaml.split(/\r?\n/);
  const names: string[] = [];
  let inJobs = false;
  let currentIndent = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!inJobs) {
      if (/^jobs:\s*$/.test(line)) {
        inJobs = true;
      }
      continue;
    }

    const jobMatch = line.match(/^ {2}[A-Za-z0-9_]+:\s*$/);
    if (!jobMatch) {
      continue;
    }

    currentIndent = 2;
    for (let innerIndex = index + 1; innerIndex < lines.length; innerIndex += 1) {
      const innerLine = lines[innerIndex];
      if (!innerLine.trim()) {
        continue;
      }

      const indent = innerLine.match(/^ */)?.[0].length ?? 0;
      if (indent <= currentIndent) {
        break;
      }

      const nameMatch = innerLine.match(/^ {4}name:\s+(.+)\s*$/);
      if (nameMatch) {
        names.push(nameMatch[1].trim());
        break;
      }
    }
  }

  return names;
}

function assertSameList(label: string, actual: string[], expected: string[]): void {
  const normalizedActual = [...actual].sort();
  const normalizedExpected = [...expected].sort();

  if (normalizedActual.length !== normalizedExpected.length) {
    throw new Error(
      `${label}: count drift detected (actual=${normalizedActual.length}, expected=${normalizedExpected.length})`
    );
  }

  for (let index = 0; index < normalizedExpected.length; index += 1) {
    if (normalizedActual[index] !== normalizedExpected[index]) {
      throw new Error(
        `${label}: mismatch detected (actual=${normalizedActual.join(', ')}, expected=${normalizedExpected.join(', ')})`
      );
    }
  }
}

function main(): void {
  const ciWorkflow = readText('.github/workflows/ci.yml');
  const branchProtectionDoc = readText('docs/BRANCH_PROTECTION.md');
  const opsBranchProtectionDoc = readText('docs/ops/BRANCH_PROTECTION.md');

  const ciJobNames = parseCiJobNames(ciWorkflow);
  const branchProtectionChecks = parseRequiredChecks(branchProtectionDoc);
  const opsBranchProtectionChecks = parseRequiredChecks(opsBranchProtectionDoc);

  assertSameList(
    'docs/BRANCH_PROTECTION.md required checks',
    branchProtectionChecks.requiredChecks,
    opsBranchProtectionChecks.requiredChecks
  );
  assertSameList(
    'docs/BRANCH_PROTECTION.md protected branch push checks',
    branchProtectionChecks.protectedBranchPushChecks,
    opsBranchProtectionChecks.protectedBranchPushChecks
  );

  const missingRequiredInCi = branchProtectionChecks.requiredChecks.filter((check) => !ciJobNames.includes(check));
  if (missingRequiredInCi.length > 0) {
    throw new Error(`branch-protection-drift: required checks missing in ci.yml (${missingRequiredInCi.join(', ')})`);
  }

  const missingPushChecksInCi = branchProtectionChecks.protectedBranchPushChecks.filter(
    (check) => !ciJobNames.includes(check)
  );
  if (missingPushChecksInCi.length > 0) {
    throw new Error(
      `branch-protection-drift: protected branch push checks missing in ci.yml (${missingPushChecksInCi.join(', ')})`
    );
  }

  console.log(
    `branch-protection-drift: OK (required=${branchProtectionChecks.requiredChecks.join(', ')}; push=${branchProtectionChecks.protectedBranchPushChecks.join(', ')}; ci_jobs=${ciJobNames.join(', ')})`
  );
}

main();
