/**
 * Unit Tests — security/security-audit.ts generateAuditReportHTML (pure HTML builder)
 *
 * - HTML template structure (DOCTYPE + head + body + score + checks)
 * - severity color mapping (critical red / high amber / medium orange / low green)
 * - status icon (pass ✓ / fail ✗ / warning ⚠)
 * - remediation conditional render
 *
 * NOT: runSecurityAudit DB+env-bağımlı.
 */

import { describe, it, expect } from 'vitest';
import { generateAuditReportHTML, type SecurityAuditReport } from '../security/security-audit';

const mkReport = (overrides: Partial<SecurityAuditReport> = {}): SecurityAuditReport => ({
  timestamp: '2026-05-05T10:00:00Z',
  totalChecks: 1,
  passedChecks: 1,
  failedChecks: 0,
  warningChecks: 0,
  criticalIssues: 0,
  overallScore: 100,
  results: [
    {
      check: 'Test Check',
      category: 'Test',
      status: 'pass',
      severity: 'low',
      message: 'OK',
    },
  ],
  ...overrides,
});

describe('generateAuditReportHTML', () => {
  it('HTML structure — DOCTYPE + head + body', () => {
    const html = generateAuditReportHTML(mkReport());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</body></html>');
  });

  it('header — title + timestamp + score', () => {
    const html = generateAuditReportHTML(mkReport({ overallScore: 75 }));
    expect(html).toContain('Security Audit Report');
    expect(html).toContain('Score: 75%');
  });

  it('score breakdown — passed/warnings/failed/critical', () => {
    const html = generateAuditReportHTML(
      mkReport({ passedChecks: 5, warningChecks: 2, failedChecks: 1, criticalIssues: 1 })
    );
    expect(html).toContain('Passed: 5');
    expect(html).toContain('Warnings: 2');
    expect(html).toContain('Failed: 1');
    expect(html).toContain('Critical: 1');
  });

  it('status icon mapping — pass → ✓ / fail → ✗ / warning → ⚠', () => {
    const html = generateAuditReportHTML(
      mkReport({
        results: [
          { check: 'A', category: 'C', status: 'pass', severity: 'low', message: 'm' },
          { check: 'B', category: 'C', status: 'fail', severity: 'critical', message: 'm' },
          { check: 'C', category: 'C', status: 'warning', severity: 'medium', message: 'm' },
        ],
      })
    );
    expect(html).toContain('✓');
    expect(html).toContain('✗');
    expect(html).toContain('⚠');
  });

  it('severity color mapping — critical = #dc2626 (red)', () => {
    const html = generateAuditReportHTML(
      mkReport({
        results: [
          { check: 'X', category: 'C', status: 'fail', severity: 'critical', message: 'm' },
        ],
      })
    );
    expect(html).toContain('#dc2626');
    expect(html).toContain('CRITICAL');
  });

  it('severity color mapping — low = #10b981 (green)', () => {
    const html = generateAuditReportHTML(
      mkReport({
        results: [
          { check: 'X', category: 'C', status: 'pass', severity: 'low', message: 'm' },
        ],
      })
    );
    expect(html).toContain('#10b981');
  });

  it('remediation field varsa block render edilir', () => {
    const html = generateAuditReportHTML(
      mkReport({
        results: [
          {
            check: 'X',
            category: 'C',
            status: 'fail',
            severity: 'high',
            message: 'm',
            remediation: 'Fix this immediately',
          },
        ],
      })
    );
    expect(html).toContain('Remediation:');
    expect(html).toContain('Fix this immediately');
  });

  it('remediation yoksa block render edilmez', () => {
    const html = generateAuditReportHTML(
      mkReport({
        results: [
          { check: 'X', category: 'C', status: 'pass', severity: 'low', message: 'OK' },
        ],
      })
    );
    expect(html).not.toContain('Remediation:');
  });

  it('multiple results — her biri ayrı div', () => {
    const html = generateAuditReportHTML(
      mkReport({
        results: [
          { check: 'A', category: 'C', status: 'pass', severity: 'low', message: 'm1' },
          { check: 'B', category: 'C', status: 'fail', severity: 'critical', message: 'm2' },
        ],
      })
    );
    expect(html).toContain('A');
    expect(html).toContain('B');
    expect(html).toContain('m1');
    expect(html).toContain('m2');
  });
});
