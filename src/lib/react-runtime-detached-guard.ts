import type { ReactSurfaceClassificationReport } from './react-surface-classification';

export interface ReactRuntimeDetachedGuardResult {
  ok: boolean;
  reasons: string[];
}

export function evaluateReactRuntimeDetachedGuard(
  report: ReactSurfaceClassificationReport,
): ReactRuntimeDetachedGuardResult {
  const reasons: string[] = [];

  if (report.serverOnlyCount > 0) {
    reasons.push(`${report.serverOnlyCount} adet server-only .tsx runtime baglantisi bulundu`);
  }

  if (report.migrateCount > 0) {
    reasons.push(`${report.migrateCount} adet migrate-required .tsx runtime baglantisi bulundu`);
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}
