import { describe, expect, it } from 'vitest';
import { auditLogger } from '../security-compliance';
import { dependencyScanner, sbomGenerator } from '../supply-chain-security';
import { reportGenerator } from '../vendor-analytics';
import { taxReporting } from '../tax-compliance';

describe('Runtime determinism wave 8', () => {
  it('keeps tax obligations deterministic for the same day and window', () => {
    const obligationsA = taxReporting.listUpcomingObligations(60);
    const obligationsB = taxReporting.listUpcomingObligations(60);

    expect(obligationsA).toEqual(obligationsB);
  });

  it('keeps SBOM hashes deterministic for the same dependency set', () => {
    const { dependencies } = dependencyScanner.scan('package.json');

    const sbomA = sbomGenerator.generateSBOM('sanliurfa', dependencies);
    const sbomB = sbomGenerator.generateSBOM('sanliurfa', dependencies);

    expect(
      sbomA.components.map(component => ({
        name: component.name,
        version: component.version,
        hashes: component.hashes
      }))
    ).toEqual(
      sbomB.components.map(component => ({
        name: component.name,
        version: component.version,
        hashes: component.hashes
      }))
    );
  });

  it('keeps vendor report payload deterministic while using secure ids', () => {
    const reportA = reportGenerator.generateReport('vendor-1', 'sales');
    const reportB = reportGenerator.generateReport('vendor-1', 'sales');

    expect(reportA.data).toEqual(reportB.data);
    expect(reportA.type).toBe(reportB.type);
    expect(reportA.vendorId).toBe(reportB.vendorId);
    expect(reportA.generatedAt).toBeLessThanOrEqual(reportB.generatedAt);
  });

  it('uses secure audit identifiers without Math.random fallbacks', () => {
    const log = auditLogger.logAction('user-1', 'update', 'vendor', 'vendor-1');

    expect(log.id).toMatch(/^AUDIT-/);
    expect(log.id.length).toBeGreaterThan(20);
  });
});
