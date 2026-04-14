/**
 * Phase 295: Compliance Drift Capital Calibrator
 */

import { logger } from '../logger';

export interface DriftCapitalInput {
  inputId: string;
  driftLevel: number;
  capitalBuffer: number;
  confidence: number;
}

class DriftCapitalBook {
  private inputs: DriftCapitalInput[] = [];

  add(input: DriftCapitalInput): DriftCapitalInput {
    this.inputs.push(input);
    return input;
  }

  list(): DriftCapitalInput[] {
    return this.inputs;
  }
}

class CapitalCalibrationEngine {
  calibrate(input: DriftCapitalInput): number {
    return Math.round((input.capitalBuffer - input.driftLevel * (1 - input.confidence)) * 10) / 10;
  }
}

class CalibrationRiskGuard {
  risky(calibratedCapital: number, floor: number): boolean {
    return calibratedCapital < floor;
  }
}

class CalibrationReporter {
  report(inputId: string, calibratedCapital: number): string {
    const text = `Calibration ${inputId}: capital=${calibratedCapital}`;
    logger.debug('Calibration report', { inputId, calibratedCapital });
    return text;
  }
}

export const driftCapitalBook = new DriftCapitalBook();
export const capitalCalibrationEngine = new CapitalCalibrationEngine();
export const calibrationRiskGuard = new CalibrationRiskGuard();
export const calibrationReporter = new CalibrationReporter();

export {
  DriftCapitalBook,
  CapitalCalibrationEngine,
  CalibrationRiskGuard,
  CalibrationReporter
};

