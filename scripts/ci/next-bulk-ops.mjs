#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const steps = [
  'npm run public:city:gate',
  'npm run recommendations:apply',
  'npm run ops:agency:all',
  'npm run gate:isolated',
];

function run(cmd) {
  console.log(`[next-bulk] ${cmd}`);
  const result = spawnSync(cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`step failed: ${cmd} (exit=${result.status ?? 'null'})`);
  }
}

let exitCode = 0;
const startedAt = new Date();
const results = [];
try {
  for (const step of steps) {
    const stepStartedAt = new Date();
    try {
      run(step);
      results.push({ step, status: 'ok', startedAt: stepStartedAt.toISOString(), finishedAt: new Date().toISOString() });
    } catch (error) {
      results.push({
        step,
        status: 'failed',
        startedAt: stepStartedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'unknown error',
      });
      throw error;
    }
  }
  console.log('[next-bulk] completed');
} catch (error) {
  exitCode = 1;
  console.error(`[next-bulk] ${error instanceof Error ? error.message : 'unknown error'}`);
} finally {
  for (const cleanupStep of [
    'npm run -s dev:isolated:stop',
    'npm run -s runtime:cleanup:listeners',
    'npm run -s dev:isolated:check-no-orphan',
  ]) {
    try {
      run(cleanupStep);
      results.push({ step: cleanupStep, status: 'ok', cleanup: true, finishedAt: new Date().toISOString() });
    } catch (error) {
      results.push({
        step: cleanupStep,
        status: 'failed',
        cleanup: true,
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'unknown error',
      });
      exitCode = 1;
    }
  }
  const report = {
    generatedAt: new Date().toISOString(),
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    status: exitCode === 0 ? 'ok' : 'failed',
    results,
  };
  const out = path.join(process.cwd(), 'docs', 'ops-last-run.json');
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[next-bulk] report: ${out}`);
}

process.exit(exitCode);
