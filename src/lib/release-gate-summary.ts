import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { logger } from './logging';

export type ReleaseGateStepResult = {
  step: string;
  command: string;
  advisory: boolean;
  status: 'passed' | 'failed';
};

export type ReleaseGateSummary = {
  available: boolean;
  generatedAt: string | null;
  finalStatus: 'passed' | 'failed' | 'missing';
  blockingFailedSteps: string[];
  advisoryFailedSteps: string[];
  failedStepCount: number;
  steps: ReleaseGateStepResult[];
};

const defaultSummary: ReleaseGateSummary = {
  available: false,
  generatedAt: null,
  finalStatus: 'missing',
  blockingFailedSteps: [],
  advisoryFailedSteps: [],
  failedStepCount: 0,
  steps: []
};

export async function getReleaseGateSummary(): Promise<ReleaseGateSummary> {
  const summaryPath = resolve(process.cwd(), 'docs/reports/release-gate-summary.json');

  try {
    const raw = await readFile(summaryPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ReleaseGateSummary>;
    const blockingFailedSteps = Array.isArray(parsed.blockingFailedSteps) ? parsed.blockingFailedSteps : [];
    const advisoryFailedSteps = Array.isArray(parsed.advisoryFailedSteps) ? parsed.advisoryFailedSteps : [];
    const steps = Array.isArray(parsed.steps) ? parsed.steps as ReleaseGateStepResult[] : [];

    return {
      available: true,
      generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : null,
      finalStatus: parsed.finalStatus === 'passed' || parsed.finalStatus === 'failed' ? parsed.finalStatus : 'missing',
      blockingFailedSteps,
      advisoryFailedSteps,
      failedStepCount: blockingFailedSteps.length + advisoryFailedSteps.length,
      steps
    };
  } catch (error) {
    logger.warn('Release gate summary could not be read', {
      error: error instanceof Error ? error.message : String(error)
    });
    return defaultSummary;
  }
}
